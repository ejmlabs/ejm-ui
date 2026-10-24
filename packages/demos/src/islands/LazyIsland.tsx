import { useInView } from '@ejm/ui/hooks/useInView';
import { isValidElement, Suspense, useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { Btn } from './btn';

export interface LazyIslandOptions {
  /** How early to start loading, as an IntersectionObserver margin. Default 600px, so the demo is usually ready before it is seen. */
  rootMargin?: string;
  /** Load at once, without waiting to be near the viewport. For tests and screenshots. */
  eager?: boolean;
}

export interface LazyIslandProps extends LazyIslandOptions {
  /** A `React.lazy` component, or its element when the island takes props. */
  island: ComponentType | ReactElement;
  /** The static view of the same screen: what the server renders and what shows without scripts. */
  fallback: ReactNode;
  /** Hide or name the loading action for passive entries. Interactive entries keep the current default. */
  loadLabel?: string | false;
}

/**
 * The loading logic of every lazy demo. What the page serves, and what shows without scripts, is the static product view (the same screen,
 * drawn from the same scenario). The island loads when the demo nears the viewport, or at once when the visitor uses it: pointer, focus,
 * key or the "Try the live demo" button that appears after hydration. It imports no view and no island, so a page pays only for the
 * ones it passes in. Pages normally use a per-product entry (`@ejm/demos/islands/cli-lazy`) instead of calling this directly.
 */
export function LazyIsland({ island: Island, fallback, rootMargin = '600px', eager = false, loadLabel = 'Try the live demo' }: LazyIslandProps) {
  const [wanted, setWanted] = useState(eager);
  const { ref, inView } = useInView<HTMLDivElement>({ once: true, rootMargin });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (inView) setWanted(true);
  }, [inView]);
  return (
    <div ref={ref} onPointerEnter={() => setWanted(true)} onFocusCapture={() => setWanted(true)} onKeyDownCapture={() => setWanted(true)}>
      {wanted ? (
        <Suspense fallback={fallback}>
          {isValidElement(Island) ? Island : <Island />}
        </Suspense>
      ) : (
        <>
          {fallback}
          {hydrated && loadLabel !== false && (
            <p className="mt-4 mb-0">
              <Btn onClick={() => setWanted(true)}>{loadLabel}</Btn>
            </p>
          )}
        </>
      )}
    </div>
  );
}
