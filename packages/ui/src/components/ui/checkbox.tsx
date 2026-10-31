import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Closed<ComponentProps<typeof CheckboxPrimitive.Root>> {
  /** Visible label. Without it, give the checkbox an `aria-label`. */
  label?: ReactNode;
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
}

/** A checkbox with an indeterminate state. The button is the touch target; the box (24px, 20px compact) is drawn inside it. A labelled row is 44px tall (32px compact). */
export function Checkbox({ label, density, ...props }: CheckboxProps) {
  const compact = useDensity(density) === 'compact';
  const control = (
    <CheckboxPrimitive.Root {...props} className={cn('group inline-flex shrink-0 items-center justify-center rounded-control touch-target disabled:pointer-events-none disabled:opacity-50', compact && 'compact-target')}>
      <span className={cn('flex items-center justify-center rounded-control border border-control bg-field text-on-primary group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=indeterminate]:border-primary group-data-[state=indeterminate]:bg-primary', compact ? 'size-5' : 'size-6')}>
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden className="size-4 group-data-[state=indeterminate]:hidden" />
          <Minus aria-hidden className="hidden size-4 group-data-[state=indeterminate]:block" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
  return label ? <label className={cn('inline-flex cursor-pointer items-center gap-3 touch-target', compact ? 'min-h-8 compact-target text-sm' : 'min-h-11 text-base')}>{control}<span>{label}</span></label> : control;
}
