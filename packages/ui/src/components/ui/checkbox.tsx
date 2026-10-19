import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Visible label. Without it, give the checkbox an `aria-label`. */
  label?: ReactNode;
}

/** A checkbox with an indeterminate state. The button is the touch target; the 24px box is drawn inside it. */
export function Checkbox({ className, label, ...props }: CheckboxProps) {
  const control = (
    <CheckboxPrimitive.Root className={cn('group inline-flex shrink-0 items-center justify-center touch-target focus-ring rounded-control disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>
      <span className="flex size-6 items-center justify-center rounded-control border border-control bg-field text-on-primary group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=indeterminate]:border-primary group-data-[state=indeterminate]:bg-primary">
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden className="size-4 group-data-[state=indeterminate]:hidden" />
          <Minus aria-hidden className="hidden size-4 group-data-[state=indeterminate]:block" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
  return label ? <label className="inline-flex cursor-pointer items-center gap-3">{control}<span>{label}</span></label> : control;
}
