import type { ButtonHTMLAttributes, Ref } from 'react';
import { cx } from '../views/cx';

/** A small pill control. Primary is the Sage fill. Every button is at least 44px on coarse pointers. */
export function Btn({ primary, className, ref, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        'touch-target focus-ring inline-flex items-center justify-center rounded-pill border px-[1.1em] py-[0.35em] font-mono whitespace-nowrap select-none transition-transform duration-fast ease-standard motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        primary ? 'border-transparent bg-ui-primary text-ui-on-primary hover:bg-ui-accent' : 'border-ui-control-border bg-transparent text-ui-text hover:bg-ui-hover',
        className,
      )}
      {...rest}
    />
  );
}
