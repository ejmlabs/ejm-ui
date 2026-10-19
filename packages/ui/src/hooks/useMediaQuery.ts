import { useCallback, useSyncExternalStore } from 'react';

const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Whether a CSS media query matches. Server and hydration render `serverDefault`, then the real value arrives
 * in the next render, so the markup always matches what the server sent.
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!supported()) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => (supported() ? window.matchMedia(query).matches : serverDefault), [query, serverDefault]);
  return useSyncExternalStore(subscribe, getSnapshot, () => serverDefault);
}
