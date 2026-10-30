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
import { api } from '@/lib/api'

import { API_ENDPOINTS } from './constants'
import type { ImageGenerationPayload } from './types'

/**
 * Text to image through the console playground route, billed to the signed-in
 * user. Errors are presented inline on the batch, not as toasts.
 */
export async function generateImages(
  payload: ImageGenerationPayload,
  signal: AbortSignal
): Promise<unknown> {
  const res = await api.post(API_ENDPOINTS.IMAGE_GENERATIONS, payload, {
    signal,
    skipErrorHandler: true,
  })
  return res.data
}

/** Image edits; the multipart boundary is set by the browser. */
export async function editImages(
  form: FormData,
  signal: AbortSignal
): Promise<unknown> {
  const res = await api.post(API_ENDPOINTS.IMAGE_EDITS, form, {
    signal,
    skipErrorHandler: true,
  })
  return res.data
}
