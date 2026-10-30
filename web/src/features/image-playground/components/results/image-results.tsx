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
import { ImagesIcon, InfoIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { EmptyState } from '@/components/empty-state'
import { LoadingState } from '@/components/loading-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { STARTER_PROMPTS } from '../../constants'
import type { ImageBatch } from '../../types'
import { ImageBatchCard } from './image-batch-card'

type ImageResultsProps = {
  /** Newest first, as kept in the history. */
  batches: ImageBatch[]
  loading: boolean
  persistent: boolean
  activeBatchId: string | null
  canRetry: (batch: ImageBatch) => boolean
  onSelectPrompt: (prompt: string) => void
  onOpenImage: (batchId: string, index: number) => void
  onRetry: (batch: ImageBatch) => void
  onRemove: (batchId: string) => void
  onStop: () => void
}

/**
 * The generation history as a feed, oldest at the top so the newest request
 * sits next to the composer; the view follows new results as they arrive.
 */
export function ImageResults(props: ImageResultsProps) {
  const { t } = useTranslation()

  if (props.loading && props.batches.length === 0) {
    return <LoadingState className='size-full' />
  }

  const chronological = [...props.batches].reverse()

  return (
    <Conversation className='size-full'>
      <ConversationContent className='mx-auto grid w-full max-w-4xl gap-4 px-4 py-6'>
        {!props.persistent && (
          <Alert>
            <InfoIcon aria-hidden='true' />
            <AlertDescription>
              {t(
                'History will not be saved in this browser; it is kept until this page is closed.'
              )}
            </AlertDescription>
          </Alert>
        )}
        {chronological.length === 0 ? (
          <EmptyState
            action={
              <div className='grid w-full max-w-2xl gap-2 sm:grid-cols-2'>
                {STARTER_PROMPTS.map((key) => {
                  const prompt = t(key)
                  return (
                    <Button
                      className='h-auto min-h-11 justify-start px-3 py-2.5 text-left whitespace-normal'
                      key={key}
                      onClick={() => props.onSelectPrompt(prompt)}
                      variant='outline'
                    >
                      {prompt}
                    </Button>
                  )
                })}
              </div>
            }
            description={t(
              'Describe an image below, or start from an example. Results are saved in this browser for your account.'
            )}
            icon={ImagesIcon}
            title={t('No images yet')}
          />
        ) : (
          chronological.map((batch) => (
            <ImageBatchCard
              batch={batch}
              canRetry={props.activeBatchId === null && props.canRetry(batch)}
              isActive={props.activeBatchId === batch.id}
              key={batch.id}
              onOpenImage={(index) => props.onOpenImage(batch.id, index)}
              onRemove={() => props.onRemove(batch.id)}
              onRetry={() => props.onRetry(batch)}
              onReusePrompt={() => props.onSelectPrompt(batch.request.prompt)}
              onStop={props.onStop}
            />
          ))
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
