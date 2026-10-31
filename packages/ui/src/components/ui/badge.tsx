import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';

const badgeVariants = cva('inline-flex items-baseline text-meta', {
  variants: {
    density: { comfortable: 'gap-1.5', compact: 'gap-1' },
    // The Status vocabulary (ok, warn, error, info, pending) plus neutral for a plain tag.
    tone: { neutral: 'text-fg', ok: 'text-success', warn: 'text-warn', error: 'text-danger', info: 'text-info', pending: 'text-muted' },
  },
  defaultVariants: { tone: 'neutral', density: 'comfortable' },
});

const marks = { slash: '/', dot: '·' } as const;

export interface BadgeProps extends Closed<ComponentProps<'span'>>, Omit<VariantProps<typeof badgeVariants>, 'density'> {
  /** Overrides the density of the surface. Compact only tightens the gap: the type is always `text-meta`. */
  density?: Density;
  /** A mark before the text, so a row of badges reads as `ejm-cli / beta · 0.4`. Decorative. */
  separator?: keyof typeof marks;
}

/** A tag as plain mono text. No fill, no border, no pill. A status tone must also say its meaning in words. */
export function Badge({ tone, density, separator, children, ...props }: BadgeProps) {
  const surface = useDensity(density);
  return (
    <span {...props} className={badgeVariants({ tone, density: surface })}>
      {separator && <span aria-hidden className="text-muted">{marks[separator]}</span>}
      <span>{children}</span>
    </span>
  );
}
