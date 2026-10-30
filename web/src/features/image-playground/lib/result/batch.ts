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
import { nanoid } from 'nanoid'

import type {
  ImageBatch,
  ImageRequestError,
  ImageRequestSnapshot,
  ImageResult,
} from '../../types'

export type HistoryLimits = {
  maxBatches: number
  maxBytes: number
}

export function createPendingBatch(input: {
  userId: number
  request: ImageRequestSnapshot
  referenceCount: number
  hasMask: boolean
  now: number
}): ImageBatch {
  return {
    id: nanoid(),
    userId: input.userId,
    request: input.request,
    referenceCount: input.referenceCount,
    hasMask: input.hasMask,
    status: 'pending',
    createdAt: input.now,
    results: [],
  }
}

export function completeBatch(
  batch: ImageBatch,
  results: ImageResult[],
  now: number
): ImageBatch {
  return { ...batch, status: 'complete', results, completedAt: now }
}

export function failBatch(
  batch: ImageBatch,
  error: ImageRequestError,
  now: number
): ImageBatch {
  return { ...batch, status: 'error', error, completedAt: now }
}

export function cancelBatch(batch: ImageBatch, now: number): ImageBatch {
  return { ...batch, status: 'cancelled', completedAt: now }
}

/** The number of images a batch shows or is waiting for. */
export function getRequestedImageCount(batch: ImageBatch): number {
  const n = batch.request.params.n
  return typeof n === 'number' && n > 0 ? n : 1
}

/**
 * A stored batch still pending was cut off when its page closed, unless it is
 * the request this page is running now.
 */
export function markInterruptedBatches(
  batches: ImageBatch[],
  activeBatchId: string | null
): ImageBatch[] {
  return batches.map((batch) =>
    batch.status === 'pending' && batch.id !== activeBatchId
      ? { ...batch, status: 'interrupted' }
      : batch
  )
}

/** Approximate stored size: image bytes plus the prompt text. */
export function getBatchByteSize(batch: ImageBatch): number {
  return batch.results.reduce(
    (total, result) => total + (result.blob?.size ?? 0),
    batch.request.prompt.length
  )
}

/**
 * Batches (newest first) over the count or byte budget, oldest ones first to
 * go. The newest batch is always kept, even when it alone exceeds the budget.
 */
export function selectBatchesToEvict(
  batches: ImageBatch[],
  limits: HistoryLimits
): string[] {
  let bytes = 0
  const evicted: string[] = []
  batches.forEach((batch, index) => {
    bytes += getBatchByteSize(batch)
    if (index > 0 && (index >= limits.maxBatches || bytes > limits.maxBytes)) {
      evicted.push(batch.id)
    }
  })
  return evicted
}
