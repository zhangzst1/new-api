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
import { DEFAULT_GROUP } from '@/features/playground/constants'

import type { ImageParameterEnabled, ImagePlaygroundConfig } from './types'

export const API_ENDPOINTS = {
  IMAGE_GENERATIONS: '/pg/images/generations',
  IMAGE_EDITS: '/pg/images/edits',
} as const

/** Endpoint type the model list is narrowed to unless all models are shown. */
export const IMAGE_ENDPOINT_TYPE = 'image-generation'

/** Upper bound of the image count control; the gateway allows more. */
export const MAX_IMAGE_COUNT = 10
export const MAX_REFERENCE_IMAGES = 4
export const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_MASK_BYTES = 4 * 1024 * 1024

export const CUSTOM_SIZE_VALUE = 'custom'

/** Per-user browser history cap; the oldest batches are evicted first. */
export const HISTORY_LIMITS = {
  maxBatches: 50,
  maxBytes: 200 * 1024 * 1024,
} as const

export const DEFAULT_IMAGE_CONFIG: ImagePlaygroundConfig = {
  model: '',
  group: DEFAULT_GROUP,
  mode: 'generate',
  showAllModels: false,
  size: '1024x1024',
  customSize: '',
  quality: 'auto',
  n: 1,
  response_format: 'b64_json',
  output_format: 'png',
  background: 'auto',
  style: 'vivid',
}

export const DEFAULT_IMAGE_PARAMETER_ENABLED: ImageParameterEnabled = {
  size: true,
  quality: false,
  n: true,
  response_format: true,
  output_format: false,
  background: false,
  style: false,
}

export const STORAGE_KEYS = {
  CONFIG: 'image_playground_config',
  PARAMETER_ENABLED: 'image_playground_parameter_enabled',
} as const

export const STORAGE_VERSION = 1

/** Starter prompts; values are i18n keys and the translated text is used. */
export const STARTER_PROMPTS = [
  'A watercolor fox in a misty forest at dawn',
  'An isometric city block at night with neon signs',
  'A minimalist logo of a paper plane, flat design',
  'A product photo of a ceramic mug on a linen tablecloth',
] as const
