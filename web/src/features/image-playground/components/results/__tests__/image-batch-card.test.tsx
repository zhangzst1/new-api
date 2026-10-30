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
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

import type { ImageBatch } from '../../../types'
import { ImageBatchCard } from '../image-batch-card'

function batchWith(overrides: Partial<ImageBatch>): ImageBatch {
  return {
    id: 'batch-1',
    userId: 1,
    request: {
      mode: 'generate',
      model: 'dall-e-3',
      group: 'default',
      prompt: 'a lighthouse at dusk',
      params: { size: '1024x1024', n: 3 },
    },
    referenceCount: 0,
    hasMask: false,
    status: 'complete',
    createdAt: Date.now(),
    results: [],
    ...overrides,
  }
}

function renderCard(
  batch: ImageBatch,
  options: { isActive?: boolean; canRetry?: boolean } = {}
) {
  const handlers = {
    onOpenImage: vi.fn(),
    onRetry: vi.fn(),
    onReusePrompt: vi.fn(),
    onRemove: vi.fn(),
    onStop: vi.fn(),
  }
  render(
    <ImageBatchCard
      batch={batch}
      canRetry={options.canRetry ?? true}
      isActive={options.isActive ?? false}
      {...handlers}
    />
  )
  return handlers
}

describe('ImageBatchCard', () => {
  test('a running batch shows one placeholder per requested image and can be stopped', async () => {
    const user = userEvent.setup()
    const handlers = renderCard(batchWith({ status: 'pending' }), {
      isActive: true,
    })

    const status = screen.getByRole('status')
    expect(within(status).getAllByRole('listitem')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Stop' }))

    expect(handlers.onStop).toHaveBeenCalledTimes(1)
  })

  test('a failed batch shows the server reason and its error code', () => {
    renderCard(
      batchWith({
        status: 'error',
        error: {
          kind: 'forbidden',
          status: 403,
          code: 'insufficient_user_quota',
          message: 'Insufficient quota (request id: abc)',
        },
      })
    )

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText('Access denied')).toBeVisible()
    expect(
      within(alert).getByText('Insufficient quota (request id: abc)')
    ).toBeVisible()
    expect(
      within(alert).getByText('Error code: insufficient_user_quota')
    ).toBeVisible()
  })

  test('a batch cut off by closing the page points to the usage logs', () => {
    renderCard(batchWith({ status: 'interrupted' }))

    expect(screen.getByText('Generation interrupted')).toBeVisible()
  })

  test('each image opens the preview from the keyboard', async () => {
    const user = userEvent.setup()
    const handlers = renderCard(
      batchWith({
        results: [
          {
            id: 'r1',
            url: 'https://cdn.example.com/1.png',
            mediaType: 'image/png',
          },
          {
            id: 'r2',
            url: 'https://cdn.example.com/2.png',
            mediaType: 'image/png',
          },
        ],
      })
    )

    screen.getByRole('button', { name: 'Open image 2' }).focus()
    await user.keyboard('{Enter}')

    expect(handlers.onOpenImage).toHaveBeenCalledWith(1)
  })

  test('an image whose link expired shows a placeholder instead', () => {
    renderCard(
      batchWith({
        results: [
          {
            id: 'r1',
            url: 'https://cdn.example.com/1.png',
            mediaType: 'image/png',
          },
        ],
      })
    )

    fireEvent.error(screen.getByRole('img'))

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Image not available')).toBeVisible()
  })

  test('a batch that cannot be sent again has Generate again disabled', () => {
    renderCard(batchWith({ status: 'error', error: { kind: 'network' } }), {
      canRetry: false,
    })

    expect(
      screen.getByRole('button', { name: 'Generate again' })
    ).toBeDisabled()
  })
})
