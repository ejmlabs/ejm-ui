import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { fieldVariants } from '../../control-recipes.mjs';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';

export interface SelectProps extends Closed<ComponentProps<'select'>> {
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
}

/** A native `<select>` with the field look and a chevron. Native keeps the platform picker on phones and the full keyboard model for free. */
export function Select({ children, density, ...props }: SelectProps) {
  const surface = useDensity(density);
  return (
    <span className="relative block">
      <select {...props} className={`${fieldVariants({ density: surface })} appearance-none pe-10`}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
