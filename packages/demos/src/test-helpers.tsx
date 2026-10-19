// Shared by the island tests: the ui test setup (matchers, cleanup, axe), a manual clock, and a helper that lets the demo run to its end.
import { act } from '@testing-library/react';
import { createManualClock, type ManualClock } from './core';
export { expectAccessible, renderIn, themes } from '../../ui/src/components/test-setup';

// jsdom has no matchMedia, which the theme hook reads. A page that never matches any query is enough here.
globalThis.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof matchMedia;

/** Reduced motion (the default here) makes every delay zero, so a run finishes the moment the clock runs. Pass false to step real timings. */
export function setup(reducedMotion = true) {
  const clock = createManualClock();
  return { clock, options: { clock, reducedMotion }, settle: () => act(async () => void clock.runAll()) };
}
