import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ComponentProps, ReactNode } from 'react';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Closed<ComponentProps<typeof SwitchPrimitive.Root>> {
  /** Visible label. Without it, give the switch an `aria-label`. */
  label?: ReactNode;
  /** Overrides the density of the surface. Compact is a 28 by 16px track (48 by 28px by default); the target stays 32px on a fine pointer and 44px on touch. */
  density?: Density;
}

/**
 * A switch (role="switch"). The button is the touch target, the track and thumb are drawn inside it,
 * so the tap area is 44px on coarse pointers while the drawing stays compact. The thumb moves with transform only.
 * A labelled row is 44px tall (32px compact).
 */
export function Switch({ label, density, ...props }: SwitchProps) {
  const compact = useDensity(density) === 'compact';
  const control = (
    <SwitchPrimitive.Root {...props} className={cn('group inline-flex shrink-0 items-center justify-center rounded-pill touch-target disabled:pointer-events-none disabled:opacity-50', compact && 'compact-target')}>
      <span className={cn('flex items-center rounded-pill border border-control bg-field group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary', compact ? 'h-4 w-7' : 'h-7 w-12')}>
        <SwitchPrimitive.Thumb className={cn('block rounded-pill bg-control transition-transform duration-fast ease-standard data-[state=checked]:bg-on-primary', compact ? 'size-3 translate-x-0.5 data-[state=checked]:translate-x-3.5' : 'size-5 translate-x-1 data-[state=checked]:translate-x-6')} />
      </span>
    </SwitchPrimitive.Root>
  );
  return label ? <label className={cn('inline-flex cursor-pointer items-center gap-3 touch-target', compact ? 'min-h-8 compact-target text-sm' : 'min-h-11 text-base')}>{control}<span>{label}</span></label> : control;
}
