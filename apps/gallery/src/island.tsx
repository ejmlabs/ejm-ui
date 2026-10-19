import { lazy, Suspense, type ComponentType } from 'react';

type Page = { default: ComponentType };

// The first thing a visitor does with the page: scroll, press, touch, tab or move the pointer. Until then a page is only its HTML.
const EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'scroll', 'keydown', 'focusin', 'popstate'];
const touched =
  typeof window === 'undefined'
    ? Promise.resolve()
    : new Promise<void>(resolve => {
        const done = () => {
          for (const e of EVENTS) window.removeEventListener(e, done, true);
          resolve();
        };
        for (const e of EVENTS) window.addEventListener(e, done, { capture: true, passive: true });
      });

/**
 * A page that hydrates when the visitor first touches it, so its code does not load (or count against the script budget) for a visit
 * that only reads. The prerender renders the real page, so the HTML is complete and reads with scripts off. In the browser the page
 * is a React.lazy inside a Suspense boundary that waits for the first interaction: React keeps the server HTML on screen, then loads
 * the chunk and hydrates it, and replays a click that arrived first. Every client navigation needs an interaction, so by then the wait
 * is over and a navigation shows the title until the chunk arrives. Load this file only with a dynamic import, so it stays its own tiny chunk.
 */
export async function island(load: () => Promise<Page>, title: string): Promise<Page> {
  const Body = import.meta.env.SSR ? (await load()).default : lazy(() => touched.then(load));
  return {
    default: () => (
      <Suspense fallback={<h1 className="page py-rhythm text-display">{title}</h1>}>
        <Body />
      </Suspense>
    ),
  };
}
