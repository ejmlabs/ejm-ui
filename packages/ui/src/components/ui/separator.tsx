import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export interface SeparatorProps extends ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
  /** Decorative separators are hidden from assistive technology. Set false when the rule divides distinct regions. */
  decorative?: boolean;
}

/** A hairline. Never a box edge. */
export function Separator({ className, orientation = 'horizontal', decorative = true, ...props }: SeparatorProps) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative || orientation === 'horizontal' ? undefined : 'vertical'}
      className={cn('shrink-0 bg-line', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px self-stretch', className)}
      {...props}
    />
  );
}
