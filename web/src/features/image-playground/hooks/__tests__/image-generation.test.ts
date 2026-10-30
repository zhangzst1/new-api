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
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosResponse,
} from 'axios'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { editImages, generateImages } from '@/features/image-playground/api'
import { useImageHistoryStore } from '@/stores/image-playground-history-store'

import type { ImageRequestSnapshot } from '../../types'
import { useImageGeneration } from '../use-image-generation'

vi.mock('@/features/image-playground/api', () => ({
  generateImages: vi.fn(),
  editImages: vi.fn(),
}))

const generateRequest: ImageRequestSnapshot = {
  mode: 'generate',
  model: 'gpt-image-1',
  group: 'default',
  prompt: 'a lighthouse at dusk',
  params: { n: 2 },
}

function pngResponse(count: number) {
  return {
    data: Array.from({ length: count }, () => ({ b64_json: 'iVBORw0KGgo=' })),
  }
}

function batches() {
  return useImageHistoryStore.getState().batches
}

beforeEach(async () => {
  useImageHistoryStore.setState({
    userId: null,
    batches: [],
    activeRequest: null,
    loading: false,
  })
  await useImageHistoryStore.getState().loadHistory(1)
})

describe('useImageGeneration', () => {
  test('a generation shows as pending, then completes with the returned images', async () => {
    let respond: (value: unknown) => void = () => undefined
    vi.mocked(generateImages).mockReturnValue(
      new Promise((resolve) => {
        respond = resolve
      })
    )
    const { result } = renderHook(() => useImageGeneration())

    act(() => {
      result.current.generate({
        request: generateRequest,
        images: [],
        mask: null,
      })
    })

    expect(result.current.isGenerating).toBe(true)
    expect(batches()[0]).toMatchObject({
      status: 'pending',
      request: generateRequest,
    })
    expect(vi.mocked(generateImages).mock.calls[0][0]).toEqual({
      model: 'gpt-image-1',
      group: 'default',
      prompt: 'a lighthouse at dusk',
      n: 2,
    })

    await act(async () => respond(pngResponse(2)))

    await waitFor(() => expect(batches()[0].status).toBe('complete'))
    expect(batches()[0].results).toHaveLength(2)
    expect(result.current.isGenerating).toBe(false)
  })

  test('a rejected request ends as an error with the server reason', async () => {
    const config = { headers: new AxiosHeaders() }
    const response: AxiosResponse = {
      status: 403,
      statusText: '',
      headers: {},
      config,
      data: {
        error: {
          message: 'Insufficient quota',
          code: 'insufficient_user_quota',
        },
      },
    }
    vi.mocked(generateImages).mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, {}, response)
    )
    const { result } = renderHook(() => useImageGeneration())

    act(() => {
      result.current.generate({
        request: generateRequest,
        images: [],
        mask: null,
      })
    })

    await waitFor(() => expect(batches()[0].status).toBe('error'))
    expect(batches()[0].error).toEqual({
      kind: 'forbidden',
      status: 403,
      code: 'insufficient_user_quota',
      message: 'Insufficient quota',
    })
  })

  test('a response without images ends as an error', async () => {
    vi.mocked(generateImages).mockResolvedValue({ data: [] })
    const { result } = renderHook(() => useImageGeneration())

    act(() => {
      result.current.generate({
        request: generateRequest,
        images: [],
        mask: null,
      })
    })

    await waitFor(() => expect(batches()[0].error).toEqual({ kind: 'empty' }))
  })

  test('stopping a running generation cancels its batch and frees the composer', async () => {
    vi.mocked(generateImages).mockImplementation(
      (_payload, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new CanceledError()))
        })
    )
    const { result } = renderHook(() => useImageGeneration())
    act(() => {
      result.current.generate({
        request: generateRequest,
        images: [],
        mask: null,
      })
    })

    act(() => result.current.stop())

    expect(result.current.isGenerating).toBe(false)
    await waitFor(() => expect(batches()[0].status).toBe('cancelled'))
  })

  test('a second generation is ignored while one is running', () => {
    vi.mocked(generateImages).mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useImageGeneration())

    act(() => {
      result.current.generate({
        request: generateRequest,
        images: [],
        mask: null,
      })
      result.current.generate({
        request: generateRequest,
        images: [],
        mask: null,
      })
    })

    expect(generateImages).toHaveBeenCalledTimes(1)
    expect(batches()).toHaveLength(1)
  })

  test('an edit is retried with the same reference images', async () => {
    vi.mocked(editImages).mockResolvedValue(pngResponse(1))
    const image = new File([new Uint8Array([1])], 'cat.png', {
      type: 'image/png',
    })
    const { result } = renderHook(() => useImageGeneration())
    act(() => {
      result.current.generate({
        request: { ...generateRequest, mode: 'edit' },
        images: [image],
        mask: null,
      })
    })
    await waitFor(() => expect(batches()[0].status).toBe('complete'))

    act(() => result.current.retry(batches()[0]))

    await waitFor(() => expect(editImages).toHaveBeenCalledTimes(2))
    const form = vi.mocked(editImages).mock.calls[1][0]
    expect((form.get('image') as File).name).toBe('cat.png')
  })
})
