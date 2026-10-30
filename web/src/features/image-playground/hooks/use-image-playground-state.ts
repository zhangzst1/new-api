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
import { useCallback, useState } from 'react'

import {
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_IMAGE_PARAMETER_ENABLED,
} from '../constants'
import {
  loadImageConfig,
  loadImageParameterEnabled,
  saveImageConfig,
  saveImageParameterEnabled,
} from '../lib/storage/config-storage'
import type {
  GroupOption,
  ImageParameterEnabled,
  ImageParameterKey,
  ImagePlaygroundConfig,
  ModelOption,
} from '../types'

/** Image playground settings, saved for the signed-in account. */
export function useImagePlaygroundState() {
  const [config, setConfig] = useState<ImagePlaygroundConfig>(() => ({
    ...DEFAULT_IMAGE_CONFIG,
    ...loadImageConfig(),
  }))
  const [parameterEnabled, setParameterEnabled] =
    useState<ImageParameterEnabled>(() => ({
      ...DEFAULT_IMAGE_PARAMETER_ENABLED,
      ...loadImageParameterEnabled(),
    }))
  const [models, setModels] = useState<ModelOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])

  const updateConfig = useCallback(
    <K extends keyof ImagePlaygroundConfig>(
      key: K,
      value: ImagePlaygroundConfig[K]
    ) => {
      setConfig((previous) => {
        const updated = { ...previous, [key]: value }
        saveImageConfig(updated)
        return updated
      })
    },
    []
  )

  const updateParameterEnabled = useCallback(
    (key: ImageParameterKey, value: boolean) => {
      setParameterEnabled((previous) => {
        const updated = { ...previous, [key]: value }
        saveImageParameterEnabled(updated)
        return updated
      })
    },
    []
  )

  return {
    config,
    parameterEnabled,
    models,
    groups,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
  }
}
