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
import { create } from 'zustand'

import { HISTORY_LIMITS } from '@/features/image-playground/constants'
import {
  markInterruptedBatches,
  selectBatchesToEvict,
} from '@/features/image-playground/lib/result/batch'
import {
  createIndexedDbHistoryAdapter,
  createMemoryHistoryAdapter,
  type ImageHistoryAdapter,
} from '@/features/image-playground/lib/storage/history-db'
import type { ImageBatch } from '@/features/image-playground/types'
import { useAuthStore } from '@/stores/auth-store'

type ActiveRequest = {
  batchId: string
  controller: AbortController
}

export type ImageHistoryState = {
  /** Account whose history is in memory; null until the page loads one. */
  userId: number | null
  /** Newest first. */
  batches: ImageBatch[]
  loading: boolean
  /** False when this browser cannot keep the history between visits. */
  persistent: boolean
  /** The generation running now; it survives leaving the page. */
  activeRequest: ActiveRequest | null
  loadHistory: (userId: number | null) => Promise<void>
  // Writes update memory at once; the promise settles once storage has them.
  addBatch: (batch: ImageBatch) => Promise<void>
  saveBatch: (batch: ImageBatch) => Promise<void>
  removeBatch: (batchId: string) => Promise<void>
  clearHistory: () => Promise<void>
  beginRequest: (batchId: string, controller: AbortController) => void
  endRequest: (batchId: string) => void
  stopRequest: () => void
}

export function createImageHistoryStore(
  adapter: ImageHistoryAdapter,
  persistent = true
) {
  return create<ImageHistoryState>()((set, get) => {
    // Keeps the newest batches within HISTORY_LIMITS in memory and storage.
    const applyBatches = async (batches: ImageBatch[]) => {
      const evicted = selectBatchesToEvict(batches, HISTORY_LIMITS)
      if (evicted.length === 0) {
        set({ batches })
        return
      }
      set({ batches: batches.filter((batch) => !evicted.includes(batch.id)) })
      if (get().persistent) await adapter.remove(evicted).catch(() => undefined)
    }

    const persist = async (batch: ImageBatch) => {
      if (!get().persistent) return
      try {
        await adapter.put(batch)
        return
      } catch (error) {
        // Storage is full: give up the oldest batch once and try again.
        const oldest = get().batches.at(-1)
        const canEvict =
          (error as { name?: unknown } | null)?.name === 'QuotaExceededError' &&
          batch.userId === get().userId &&
          oldest !== undefined &&
          oldest.id !== batch.id
        if (canEvict) {
          set((state) => ({
            batches: state.batches.filter((item) => item.id !== oldest.id),
          }))
          try {
            await adapter.remove([oldest.id])
            await adapter.put(batch)
            return
          } catch {
            // Fall through: keep the history in memory only.
          }
        }
        set({ persistent: false })
      }
    }

    return {
      userId: null,
      batches: [],
      loading: false,
      persistent,
      activeRequest: null,

      loadHistory: async (userId) => {
        const current = get()
        if (current.userId === userId) return
        // A request still running belongs to the previous account.
        current.activeRequest?.controller.abort()
        set({
          userId,
          batches: [],
          loading: userId !== null,
          activeRequest: null,
        })
        if (userId === null) return
        try {
          const stored = await adapter.list(userId)
          if (get().userId !== userId) return
          set((state) => {
            const known = new Set(state.batches.map((batch) => batch.id))
            const restored = markInterruptedBatches(
              stored.filter((batch) => !known.has(batch.id)),
              state.activeRequest?.batchId ?? null
            )
            return {
              batches: [...state.batches, ...restored].sort(
                (a, b) => b.createdAt - a.createdAt
              ),
              loading: false,
            }
          })
        } catch {
          if (get().userId === userId) {
            set({ loading: false, persistent: false })
          }
        }
      },

      addBatch: async (batch) => {
        if (batch.userId !== get().userId) return
        await Promise.all([
          applyBatches([batch, ...get().batches]),
          persist(batch),
        ])
      },

      saveBatch: async (batch) => {
        const state = get()
        if (batch.userId !== state.userId) {
          // A batch of a previous account is still stored for that account.
          await persist(batch)
          return
        }
        // A batch the user removed while it ran stays removed.
        if (!state.batches.some((item) => item.id === batch.id)) return
        await Promise.all([
          applyBatches(
            state.batches.map((item) => (item.id === batch.id ? batch : item))
          ),
          persist(batch),
        ])
      },

      removeBatch: async (batchId) => {
        const state = get()
        if (state.activeRequest?.batchId === batchId) {
          state.activeRequest.controller.abort()
          set({ activeRequest: null })
        }
        set({ batches: state.batches.filter((batch) => batch.id !== batchId) })
        if (state.persistent) {
          await adapter.remove([batchId]).catch(() => undefined)
        }
      },

      clearHistory: async () => {
        const state = get()
        state.activeRequest?.controller.abort()
        set({ batches: [], activeRequest: null })
        if (state.userId === null || !state.persistent) return
        await adapter.clear(state.userId).catch(() => undefined)
      },

      beginRequest: (batchId, controller) => {
        set({ activeRequest: { batchId, controller } })
      },

      endRequest: (batchId) => {
        if (get().activeRequest?.batchId === batchId) {
          set({ activeRequest: null })
        }
      },

      stopRequest: () => {
        const active = get().activeRequest
        if (!active) return
        active.controller.abort()
        set({ activeRequest: null })
      },
    }
  })
}

const indexedDbAvailable = typeof indexedDB !== 'undefined'

export const useImageHistoryStore = createImageHistoryStore(
  indexedDbAvailable
    ? createIndexedDbHistoryAdapter()
    : createMemoryHistoryAdapter(),
  indexedDbAvailable
)

// Signing out or switching accounts swaps the history kept in memory, once the
// page has loaded one; a request still running is stopped.
useAuthStore.subscribe((state, previous) => {
  const userId = state.auth.user?.id ?? null
  if (userId === (previous.auth.user?.id ?? null)) return
  const history = useImageHistoryStore.getState()
  if (history.userId !== null) void history.loadHistory(userId)
})
