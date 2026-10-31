import { createContext, useContext, type ReactNode } from 'react';

/**
 * How tight a control is. `comfortable` (the default) is the site size. `compact` is for applications: `text-sm` and, on a fine
 * pointer, 32px targets. On a coarse pointer (touch) a target stays 44px through `touch-target`.
 */
export type Density = 'comfortable' | 'compact';

const DensityContext = createContext<Density>('comfortable');

/** The surface sets density once: `AppShell` and `Page variant="application"` provide `compact`. Controls read it. */
export function DensityProvider({ density, children }: { density: Density; children?: ReactNode }) {
  return <DensityContext.Provider value={density}>{children}</DensityContext.Provider>;
}

/** The density of the surface, unless the caller still passes its own. */
export function useDensity(override?: Density): Density {
  const surface = useContext(DensityContext);
  return override ?? surface;
}
