import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

/** The control look shared by Input, Textarea and Select: field ground, 3:1 control edge, 16px text so phones do not zoom. */
export const fieldClass =
  'block w-full rounded-control border border-control bg-field px-3 text-base text-fg placeholder:text-muted touch-target disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger';

/** A native text input. Pair it with a `<label>`; set `aria-invalid` and `aria-describedby` for errors. */
export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldClass, 'min-h-11', className)} {...props} />;
}
