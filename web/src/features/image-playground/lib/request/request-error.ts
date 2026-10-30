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
import { isAxiosError } from 'axios'

import {
  getServerErrorMessage,
  getServerErrorStatus,
} from '@/lib/server-error-message'

import type { ImageRequestError } from '../../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Classifies a failed image request. Relay errors carry the OpenAI shape
 * `{ error: { message, type, code } }`; console auth errors carry
 * `{ success: false, message }`. Bodies that are not JSON, such as a reverse
 * proxy's HTML 413 page, contribute no message.
 */
export function parseImageRequestError(error: unknown): ImageRequestError {
  if (isAxiosError(error) && !error.response) {
    return { kind: 'network' }
  }
  const status = getServerErrorStatus(error)
  const body = isAxiosError(error) ? error.response?.data : undefined
  if (status === undefined) {
    return {
      kind: 'failed',
      message: error instanceof Error ? error.message : undefined,
    }
  }
  if (status === 413) {
    return { kind: 'too-large', status }
  }
  const message = isRecord(body) ? getServerErrorMessage(body, '') : ''
  const code =
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.code === 'string' &&
    body.error.code
      ? body.error.code
      : undefined
  const detail = { status, code, message: message || undefined }
  if (status === 403) return { kind: 'forbidden', ...detail }
  if (status === 429) return { kind: 'rate-limited', ...detail }
  return { kind: 'failed', ...detail }
}
