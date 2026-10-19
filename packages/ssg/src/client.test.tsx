import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineSite, hydrateSite, matchRoute, usePath } from './index';
import { renderRoute } from './server';
import site from '../fixtures/basic/src/site';

type Root = Awaited<ReturnType<typeof hydrateSite>>;
let root: Root | undefined;
let errors: ReturnType<typeof vi.spyOn>;

async function boot(path: string) {
  history.replaceState(null, '', path);
  document.head.innerHTML = '';
  const route = matchRoute(site, path) ?? site.notFound;
  const { html, head } = await renderRoute(site, route);
  document.head.innerHTML = head;
  document.body.innerHTML = `<div id="root">${html}</div>`;
  await act(async () => {
    root = await hydrateSite(site);
  });
}
const click = (el: Element, init: MouseEventInit = {}) =>
  act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
  });
const link = (name: string) => [...document.querySelectorAll('a')].find(a => a.textContent === name)!;
const settled = () => act(async () => void (await new Promise(r => setTimeout(r, 10))));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = vi.fn();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.restoreAllMocks();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  document.documentElement.removeAttribute('data-ejm-nav');
});

describe('hydration', () => {
  it('adopts the prerendered markup without a mismatch or a second render', async () => {
    await boot('/');
    const h1 = document.querySelector('h1');
    expect(errors).not.toHaveBeenCalled();
    await settled();
    expect(document.querySelector('h1')).toBe(h1); // same node: nothing was thrown away and rebuilt
    expect(document.activeElement).toBe(document.body); // first paint does not steal focus
  });

  it('hydrates a lazy route in place, with no fallback', async () => {
    await boot('/lazy/');
    expect(errors).not.toHaveBeenCalled();
    expect(document.querySelector('h1')?.textContent).toBe('Lazy heading');
  });

  it('hydrates the 404 page at an unknown URL', async () => {
    await boot('/nope/');
    expect(errors).not.toHaveBeenCalled();
    expect(document.querySelector('h1')?.textContent).toBe('Nothing here');
  });
});

describe('usePath', () => {
  it('is the path without a trailing slash on the server and in the browser, so an App that renders from it hydrates cleanly', async () => {
    const App = ({ children }: { children: React.ReactNode }) => (
      <>
        <p id="at">{usePath()}</p>
        {children}
      </>
    );
    const own = defineSite({ App, base: '', routes: [{ path: '/lazy/', component: () => <h1>Page</h1> }] });
    history.replaceState(null, '', '/lazy/');
    const { html } = await renderRoute(own, own.routes[0]!);
    expect(html).toContain('<p id="at">/lazy</p>');
    document.body.innerHTML = `<div id="root">${html}</div>`;
    await act(async () => {
      root = await hydrateSite(own);
    });
    expect(errors).not.toHaveBeenCalled();
    expect(document.getElementById('at')?.textContent).toBe('/lazy');
  });
});

describe('client navigation', () => {
  it('follows an internal link without a reload, then focuses the new h1 and announces the title', async () => {
    await boot('/');
    const reload = vi.fn();
    window.addEventListener('beforeunload', reload);
    await click(link('Lazy'));
    await settled();
    expect(location.pathname).toBe('/lazy/');
    expect(document.querySelector('h1')?.textContent).toBe('Lazy heading');
    expect(document.activeElement).toBe(document.querySelector('h1'));
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(document.getElementById('ejm-announcer')?.textContent).toBe('Lazy page | Fixture');
    expect(document.title).toBe('Lazy page | Fixture');
    expect(document.head.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://fixture.test/lazy/');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(reload).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('renders the not found page for an unknown route', async () => {
    await boot('/');
    await click(link('Missing'));
    await settled();
    expect(document.querySelector('h1')?.textContent).toBe('Nothing here');
    expect(document.getElementById('ejm-announcer')?.textContent).toBe('Not found | Fixture');
  });

  it('leaves external links, modified clicks and rel=external to the browser', async () => {
    await boot('/');
    let prevented = true;
    // Runs after React's handler (the root listener is nested deeper): records the verdict, then stops jsdom from "navigating".
    const record = (e: Event) => ((prevented = e.defaultPrevented), e.preventDefault());
    document.addEventListener('click', record);
    const cases: Array<[string, MouseEventInit]> = [['Example', {}], ['Lazy', { ctrlKey: true }], ['Lazy', { metaKey: true }], ['Lazy', { shiftKey: true }], ['Lazy', { button: 1 }]];
    for (const [name, init] of cases) {
      prevented = true;
      await click(link(name), init);
      expect(prevented, `${name} ${JSON.stringify(init)}`).toBe(false);
    }
    document.removeEventListener('click', record);
    expect(location.pathname).toBe('/');
  });

  it('scrolls to a hash target instead of the top', async () => {
    await boot('/');
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await click(link('Details'));
    await settled();
    expect(location.pathname + location.hash).toBe('/lazy/#details');
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe('view transitions', () => {
  const rejecting = () => {
    const abort = () => Promise.reject(new DOMException('Transition was skipped', 'AbortError'));
    return vi.fn((cb: () => void) => {
      cb();
      return { ready: abort(), finished: abort(), updateCallbackDone: abort() };
    });
  };

  it('wraps the route change in startViewTransition and swallows a skipped transition', async () => {
    const start = rejecting();
    (document as { startViewTransition?: unknown }).startViewTransition = start;
    window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia;
    await boot('/');
    await click(link('Lazy'));
    await settled();
    expect(start).toHaveBeenCalledOnce();
    expect(location.pathname).toBe('/lazy/'); // the page still updated
    expect(errors).not.toHaveBeenCalled(); // and nothing leaked to the console (an unhandled rejection would fail the run)
  });

  it('skips the API entirely under prefers-reduced-motion', async () => {
    const start = rejecting();
    (document as { startViewTransition?: unknown }).startViewTransition = start;
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    await boot('/');
    await click(link('Lazy'));
    await settled();
    expect(start).not.toHaveBeenCalled();
    expect(location.pathname).toBe('/lazy/');
    expect(document.activeElement).toBe(document.querySelector('h1'));
  });
});
