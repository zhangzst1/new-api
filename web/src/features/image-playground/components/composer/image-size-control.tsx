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
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { CUSTOM_SIZE_VALUE } from '../../constants'
import {
  getImageSizeOptions,
  getImageSizeSelection,
  parseImageSize,
} from '../../lib/parameters/image-parameters'
import type { ImageModelFamily, ImagePlaygroundConfig } from '../../types'

type ImageSizeControlProps = {
  config: ImagePlaygroundConfig
  family: ImageModelFamily
  disabled: boolean
  id: string
  onSizeChange: (size: string) => void
  onCustomSizeChange: (customSize: string) => void
}

/** Size presets of the model family, plus a free WIDTHxHEIGHT entry. */
export function ImageSizeControl(props: ImageSizeControlProps) {
  const { t } = useTranslation()
  const selection = getImageSizeSelection(props.config, props.family)
  const options = getImageSizeOptions(props.family).map((value) => {
    if (value === 'auto') return { value, label: t('Auto') }
    if (value === CUSTOM_SIZE_VALUE) return { value, label: t('Custom size') }
    const [width, height] = value.split('x').map(Number)
    let shape = t('Square')
    if (width > height) shape = t('Landscape')
    if (width < height) shape = t('Portrait')
    return { value, label: `${width} × ${height} · ${shape}` }
  })
  const isCustom = selection === CUSTOM_SIZE_VALUE
  const customInvalid =
    props.config.customSize.trim() !== '' &&
    parseImageSize(props.config.customSize) === null
  const errorId = `${props.id}-error`

  return (
    <div className='grid gap-2'>
      <Select
        disabled={props.disabled}
        items={options}
        onValueChange={(value) => {
          if (value) props.onSizeChange(String(value))
        }}
        value={selection}
      >
        <SelectTrigger className='w-full' id={props.id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          aria-describedby={customInvalid ? errorId : undefined}
          aria-invalid={customInvalid}
          aria-label={t('Custom size')}
          disabled={props.disabled}
          onChange={(event) => props.onCustomSizeChange(event.target.value)}
          placeholder='1280x720'
          value={props.config.customSize}
        />
      )}
      {isCustom && customInvalid && (
        <p className='text-destructive text-xs' id={errorId}>
          {t('Enter the size as width x height, for example 1280x720')}
        </p>
      )}
    </div>
  )
}
