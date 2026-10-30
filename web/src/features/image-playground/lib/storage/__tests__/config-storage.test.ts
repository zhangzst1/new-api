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
import { afterEach, beforeEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import {
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_IMAGE_PARAMETER_ENABLED,
  STORAGE_KEYS,
} from '../../../constants'
import {
  loadImageConfig,
  loadImageParameterEnabled,
  saveImageConfig,
  saveImageParameterEnabled,
} from '../config-storage'

function signIn(id: number) {
  useAuthStore.getState().auth.setUser({ id, username: `user-${id}`, role: 1 })
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

afterEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

test('each account keeps its own settings', () => {
  signIn(1)
  saveImageConfig({ ...DEFAULT_IMAGE_CONFIG, model: 'gpt-image-1' })
  saveImageParameterEnabled({ ...DEFAULT_IMAGE_PARAMETER_ENABLED, style: true })

  useAuthStore.getState().auth.reset()
  signIn(2)
  expect(loadImageConfig()).toEqual({})
  expect(loadImageParameterEnabled()).toEqual({})

  signIn(1)
  expect(loadImageConfig().model).toBe('gpt-image-1')
  expect(loadImageParameterEnabled().style).toBe(true)
})

test('a stale stored value is dropped while the other settings are kept', () => {
  signIn(1)
  localStorage.setItem(
    `${STORAGE_KEYS.CONFIG}:1`,
    JSON.stringify({
      version: 1,
      data: { model: 'dall-e-3', quality: 'ultra', n: 3 },
    })
  )

  expect(loadImageConfig()).toEqual({ model: 'dall-e-3', n: 3 })
})

test('settings saved by another storage version are ignored', () => {
  signIn(1)
  localStorage.setItem(
    `${STORAGE_KEYS.CONFIG}:1`,
    JSON.stringify({ version: 99, data: { model: 'dall-e-3' } })
  )

  expect(loadImageConfig()).toEqual({})
})

test('nothing is stored while signed out', () => {
  saveImageConfig({ ...DEFAULT_IMAGE_CONFIG, model: 'gpt-image-1' })

  expect(loadImageConfig()).toEqual({})
  expect(localStorage.length).toBe(0)
})
