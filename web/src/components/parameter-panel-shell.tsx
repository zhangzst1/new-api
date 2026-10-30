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
import { SlidersHorizontalIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'

type ParameterPanelShellProps = {
  /** Number of enabled parameters, shown on the trigger. */
  activeCount: number
  disabled?: boolean
  /** Renders the parameter controls; compact is true in the mobile sheet. */
  children: (compact: boolean) => ReactNode
}

/**
 * Prompt-composer parameter panel: a popover on desktop and a bottom sheet on
 * mobile, opened from a toolbar button that shows how many parameters are on.
 */
export function ParameterPanelShell(props: ParameterPanelShellProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const trigger = (
    <PromptInputButton
      aria-label={t('Parameters')}
      className='text-muted-foreground hover:text-foreground hover:bg-muted/70 relative font-medium'
      disabled={props.disabled}
      variant='ghost'
    >
      <SlidersHorizontalIcon size={16} />
      <span className='bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] leading-none font-semibold'>
        {props.activeCount}
      </span>
    </PromptInputButton>
  )

  if (isMobile) {
    return (
      <Sheet>
        <Tooltip>
          <TooltipTrigger render={<SheetTrigger render={trigger} />} />
          <TooltipContent>
            <p>{t('Parameters')}</p>
          </TooltipContent>
        </Tooltip>
        <SheetContent
          className='max-h-[85vh] overflow-hidden rounded-t-xl'
          side='bottom'
        >
          <SheetHeader>
            <SheetTitle>{t('Parameter settings')}</SheetTitle>
          </SheetHeader>
          {props.children(true)}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger render={trigger} />} />
        <TooltipContent>
          <p>{t('Parameters')}</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align='start'
        className='w-[22rem] max-w-[calc(100vw-2rem)] gap-3 p-3'
        collisionPadding={8}
        side='top'
        sideOffset={8}
      >
        <div className='space-y-1 px-1'>
          <div className='text-sm font-semibold'>{t('Parameter settings')}</div>
          <div className='text-muted-foreground text-xs leading-4'>
            {t('Only enabled parameters are sent with the request.')}
          </div>
        </div>
        {props.children(false)}
      </PopoverContent>
    </Popover>
  )
}
