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
import { afterEach, describe, expect, test } from 'vitest'

import { ParameterPanelShell } from '../parameter-panel-shell'

const originalInnerWidth = window.innerWidth

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
}

function renderShell(options: { disabled?: boolean } = {}) {
  return render(
    <ParameterPanelShell activeCount={3} disabled={options.disabled}>
      {(compact) => <p>{compact ? 'compact controls' : 'full controls'}</p>}
    </ParameterPanelShell>
  )
}

afterEach(() => {
  setViewportWidth(originalInnerWidth)
})

describe('ParameterPanelShell', () => {
  test('desktop trigger shows the enabled count and opens the full layout in a popover', async () => {
    setViewportWidth(1280)
    const user = userEvent.setup()
    renderShell()

    const trigger = screen.getByRole('button', { name: 'Parameters' })
    expect(trigger).toHaveTextContent('3')
    await user.click(trigger)

    expect(await screen.findByText('full controls')).toBeInTheDocument()
    expect(
      screen.getByText('Only enabled parameters are sent with the request.')
    ).toBeInTheDocument()
  })

  test('mobile trigger opens the compact layout in a titled bottom sheet', async () => {
    setViewportWidth(500)
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('button', { name: 'Parameters' }))

    expect(
      await screen.findByRole('dialog', { name: 'Parameter settings' })
    ).toBeInTheDocument()
    expect(screen.getByText('compact controls')).toBeInTheDocument()
  })

  test('disabled trigger does not open the panel', async () => {
    setViewportWidth(1280)
    const user = userEvent.setup()
    renderShell({ disabled: true })

    const trigger = screen.getByRole('button', { name: 'Parameters' })
    expect(trigger).toBeDisabled()
    await user.click(trigger)

    expect(screen.queryByText('full controls')).not.toBeInTheDocument()
  })
})
