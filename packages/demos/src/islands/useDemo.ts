import { useReducedMotion } from '@ejm/ui/hooks/useReducedMotion';
import { useInView } from '@ejm/ui/hooks/useInView';
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import type { Demo, DemoOptions } from '../core';

export type IslandOptions = Omit<DemoOptions, 'visible'>;

export interface Island<S, A> {
  state: S;
  dispatch: Demo<S, A>['dispatch'];
  /** Put on the element whose visibility starts and stops the demo. */
  host: RefObject<HTMLDivElement | null>;
}

/**
 * Runs a demo engine for the life of a component. The component renders the engine's state (useSyncExternalStore, so a batched
 * change is one render). The demo runs only while its host is in view, as DEMOS.md requires: an IntersectionObserver feeds
 * `dispatch({ type: 'visible' })`. Reduced motion comes from the page unless the caller sets it. No network is touched.
 */
export function useDemo<S, A>(create: (opts: DemoOptions) => Demo<S, A>, options: IslandOptions = {}): Island<S, A> {
  const reduced = useReducedMotion();
  const [demo] = useState(() => create({ ...options, reducedMotion: options.reducedMotion ?? reduced, visible: false }));
  const state = useSyncExternalStore(demo.subscribe, demo.getState, demo.getState);
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '120px' });
  const gone = useRef(false);

  useEffect(() => {
    // React Strict Mode runs effects twice in development. destroy() stops every timer, so a second run starts the demo again.
    if (gone.current) {
      gone.current = false;
      demo.dispatch({ type: 'reset' });
    }
    return () => {
      gone.current = true;
      demo.destroy();
    };
  }, [demo]);
  useEffect(() => demo.dispatch({ type: 'visible', value: inView }), [demo, inView]);

  return { state, dispatch: demo.dispatch, host: ref };
}
