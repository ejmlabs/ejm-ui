import type { ComponentProps } from 'react';
import { fieldVariants } from '../../control-recipes.mjs';
import type { Closed } from '../../lib/closed';
import { useDensity, type Density } from '../../lib/density';
export { fieldClass } from '../../control-recipes.mjs';

export interface InputProps extends Closed<ComponentProps<'input'>> {
  /** Overrides the density of the surface. Leave it out: `AppShell` and `Page variant="application"` set `compact`. */
  density?: Density;
}

/** A native text input, 44px tall (32px compact on a fine pointer). Pair it with a `<label>`; set `aria-invalid` and `aria-describedby` for errors. */
export function Input({ type = 'text', density, ...props }: InputProps) {
  const surface = useDensity(density);
  return <input {...props} type={type} className={fieldVariants({ density: surface })} />;
}
