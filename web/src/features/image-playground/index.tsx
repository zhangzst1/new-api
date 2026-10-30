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
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { usePlaygroundOptions } from '@/features/playground/hooks/use-playground-options'

import {
  ImageComposer,
  type ImageComposerSubmission,
} from './components/composer/image-composer'
import { ImagePreviewDialog } from './components/preview/image-preview-dialog'
import { ImageResults } from './components/results/image-results'
import { IMAGE_ENDPOINT_TYPE } from './constants'
import {
  canRetryImageBatch,
  useImageGeneration,
} from './hooks/use-image-generation'
import { useImageHistory } from './hooks/use-image-history'
import { useImagePlaygroundState } from './hooks/use-image-playground-state'
import { createImageRequestSnapshot } from './lib/request/payload-builder'
import { getImageFileName } from './lib/result/image-response'
import type { ImageBatch, ImageResult } from './types'

type PreviewTarget = { batchId: string; index: number }

/** Online image generation: text to image and image edits, with history. */
export function ImagePlayground() {
  const { t } = useTranslation()
  const state = useImagePlaygroundState()
  const history = useImageHistory()
  const generation = useImageGeneration()
  const [prompt, setPrompt] = useState('')
  const promptInputRef = useRef<HTMLTextAreaElement>(null)
  const [pendingReferences, setPendingReferences] = useState<File[] | null>(
    null
  )
  const [preview, setPreview] = useState<PreviewTarget | null>(null)
  // Set when "Use as reference" closes the preview: the edit instruction comes
  // next, so focus goes to the prompt instead of back to the image.
  const focusPromptOnPreviewCloseRef = useRef(false)

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: state.config.group,
    currentModel: state.config.model,
    setGroups: state.setGroups,
    setModels: state.setModels,
    updateConfig: state.updateConfig,
    endpointType: state.config.showAllModels ? undefined : IMAGE_ENDPOINT_TYPE,
  })

  const previewBatch =
    history.batches.find((batch) => batch.id === preview?.batchId) ?? null

  const handlePreviewIndexChange = useCallback((index: number) => {
    setPreview((current) => (current ? { ...current, index } : current))
  }, [])

  const handlePendingReferencesConsumed = useCallback(() => {
    setPendingReferences(null)
  }, [])

  // A starter or reused prompt lands in the composer, ready to edit or send.
  const handleSelectPrompt = (value: string) => {
    setPrompt(value)
    promptInputRef.current?.focus()
  }

  const handleSubmit = (submission: ImageComposerSubmission) => {
    generation.generate({
      request: createImageRequestSnapshot(
        state.config,
        state.parameterEnabled,
        submission.prompt
      ),
      images: submission.images,
      mask: submission.mask,
    })
    setPrompt('')
  }

  const handleUseAsReference = async (
    batch: ImageBatch,
    result: ImageResult,
    index: number
  ) => {
    try {
      let blob = result.blob
      if (!blob && result.url) {
        // A remote result is downloaded first; its host must allow it (CORS).
        const response = await fetch(result.url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        blob = await response.blob()
      }
      if (!blob) return
      const file = new File(
        [blob],
        getImageFileName(batch, index, result.mediaType),
        { type: blob.type || result.mediaType }
      )
      setPendingReferences([file])
      focusPromptOnPreviewCloseRef.current = true
      setPreview(null)
    } catch {
      toast.error(t('Could not load this image as a reference'))
    }
  }

  return (
    <div className='relative flex size-full min-h-0 flex-col overflow-hidden'>
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <ImageResults
          activeBatchId={generation.activeBatchId}
          batches={history.batches}
          canRetry={canRetryImageBatch}
          loading={history.loading}
          onOpenImage={(batchId, index) => setPreview({ batchId, index })}
          onRemove={(batchId) => void history.removeBatch(batchId)}
          onRetry={generation.retry}
          onSelectPrompt={handleSelectPrompt}
          onStop={generation.stop}
          persistent={history.persistent}
        />
      </div>

      <div className='mx-auto w-full max-w-4xl'>
        <ImageComposer
          config={state.config}
          groups={state.groups}
          hasHistory={history.batches.length > 0}
          isGenerating={generation.isGenerating}
          isModelLoading={isLoadingModels}
          models={state.models}
          onClearHistory={() => void history.clearHistory()}
          onConfigChange={state.updateConfig}
          onParameterEnabledChange={state.updateParameterEnabled}
          onPendingReferencesConsumed={handlePendingReferencesConsumed}
          onPromptChange={setPrompt}
          onStop={generation.stop}
          onSubmit={handleSubmit}
          parameterEnabled={state.parameterEnabled}
          pendingReferences={pendingReferences}
          prompt={prompt}
          textareaRef={promptInputRef}
        />
      </div>

      <ImagePreviewDialog
        batch={previewBatch}
        finalFocus={() => {
          if (!focusPromptOnPreviewCloseRef.current) return true
          focusPromptOnPreviewCloseRef.current = false
          return promptInputRef.current ?? true
        }}
        index={preview?.index ?? 0}
        onClose={() => setPreview(null)}
        onIndexChange={handlePreviewIndexChange}
        onUseAsReference={(batch, result, index) =>
          void handleUseAsReference(batch, result, index)
        }
      />
    </div>
  )
}
