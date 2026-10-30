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
import 'fake-indexeddb/auto'
import { Blob as NodeBlob } from 'node:buffer'

import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, test } from 'vitest'

import type { ImageBatch } from '../../../types'
import {
  createIndexedDbHistoryAdapter,
  type ImageHistoryAdapter,
} from '../history-db'

function batch(id: string, userId: number, createdAt: number): ImageBatch {
  return {
    id,
    userId,
    request: {
      mode: 'generate',
      model: 'dall-e-3',
      group: 'default',
      prompt: `prompt ${id}`,
      params: { response_format: 'url' },
    },
    referenceCount: 0,
    hasMask: false,
    status: 'complete',
    createdAt,
    completedAt: createdAt + 1,
    results: [
      {
        id: `${id}-1`,
        url: `https://cdn.example.com/${id}.png`,
        mediaType: 'image/png',
      },
    ],
  }
}

let adapter: ImageHistoryAdapter

beforeEach(() => {
  // A fresh database per test.
  adapter = createIndexedDbHistoryAdapter(new IDBFactory())
})

describe('IndexedDB image history', () => {
  test('lists only the account’s batches, newest first', async () => {
    await adapter.put(batch('old', 1, 100))
    await adapter.put(batch('new', 1, 300))
    await adapter.put(batch('other-account', 2, 200))

    const batches = await adapter.list(1)

    expect(batches.map((item) => item.id)).toEqual(['new', 'old'])
    expect(batches[0]).toEqual(batch('new', 1, 300))
  })

  test('image Blobs are stored with their type and bytes', async () => {
    // fake-indexeddb clones with Node's structuredClone, which clones Node's
    // Blob the way a browser's IndexedDB clones a DOM Blob (jsdom's Blob is
    // not cloneable there).
    const image = new NodeBlob([new Uint8Array([137, 80, 78, 71])], {
      type: 'image/png',
    }) as unknown as Blob
    await adapter.put({
      ...batch('blob', 1, 100),
      results: [{ id: 'blob-1', blob: image, mediaType: 'image/png' }],
    })

    const [stored] = await adapter.list(1)
    const blob = stored.results[0].blob
    const bytes = await blob?.arrayBuffer()

    expect(blob?.type).toBe('image/png')
    expect([...new Uint8Array(bytes ?? new ArrayBuffer(0))]).toEqual([
      137, 80, 78, 71,
    ])
  })

  test('putting a batch again replaces the stored record', async () => {
    await adapter.put({ ...batch('a', 1, 100), status: 'pending', results: [] })
    await adapter.put(batch('a', 1, 100))

    const [stored] = await adapter.list(1)

    expect(stored.status).toBe('complete')
    expect(stored.results).toHaveLength(1)
  })

  test('removing batches deletes only the listed ones', async () => {
    await adapter.put(batch('a', 1, 100))
    await adapter.put(batch('b', 1, 200))
    await adapter.put(batch('c', 1, 300))

    await adapter.remove(['a', 'c'])

    expect((await adapter.list(1)).map((item) => item.id)).toEqual(['b'])
  })

  test('clearing an account leaves other accounts untouched', async () => {
    await adapter.put(batch('a', 1, 100))
    await adapter.put(batch('b', 2, 200))

    await adapter.clear(1)

    expect(await adapter.list(1)).toEqual([])
    expect((await adapter.list(2)).map((item) => item.id)).toEqual(['b'])
  })
})
