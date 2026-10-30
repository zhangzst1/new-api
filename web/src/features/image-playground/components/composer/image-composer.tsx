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
import { useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PromptInput,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import {
  MAX_REFERENCE_IMAGE_BYTES,
  MAX_REFERENCE_IMAGES,
} from '../../constants'
import { dataUrlToFile } from '../../lib/request/data-url'
import type {
  GroupOption,
  ImageParameterEnabled,
  ImageParameterKey,
  ImagePlaygroundConfig,
  ModelOption,
} from '../../types'
import { ImageComposerBody } from './image-composer-body'

export type ImageComposerSubmission = {
  prompt: string
  images: File[]
  mask: File | null
}

type ImageComposerProps = {
  config: ImagePlaygroundConfig
  parameterEnabled: ImageParameterEnabled
  models: ModelOption[]
  groups: GroupOption[]
  isModelLoading: boolean
  isGenerating: boolean
  prompt: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  hasHistory: boolean
  pendingReferences: File[] | null
  onPendingReferencesConsumed: () => void
  onPromptChange: (prompt: string) => void
  onConfigChange: <K extends keyof ImagePlaygroundConfig>(
    key: K,
    value: ImagePlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (key: ImageParameterKey, value: boolean) => void
  onSubmit: (submission: ImageComposerSubmission) => void
  onStop: () => void
  onClearHistory: () => void
}

/** Prompt, reference images, mask, model and parameters for one generation. */
export function ImageComposer(props: ImageComposerProps) {
  const { t } = useTranslation()
  const [mask, setMask] = useState<File | null>(null)
  const [attachmentCount, setAttachmentCount] = useState(0)
  const isEdit = props.config.mode === 'edit'
  const canSubmit =
    props.prompt.trim() !== '' &&
    !props.isGenerating &&
    !props.isModelLoading &&
    props.models.length > 0 &&
    (!isEdit || attachmentCount > 0)
  const showNoModels = !props.isModelLoading && props.models.length === 0

  const handleSubmit = (message: PromptInputMessage) => {
    const prompt = message.text?.trim() ?? ''
    const files = message.files ?? []
    if (!prompt || (isEdit && files.length === 0)) {
      // A rejection keeps the attachments (see PromptInput).
      throw new Error('The composer is not ready to submit')
    }
    const images = isEdit
      ? files.map((file, index) =>
          dataUrlToFile(file.url, file.filename || `reference-${index + 1}.png`)
        )
      : []
    props.onSubmit({ prompt, images, mask: isEdit ? mask : null })
    setMask(null)
  }

  return (
    <div className='grid shrink-0 gap-3 px-1 md:pb-4'>
      {showNoModels && (
        <Alert>
          <AlertTitle>
            {props.config.showAllModels
              ? t('No models available in this group')
              : t('No image models available in this group')}
          </AlertTitle>
          <AlertDescription>
            {props.config.showAllModels
              ? t('Choose another group.')
              : t(
                  'Choose another group, or show all models if an image model is not recognized.'
                )}
          </AlertDescription>
          {!props.config.showAllModels && (
            <AlertAction>
              <Button
                onClick={() => props.onConfigChange('showAllModels', true)}
                size='xs'
                variant='outline'
              >
                {t('Show all models')}
              </Button>
            </AlertAction>
          )}
        </Alert>
      )}
      <PromptInput
        accept='image/*'
        className='relative'
        groupClassName='bg-background/95 dark:bg-background/80 border-border/70 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.65)] ring-1 ring-foreground/5 rounded-xl overflow-hidden transition-all duration-200 focus-within:border-primary/45 focus-within:ring-primary/15 focus-within:shadow-[0_22px_70px_-34px_rgba(0,0,0,0.75)]'
        maxFileSize={MAX_REFERENCE_IMAGE_BYTES}
        maxFiles={MAX_REFERENCE_IMAGES}
        multiple
        onError={(error) => toast.error(error.message)}
        onSubmit={handleSubmit}
        // Enter submits the form even while Generate is disabled (for example
        // before a model is available); such submits stop here.
        onSubmitCapture={(event) => {
          if (canSubmit) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <ImageComposerBody
          config={props.config}
          groups={props.groups}
          hasHistory={props.hasHistory}
          isGenerating={props.isGenerating}
          isModelLoading={props.isModelLoading}
          mask={mask}
          models={props.models}
          onAttachmentCountChange={setAttachmentCount}
          onClearHistory={props.onClearHistory}
          onConfigChange={props.onConfigChange}
          onMaskChange={setMask}
          onParameterEnabledChange={props.onParameterEnabledChange}
          onPendingReferencesConsumed={props.onPendingReferencesConsumed}
          onPromptChange={props.onPromptChange}
          onStop={props.onStop}
          parameterEnabled={props.parameterEnabled}
          pendingReferences={props.pendingReferences}
          prompt={props.prompt}
          textareaRef={props.textareaRef}
        />
      </PromptInput>
    </div>
  )
}
