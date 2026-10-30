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
import { CUSTOM_SIZE_VALUE, MAX_IMAGE_COUNT } from '../../constants'
import type {
  ImageModelFamily,
  ImageParameterEnabled,
  ImageParameterKey,
  ImagePlaygroundConfig,
  ImagePlaygroundMode,
  ImageQuality,
  ImageRequestParams,
} from '../../types'

export type ImageParameterControl = {
  key: ImageParameterKey
  labelKey: string
  descriptionKey: string
  /** Families that accept the parameter; unknown models accept all. */
  families: readonly ImageModelFamily[]
  /** Image edits do not take this parameter. */
  generateOnly?: boolean
}

const ALL_FAMILIES = ['gpt-image', 'dall-e-3', 'dall-e-2', 'other'] as const

export const IMAGE_PARAMETER_CONTROLS: readonly ImageParameterControl[] = [
  {
    key: 'size',
    labelKey: 'Size',
    descriptionKey: 'Output dimensions in pixels',
    families: ALL_FAMILIES,
  },
  {
    key: 'quality',
    labelKey: 'Quality',
    descriptionKey: 'Higher quality takes longer and may cost more',
    families: ['gpt-image', 'dall-e-3', 'other'],
  },
  {
    key: 'n',
    labelKey: 'Image count',
    descriptionKey: 'Number of images per request',
    families: ['gpt-image', 'dall-e-2', 'other'],
  },
  {
    key: 'response_format',
    labelKey: 'Response format',
    descriptionKey: 'Return images as base64 data or temporary URLs',
    families: ['dall-e-3', 'dall-e-2', 'other'],
  },
  {
    key: 'output_format',
    labelKey: 'Output format',
    descriptionKey: 'File format of the generated images',
    families: ['gpt-image', 'other'],
  },
  {
    key: 'background',
    // "Background" alone already means running a request in the background.
    labelKey: 'Image background',
    descriptionKey: 'Transparent backgrounds need PNG or WebP output',
    families: ['gpt-image', 'other'],
  },
  {
    key: 'style',
    labelKey: 'Style',
    descriptionKey: 'Vivid is more dramatic, natural is more realistic',
    families: ['dall-e-3', 'other'],
    generateOnly: true,
  },
]

const SIZE_OPTIONS: Record<ImageModelFamily, readonly string[]> = {
  'gpt-image': [
    'auto',
    '1024x1024',
    '1536x1024',
    '1024x1536',
    CUSTOM_SIZE_VALUE,
  ],
  'dall-e-3': ['1024x1024', '1792x1024', '1024x1792'],
  'dall-e-2': ['256x256', '512x512', '1024x1024'],
  other: [
    'auto',
    '1024x1024',
    '1536x1024',
    '1024x1536',
    '1792x1024',
    '1024x1792',
    '512x512',
    '256x256',
    CUSTOM_SIZE_VALUE,
  ],
}

const QUALITY_OPTIONS: Record<ImageModelFamily, readonly ImageQuality[]> = {
  'gpt-image': ['auto', 'low', 'medium', 'high'],
  'dall-e-3': ['standard', 'hd'],
  'dall-e-2': ['standard'],
  other: ['auto', 'low', 'medium', 'high', 'standard', 'hd'],
}

const IMAGE_SIZE_PATTERN = /^\s*(\d{2,5})\s*[xX×*]\s*(\d{2,5})\s*$/
const MIN_IMAGE_SIDE = 64
const MAX_IMAGE_SIDE = 8192

export function getImageModelFamily(model: string): ImageModelFamily {
  const name = model.toLowerCase()
  if (name.includes('gpt-image')) return 'gpt-image'
  if (name.includes('dall-e-3')) return 'dall-e-3'
  if (name.includes('dall-e-2')) return 'dall-e-2'
  return 'other'
}

export function isImageParameterAvailable(
  control: ImageParameterControl,
  family: ImageModelFamily,
  mode: ImagePlaygroundMode
): boolean {
  if (control.generateOnly && mode === 'edit') return false
  return control.families.includes(family)
}

export function getImageSizeOptions(
  family: ImageModelFamily
): readonly string[] {
  return SIZE_OPTIONS[family]
}

export function getImageQualityOptions(
  family: ImageModelFamily
): readonly ImageQuality[] {
  return QUALITY_OPTIONS[family]
}

/** The configured value when the family offers it, else the family default. */
function resolveOption<T extends string>(value: T, options: readonly T[]): T {
  return options.includes(value) ? value : options[0]
}

/**
 * Normalizes a user-entered size such as "1024 × 1536" to "1024x1536";
 * returns null when it is not WIDTHxHEIGHT within the supported range.
 */
export function parseImageSize(input: string): string | null {
  const match = IMAGE_SIZE_PATTERN.exec(input)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  const sides = [width, height]
  if (sides.some((side) => side < MIN_IMAGE_SIDE || side > MAX_IMAGE_SIDE)) {
    return null
  }
  return `${width}x${height}`
}

export function clampImageCount(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_IMAGE_COUNT, Math.max(1, Math.trunc(value)))
}

/**
 * The value a parameter is sent with for the family, as shown in the panel;
 * undefined when it cannot be sent (an invalid custom size).
 */
export function getImageParameterValue(
  key: ImageParameterKey,
  config: ImagePlaygroundConfig,
  family: ImageModelFamily
): string | number | undefined {
  switch (key) {
    case 'size': {
      const size = resolveOption(config.size, SIZE_OPTIONS[family])
      if (size !== CUSTOM_SIZE_VALUE) return size
      return parseImageSize(config.customSize) ?? undefined
    }
    case 'quality':
      return resolveOption(config.quality, QUALITY_OPTIONS[family])
    case 'n':
      return clampImageCount(config.n)
    case 'response_format':
      return config.response_format
    case 'output_format':
      return config.output_format
    case 'background':
      return config.background
    case 'style':
      return config.style
  }
}

/** The size select's value for the family: a preset or the custom entry. */
export function getImageSizeSelection(
  config: ImagePlaygroundConfig,
  family: ImageModelFamily
): string {
  return resolveOption(config.size, SIZE_OPTIONS[family])
}

/** The quality select's value for the family. */
export function getImageQualitySelection(
  config: ImagePlaygroundConfig,
  family: ImageModelFamily
): ImageQuality {
  return resolveOption(config.quality, QUALITY_OPTIONS[family])
}

/** Parameters the request carries: enabled ones the model and mode accept. */
export function resolveImageRequestParams(
  config: ImagePlaygroundConfig,
  enabled: ImageParameterEnabled,
  mode: ImagePlaygroundMode
): ImageRequestParams {
  const family = getImageModelFamily(config.model)
  const params: ImageRequestParams = {}
  for (const control of IMAGE_PARAMETER_CONTROLS) {
    if (!enabled[control.key]) continue
    if (!isImageParameterAvailable(control, family, mode)) continue
    const value = getImageParameterValue(control.key, config, family)
    if (value !== undefined) params[control.key] = value
  }
  return params
}
