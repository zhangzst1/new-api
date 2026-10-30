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

import type { ImageBatch } from '../../../types'
import {
  getImageFileName,
  getRequestedMediaType,
  normalizeImageResponse,
} from '../image-response'

// The 8-byte PNG signature, base64 encoded.
const PNG_BASE64 = 'iVBORw0KGgo='

describe('normalizeImageResponse', () => {
  test('base64 images become typed Blobs with their revised prompt', () => {
    const [result] = normalizeImageResponse(
      { data: [{ b64_json: PNG_BASE64, revised_prompt: 'a red fox' }] },
      'image/webp'
    )

    expect(result.blob?.size).toBe(8)
    expect(result.blob?.type).toBe('image/png')
    expect(result.mediaType).toBe('image/png')
    expect(result.revisedPrompt).toBe('a red fox')
    expect(result.url).toBeUndefined()
  })

  test('base64 without a known signature takes the requested output type', () => {
    const [result] = normalizeImageResponse(
      { data: [{ b64_json: 'AQID' }] },
      'image/webp'
    )

    expect(result.mediaType).toBe('image/webp')
  })

  test('an object-shaped data field is one image', () => {
    expect(
      normalizeImageResponse({ data: { b64_json: PNG_BASE64 } }, 'image/png')
    ).toHaveLength(1)
  })

  test('http URLs are kept as links typed by their extension', () => {
    const [result] = normalizeImageResponse(
      { data: [{ url: 'https://cdn.example.com/out/1.jpg?sig=x' }] },
      'image/png'
    )

    expect(result).toMatchObject({
      url: 'https://cdn.example.com/out/1.jpg?sig=x',
      mediaType: 'image/jpeg',
    })
    expect(result.blob).toBeUndefined()
  })

  test('entries without an image and non-http links are skipped', () => {
    const results = normalizeImageResponse(
      {
        data: [
          { revised_prompt: 'no image here' },
          { url: 'javascript:alert(1)' },
          { b64_json: '' },
          null,
        ],
      },
      'image/png'
    )

    expect(results).toEqual([])
  })

  test('a data URL declaring a non-image type is stored as an image type', () => {
    const [result] = normalizeImageResponse(
      { data: [{ url: `data:text/html;base64,${PNG_BASE64}` }] },
      'image/png'
    )

    expect(result.blob?.type).toBe('image/png')
  })

  test('responses without data produce no images', () => {
    expect(normalizeImageResponse({ created: 1 }, 'image/png')).toEqual([])
    expect(normalizeImageResponse('unexpected', 'image/png')).toEqual([])
  })
})

describe('getRequestedMediaType', () => {
  test.each([
    [{ output_format: 'jpeg' }, 'image/jpeg'],
    [{ output_format: 'webp' }, 'image/webp'],
    [{}, 'image/png'],
  ])('maps %j to %s', (params, mediaType) => {
    expect(getRequestedMediaType(params)).toBe(mediaType)
  })
})

describe('getImageFileName', () => {
  test('names the file after the model, request time and position', () => {
    const batch = {
      createdAt: new Date(2026, 9, 30, 9, 15, 0).getTime(),
      request: { model: 'org/gpt-image-1' },
    } as ImageBatch

    expect(getImageFileName(batch, 1, 'image/jpeg')).toBe(
      'image-org-gpt-image-1-20261030-091500-2.jpg'
    )
  })
})
