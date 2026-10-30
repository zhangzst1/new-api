/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { markServerErrorHandled } from '@/lib/handle-server-error'
import { isServerErrorCancelled } from '@/lib/server-error-message'
import { useImageHistoryStore } from '@/stores/image-playground-history-store'

import { editImages, generateImages } from '../api'
import {
  buildImageEditFormData,
  buildImageGenerationPayload,
} from '../lib/request/payload-builder'
import { parseImageRequestError } from '../lib/request/request-error'
import {
  cancelBatch,
  completeBatch,
  createPendingBatch,
  failBatch,
} from '../lib/result/batch'
import {
  getRequestedMediaType,
  normalizeImageResponse,
} from '../lib/result/image-response'
import type { ImageBatch, ImageRequestSnapshot } from '../types'

export type ImageGenerationInput = {
  request: ImageRequestSnapshot
  images: File[]
  mask: File | null
}

type ReferenceFiles = Pick<ImageGenerationInput, 'images' | 'mask'>

// Reference images are not stored with the history; the most recent edit
// batches keep theirs in memory so they can be retried during this visit.
const MAX_RETAINED_REFERENCES = 5
const retainedReferences = new Map<string, ReferenceFiles>()

/**
 * Sends one generation and records it in the history. It runs outside React,
 * so leaving the page does not cancel it; only one runs at a time.
 */
async function runImageGeneration(input: ImageGenerationInput): Promise<void> {
  const history = useImageHistoryStore.getState()
  if (history.userId === null || history.activeRequest) return

  const batch = createPendingBatch({
    userId: history.userId,
    request: input.request,
    referenceCount: input.images.length,
    hasMask: input.mask !== null,
    now: Date.now(),
  })
  if (input.request.mode === 'edit') {
    retainedReferences.set(batch.id, { images: input.images, mask: input.mask })
    const oldest = retainedReferences.keys().next().value
    if (retainedReferences.size > MAX_RETAINED_REFERENCES && oldest) {
      retainedReferences.delete(oldest)
    }
  }
  const controller = new AbortController()
  void history.addBatch(batch)
  history.beginRequest(batch.id, controller)

  let finished: ImageBatch
  try {
    const response =
      input.request.mode === 'edit'
        ? await editImages(
            buildImageEditFormData(input.request, input.images, input.mask),
            controller.signal
          )
        : await generateImages(
            buildImageGenerationPayload(input.request),
            controller.signal
          )
    const results = normalizeImageResponse(
      response,
      getRequestedMediaType(input.request.params)
    )
    finished =
      results.length > 0
        ? completeBatch(batch, results, Date.now())
        : failBatch(batch, { kind: 'empty' }, Date.now())
  } catch (error) {
    // The batch shows the failure; no toast should repeat it.
    markServerErrorHandled(error)
    finished =
      isServerErrorCancelled(error) || controller.signal.aborted
        ? cancelBatch(batch, Date.now())
        : failBatch(batch, parseImageRequestError(error), Date.now())
  }
  const current = useImageHistoryStore.getState()
  void current.saveBatch(finished)
  current.endRequest(batch.id)
}

/** Whether the batch can be sent again with the same request. */
export function canRetryImageBatch(batch: ImageBatch): boolean {
  return batch.request.mode === 'generate' || retainedReferences.has(batch.id)
}

export function useImageGeneration() {
  const activeBatchId = useImageHistoryStore(
    (state) => state.activeRequest?.batchId ?? null
  )
  const stopRequest = useImageHistoryStore((state) => state.stopRequest)

  return {
    activeBatchId,
    isGenerating: activeBatchId !== null,
    generate: (input: ImageGenerationInput) => {
      void runImageGeneration(input)
    },
    retry: (batch: ImageBatch) => {
      const references = retainedReferences.get(batch.id)
      if (batch.request.mode === 'edit' && !references) return
      void runImageGeneration({
        request: batch.request,
        images: references?.images ?? [],
        mask: references?.mask ?? null,
      })
    },
    stop: stopRequest,
  }
}
