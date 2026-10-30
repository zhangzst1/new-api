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
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_IMAGE_PARAMETER_ENABLED,
} from '../../../constants'
import type {
  ImagePlaygroundConfig,
  ImagePlaygroundMode,
  ModelOption,
} from '../../../types'
import { ImageComposer, type ImageComposerSubmission } from '../image-composer'

type HarnessProps = {
  mode?: ImagePlaygroundMode
  models?: ModelOption[]
  isGenerating?: boolean
  onSubmit?: (submission: ImageComposerSubmission) => void
  onStop?: () => void
}

function ComposerHarness(props: HarnessProps) {
  const [config, setConfig] = useState<ImagePlaygroundConfig>({
    ...DEFAULT_IMAGE_CONFIG,
    model: 'gpt-image-1',
    mode: props.mode ?? 'generate',
  })
  const [prompt, setPrompt] = useState('')
  return (
    <ImageComposer
      config={config}
      groups={[{ label: 'default', value: 'default', ratio: 1 }]}
      hasHistory={false}
      isGenerating={props.isGenerating ?? false}
      isModelLoading={false}
      models={props.models ?? [{ label: 'gpt-image-1', value: 'gpt-image-1' }]}
      onClearHistory={() => undefined}
      onConfigChange={(key, value) =>
        setConfig((current) => ({ ...current, [key]: value }))
      }
      onParameterEnabledChange={() => undefined}
      onPendingReferencesConsumed={() => undefined}
      onPromptChange={setPrompt}
      onStop={props.onStop ?? (() => undefined)}
      onSubmit={props.onSubmit ?? (() => undefined)}
      parameterEnabled={DEFAULT_IMAGE_PARAMETER_ENABLED}
      pendingReferences={null}
      prompt={prompt}
    />
  )
}

// The controls render the submit button once for small screens and once for
// wide ones; jsdom applies no CSS, so both are present.
const generateButtons = () =>
  screen.getAllByRole('button', { name: /^Generate/ })

function referenceImage() {
  return new File([new Uint8Array([1, 2, 3])], 'cat.png', { type: 'image/png' })
}

beforeEach(() => {
  // PromptInput previews attachments through object URLs and hands blob: URLs
  // to the submit handler as data URLs; jsdom has neither, so the stub returns
  // the data URL the composer receives in a browser.
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => 'data:image/png;base64,AQID'),
      revokeObjectURL: vi.fn(),
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ImageComposer', () => {
  test('Generate stays disabled until a prompt is typed', async () => {
    const user = userEvent.setup()
    render(<ComposerHarness />)

    for (const button of generateButtons()) expect(button).toBeDisabled()
    await user.type(
      screen.getByPlaceholderText('Describe the image you want'),
      'a red fox'
    )

    for (const button of generateButtons()) expect(button).toBeEnabled()
  })

  test('text to image submits the trimmed prompt without images', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ComposerHarness onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('Describe the image you want'),
      '  a red fox  '
    )
    await user.click(generateButtons()[0])

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        prompt: 'a red fox',
        images: [],
        mask: null,
      })
    )
  })

  test('editing without a reference image does not submit on Enter and keeps the prompt', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ComposerHarness mode='edit' onSubmit={onSubmit} />)
    const textarea = screen.getByPlaceholderText(
      'Describe how to change the reference images'
    )

    await user.type(textarea, 'add a hat{Enter}')

    expect(screen.getByText('Attach at least one image to edit')).toBeVisible()
    for (const button of generateButtons()) expect(button).toBeDisabled()
    expect(textarea).toHaveValue('add a hat')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('Enter does not submit while no model is available', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ComposerHarness models={[]} onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('Describe the image you want'),
      'a red fox{Enter}'
    )

    expect(
      screen.getByText('No image models available in this group')
    ).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('attaching a reference image switches to image edit and allows generating', async () => {
    const user = userEvent.setup()
    render(<ComposerHarness />)
    await user.type(
      screen.getByPlaceholderText('Describe the image you want'),
      'add a hat'
    )

    await user.upload(screen.getByLabelText('Upload files'), referenceImage())

    expect(screen.getByRole('tab', { name: /Image edit/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    for (const button of generateButtons()) expect(button).toBeEnabled()
  })

  test('an edit submits the attached reference image as a file', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ComposerHarness mode='edit' onSubmit={onSubmit} />)
    await user.upload(screen.getByLabelText('Upload files'), referenceImage())
    await user.type(
      screen.getByPlaceholderText(
        'Describe how to change the reference images'
      ),
      'add a hat'
    )

    await user.click(generateButtons()[0])

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const submission = onSubmit.mock.calls[0][0] as ImageComposerSubmission
    expect(submission.prompt).toBe('add a hat')
    expect(submission.images.map((image) => [image.name, image.type])).toEqual([
      ['cat.png', 'image/png'],
    ])
  })

  test('returning to text to image removes the reference images', async () => {
    const user = userEvent.setup()
    render(<ComposerHarness />)
    await user.upload(screen.getByLabelText('Upload files'), referenceImage())
    expect(screen.getByText('cat.png')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Text to image/ }))

    expect(screen.queryByText('cat.png')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Text to image/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  test('while generating, Stop replaces Generate', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    render(<ComposerHarness isGenerating onStop={onStop} />)

    expect(screen.queryAllByRole('button', { name: /^Generate/ })).toEqual([])
    await user.click(screen.getAllByRole('button', { name: /^Stop/ })[0])

    expect(onStop).toHaveBeenCalledTimes(1)
  })
})
