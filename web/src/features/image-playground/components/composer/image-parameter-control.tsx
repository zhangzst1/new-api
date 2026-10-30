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

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { MAX_IMAGE_COUNT } from '../../constants'
import {
  clampImageCount,
  getImageQualityOptions,
  getImageQualitySelection,
  type ImageParameterControl as ParameterControl,
} from '../../lib/parameters/image-parameters'
import type {
  ImageModelFamily,
  ImagePlaygroundConfig,
  ImageQuality,
} from '../../types'
import { ImageSizeControl } from './image-size-control'

type Option<T extends string> = { value: T; label: string }

type ImageParameterControlProps = {
  control: ParameterControl
  config: ImagePlaygroundConfig
  family: ImageModelFamily
  disabled: boolean
  /** Given to the select of size and quality, which the label targets. */
  id: string
  /** The visible label, which names the slider and the option groups. */
  labelId: string
  onConfigChange: <K extends keyof ImagePlaygroundConfig>(
    key: K,
    value: ImagePlaygroundConfig[K]
  ) => void
}

const QUALITY_LABEL_KEYS: Record<ImageQuality, string> = {
  auto: 'Auto',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  standard: 'Standard',
  hd: 'HD',
}

type SegmentedOptionsProps<T extends string> = {
  labelId: string
  value: T
  options: Option<T>[]
  disabled: boolean
  onChange: (value: T) => void
}

/** A single-choice segmented control; choosing the active option keeps it. */
function SegmentedOptions<T extends string>(props: SegmentedOptionsProps<T>) {
  return (
    <ToggleGroup
      aria-labelledby={props.labelId}
      className='w-full'
      disabled={props.disabled}
      onValueChange={(next) => {
        const option = props.options.find((item) => item.value === next[0])
        if (option) props.onChange(option.value)
      }}
      size='sm'
      value={[props.value]}
      variant='outline'
    >
      {props.options.map((option) => (
        <ToggleGroupItem
          className='flex-1'
          key={option.value}
          value={option.value}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** The input of one image parameter: a select, a slider or a segmented group. */
export function ImageParameterControl(props: ImageParameterControlProps) {
  const { t } = useTranslation()

  switch (props.control.key) {
    case 'size':
      return (
        <ImageSizeControl
          config={props.config}
          disabled={props.disabled}
          family={props.family}
          id={props.id}
          onCustomSizeChange={(value) =>
            props.onConfigChange('customSize', value)
          }
          onSizeChange={(value) => props.onConfigChange('size', value)}
        />
      )
    case 'quality': {
      const options = getImageQualityOptions(props.family).map((value) => ({
        value,
        label: t(QUALITY_LABEL_KEYS[value]),
      }))
      return (
        <Select
          disabled={props.disabled}
          items={options}
          onValueChange={(value) => {
            const option = options.find((item) => item.value === value)
            if (option) props.onConfigChange('quality', option.value)
          }}
          value={getImageQualitySelection(props.config, props.family)}
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
      )
    }
    case 'n':
      return (
        <Slider
          // Base UI passes this on to the thumb's input; aria-label is not.
          aria-labelledby={props.labelId}
          className='py-1.5'
          disabled={props.disabled}
          max={MAX_IMAGE_COUNT}
          min={1}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value
            props.onConfigChange('n', clampImageCount(next))
          }}
          step={1}
          value={[clampImageCount(props.config.n)]}
        />
      )
    case 'response_format':
      return (
        <SegmentedOptions
          disabled={props.disabled}
          labelId={props.labelId}
          onChange={(value) => props.onConfigChange('response_format', value)}
          options={[
            { value: 'b64_json', label: t('Base64') },
            { value: 'url', label: t('URL') },
          ]}
          value={props.config.response_format}
        />
      )
    case 'output_format':
      return (
        <SegmentedOptions
          disabled={props.disabled}
          labelId={props.labelId}
          onChange={(value) => props.onConfigChange('output_format', value)}
          options={[
            { value: 'png', label: 'PNG' },
            { value: 'jpeg', label: 'JPEG' },
            { value: 'webp', label: 'WebP' },
          ]}
          value={props.config.output_format}
        />
      )
    case 'background':
      return (
        <SegmentedOptions
          disabled={props.disabled}
          labelId={props.labelId}
          onChange={(value) => props.onConfigChange('background', value)}
          options={[
            { value: 'auto', label: t('Auto') },
            { value: 'transparent', label: t('Transparent') },
            { value: 'opaque', label: t('Opaque') },
          ]}
          value={props.config.background}
        />
      )
    case 'style':
      return (
        <SegmentedOptions
          disabled={props.disabled}
          labelId={props.labelId}
          onChange={(value) => props.onConfigChange('style', value)}
          options={[
            { value: 'vivid', label: t('Vivid') },
            { value: 'natural', label: t('Natural') },
          ]}
          value={props.config.style}
        />
      )
  }
}
