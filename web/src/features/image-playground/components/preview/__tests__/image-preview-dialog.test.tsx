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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { ImageBatch, ImageResult } from '../../../types'
import { ImagePreviewDialog } from '../image-preview-dialog'

const createdAt = new Date(2026, 9, 30, 9, 15, 0).getTime()

function batchWith(results: ImageResult[]): ImageBatch {
  return {
    id: 'batch-1',
    userId: 1,
    request: {
      mode: 'generate',
      model: 'gpt-image-1',
      group: 'default',
      prompt: 'a lighthouse at dusk',
      params: {},
    },
    referenceCount: 0,
    hasMask: false,
    status: 'complete',
    createdAt,
    completedAt: createdAt + 1000,
    results,
  }
}

const linkResults: ImageResult[] = [
  { id: 'r1', url: 'https://cdn.example.com/1.png', mediaType: 'image/png' },
  { id: 'r2', url: 'https://cdn.example.com/2.png', mediaType: 'image/png' },
]

function PreviewHarness(props: {
  batch: ImageBatch
  onUseAsReference?: (
    batch: ImageBatch,
    result: ImageResult,
    index: number
  ) => void
}) {
  const [index, setIndex] = useState(0)
  return (
    <ImagePreviewDialog
      batch={props.batch}
      index={index}
      onClose={() => undefined}
      onIndexChange={setIndex}
      onUseAsReference={props.onUseAsReference ?? (() => undefined)}
    />
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ImagePreviewDialog', () => {
  test('arrow keys move between the images and stop at the last one', async () => {
    const user = userEvent.setup()
    render(<PreviewHarness batch={batchWith(linkResults)} />)
    expect(
      await screen.findByRole('dialog', { name: 'Image 1 of 2' })
    ).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('dialog', { name: 'Image 2 of 2' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeEnabled()
  })

  test('a base64 image downloads under a name made of the model and request time', async () => {
    render(
      <PreviewHarness
        batch={batchWith([
          { id: 'r1', blob: new Blob(['png']), mediaType: 'image/png' },
        ])}
      />
    )

    const download = await screen.findByRole('button', { name: 'Download' })

    expect(download).toHaveAttribute('href', 'blob:preview')
    expect(download).toHaveAttribute(
      'download',
      'image-gpt-image-1-20261030-091500-1.png'
    )
    expect(screen.queryByRole('button', { name: 'Open original' })).toBeNull()
  })

  test('a link result opens its original in a new tab instead of downloading', async () => {
    render(<PreviewHarness batch={batchWith(linkResults)} />)

    const original = await screen.findByRole('button', {
      name: 'Open original',
    })

    expect(original).toHaveAttribute('href', 'https://cdn.example.com/1.png')
    expect(original).toHaveAttribute('target', '_blank')
    expect(original).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull()
  })

  test('Use as reference hands over the image being shown', async () => {
    const user = userEvent.setup()
    const onUseAsReference = vi.fn()
    const batch = batchWith(linkResults)
    render(<PreviewHarness batch={batch} onUseAsReference={onUseAsReference} />)
    await screen.findByRole('dialog', { name: 'Image 1 of 2' })
    await user.keyboard('{ArrowRight}')

    await user.click(screen.getByRole('button', { name: 'Use as reference' }))

    expect(onUseAsReference).toHaveBeenCalledWith(batch, linkResults[1], 1)
  })

  test('on closing, focus goes to the element finalFocus returns', async () => {
    const user = userEvent.setup()
    function ComposerHarness() {
      const [open, setOpen] = useState(true)
      const promptRef = useRef<HTMLTextAreaElement>(null)
      return (
        <>
          <textarea aria-label='Prompt' ref={promptRef} />
          <ImagePreviewDialog
            batch={open ? batchWith(linkResults) : null}
            finalFocus={() => promptRef.current ?? true}
            index={0}
            onClose={() => setOpen(false)}
            onIndexChange={() => undefined}
            onUseAsReference={() => setOpen(false)}
          />
        </>
      )
    }
    render(<ComposerHarness />)
    await screen.findByRole('dialog', { name: 'Image 1 of 2' })

    await user.click(screen.getByRole('button', { name: 'Use as reference' }))

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveFocus()
    )
  })
})
