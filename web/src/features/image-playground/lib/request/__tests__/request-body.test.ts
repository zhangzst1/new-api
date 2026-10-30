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
import type { ImageRequestSnapshot } from '../../../types'
import { dataUrlToFile } from '../data-url'
import {
  buildImageEditFormData,
  buildImageGenerationPayload,
  createImageRequestSnapshot,
} from '../payload-builder'

const editRequest: ImageRequestSnapshot = {
  mode: 'edit',
  model: 'gpt-image-1',
  group: 'vip',
  prompt: 'add a red hat',
  params: { size: '1024x1024', n: 2 },
}

function imageFile(name: string) {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })
}

describe('createImageRequestSnapshot', () => {
  test('captures the mode, routing fields and the parameters sent now', () => {
    const snapshot = createImageRequestSnapshot(
      { ...DEFAULT_IMAGE_CONFIG, model: 'gpt-image-1', group: 'vip', n: 2 },
      DEFAULT_IMAGE_PARAMETER_ENABLED,
      'a lighthouse'
    )

    expect(snapshot).toEqual({
      mode: 'generate',
      model: 'gpt-image-1',
      group: 'vip',
      prompt: 'a lighthouse',
      params: { size: '1024x1024', n: 2 },
    })
  })
})

describe('buildImageGenerationPayload', () => {
  test('sends the parameters as top-level JSON fields', () => {
    expect(
      buildImageGenerationPayload({ ...editRequest, mode: 'generate' })
    ).toEqual({
      model: 'gpt-image-1',
      group: 'vip',
      prompt: 'add a red hat',
      size: '1024x1024',
      n: 2,
    })
  })
})

describe('buildImageEditFormData', () => {
  test('one reference image uses the image field, with the mask and parameters', () => {
    const form = buildImageEditFormData(
      editRequest,
      [imageFile('cat.png')],
      imageFile('mask.png')
    )

    expect(form.get('model')).toBe('gpt-image-1')
    expect(form.get('group')).toBe('vip')
    expect(form.get('prompt')).toBe('add a red hat')
    expect(form.get('size')).toBe('1024x1024')
    expect(form.get('n')).toBe('2')
    expect((form.get('image') as File).name).toBe('cat.png')
    expect((form.get('mask') as File).name).toBe('mask.png')
    expect(form.has('image[]')).toBe(false)
  })

  test('several reference images use the image[] field and no mask is sent without one', () => {
    const form = buildImageEditFormData(
      editRequest,
      [imageFile('a.png'), imageFile('b.png')],
      null
    )

    expect(form.getAll('image[]').map((value) => (value as File).name)).toEqual(
      ['a.png', 'b.png']
    )
    expect(form.has('image')).toBe(false)
    expect(form.has('mask')).toBe(false)
  })
})

describe('dataUrlToFile', () => {
  test('decodes a base64 data URL into a typed file', async () => {
    const file = dataUrlToFile('data:image/png;base64,AQID', 'reference.png')

    expect(file.name).toBe('reference.png')
    expect(file.type).toBe('image/png')
    expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([1, 2, 3])
  })

  test('rejects text that is not a data URL', () => {
    expect(() => dataUrlToFile('https://example.com/a.png', 'a.png')).toThrow(
      'Invalid data URL'
    )
  })
})
