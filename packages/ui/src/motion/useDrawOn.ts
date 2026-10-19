import { useEffect, type RefObject } from 'react';
import { useInView } from '../hooks/useInView';

/**
 * Draws inline symbol art (`<svg class="art">` with pathLength paths) on once, when it scrolls into view. Without scripts,
 * or under reduced motion, the art is simply fully drawn: the draw-on class is added from here, never in the markup.
 * It uses classList, so do not change the svg's className prop after mount.
 */
export function useDrawOn<T extends SVGSVGElement = SVGSVGElement>(): RefObject<T | null> {
  const { ref, inView } = useInView<T>({ once: true });
  useEffect(() => {
    if (inView) ref.current?.classList.add('draw-on');
  }, [inView, ref]);
  return ref;
}
