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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImageOffIcon,
  ImagePlusIcon,
} from 'lucide-react'
import { useEffect, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { useImageResultSource } from '../../hooks/use-image-result-source'
import { getImageFileName } from '../../lib/result/image-response'
import type { ImageBatch, ImageResult } from '../../types'

type ImagePreviewDialogProps = {
  /** The batch whose image is shown; null closes the dialog. */
  batch: ImageBatch | null
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  onUseAsReference: (
    batch: ImageBatch,
    result: ImageResult,
    index: number
  ) => void
  finalFocus?: ComponentProps<typeof Dialog>['finalFocus']
}

/** Full-size view of a batch's images with download and reuse actions. */
export function ImagePreviewDialog(props: ImagePreviewDialogProps) {
  const { t } = useTranslation()
  const batch = props.batch
  const total = batch?.results.length ?? 0
  const result = batch?.results[props.index]
  const src = useImageResultSource(result)
  const [failedSrc, setFailedSrc] = useState<string>()
  const open = batch !== null && result !== undefined

  // Arrow keys move between the images of the batch. The dialog stops key
  // events from bubbling out of it, so this listens in the capture phase.
  const index = props.index
  const onIndexChange = props.onIndexChange
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
      if (event.key === 'ArrowRight' && index < total - 1) {
        onIndexChange(index + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [open, index, total, onIndexChange])

  let image = <Skeleton className='aspect-square w-full max-w-md' />
  if (src && failedSrc === src) {
    image = (
      <div className='text-muted-foreground flex flex-col items-center gap-2 p-8 text-sm'>
        <ImageOffIcon aria-hidden='true' className='size-6' />
        {t('Image not available')}
      </div>
    )
  } else if (src && batch) {
    image = (
      <img
        alt={t('Image {{index}}: {{prompt}}', {
          index: index + 1,
          prompt: batch.request.prompt,
        })}
        className='max-h-[65vh] w-auto max-w-full object-contain'
        onError={() => setFailedSrc(src)}
        src={src}
      />
    )
  }

  const footer =
    batch && result ? (
      <div className='flex w-full flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-1'>
          <Button
            aria-label={t('Previous image')}
            disabled={index === 0}
            onClick={() => props.onIndexChange(index - 1)}
            size='icon'
            variant='outline'
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            aria-label={t('Next image')}
            disabled={index >= total - 1}
            onClick={() => props.onIndexChange(index + 1)}
            size='icon'
            variant='outline'
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            onClick={() => props.onUseAsReference(batch, result, index)}
            variant='outline'
          >
            <ImagePlusIcon data-icon='inline-start' />
            {t('Use as reference')}
          </Button>
          {result.url && (
            <Button
              nativeButton={false}
              render={
                <a
                  href={result.url}
                  rel='noopener noreferrer'
                  target='_blank'
                />
              }
              variant='outline'
            >
              <ExternalLinkIcon data-icon='inline-start' />
              {t('Open original')}
            </Button>
          )}
          {result.blob && src && (
            <Button
              nativeButton={false}
              render={
                <a
                  download={getImageFileName(batch, index, result.mediaType)}
                  href={src}
                />
              }
            >
              <DownloadIcon data-icon='inline-start' />
              {t('Download')}
            </Button>
          )}
        </div>
      </div>
    ) : null

  return (
    <Dialog
      bodyClassName='grid gap-3'
      contentClassName='sm:max-w-4xl'
      description={batch?.request.prompt}
      descriptionClassName='line-clamp-3 break-words'
      finalFocus={props.finalFocus}
      footer={footer}
      onOpenChange={(next) => {
        if (!next) props.onClose()
      }}
      open={open}
      title={t('Image {{index}} of {{total}}', { index: index + 1, total })}
    >
      <div className='bg-muted/40 flex min-h-64 items-center justify-center overflow-hidden rounded-lg border'>
        {image}
      </div>
      {result?.revisedPrompt && (
        <div className='grid gap-1'>
          <p className='text-xs font-medium'>{t('Revised prompt')}</p>
          <p className='text-muted-foreground text-sm break-words'>
            {result.revisedPrompt}
          </p>
        </div>
      )}
    </Dialog>
  )
}
