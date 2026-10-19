import { useSyncExternalStore } from 'react';

const none = () => () => {};

/**
 * False on the server and during hydration, true after. Components render their no-script form first and add controls
 * that need script (copy buttons, tab lists, the filter) once this turns true, so the server HTML and the first client
 * render always match.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(none, () => true, () => false);
}

/** True when the visitor asked for less motion. Read at the moment of use, so it follows live changes. */
export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The language a visitor picked in any CodeTabs group. Other groups with a tab of that name follow it. */
let preferred: string | null = null;
const listeners = new Set<() => void>();
export const tabPreference = {
  get: () => preferred,
  set(label: string) {
    if (label === preferred) return;
    preferred = label;
    for (const l of [...listeners]) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  /** For tests. */
  reset() {
    preferred = null;
  },
};
