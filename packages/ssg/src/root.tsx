import './ssg.css';
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Router, useLocation } from 'wouter';
import { applyHead, resolveHead } from './head';
import { matchRoute, normalizePath, stripBase, type Route, type Site } from './site';

const SiteContext = createContext<Site | null>(null);
const useSite = () => {
  const site = useContext(SiteContext);
  if (!site) throw new Error('ssg: used outside of the site root');
  return site;
};

/** The current path without the site base and without a trailing slash, e.g. `/about`. The prerender and the browser agree on it, so an `App` can render from it without a hydration mismatch. */
export const usePath = () => normalizePath(useLocation()[0]);

// wouter patches history.pushState and replaceState to dispatch an event of the same name; pushState is the router's own navigation signal.
// replaceState is left out on purpose, so a page can rewrite its own URL without re-rendering what reads the query.
const searchEvents = ['popstate', 'pushState'];
const subscribeSearch = (notify: () => void) => {
  for (const event of searchEvents) addEventListener(event, notify);
  return () => searchEvents.forEach(event => removeEventListener(event, notify));
};
const liveSearch = () => location.search;
const prerenderSearch = () => '';

/**
 * The query string with its leading `?`, as `location.search` holds it (`?game=abc`, or an empty string). The prerender and the hydration pass
 * see an empty string, so markup that depends on it never mismatches, and the live value follows in the next render. It changes on back and
 * forward and on a `Link` or `useNavigate` push, not on `replaceState` (direct, or from `replace`). Wouter's own `useSearch` is not used:
 * it follows replaceState and decodes the string.
 */
export const useSearch = () => useSyncExternalStore(subscribeSearch, liveSearch, prerenderSearch);

const noop = () => {};

function focusHeading() {
  const el = document.querySelector<HTMLElement>('#main h1') ?? document.querySelector<HTMLElement>('h1') ?? document.getElementById('main');
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

function scrollTo(hash: string) {
  const id = decodeURIComponent(hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

function startTransition(run: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
      updateCallbackDone: Promise<void>;
      skipTransition(): void;
    };
  };
  const root = document.documentElement;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Switches on the CSS-only fallback in ssg.css. The first load never animates.
  root.setAttribute('data-ejm-nav', '');
  if (!doc.startViewTransition || reduced) return run();
  root.setAttribute('data-ejm-vt', '');
  let ran = false;
  const t = doc.startViewTransition(() => ((ran = true), run()));
  // The browser calls the update on its next rendered frame. If frames are not coming (a throttled tab), do not leave the page frozen.
  setTimeout(() => ran || t.skipTransition(), 300);
  // A skipped transition (another navigation, a hidden tab) rejects with AbortError; the page still updates.
  const quiet = (e: unknown) => {
    if ((e as { name?: string })?.name !== 'AbortError') console.error(e);
  };
  t.ready.catch(noop);
  t.updateCallbackDone.catch(quiet);
  t.finished.catch(noop).finally(() => root.removeAttribute('data-ejm-vt'));
}

export interface NavigateOptions {
  replace?: boolean;
}

/** Navigates without a reload: loads the route chunk first, runs inside a view transition, then scrolls to the top or the hash. */
export function useNavigate() {
  const site = useSite();
  const go = useLocation()[1];
  return useCallback(
    async (to: string, opts: NavigateOptions = {}) => {
      if (!to.startsWith('/')) return void window.location.assign(to);
      const route = matchRoute(site, to);
      await route?.preload().catch(noop);
      const hash = to.includes('#') ? to.slice(to.indexOf('#')) : '';
      startTransition(() => {
        flushSync(() => go(to, { replace: opts.replace }));
        scrollTo(hash);
      });
    },
    [site, go],
  );
}

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** A site path such as `/about#team` (no base), or any absolute URL, which navigates normally. */
  href: string;
  replace?: boolean;
};

