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
import { z } from 'zod'

import { useAuthStore } from '@/stores/auth-store'

import { STORAGE_KEYS, STORAGE_VERSION } from '../../constants'
import type { ImageParameterEnabled, ImagePlaygroundConfig } from '../../types'

// Every field falls back on its own: one stale value (for example an option a
// later version removed) is dropped without discarding the rest.
const configSchema = z.object({
  model: z.string().optional().catch(undefined),
  group: z.string().optional().catch(undefined),
  mode: z.enum(['generate', 'edit']).optional().catch(undefined),
  showAllModels: z.boolean().optional().catch(undefined),
  size: z.string().optional().catch(undefined),
  customSize: z.string().optional().catch(undefined),
  quality: z
    .enum(['auto', 'low', 'medium', 'high', 'standard', 'hd'])
    .optional()
    .catch(undefined),
  n: z.number().int().positive().optional().catch(undefined),
  response_format: z.enum(['b64_json', 'url']).optional().catch(undefined),
  output_format: z.enum(['png', 'jpeg', 'webp']).optional().catch(undefined),
  background: z
    .enum(['auto', 'transparent', 'opaque'])
    .optional()
    .catch(undefined),
  style: z.enum(['vivid', 'natural']).optional().catch(undefined),
})

const parameterEnabledSchema = z.object({
  size: z.boolean().optional().catch(undefined),
  quality: z.boolean().optional().catch(undefined),
  n: z.boolean().optional().catch(undefined),
  response_format: z.boolean().optional().catch(undefined),
  output_format: z.boolean().optional().catch(undefined),
  background: z.boolean().optional().catch(undefined),
  style: z.boolean().optional().catch(undefined),
})

/** Settings belong to the signed-in account; nothing is kept when signed out. */
function userStorageKey(baseKey: string): string | null {
  const userId = useAuthStore.getState().auth.user?.id
  return userId == null ? null : `${baseKey}:${userId}`
}

function readStored<T extends object>(
  baseKey: string,
  schema: z.ZodType<T>
): Partial<T> {
  const key = userStorageKey(baseKey)
  if (!key) return {}
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return {}
    const envelope = JSON.parse(saved) as { version?: unknown; data?: unknown }
    if (envelope.version !== STORAGE_VERSION) return {}
    const parsed = schema.safeParse(envelope.data)
    if (!parsed.success) return {}
    return Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined)
    ) as Partial<T>
  } catch {
    return {}
  }
}

function writeStored(baseKey: string, data: object): void {
  const key = userStorageKey(baseKey)
  if (!key) return
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ version: STORAGE_VERSION, data })
    )
  } catch {
    // Storage full or blocked: settings stay in memory for this visit.
  }
}

export function loadImageConfig(): Partial<ImagePlaygroundConfig> {
  return readStored(STORAGE_KEYS.CONFIG, configSchema)
}

export function saveImageConfig(config: ImagePlaygroundConfig): void {
  writeStored(STORAGE_KEYS.CONFIG, config)
}

export function loadImageParameterEnabled(): Partial<ImageParameterEnabled> {
  return readStored(STORAGE_KEYS.PARAMETER_ENABLED, parameterEnabledSchema)
}

export function saveImageParameterEnabled(
  enabled: ImageParameterEnabled
): void {
  writeStored(STORAGE_KEYS.PARAMETER_ENABLED, enabled)
}
