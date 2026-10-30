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
import { describe, expect, test } from 'vitest'

import {
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_IMAGE_PARAMETER_ENABLED,
} from '../../../constants'
import type {
  ImageParameterEnabled,
  ImagePlaygroundConfig,
} from '../../../types'
import {
  clampImageCount,
  getImageModelFamily,
  parseImageSize,
  resolveImageRequestParams,
} from '../image-parameters'

const allEnabled: ImageParameterEnabled = {
  size: true,
  quality: true,
  n: true,
  response_format: true,
  output_format: true,
  background: true,
  style: true,
}

function configFor(overrides: Partial<ImagePlaygroundConfig>) {
  return { ...DEFAULT_IMAGE_CONFIG, ...overrides }
}

describe('parseImageSize', () => {
  test.each(['1024x1536', '1024X1536', ' 1024 × 1536 ', '1024*1536'])(
    'normalizes %j to WIDTHxHEIGHT',
    (input) => {
      expect(parseImageSize(input)).toBe('1024x1536')
    }
  )

  test.each(['', '1024', 'wide x tall', '32x32', '9000x1024', '1024x1536x2'])(
    'rejects %j',
    (input) => {
      expect(parseImageSize(input)).toBeNull()
    }
  )
})

describe('clampImageCount', () => {
  test.each([
    [0, 1],
    [-3, 1],
    [2.7, 2],
    [11, 10],
    [Number.NaN, 1],
  ])('keeps %d within 1 to 10 as %d', (input, expected) => {
    expect(clampImageCount(input)).toBe(expected)
  })
})

describe('getImageModelFamily', () => {
  test.each([
    ['gpt-image-1', 'gpt-image'],
    ['GPT-Image-1-mini', 'gpt-image'],
    ['dall-e-3', 'dall-e-3'],
    ['dall-e-2', 'dall-e-2'],
    ['flux-1.1-pro', 'other'],
  ])('classifies %s as %s', (model, family) => {
    expect(getImageModelFamily(model)).toBe(family)
  })
})

describe('resolveImageRequestParams', () => {
  test('gpt-image models omit response_format and style, which they reject', () => {
    const config = configFor({ model: 'gpt-image-1', quality: 'high', n: 3 })

    expect(resolveImageRequestParams(config, allEnabled, 'generate')).toEqual({
      size: '1024x1024',
      quality: 'high',
      n: 3,
      output_format: 'png',
      background: 'auto',
    })
  })

  test('dall-e-3 sends one image, its own sizes and qualities, and a style', () => {
    const config = configFor({
      model: 'dall-e-3',
      size: '1536x1024',
      quality: 'high',
      n: 4,
    })

    expect(resolveImageRequestParams(config, allEnabled, 'generate')).toEqual({
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
      style: 'vivid',
    })
  })

  test('edit mode never sends style, even for models that accept it', () => {
    const config = configFor({ model: 'flux-1.1-pro' })

    expect(
      resolveImageRequestParams(config, allEnabled, 'edit')
    ).not.toHaveProperty('style')
  })

  test('disabled parameters are not sent', () => {
    const config = configFor({ model: 'flux-1.1-pro', n: 2 })

    expect(
      resolveImageRequestParams(
        config,
        DEFAULT_IMAGE_PARAMETER_ENABLED,
        'generate'
      )
    ).toEqual({ size: '1024x1024', n: 2, response_format: 'b64_json' })
  })

  test('a custom size is sent normalized, and left out while it is invalid', () => {
    const enabled = { ...DEFAULT_IMAGE_PARAMETER_ENABLED, n: false }
    const valid = configFor({
      model: 'flux-1.1-pro',
      size: 'custom',
      customSize: '1280 × 720',
    })
    const invalid = { ...valid, customSize: '1280' }

    expect(resolveImageRequestParams(valid, enabled, 'generate').size).toBe(
      '1280x720'
    )
    expect(
      resolveImageRequestParams(invalid, enabled, 'generate')
    ).not.toHaveProperty('size')
  })
})
