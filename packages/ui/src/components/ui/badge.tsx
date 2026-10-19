import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import type { Density } from '../../lib/density';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-baseline text-meta', {
  variants: {
    density: { comfortable: 'gap-1.5', compact: 'gap-1 text-xs' },
    tone: { default: 'text-muted', strong: 'text-fg', success: 'text-success', warn: 'text-warn', danger: 'text-danger', info: 'text-info' },
  },
  defaultVariants: { tone: 'default', density: 'comfortable' },
});

const marks = { slash: '/', dot: '·' } as const;

export interface BadgeProps extends ComponentProps<'span'>, Omit<VariantProps<typeof badgeVariants>, 'density'> {
  /** `compact`: 12px, for dense application rows. */
  density?: Density;
  /** A mark before the text, so a row of badges reads as `ejm-cli / beta · 0.4`. Decorative. */
  separator?: keyof typeof marks;
}

/** A tag as plain mono text. No fill, no border, no pill. A status tone must also say its meaning in words. */
export function Badge({ className, tone, density, separator, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, density }), className)} {...props}>
      {separator && <span aria-hidden className="text-muted">{marks[separator]}</span>}
      <span>{children}</span>
    </span>
  );
}
