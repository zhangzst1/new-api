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
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, test } from 'vitest'

import { parseImageRequestError } from '../request-error'

function httpError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  const response: AxiosResponse = {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  }
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    config,
    {},
    response
  )
}

describe('parseImageRequestError', () => {
  test('a relay error keeps the upstream message and code', () => {
    const error = httpError(400, {
      error: {
        message: 'Invalid size (request id: abc)',
        type: 'invalid_request_error',
        code: 'invalid_value',
      },
    })

    expect(parseImageRequestError(error)).toEqual({
      kind: 'failed',
      status: 400,
      code: 'invalid_value',
      message: 'Invalid size (request id: abc)',
    })
  })

  test('403 is reported as an access problem with the server reason', () => {
    const error = httpError(403, {
      error: { message: 'No permission to access this group', code: '' },
    })

    expect(parseImageRequestError(error)).toEqual({
      kind: 'forbidden',
      status: 403,
      code: undefined,
      message: 'No permission to access this group',
    })
  })

  test('429 is reported as rate limited', () => {
    expect(
      parseImageRequestError(
        httpError(429, { error: { message: 'Slow down' } })
      ).kind
    ).toBe('rate-limited')
  })

  test('a proxy 413 page adds no message to the too-large explanation', () => {
    const error = httpError(
      413,
      '<html><body>413 Request Entity Too Large</body></html>'
    )

    expect(parseImageRequestError(error)).toEqual({
      kind: 'too-large',
      status: 413,
    })
  })

  test('a console envelope error keeps its message', () => {
    const error = httpError(401, { success: false, message: 'Session expired' })

    expect(parseImageRequestError(error)).toMatchObject({
      kind: 'failed',
      status: 401,
      message: 'Session expired',
    })
  })

  test('a request without a response is a network failure', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(parseImageRequestError(error)).toEqual({ kind: 'network' })
  })

  test('an error raised in the page keeps its own message', () => {
    expect(parseImageRequestError(new Error('Invalid data URL'))).toEqual({
      kind: 'failed',
      message: 'Invalid data URL',
    })
  })
})
