import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { fieldClass } from './input';

/** A native multi-line input. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'min-h-28 resize-y py-2.5', className)} {...props} />;
}
