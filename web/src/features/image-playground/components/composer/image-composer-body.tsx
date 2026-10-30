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
import { BrushIcon, ImageIcon, SparklesIcon, XIcon } from 'lucide-react'
import { useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import {
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTextarea,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaygroundInputControls } from '@/features/playground/components/input/playground-input-controls'

import type {
  GroupOption,
  ImageParameterEnabled,
  ImageParameterKey,
  ImagePlaygroundConfig,
  ModelOption,
} from '../../types'
import { ImageComposerTools } from './image-composer-tools'

type ImageComposerBodyProps = {
  config: ImagePlaygroundConfig
  parameterEnabled: ImageParameterEnabled
  models: ModelOption[]
  groups: GroupOption[]
  isModelLoading: boolean
  isGenerating: boolean
  prompt: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  mask: File | null
  hasHistory: boolean
  pendingReferences: File[] | null
  onPendingReferencesConsumed: () => void
  onAttachmentCountChange: (count: number) => void
  onPromptChange: (prompt: string) => void
  onMaskChange: (mask: File | null) => void
  onConfigChange: <K extends keyof ImagePlaygroundConfig>(
    key: K,
    value: ImagePlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (key: ImageParameterKey, value: boolean) => void
  onStop: () => void
  onClearHistory: () => void
}

/** Composer contents; rendered inside PromptInput to reach its attachments. */
export function ImageComposerBody(props: ImageComposerBodyProps) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const fileCount = attachments.files.length
  const isEdit = props.config.mode === 'edit'

  const onAttachmentCountChange = props.onAttachmentCountChange
  useEffect(() => {
    onAttachmentCountChange(fileCount)
  }, [fileCount, onAttachmentCountChange])

  // Attaching a reference image switches to editing.
  const mode = props.config.mode
  const onConfigChange = props.onConfigChange
  useEffect(() => {
    if (fileCount > 0 && mode === 'generate') onConfigChange('mode', 'edit')
  }, [fileCount, mode, onConfigChange])

  // Images sent from the results with "Use as reference".
  const pendingReferences = props.pendingReferences
  const onPendingReferencesConsumed = props.onPendingReferencesConsumed
  const addAttachments = attachments.add
  useEffect(() => {
    if (!pendingReferences) return
    addAttachments(pendingReferences)
    onPendingReferencesConsumed()
  }, [pendingReferences, addAttachments, onPendingReferencesConsumed])

  const handleModeChange = (value: unknown) => {
    if (value !== 'generate' && value !== 'edit') return
    if (value === 'generate') {
      // Text to image takes no reference images or mask.
      attachments.clear()
      props.onMaskChange(null)
    }
    props.onConfigChange('mode', value)
  }

  return (
    <>
      <PromptInputHeader className='px-3 pt-3'>
        <Tabs onValueChange={handleModeChange} value={props.config.mode}>
          <TabsList aria-label={t('Generation mode')}>
            <TabsTrigger disabled={props.isGenerating} value='generate'>
              <SparklesIcon aria-hidden='true' />
              {t('Text to image')}
            </TabsTrigger>
            <TabsTrigger disabled={props.isGenerating} value='edit'>
              <ImageIcon aria-hidden='true' />
              {t('Image edit')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <PromptInputAttachments>
          {(file) => <PromptInputAttachment data={file} />}
        </PromptInputAttachments>
        {isEdit && props.mask && (
          <Badge
            className='h-8 gap-1.5 rounded-md pr-0.5 pl-2'
            variant='outline'
          >
            <BrushIcon aria-hidden='true' />
            <span className='max-w-40 truncate'>
              {t('Mask')}: {props.mask.name}
            </span>
            <Button
              aria-label={t('Remove mask')}
              onClick={() => props.onMaskChange(null)}
              size='icon-xs'
              type='button'
              variant='ghost'
            >
              <XIcon />
            </Button>
          </Badge>
        )}
        {isEdit && fileCount === 0 && (
          <span className='text-muted-foreground text-xs'>
            {t('Attach at least one image to edit')}
          </span>
        )}
      </PromptInputHeader>

      <PromptInputTextarea
        autoComplete='off'
        className='min-h-20 px-5 pt-3 pb-3 leading-7 md:min-h-24 md:text-base'
        disabled={props.isGenerating}
        onChange={(event) => props.onPromptChange(event.target.value)}
        placeholder={
          isEdit
            ? t('Describe how to change the reference images')
            : t('Describe the image you want')
        }
        ref={props.textareaRef}
        spellCheck={false}
        value={props.prompt}
      />

      <PromptInputFooter className='border-border/60 bg-muted/20 dark:bg-muted/10 border-t px-3 py-2.5 backdrop-blur'>
        <PlaygroundInputControls
          disabled={props.isGenerating}
          groups={props.groups}
          groupValue={props.config.group}
          isGenerating={props.isGenerating}
          isModelLoading={props.isModelLoading}
          models={props.models}
          modelValue={props.config.model}
          onGroupChange={(value) => props.onConfigChange('group', value)}
          onModelChange={(value) => props.onConfigChange('model', value)}
          onStop={props.onStop}
          submitDisabled={isEdit && fileCount === 0}
          submitIcon={<SparklesIcon size={16} />}
          submitLabel={t('Generate')}
          text={props.prompt}
          tools={
            <ImageComposerTools
              config={props.config}
              disabled={props.isGenerating}
              hasHistory={props.hasHistory}
              onAttach={attachments.openFileDialog}
              onClearHistory={props.onClearHistory}
              onConfigChange={props.onConfigChange}
              onMaskChange={props.onMaskChange}
              onParameterEnabledChange={props.onParameterEnabledChange}
              parameterEnabled={props.parameterEnabled}
            />
          }
        />
      </PromptInputFooter>
    </>
  )
}
