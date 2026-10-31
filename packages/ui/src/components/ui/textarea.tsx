import type { ComponentProps } from 'react';
import { fieldVariants } from '../../control-recipes.mjs';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';

export interface TextareaProps extends Closed<ComponentProps<'textarea'>> {
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
}

/** A native multi-line input. It keeps `min-h-28` at both densities; compact only sets the type to 14px. */
export function Textarea({ density, ...props }: TextareaProps) {
  const surface = useDensity(density);
  return <textarea {...props} className={fieldVariants({ kind: 'area', density: surface })} />;
}
