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

import { HISTORY_LIMITS } from '@/features/image-playground/constants'
import {
  cancelBatch,
  completeBatch,
  createPendingBatch,
} from '@/features/image-playground/lib/result/batch'
import {
  createMemoryHistoryAdapter,
  type ImageHistoryAdapter,
} from '@/features/image-playground/lib/storage/history-db'
import type { ImageBatch } from '@/features/image-playground/types'

import { createImageHistoryStore } from '../image-playground-history-store'

function pending(userId: number, createdAt: number): ImageBatch {
  return createPendingBatch({
    userId,
    request: {
      mode: 'generate',
      model: 'gpt-image-1',
      group: 'default',
      prompt: `prompt ${createdAt}`,
      params: {},
    },
    referenceCount: 0,
    hasMask: false,
    now: createdAt,
  })
}

function quotaError() {
  return new DOMException('Storage is full', 'QuotaExceededError')
}

describe('image history store', () => {
  test('loading an account restores its batches newest first and marks unfinished ones interrupted', async () => {
    const adapter = createMemoryHistoryAdapter()
    const older = completeBatch(pending(1, 100), [], 150)
    const unfinished = pending(1, 200)
    await adapter.put(older)
    await adapter.put(unfinished)
    const store = createImageHistoryStore(adapter)

    await store.getState().loadHistory(1)

    expect(
      store.getState().batches.map((batch) => [batch.id, batch.status])
    ).toEqual([
      [unfinished.id, 'interrupted'],
      [older.id, 'complete'],
    ])
    expect(store.getState().loading).toBe(false)
  })

  test('switching accounts shows only that account’s history and stops its running request', async () => {
    const adapter = createMemoryHistoryAdapter()
    const store = createImageHistoryStore(adapter)
    await store.getState().loadHistory(1)
    const running = pending(1, 100)
    const controller = new AbortController()
    await store.getState().addBatch(running)
    store.getState().beginRequest(running.id, controller)

    await store.getState().loadHistory(2)

    expect(controller.signal.aborted).toBe(true)
    expect(store.getState().activeRequest).toBeNull()
    expect(store.getState().batches).toEqual([])

    await store.getState().loadHistory(1)
    expect(store.getState().batches.map((batch) => batch.id)).toEqual([
      running.id,
    ])
  })

  test('a batch removed while it runs is not stored again when it finishes', async () => {
    const adapter = createMemoryHistoryAdapter()
    const store = createImageHistoryStore(adapter)
    await store.getState().loadHistory(1)
    const running = pending(1, 100)
    const controller = new AbortController()
    await store.getState().addBatch(running)
    store.getState().beginRequest(running.id, controller)

    await store.getState().removeBatch(running.id)
    await store.getState().saveBatch(cancelBatch(running, 120))

    expect(controller.signal.aborted).toBe(true)
    expect(store.getState().batches).toEqual([])
    expect(await adapter.list(1)).toEqual([])
  })

  test('a batch finished after the account changed is stored for its own account only', async () => {
    const adapter = createMemoryHistoryAdapter()
    const store = createImageHistoryStore(adapter)
    await store.getState().loadHistory(1)
    const running = pending(1, 100)
    await store.getState().addBatch(running)

    await store.getState().loadHistory(2)
    await store.getState().saveBatch(cancelBatch(running, 120))

    expect(store.getState().batches).toEqual([])
    expect((await adapter.list(1)).map((batch) => batch.status)).toEqual([
      'cancelled',
    ])
  })

  test('adding beyond the history limit evicts the oldest batch everywhere', async () => {
    const adapter = createMemoryHistoryAdapter()
    const store = createImageHistoryStore(adapter)
    await store.getState().loadHistory(1)
    const batches = Array.from(
      { length: HISTORY_LIMITS.maxBatches + 1 },
      (_, index) => pending(1, index + 1)
    )

    for (const batch of batches) {
      await store.getState().addBatch(batch)
    }

    const kept = store.getState().batches.map((batch) => batch.id)
    expect(kept).toHaveLength(HISTORY_LIMITS.maxBatches)
    expect(kept).not.toContain(batches[0].id)
    expect((await adapter.list(1)).map((batch) => batch.id)).not.toContain(
      batches[0].id
    )
  })

  test('when storage is full the oldest batch is dropped and the save is retried', async () => {
    const memory = createMemoryHistoryAdapter()
    let failures = 1
    const adapter: ImageHistoryAdapter = {
      ...memory,
      put: async (batch) => {
        if (failures-- > 0) throw quotaError()
        await memory.put(batch)
      },
    }
    const oldest = pending(1, 100)
    await memory.put(oldest)
    const store = createImageHistoryStore(adapter)
    await store.getState().loadHistory(1)
    const newest = pending(1, 200)

    await store.getState().addBatch(newest)

    expect(store.getState().batches.map((batch) => batch.id)).toEqual([
      newest.id,
    ])
    expect((await memory.list(1)).map((batch) => batch.id)).toEqual([newest.id])
    expect(store.getState().persistent).toBe(true)
  })

  test('when storage keeps failing the history stays in memory only', async () => {
    const memory = createMemoryHistoryAdapter()
    const adapter: ImageHistoryAdapter = {
      ...memory,
      put: async () => {
        throw new Error('database closed')
      },
    }
    const store = createImageHistoryStore(adapter)
    await store.getState().loadHistory(1)
    const batch = pending(1, 100)

    await store.getState().addBatch(batch)

    expect(store.getState().persistent).toBe(false)
    expect(store.getState().batches.map((item) => item.id)).toEqual([batch.id])
  })
})
