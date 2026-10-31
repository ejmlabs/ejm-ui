import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { useDensity, type Density } from '../../lib/density';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  /** The tip text. Keep it to a few words; it is a hint, never the only place a fact lives. */
  content: ReactNode;
  /** One focusable element. The tip shows on hover and on keyboard focus, and Escape closes it. */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Where to portal the tip. Defaults to document.body. */
  container?: HTMLElement | null;
  /** Overrides the density of the surface. Compact tightens the padding; the type is `text-sm` at both. */
  density?: Density;
}

/** A small label for a control: an overlay with the control radius, a line border and the raised shadow. */
export function Tooltip({ content, children, side = 'top', container, density }: TooltipProps) {
  const compact = useDensity(density) === 'compact';
  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={container}>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            collisionPadding={16}
            className={cn('z-50 max-w-64 rounded-control border border-line bg-ground text-sm text-fg shadow-raised animate-fade', compact ? 'px-2 py-1' : 'px-3 py-1.5')}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
