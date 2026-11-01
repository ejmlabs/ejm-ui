import { useLayoutEffect, useRef, type RefObject } from 'react';
import { REDUCED_MOTION_QUERY } from '../hooks/useReducedMotion';

export interface RevealOptions {
  /**
   * If the observer has not answered at all within this time, the element is shown. It never runs while the observer
   * works, so the reveal still waits for the visitor to scroll. Default 1000ms.
   */
  watchdogMs?: number;
}

/**
 * Scroll reveal, following the data-reveal contract in THEME.md. Put the returned ref on the element.
 * - Server render, no scripts, reduced motion, print: nothing is touched, so nothing is hidden.
 * - On the client, before first paint, an element below the fold gets data-reveal="pending" (hidden by CSS).
 * - When it enters the viewport it gets data-reveal="in", plays once, and the observer stops.
 */
export function useReveal<T extends HTMLElement = HTMLElement>({ watchdogMs = 1000 }: RevealOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen, or scrolled past: leave it alone

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      clearTimeout(watchdog);
      io.disconnect();
      el.dataset["reveal"] = 'in';
    };
    const io = new IntersectionObserver(entries => {
      clearTimeout(watchdog); // the observer is alive; from here on only scrolling reveals
      // Scrolled past without being seen (an anchor jump): show it too, so going back up never meets a blank gap.
      if (entries.some(e => e.isIntersecting || e.boundingClientRect.top < 0)) show();
    });
    el.dataset["reveal"] = 'pending';
    io.observe(el);
    watchdog = setTimeout(show, watchdogMs);
    return () => {
      clearTimeout(watchdog);
      io.disconnect();
      if (el.dataset["reveal"] === 'pending') delete el.dataset["reveal"];
    };
  }, [watchdogMs]);
  return ref;
}
