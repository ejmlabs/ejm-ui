import { useEffect, useRef, useState, type RefObject } from 'react';

export interface ContainerQuery {
  minWidth?: number;
  maxWidth?: number;
}

export interface ContainerQueryResult<T extends Element> {
  /** Put this on the element to measure. */
  ref: RefObject<T | null>;
  /** The element's content width in CSS px, or null before the first measurement (server, first render). */
  width: number | null;
  /** Whether the width is inside the query. False until measured. */
  matches: boolean;
}

/** Measures an element with ResizeObserver, so a component can adapt to the space it has, not the screen. */
export function useContainerQuery<T extends Element = HTMLElement>(query: ContainerQuery = {}): ContainerQueryResult<T> {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const entry = entries[entries.length - 1];
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const matches = width !== null && (query.minWidth === undefined || width >= query.minWidth) && (query.maxWidth === undefined || width <= query.maxWidth);
  return { ref, width, matches };
}
