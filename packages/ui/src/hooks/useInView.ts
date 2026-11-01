import { useEffect, useRef, useState, type RefObject } from 'react';

export interface InViewOptions {
  /** Stop observing after the first time it is seen, and stay true. */
  once?: boolean;
  rootMargin?: string | undefined;
  threshold?: number | undefined;
}

/**
 * Whether an element is in the viewport. False on the server. Where IntersectionObserver is missing it reports true,
 * so nothing that waits for "in view" can stay hidden.
 */
export function useInView<T extends Element = HTMLElement>({ once = false, rootMargin, threshold }: InViewOptions = {}): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setInView(entry.isIntersecting);
        if (once && entry.isIntersecting) io.disconnect();
      },
      { ...(rootMargin === undefined ? {} : { rootMargin }), ...(threshold === undefined ? {} : { threshold }) },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, threshold]);
  return { ref, inView };
}
