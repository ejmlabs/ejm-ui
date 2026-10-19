import { useEffect } from 'react';
import { PROJECT_LIST } from './projects.mjs';

/** Cloudflare Web Analytics, loaded the same way on every ejmlabs site. Cookieless, deferred, and skipped for visitors who
 *  send Do Not Track or Global Privacy Control and on any host that is not an ejmlabs site (localhost, previews, workers.dev). */
export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

/** Hostname to site token, from the project registry. */
export const ANALYTICS_SITES: Readonly<Record<string, string>> = Object.fromEntries(PROJECT_LIST.map(p => [p.host, p.analyticsToken]));

/** What the gate reads. Defaults come from the browser; tests pass their own. */
export interface Env {
  location?: { hostname: string };
  navigator?: { doNotTrack?: string | null; globalPrivacyControl?: boolean };
  /** Old Internet Explorer and Edge put Do Not Track on window. */
  window?: { doNotTrack?: string | null };
}

const browser = (): Env => (typeof window === 'undefined' ? {} : { location: window.location, navigator: window.navigator as Env['navigator'], window: window as Env['window'] });

/** Whether the visitor asked not to be measured. */
export function optedOut(env: Env = browser()): boolean {
  return env.navigator?.doNotTrack === '1' || env.window?.doNotTrack === '1' || env.navigator?.globalPrivacyControl === true;
}

/** The site token for this host, or undefined when analytics must not run here, including any visitor who opted out. */
export function analyticsToken(env: Env = browser()): string | undefined {
  const host = env.location?.hostname;
  if (!host || optedOut(env)) return undefined;
  return Object.hasOwn(ANALYTICS_SITES, host) ? ANALYTICS_SITES[host] : undefined;
}

/** Adds the beacon script once. Returns it, or null when analytics must not run. */
export function loadAnalytics(env: Env = browser(), doc: Document = document): HTMLScriptElement | null {
  const token = analyticsToken(env);
  if (!token || doc.querySelector('script[data-cf-beacon]')) return null;
  const s = doc.createElement('script');
  s.defer = true;
  s.src = BEACON_SRC;
  s.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  doc.head.appendChild(s);
  return s;
}

/** Mount once in the site App. It renders nothing; after hydration it adds the Cloudflare beacon when the host and the visitor allow it.
 *  The beacon follows client route changes by itself. Nothing is sent from the server render. */
export function Analytics(): null {
  useEffect(() => {
    loadAnalytics();
  }, []);
  return null;
}
