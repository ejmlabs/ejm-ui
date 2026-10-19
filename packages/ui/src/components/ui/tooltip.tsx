import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import type { Density } from '../../lib/density';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  /** The tip text. Keep it to a few words; it is a hint, never the only place a fact lives. */
  content: ReactNode;
  /** One focusable element. The tip shows on hover and on keyboard focus, and Escape closes it. */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Where to portal the tip. Defaults to document.body. */
  container?: HTMLElement | null;
  /** `compact`: 13px mono text, tighter padding and the 5px radius, for applications. */
  density?: Density;
}

/** A small label for a control. No shadow: it is a mark on the page, not a surface. */
export function Tooltip({ content, children, side = 'top', container, density = 'comfortable' }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={container}>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={16}
            className={cn('z-50 max-w-64 bg-fg text-ground animate-fade', density === 'compact' ? 'rounded-compact px-2 py-1 font-mono text-[0.8125rem] leading-snug' : 'rounded-control px-3 py-1.5 text-meta')}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
