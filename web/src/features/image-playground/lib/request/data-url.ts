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
const DATA_URL_PATTERN = /^data:([^,]*?)(;base64)?,(.*)$/s

/** Decodes base64 text; whitespace such as line breaks is ignored. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64.replaceAll(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/**
 * Turns a data URL back into a File. Prompt attachments reach the submit
 * handler as data URLs, while image edits upload them as multipart files.
 */
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const match = DATA_URL_PATTERN.exec(dataUrl)
  if (!match) {
    throw new Error('Invalid data URL')
  }
  const mediaType = match[1].split(';')[0] || 'application/octet-stream'
  const bytes = match[2]
    ? base64ToBytes(match[3])
    : new TextEncoder().encode(decodeURIComponent(match[3]))
  return new File([bytes], fileName, { type: mediaType })
}
