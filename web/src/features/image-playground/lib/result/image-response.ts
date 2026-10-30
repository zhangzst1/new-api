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
import { nanoid } from 'nanoid'

import type { ImageBatch, ImageRequestParams, ImageResult } from '../../types'
import { base64ToBytes } from '../request/data-url'

const BASE64_SIGNATURES: readonly (readonly [string, string])[] = [
  ['iVBORw0KGgo', 'image/png'],
  ['/9j/', 'image/jpeg'],
  ['UklGR', 'image/webp'],
  ['R0lGOD', 'image/gif'],
]

/**
 * Raster types a result Blob may carry. Blob URLs share the console's origin,
 * so a declared type such as text/html or image/svg+xml is never kept.
 */
const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
])

const MEDIA_TYPE_EXTENSIONS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
])

const EXTENSION_MEDIA_TYPES = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['avif', 'image/avif'],
])

const BASE64_DATA_URL_PATTERN = /^data:([^;,]*)[^,]*;base64,(.*)$/s

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/** Detects the image type from the first bytes of base64 image data. */
export function sniffBase64ImageType(base64: string): string | undefined {
  return BASE64_SIGNATURES.find(([prefix]) => base64.startsWith(prefix))?.[1]
}

/** The media type the requested output_format produces (PNG by default). */
export function getRequestedMediaType(params: ImageRequestParams): string {
  switch (params.output_format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

/** Only http(s) URLs may become image sources and links. */
export function isSafeRemoteImageUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** A base64 payload, plain or as a base64 data URL, decoded into a Blob. */
function inlineImageResult(
  source: string,
  fallbackMediaType: string,
  revisedPrompt: string | undefined
): ImageResult {
  const dataUrl = BASE64_DATA_URL_PATTERN.exec(source)
  const base64 = dataUrl ? dataUrl[2] : source
  const declaredType = dataUrl?.[1].toLowerCase() ?? ''
  const mediaType = RASTER_IMAGE_TYPES.has(declaredType)
    ? declaredType
    : (sniffBase64ImageType(base64) ?? fallbackMediaType)
  return {
    id: nanoid(),
    blob: new Blob([base64ToBytes(base64)], { type: mediaType }),
    mediaType,
    revisedPrompt,
  }
}

/**
 * Reads the images of an OpenAI Images response. `data` may be an array or a
 * single object; base64 payloads (and data URLs) become Blobs, http(s) URLs are
 * kept as links, and entries without an image are skipped.
 */
export function normalizeImageResponse(
  response: unknown,
  fallbackMediaType: string
): ImageResult[] {
  const data = isRecord(response) ? response.data : undefined
  let entries: unknown[] = []
  if (Array.isArray(data)) {
    entries = data
  } else if (isRecord(data)) {
    entries = [data]
  }
  const results: ImageResult[] = []
  for (const entry of entries) {
    if (!isRecord(entry)) continue
    const revisedPrompt = nonEmptyString(entry.revised_prompt)
    const base64 = nonEmptyString(entry.b64_json)
    const url = nonEmptyString(entry.url)
    if (base64) {
      results.push(inlineImageResult(base64, fallbackMediaType, revisedPrompt))
    } else if (url?.startsWith('data:')) {
      results.push(inlineImageResult(url, fallbackMediaType, revisedPrompt))
    } else if (url && isSafeRemoteImageUrl(url)) {
      const extension = new URL(url).pathname.split('.').pop()?.toLowerCase()
      results.push({
        id: nanoid(),
        url,
        mediaType:
          EXTENSION_MEDIA_TYPES.get(extension ?? '') ?? fallbackMediaType,
        revisedPrompt,
      })
    }
  }
  return results
}

/** Download name, e.g. image-gpt-image-1-20261030-091500-2.png. */
export function getImageFileName(
  batch: ImageBatch,
  index: number,
  mediaType: string
): string {
  const model = batch.request.model.replaceAll(/[^\w.-]+/g, '-') || 'image'
  const time = dayjs(batch.createdAt).format('YYYYMMDD-HHmmss')
  const extension = MEDIA_TYPE_EXTENSIONS.get(mediaType) ?? 'png'
  return `image-${model}-${time}-${index + 1}.${extension}`
}
