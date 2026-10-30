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
import { useEffect } from 'react'

import { useAuthStore } from '@/stores/auth-store'
import { useImageHistoryStore } from '@/stores/image-playground-history-store'

/** The signed-in account's generation history, loaded on first use. */
export function useImageHistory() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const batches = useImageHistoryStore((state) => state.batches)
  const loading = useImageHistoryStore((state) => state.loading)
  const persistent = useImageHistoryStore((state) => state.persistent)
  const removeBatch = useImageHistoryStore((state) => state.removeBatch)
  const clearHistory = useImageHistoryStore((state) => state.clearHistory)

  useEffect(() => {
    void useImageHistoryStore.getState().loadHistory(userId)
  }, [userId])

  return { batches, loading, persistent, removeBatch, clearHistory }
}
