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
import dayjs from 'dayjs'
import {
  PencilLineIcon,
  RefreshCwIcon,
  SquareIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

import { MAX_IMAGE_COUNT } from '../../constants'
import { getRequestedImageCount } from '../../lib/result/batch'
import type { ImageBatch } from '../../types'
import { ImageBatchStatus } from './image-batch-status'
import { ImageResultTile } from './image-result-tile'

type ImageBatchCardProps = {
  batch: ImageBatch
  /** This batch is the generation running now. */
  isActive: boolean
  canRetry: boolean
  onOpenImage: (index: number) => void
  onRetry: () => void
  onReusePrompt: () => void
  onRemove: () => void
  onStop: () => void
}

function ActionButton(props: {
  label: string
  icon: LucideIcon
  disabled?: boolean
  destructive?: boolean
  onClick: () => void
}) {
  const Icon = props.icon
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={props.label}
            className={props.destructive ? 'hover:text-destructive' : undefined}
            disabled={props.disabled}
            onClick={props.onClick}
            size='icon-sm'
            variant='ghost'
          >
            <Icon />
          </Button>
        }
      />
      <TooltipContent>
        <p>{props.label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Stable keys for the placeholder tiles of a pending batch.
const PLACEHOLDER_KEYS = Array.from(
  { length: MAX_IMAGE_COUNT },
  (_, index) => `placeholder-${index + 1}`
)

/** One request: its prompt and settings, then its images or its outcome. */
export function ImageBatchCard(props: ImageBatchCardProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const batch = props.batch
  const isPending = batch.status === 'pending'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isPending) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isPending])
  const elapsedSeconds = Math.max(0, Math.floor((now - batch.createdAt) / 1000))
  const size = batch.request.params.size
  const durationSeconds =
    batch.completedAt === undefined
      ? undefined
      : Math.round((batch.completedAt - batch.createdAt) / 100) / 10

  let content = <ImageBatchStatus batch={batch} />
  if (isPending) {
    const count = getRequestedImageCount(batch)
    content = (
      <div aria-live='polite' className='grid gap-2' role='status'>
        <p className='text-muted-foreground text-xs'>
          {t('Generating, {{seconds}}s elapsed', { seconds: elapsedSeconds })}
        </p>
        <ul className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
          {PLACEHOLDER_KEYS.slice(0, count).map((key) => (
            <li key={key}>
              <Skeleton className='aspect-square w-full rounded-lg' />
            </li>
          ))}
        </ul>
      </div>
    )
  } else if (batch.results.length > 0) {
    content = (
      <ul className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
        {batch.results.map((result, index) => (
          <ImageResultTile
            index={index}
            key={result.id}
            onOpen={() => props.onOpenImage(index)}
            prompt={batch.request.prompt}
            result={result}
          />
        ))}
      </ul>
    )
  }

  return (
    <Card size='sm'>
      <CardHeader>
        <CardTitle className='line-clamp-3 break-words whitespace-pre-wrap'>
          {batch.request.prompt}
        </CardTitle>
        <CardDescription className='flex flex-wrap items-center gap-1.5 text-xs'>
          <Badge variant='secondary'>
            {batch.request.mode === 'edit'
              ? t('Image edit')
              : t('Text to image')}
          </Badge>
          <Badge variant='outline'>{batch.request.model}</Badge>
          <Badge variant='outline'>{batch.request.group}</Badge>
          {size !== undefined && <Badge variant='outline'>{size}</Badge>}
          {batch.referenceCount > 0 && (
            <span>
              {t('Reference images: {{count}}', {
                count: batch.referenceCount,
              })}
            </span>
          )}
          <time dateTime={new Date(batch.createdAt).toISOString()}>
            {dayjs(batch.createdAt).format('YYYY-MM-DD HH:mm')}
          </time>
          {durationSeconds !== undefined && (
            <span>
              {t('{{value}}s', {
                value: formatNumber(durationSeconds, locale),
              })}
            </span>
          )}
        </CardDescription>
        <CardAction className='flex items-center gap-0.5'>
          {props.isActive && (
            <ActionButton
              icon={SquareIcon}
              label={t('Stop')}
              onClick={props.onStop}
            />
          )}
          <ActionButton
            icon={PencilLineIcon}
            label={t('Reuse prompt')}
            onClick={props.onReusePrompt}
          />
          <CopyButton
            className='size-7'
            successTooltip={t('Copied!')}
            tooltip={t('Copy prompt')}
            value={batch.request.prompt}
          />
          <ActionButton
            disabled={!props.canRetry}
            icon={RefreshCwIcon}
            label={t('Generate again')}
            onClick={props.onRetry}
          />
          <ActionButton
            destructive
            icon={Trash2Icon}
            label={t('Remove from history')}
            onClick={props.onRemove}
          />
        </CardAction>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
