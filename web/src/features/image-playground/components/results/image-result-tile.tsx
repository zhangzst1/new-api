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
import { ImageOffIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Skeleton } from '@/components/ui/skeleton'

import { useImageResultSource } from '../../hooks/use-image-result-source'
import type { ImageResult } from '../../types'

type ImageResultTileProps = {
  result: ImageResult
  index: number
  prompt: string
  onOpen: () => void
}

/** A thumbnail that opens the full image; expired links show a placeholder. */
export function ImageResultTile(props: ImageResultTileProps) {
  const { t } = useTranslation()
  const src = useImageResultSource(props.result)
  const [failedSrc, setFailedSrc] = useState<string>()
  const failed = src !== undefined && failedSrc === src

  let content = <Skeleton className='size-full rounded-none' />
  if (failed) {
    content = (
      <div className='text-muted-foreground flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center text-xs'>
        <ImageOffIcon aria-hidden='true' className='size-5' />
        {t('Image not available')}
      </div>
    )
  } else if (src) {
    content = (
      <img
        alt={t('Image {{index}}: {{prompt}}', {
          index: props.index + 1,
          prompt: props.prompt,
        })}
        className='size-full object-contain transition-transform duration-200 group-hover:scale-[1.02]'
        decoding='async'
        loading='lazy'
        onError={() => setFailedSrc(src)}
        src={src}
      />
    )
  }

  return (
    <li>
      <button
        aria-label={t('Open image {{index}}', { index: props.index + 1 })}
        className='group bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 block w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-3'
        onClick={props.onOpen}
        type='button'
      >
        <AspectRatio ratio={1}>{content}</AspectRatio>
      </button>
    </li>
  )
}