/** An `<a>` that navigates client side for internal paths. Absolute URLs, `rel="external"`, `target`, `download` and modified clicks behave as normal links. */
export function Link({ href, replace, onClick, onPointerEnter, onFocus, rel, target, ...rest }: LinkProps) {
  const site = useSite();
  const navigate = useNavigate();
  const internal = href.startsWith('/') && !href.startsWith('//') && !/(^|\s)external(\s|$)/.test(rel ?? '');
  const warm = () => void matchRoute(site, href)?.preload().catch(noop);
  return (
    <a
      {...rest}
      href={internal ? site.base + href : href}
      target={target}
      rel={rel ?? (/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('mailto:') ? 'external noopener' : undefined)}
      onPointerEnter={e => (onPointerEnter?.(e), internal && warm())}
      onFocus={e => (onFocus?.(e), internal && warm())}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (!internal || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if ((target && target !== '_self') || rest.download != null) return;
        e.preventDefault();
        void navigate(href, { replace });
      }}
    />
  );
}

export interface StaticProps {
  /**
   * The content, for the server render only. Pass it from a build-time condition, so the browser bundle never contains it:
   * `render={import.meta.env.SSR || import.meta.env.DEV ? () => <Guide /> : undefined}`.
   * With no `render` (the browser build) the prerendered markup is kept as it is and not hydrated.
   */
  render?: () => ReactNode;
  className?: string;
}

/**
 * A part of a page that costs the first load nothing: prose, tables, a product view that nothing in the browser needs to change. The server
 * renders it in full, so it reads with scripts off. The browser keeps that markup and does not hydrate it (an element with
 * `dangerouslySetInnerHTML` makes React leave its children alone), and the code behind it is not in the browser bundle.
 * Internal links inside it (`<a href="/docs/">`, with the site base already in the href) still navigate without a reload, through
 * a delegated click handler. If the part is ever rendered in the browser with no markup to keep (client navigation into a route that has
 * one, or history navigation), there is nothing to show, so the page is reloaded and the server answers it.
 */
export function Static({ render, className }: StaticProps) {
  const site = useSite();
  const navigate = useNavigate();
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!render && el.current && !el.current.firstChild) window.location.reload();
  }, [render]);
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as Element).closest?.('a');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || /(^|\s)external(\s|$)/.test(a.rel)) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const path = stripBase(site, url.pathname);
    if (!matchRoute(site, path)) return;
    e.preventDefault();
    void navigate(path + url.hash);
  };
  const props = { ref: el, className, 'data-ejm-static': '', onClick };
  return render ? (
    <div {...props}>{render()}</div>
  ) : (
    <div {...props} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: '' }} />
  );
}

function Shell() {
  const site = useSite();
  const [path] = useLocation();
  const route: Route = matchRoute(site, path) ?? site.notFound;
  const last = useRef<Route>(route);
  useLayoutEffect(() => {
    const head = resolveHead(site, route);
    if (last.current === route) {
      // First paint: prerendered pages already carry their head. A dev page rendered on the client does not.
      if (!document.head.querySelector('[data-ejm]')) applyHead(head);
      return;
    }
    last.current = route;
    applyHead(head);
    const live = document.getElementById('ejm-announcer');
    if (live) live.textContent = head.title;
    focusHeading();
  }, [site, route]);
  const page = (
    <Suspense fallback={null}>
      <div data-ejm-route="" key={route.path}>
        <route.Component />
      </div>
    </Suspense>
  );
  return site.App ? <site.App>{page}</site.App> : page;
}

/** The whole tree: router, page and the live region that announces route changes. Server and client render the same thing. */
export function SiteRoot({ site, ssrPath }: { site: Site; ssrPath?: string }) {
  return (
    <SiteContext.Provider value={site}>
      <Router base={site.base} ssrPath={ssrPath}>
        <Shell />
        <div id="ejm-announcer" role="status" aria-live="polite" />
      </Router>
    </SiteContext.Provider>
  );
}

/** Client entry: loads the current route's chunk, then hydrates the prerendered HTML (or renders from scratch in dev). */
export async function hydrateSite(site: Site, container: HTMLElement | null = document.getElementById('root')) {
  if (!container) throw new Error('ssg: no #root element');
  await matchRoute(site, stripBase(site, location.pathname))?.preload();
  const tree = <SiteRoot site={site} />;
  if (container.firstElementChild) return hydrateRoot(container, tree);
  const root = createRoot(container);
  root.render(tree);
  return root;
}
