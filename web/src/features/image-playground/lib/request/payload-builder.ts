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
import type {
  ImageGenerationPayload,
  ImageParameterEnabled,
  ImagePlaygroundConfig,
  ImageRequestSnapshot,
} from '../../types'
import { resolveImageRequestParams } from '../parameters/image-parameters'

/** Captures what is sent now, so the request can be retried as it was. */
export function createImageRequestSnapshot(
  config: ImagePlaygroundConfig,
  enabled: ImageParameterEnabled,
  prompt: string
): ImageRequestSnapshot {
  return {
    mode: config.mode,
    model: config.model,
    group: config.group,
    prompt,
    params: resolveImageRequestParams(config, enabled, config.mode),
  }
}

/** JSON body of POST /pg/images/generations. */
export function buildImageGenerationPayload(
  request: ImageRequestSnapshot
): ImageGenerationPayload {
  return {
    model: request.model,
    group: request.group,
    prompt: request.prompt,
    ...request.params,
  }
}

/**
 * Multipart body of POST /pg/images/edits. Several reference images use the
 * `image[]` field the OpenAI Images API accepts; one image uses `image`.
 */
export function buildImageEditFormData(
  request: ImageRequestSnapshot,
  images: readonly File[],
  mask: File | null
): FormData {
  const form = new FormData()
  form.append('model', request.model)
  form.append('group', request.group)
  form.append('prompt', request.prompt)
  for (const [key, value] of Object.entries(request.params)) {
    if (value !== undefined) form.append(key, String(value))
  }
  const imageField = images.length > 1 ? 'image[]' : 'image'
  for (const image of images) {
    form.append(imageField, image, image.name)
  }
  if (mask) {
    form.append('mask', mask, mask.name)
  }
  return form
}
