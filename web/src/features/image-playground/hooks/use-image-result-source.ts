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
import { useEffect, useState } from 'react'

import type { ImageResult } from '../types'

/**
 * The address an image result is shown and downloaded from: an object URL of
 * its Blob, revoked when no longer used, or its remote URL.
 */
export function useImageResultSource(
  result: ImageResult | undefined
): string | undefined {
  const blob = result?.blob
  const [objectUrl, setObjectUrl] = useState<{ blob: Blob; url: string }>()

  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    setObjectUrl({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])

  if (blob) {
    return objectUrl?.blob === blob ? objectUrl.url : undefined
  }
  return result?.url
}
