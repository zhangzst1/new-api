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

import { ParameterPanelShell } from '@/components/parameter-panel-shell'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

import {
  getImageModelFamily,
  getImageParameterValue,
  IMAGE_PARAMETER_CONTROLS,
  isImageParameterAvailable,
} from '../../lib/parameters/image-parameters'
import type {
  ImageParameterEnabled,
  ImageParameterKey,
  ImagePlaygroundConfig,
} from '../../types'
import { ImageParameterControl } from './image-parameter-control'

/** Controls drawn as a select, the only kind a label can target by id. */
const SELECT_CONTROLS: ReadonlySet<ImageParameterKey> = new Set([
  'size',
  'quality',
])

type ImageParameterPanelProps = {
  config: ImagePlaygroundConfig
  parameterEnabled: ImageParameterEnabled
  disabled?: boolean
  onConfigChange: <K extends keyof ImagePlaygroundConfig>(
    key: K,
    value: ImagePlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (key: ImageParameterKey, value: boolean) => void
}

/**
 * Image request parameters the selected model accepts in the current mode,
 * each switched on or off; switched-off parameters are not sent.
 */
export function ImageParameterPanel(props: ImageParameterPanelProps) {
  const { t } = useTranslation()
  const family = getImageModelFamily(props.config.model)
  const controls = IMAGE_PARAMETER_CONTROLS.filter((control) =>
    isImageParameterAvailable(control, family, props.config.mode)
  )
  const activeCount = controls.filter(
    (control) => props.parameterEnabled[control.key]
  ).length

  return (
    <ParameterPanelShell activeCount={activeCount} disabled={props.disabled}>
      {(compact) => (
        <div
          className={cn(
            'grid max-h-[min(28rem,calc(100vh-10rem))] gap-3 overflow-y-auto pr-1',
            compact ? 'px-4 pb-4' : 'p-1'
          )}
        >
          <div className='border-border/70 bg-background/60 flex items-start justify-between gap-3 rounded-lg border p-3'>
            <div className='min-w-0 space-y-1'>
              <label
                className='text-sm leading-5 font-medium'
                htmlFor='image-playground-show-all-models'
              >
                {t('Show all models')}
              </label>
              <p className='text-muted-foreground text-xs leading-4'>
                {t('List every model of the group, not only image models')}
              </p>
            </div>
            <Switch
              checked={props.config.showAllModels}
              disabled={props.disabled}
              id='image-playground-show-all-models'
              onCheckedChange={(checked) =>
                props.onConfigChange('showAllModels', checked)
              }
              size='sm'
            />
          </div>

          {controls.map((control) => {
            const enabled = props.parameterEnabled[control.key]
            const value = getImageParameterValue(
              control.key,
              props.config,
              family
            )
            const controlId = `image-playground-${control.key}`
            const labelId = `${controlId}-label`

            return (
              <div
                className={cn(
                  'border-border/70 bg-background/60 grid gap-2 rounded-lg border p-3 transition-opacity',
                  (!enabled || props.disabled) && 'opacity-55'
                )}
                key={control.key}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <label
                        className='truncate text-sm leading-5 font-medium'
                        htmlFor={
                          SELECT_CONTROLS.has(control.key)
                            ? controlId
                            : undefined
                        }
                        id={labelId}
                      >
                        {t(control.labelKey)}
                      </label>
                      <Badge
                        className='h-5 max-w-28 shrink-0 px-1.5 font-mono text-[11px]'
                        variant='outline'
                      >
                        {value === undefined ? t('Not set') : String(value)}
                      </Badge>
                    </div>
                    <p className='text-muted-foreground text-xs leading-4'>
                      {t(control.descriptionKey)}
                    </p>
                  </div>
                  <Switch
                    aria-label={t('Enable {{parameter}}', {
                      parameter: t(control.labelKey),
                    })}
                    checked={enabled}
                    disabled={props.disabled}
                    onCheckedChange={(checked) =>
                      props.onParameterEnabledChange(control.key, checked)
                    }
                    size='sm'
                  />
                </div>
                <ImageParameterControl
                  config={props.config}
                  control={control}
                  disabled={Boolean(props.disabled) || !enabled}
                  family={family}
                  id={controlId}
                  labelId={labelId}
                  onConfigChange={props.onConfigChange}
                />
              </div>
            )
          })}
        </div>
      )}
    </ParameterPanelShell>
  )
}
