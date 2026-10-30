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
import type { ImageBatch } from '../../types'

/** Where generation history lives; one record per batch, keyed by batch id. */
export interface ImageHistoryAdapter {
  /** The user's batches, newest first. */
  list(userId: number): Promise<ImageBatch[]>
  put(batch: ImageBatch): Promise<void>
  remove(batchIds: readonly string[]): Promise<void>
  clear(userId: number): Promise<void>
}

const DATABASE_NAME = 'image-playground'
const DATABASE_VERSION = 1
const BATCH_STORE = 'batches'
const USER_CREATED_INDEX = 'by_user_created'

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve())
    // A failed request (for example QuotaExceededError) reports here first.
    transaction.addEventListener('error', (event) =>
      reject((event.target as IDBRequest | null)?.error ?? transaction.error)
    )
    transaction.addEventListener('abort', () =>
      reject(transaction.error ?? new DOMException('Aborted', 'AbortError'))
    )
  })
}

function userRange(userId: number): IDBKeyRange {
  return IDBKeyRange.bound([userId, -Infinity], [userId, Infinity])
}

/**
 * Stores batches, with their image Blobs, in IndexedDB. The database opens on
 * first use; an index on [userId, createdAt] keeps each account's history apart.
 */
export function createIndexedDbHistoryAdapter(
  factory: IDBFactory = indexedDB
): ImageHistoryAdapter {
  let database: Promise<IDBDatabase> | null = null

  const open = (): Promise<IDBDatabase> => {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(DATABASE_NAME, DATABASE_VERSION)
      request.addEventListener('upgradeneeded', () => {
        const store = request.result.createObjectStore(BATCH_STORE, {
          keyPath: 'id',
        })
        store.createIndex(USER_CREATED_INDEX, ['userId', 'createdAt'])
      })
      request.addEventListener('success', () => {
        const opened = request.result
        // Let a newer version of the page upgrade the schema.
        opened.addEventListener('versionchange', () => {
          opened.close()
          database = null
        })
        resolve(opened)
      })
      request.addEventListener('error', () => {
        database = null
        reject(request.error)
      })
    })
    return database
  }

  return {
    async list(userId) {
      const db = await open()
      const transaction = db.transaction(BATCH_STORE, 'readonly')
      const index = transaction
        .objectStore(BATCH_STORE)
        .index(USER_CREATED_INDEX)
      const batches = await requestResult(index.getAll(userRange(userId)))
      return (batches as ImageBatch[]).reverse()
    },
    async put(batch) {
      const db = await open()
      const transaction = db.transaction(BATCH_STORE, 'readwrite')
      transaction.objectStore(BATCH_STORE).put(batch)
      await transactionDone(transaction)
    },
    async remove(batchIds) {
      if (batchIds.length === 0) return
      const db = await open()
      const transaction = db.transaction(BATCH_STORE, 'readwrite')
      const store = transaction.objectStore(BATCH_STORE)
      for (const batchId of batchIds) {
        store.delete(batchId)
      }
      await transactionDone(transaction)
    },
    async clear(userId) {
      const db = await open()
      const transaction = db.transaction(BATCH_STORE, 'readwrite')
      const store = transaction.objectStore(BATCH_STORE)
      const keys = await requestResult(
        store.index(USER_CREATED_INDEX).getAllKeys(userRange(userId))
      )
      for (const key of keys) {
        store.delete(key)
      }
      await transactionDone(transaction)
    },
  }
}

/** Keeps history for this page only; used where IndexedDB is unavailable. */
export function createMemoryHistoryAdapter(): ImageHistoryAdapter {
  const batches = new Map<string, ImageBatch>()
  return {
    async list(userId) {
      return [...batches.values()]
        .filter((batch) => batch.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
    },
    async put(batch) {
      batches.set(batch.id, batch)
    },
    async remove(batchIds) {
      for (const batchId of batchIds) {
        batches.delete(batchId)
      }
    },
    async clear(userId) {
      for (const [batchId, batch] of batches) {
        if (batch.userId === userId) batches.delete(batchId)
      }
    },
  }
}
