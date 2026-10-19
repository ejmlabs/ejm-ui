import { useEffect, useRef, useState } from 'react';

/** Measures an element's content box so an SVG can draw at 1 unit per CSS pixel. Returns the fallback on the server and before the first measurement. */
export function useBox<T extends Element>(fallback: { width: number; height: number }) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const r = entries[entries.length - 1]?.contentRect;
      if (r && r.width > 0 && r.height > 0) setBox(b => (b.width === Math.round(r.width) && b.height === Math.round(r.height) ? b : { width: Math.round(r.width), height: Math.round(r.height) }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...box };
}
