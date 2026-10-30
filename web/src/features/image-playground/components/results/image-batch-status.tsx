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
import { AlertCircleIcon, CircleSlashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

import type { ImageBatch, ImageRequestErrorKind } from '../../types'

const ERROR_TITLE_KEYS: Record<ImageRequestErrorKind, string> = {
  network: 'Generation failed',
  'too-large': 'Request too large',
  forbidden: 'Access denied',
  'rate-limited': 'Too many requests',
  failed: 'Generation failed',
  empty: 'Generation failed',
}

// Shown when the server gave no reason of its own.
const ERROR_FALLBACK_KEYS: Record<ImageRequestErrorKind, string> = {
  network: 'Network connection failed or server not responding',
  'too-large':
    'The request is too large. Use fewer or smaller reference images, or ask the administrator to raise the upload limit.',
  forbidden: 'Check your balance and your access to this group.',
  'rate-limited': 'Wait a moment before generating again.',
  failed: 'The request failed.',
  empty: 'The model returned no images.',
}

/** Explains why a batch has no images: it failed, was stopped or was cut off. */
export function ImageBatchStatus(props: { batch: ImageBatch }) {
  const { t } = useTranslation()
  const error = props.batch.error

  if (props.batch.status === 'error' && error) {
    return (
      <Alert variant='destructive'>
        <AlertCircleIcon aria-hidden='true' />
        <AlertTitle>{t(ERROR_TITLE_KEYS[error.kind])}</AlertTitle>
        <AlertDescription className='grid gap-1.5'>
          <p className='break-words'>
            {error.message || t(ERROR_FALLBACK_KEYS[error.kind])}
          </p>
          {error.code && (
            <Badge className='font-mono' variant='outline'>
              {t('Error code: {{code}}', { code: error.code })}
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    )
  }
  if (props.batch.status === 'cancelled') {
    return (
      <Alert>
        <CircleSlashIcon aria-hidden='true' />
        <AlertTitle>{t('Generation stopped')}</AlertTitle>
        <AlertDescription>
          {t('The request was stopped before any image was returned.')}
        </AlertDescription>
      </Alert>
    )
  }
  if (props.batch.status === 'interrupted') {
    return (
      <Alert>
        <CircleSlashIcon aria-hidden='true' />
        <AlertTitle>{t('Generation interrupted')}</AlertTitle>
        <AlertDescription>
          {t(
            'The page was closed before this generation finished. Check the usage logs for its result.'
          )}
        </AlertDescription>
      </Alert>
    )
  }
  return null
}
