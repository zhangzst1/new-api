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

import type { ImageBatch, ImageResult } from '../../../types'
import {
  cancelBatch,
  completeBatch,
  createPendingBatch,
  failBatch,
  getRequestedImageCount,
  markInterruptedBatches,
  selectBatchesToEvict,
} from '../batch'

function pendingBatch(createdAt: number, n?: number): ImageBatch {
  return createPendingBatch({
    userId: 1,
    request: {
      mode: 'generate',
      model: 'gpt-image-1',
      group: 'default',
      prompt: 'p',
      params: n === undefined ? {} : { n },
    },
    referenceCount: 0,
    hasMask: false,
    now: createdAt,
  })
}

function withImageBytes(batch: ImageBatch, size: number): ImageBatch {
  const result: ImageResult = {
    id: `${batch.id}-image`,
    blob: new Blob([new Uint8Array(size)]),
    mediaType: 'image/png',
  }
  return completeBatch(batch, [result], batch.createdAt + 1)
}

describe('batch transitions', () => {
  test('a new batch is pending with no results', () => {
    const batch = pendingBatch(100)

    expect(batch).toMatchObject({
      status: 'pending',
      createdAt: 100,
      results: [],
    })
  })

  test('finishing a batch keeps its identity and records when it ended', () => {
    const batch = pendingBatch(100)

    expect(completeBatch(batch, [], 250)).toMatchObject({
      id: batch.id,
      status: 'complete',
      completedAt: 250,
    })
    expect(failBatch(batch, { kind: 'network' }, 260)).toMatchObject({
      id: batch.id,
      status: 'error',
      error: { kind: 'network' },
      completedAt: 260,
    })
    expect(cancelBatch(batch, 270)).toMatchObject({
      id: batch.id,
      status: 'cancelled',
      completedAt: 270,
    })
  })

  test('the requested image count defaults to one when n was not sent', () => {
    expect(getRequestedImageCount(pendingBatch(1, 4))).toBe(4)
    expect(getRequestedImageCount(pendingBatch(1))).toBe(1)
  })
})

describe('markInterruptedBatches', () => {
  test('stored pending batches are interrupted unless they are still running', () => {
    const running = pendingBatch(3)
    const orphaned = pendingBatch(2)
    const finished = cancelBatch(pendingBatch(1), 5)

    const marked = markInterruptedBatches(
      [running, orphaned, finished],
      running.id
    )

    expect(marked.map((batch) => batch.status)).toEqual([
      'pending',
      'interrupted',
      'cancelled',
    ])
  })
})

describe('selectBatchesToEvict', () => {
  test('batches beyond the count limit are evicted, oldest first', () => {
    const batches = [
      pendingBatch(4),
      pendingBatch(3),
      pendingBatch(2),
      pendingBatch(1),
    ]

    expect(
      selectBatchesToEvict(batches, { maxBatches: 2, maxBytes: Infinity })
    ).toEqual([batches[2].id, batches[3].id])
  })

  test('older batches go once the image bytes exceed the budget', () => {
    const batches = [
      withImageBytes(pendingBatch(3), 60),
      withImageBytes(pendingBatch(2), 30),
      withImageBytes(pendingBatch(1), 30),
    ]

    expect(
      selectBatchesToEvict(batches, { maxBatches: 10, maxBytes: 100 })
    ).toEqual([batches[2].id])
  })

  test('the newest batch is kept even when it alone exceeds the budget', () => {
    const batches = [withImageBytes(pendingBatch(2), 500), pendingBatch(1)]

    expect(
      selectBatchesToEvict(batches, { maxBatches: 10, maxBytes: 100 })
    ).toEqual([batches[1].id])
  })
})
