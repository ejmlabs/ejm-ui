import type { ComponentProps } from 'react';
import type { Closed } from '../../lib/closed';

export interface SeparatorProps extends Closed<ComponentProps<'div'>> {
  orientation?: 'horizontal' | 'vertical';
  /** Decorative separators are hidden from assistive technology. Set false when the rule divides distinct regions. */
  decorative?: boolean;
}

/** A hairline. Never a box edge. */
export function Separator({ orientation = 'horizontal', decorative = true, ...props }: SeparatorProps) {
  return (
    <div
      {...props}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative || orientation === 'horizontal' ? undefined : 'vertical'}
      className={orientation === 'horizontal' ? 'h-px w-full shrink-0 bg-line' : 'h-full w-px shrink-0 self-stretch bg-line'}
    />
  );
}
