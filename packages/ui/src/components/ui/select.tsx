import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { fieldClass } from './input';

/** A native `<select>` with the control look and a chevron. Native keeps the platform picker on phones and the full keyboard model for free. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select className={cn(fieldClass, 'min-h-11 appearance-none pe-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
