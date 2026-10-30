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
export type { GroupOption, ModelOption } from '@/features/playground/types'

/** Text to image (generations) or reference images to image (edits). */
export type ImagePlaygroundMode = 'generate' | 'edit'

/** Model families whose OpenAI Images parameters are known. */
export type ImageModelFamily = 'gpt-image' | 'dall-e-3' | 'dall-e-2' | 'other'

export type ImageQuality =
  | 'auto'
  | 'low'
  | 'medium'
  | 'high'
  | 'standard'
  | 'hd'
export type ImageResponseFormat = 'b64_json' | 'url'
export type ImageOutputFormat = 'png' | 'jpeg' | 'webp'
export type ImageBackground = 'auto' | 'transparent' | 'opaque'
export type ImageStyle = 'vivid' | 'natural'

export interface ImagePlaygroundConfig {
  model: string
  group: string
  mode: ImagePlaygroundMode
  /** Lists every model of the group instead of image models only. */
  showAllModels: boolean
  /** A size preset, or CUSTOM_SIZE_VALUE to use customSize. */
  size: string
  customSize: string
  quality: ImageQuality
  n: number
  response_format: ImageResponseFormat
  output_format: ImageOutputFormat
  background: ImageBackground
  style: ImageStyle
}

export type ImageParameterKey =
  | 'size'
  | 'quality'
  | 'n'
  | 'response_format'
  | 'output_format'
  | 'background'
  | 'style'

export type ImageParameterEnabled = Record<ImageParameterKey, boolean>

/** Parameter values sent with a request, keyed by request field name. */
export type ImageRequestParams = Partial<
  Record<ImageParameterKey, string | number>
>

/** Everything a batch was requested with, enough to send it again. */
export interface ImageRequestSnapshot {
  mode: ImagePlaygroundMode
  model: string
  group: string
  prompt: string
  params: ImageRequestParams
}

export type ImageGenerationPayload = {
  model: string
  group: string
  prompt: string
} & ImageRequestParams

export interface ImageResult {
  id: string
  /** Image bytes of a base64 (or data URL) result. */
  blob?: Blob
  /** Remote http(s) URL of a URL result; providers expire these. */
  url?: string
  mediaType: string
  revisedPrompt?: string
}

export type ImageBatchStatus =
  | 'pending'
  | 'complete'
  | 'error'
  | 'cancelled'
  | 'interrupted'

export type ImageRequestErrorKind =
  | 'network'
  | 'too-large'
  | 'forbidden'
  | 'rate-limited'
  | 'failed'
  | 'empty'

export interface ImageRequestError {
  kind: ImageRequestErrorKind
  /** Detail reported by the server; the kind explains the rest. */
  message?: string
  code?: string
  status?: number
}

/** One generation request and its outcome, kept in the browser history. */
export interface ImageBatch {
  id: string
  userId: number
  request: ImageRequestSnapshot
  referenceCount: number
  hasMask: boolean
  status: ImageBatchStatus
  createdAt: number
  completedAt?: number
  results: ImageResult[]
  error?: ImageRequestError
}
