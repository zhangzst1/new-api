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
import { BrushIcon, ImagePlusIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PromptInputButton,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { MAX_MASK_BYTES } from '../../constants'
import type {
  ImageParameterEnabled,
  ImageParameterKey,
  ImagePlaygroundConfig,
} from '../../types'
import { ImageParameterPanel } from './image-parameter-panel'

type ImageComposerToolsProps = {
  config: ImagePlaygroundConfig
  parameterEnabled: ImageParameterEnabled
  disabled: boolean
  hasHistory: boolean
  onAttach: () => void
  onMaskChange: (mask: File) => void
  onClearHistory: () => void
  onConfigChange: <K extends keyof ImagePlaygroundConfig>(
    key: K,
    value: ImagePlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (key: ImageParameterKey, value: boolean) => void
}

const TOOL_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground hover:bg-muted/70 font-medium'

export function ImageComposerTools(props: ImageComposerToolsProps) {
  const { t } = useTranslation()
  const maskInputRef = useRef<HTMLInputElement>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const handleMaskSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Allow picking the same file again after removing it.
    event.target.value = ''
    if (!file) return
    if (file.type !== 'image/png') {
      toast.error(t('The mask must be a PNG image'))
      return
    }
    if (file.size > MAX_MASK_BYTES) {
      toast.error(
        t('The mask must be at most {{size}} MB', {
          size: MAX_MASK_BYTES / 1024 / 1024,
        })
      )
      return
    }
    props.onMaskChange(file)
  }

  return (
    <>
      <PromptInputTools className='bg-background/70 border-border/60 rounded-lg border p-1 shadow-xs'>
        <Tooltip>
          <TooltipTrigger
            render={
              <PromptInputButton
                aria-label={t('Attach reference images')}
                className={TOOL_BUTTON_CLASS}
                disabled={props.disabled}
                onClick={props.onAttach}
                variant='ghost'
              >
                <ImagePlusIcon size={16} />
              </PromptInputButton>
            }
          />
          <TooltipContent>
            <p>{t('Attach reference images')}</p>
          </TooltipContent>
        </Tooltip>

        {props.config.mode === 'edit' && (
          <>
            <input
              accept='image/png'
              aria-hidden='true'
              className='hidden'
              onChange={handleMaskSelected}
              ref={maskInputRef}
              tabIndex={-1}
              type='file'
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <PromptInputButton
                    aria-label={t('Choose mask')}
                    className={TOOL_BUTTON_CLASS}
                    disabled={props.disabled}
                    onClick={() => maskInputRef.current?.click()}
                    variant='ghost'
                  >
                    <BrushIcon size={16} />
                  </PromptInputButton>
                }
              />
              <TooltipContent>
                <p>{t('Choose mask')}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <ImageParameterPanel
          config={props.config}
          disabled={props.disabled}
          onConfigChange={props.onConfigChange}
          onParameterEnabledChange={props.onParameterEnabledChange}
          parameterEnabled={props.parameterEnabled}
        />

        <Tooltip>
          <TooltipTrigger
            render={
              <PromptInputButton
                aria-label={t('Clear image history')}
                className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium'
                disabled={!props.hasHistory}
                onClick={() => setClearConfirmOpen(true)}
                variant='ghost'
              >
                <Trash2Icon size={16} />
              </PromptInputButton>
            }
          />
          <TooltipContent>
            <p>{t('Clear image history')}</p>
          </TooltipContent>
        </Tooltip>
      </PromptInputTools>

      <ConfirmDialog
        confirmText={t('Clear')}
        desc={t(
          'All generated images saved in this browser for your account will be removed. A generation in progress is stopped. This cannot be undone.'
        )}
        destructive
        handleConfirm={() => {
          props.onClearHistory()
          setClearConfirmOpen(false)
        }}
        onOpenChange={setClearConfirmOpen}
        open={clearConfirmOpen}
        title={t('Clear image history?')}
      />
    </>
  )
}
