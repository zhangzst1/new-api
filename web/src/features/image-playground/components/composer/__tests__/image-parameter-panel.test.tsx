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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import {
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_IMAGE_PARAMETER_ENABLED,
} from '../../../constants'
import { ImageParameterPanel } from '../image-parameter-panel'

const originalInnerWidth = window.innerWidth

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
  })
})

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  })
})

describe('ImageParameterPanel', () => {
  test('every control is named by its visible label', async () => {
    const user = userEvent.setup()
    // A model of no known family shows every parameter.
    render(
      <ImageParameterPanel
        config={{ ...DEFAULT_IMAGE_CONFIG, model: 'flux-dev' }}
        onConfigChange={() => undefined}
        onParameterEnabledChange={() => undefined}
        parameterEnabled={DEFAULT_IMAGE_PARAMETER_ENABLED}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Parameters' }))

    expect(
      await screen.findByRole('combobox', { name: 'Size' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'Quality' })
    ).toBeInTheDocument()
    // Base UI keeps the thumb hidden until it can measure it, which jsdom never
    // allows, and a hidden element has no accessible name; so check that the
    // slider refers to its label instead.
    expect(screen.getByRole('slider', { hidden: true })).toHaveAttribute(
      'aria-labelledby',
      screen.getByText('Image count').id
    )
    for (const name of [
      'Response format',
      'Output format',
      'Image background',
      'Style',
    ]) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument()
    }
  })
})
