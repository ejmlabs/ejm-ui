import { parseThemeChoice, resolveTheme, themeCookie, type ResolvedTheme, type ThemeChoice } from '@ejm/core';
import { THEME_COOKIE } from '@ejm/tokens';

export interface ThemeState {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
}

export interface ThemeStore {
  getSnapshot(): ThemeState;
  subscribe(listener: () => void): () => void;
  setChoice(choice: ThemeChoice): void;
}

/** Everything the store touches in the browser, so tests can fake it. */
export interface ThemeEnv {
  hostname: string;
  secure: boolean;
  search: string;
  getCookie(): string;
  setCookie(cookie: string): void;
  getStored(): string | null;
  setStored(value: string | null): void;
  /** The <html> element's data attributes. */
  rootData: DOMStringMap;
  systemDark: Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;
}

export const SERVER_THEME: ThemeState = { choice: 'system', resolved: 'light' };

/** Exact host ejmlabs.com or any subdomain: the same rule theme-boot.js uses to pick the cookie over localStorage. */
export const isSharedHost = (hostname: string) => /(^|\.)ejmlabs\.com$/.test(hostname);

/**
 * The cookie string the store writes. On ejmlabs hosts it carries exactly the attributes in THEME_COOKIE, shared by
 * every subdomain. Anywhere else (localhost, previews) the Domain attribute is left off, which makes it host-only.
 */
export function themeCookieFor(choice: ThemeChoice, hostname: string, secure: boolean): string {
  const cookie = themeCookie(choice, { secure: secure && THEME_COOKIE.secureOnHttps });
  return isSharedHost(hostname) ? cookie : cookie.replace(/; Domain=[^;]*/, '');
}

export function browserThemeEnv(): ThemeEnv {
  const storage = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* storage can be blocked; the choice then lasts for this page only */
    }
  };
  return {
    hostname: location.hostname,
    secure: location.protocol === 'https:',
    search: location.search,
    getCookie: () => document.cookie,
    setCookie: c => void (document.cookie = c),
    getStored: () => {
      try {
        return localStorage.getItem(THEME_COOKIE.name);
      } catch {
        return null;
      }
    },
    setStored: v => storage(() => (v === null ? localStorage.removeItem(THEME_COOKIE.name) : localStorage.setItem(THEME_COOKIE.name, v))),
    rootData: document.documentElement.dataset,
    systemDark: matchMedia('(prefers-color-scheme: dark)'),
  };
}

/**
 * The theme choice and the data-theme attribute. theme-boot.js already set data-theme before first paint, so creating the
 * store changes nothing on screen. It writes only when the visitor chooses, and follows the OS while nothing is saved.
 */
export function createThemeStore(env: ThemeEnv): ThemeStore {
  const shared = isSharedHost(env.hostname);
  const override = /[?&]theme=(light|dark)(&|$)/.test(env.search); // test override from theme-boot.js, never saved
  const listeners = new Set<() => void>();
  const readChoice = (): ThemeChoice => parseThemeChoice(shared ? /(?:^|;\s*)ejm-theme=(light|dark)(?:;|$)/.exec(env.getCookie())?.[1] : env.getStored());
  const readResolved = (choice: ThemeChoice): ResolvedTheme => {
    const set = env.rootData["theme"];
    return set === 'light' || set === 'dark' ? set : resolveTheme(choice, env.systemDark.matches);
  };

  let state: ThemeState | undefined;
  const get = () => {
    if (!state) {
      const choice = readChoice();
      state = { choice, resolved: readResolved(choice) };
    }
    return state;
  };
  const apply = (choice: ThemeChoice) => {
    const resolved = resolveTheme(choice, env.systemDark.matches);
    env.rootData["theme"] = resolved;
    env.rootData["themeChoice"] = choice;
    state = { choice, resolved };
    listeners.forEach(l => l());
  };
  const onSystemChange = () => {
    if (get().choice === 'system' && !override) apply('system');
  };

  return {
    getSnapshot: get,
    subscribe(listener) {
      if (listeners.size === 0) env.systemDark.addEventListener('change', onSystemChange);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) env.systemDark.removeEventListener('change', onSystemChange);
      };
    },
    setChoice(choice) {
      env.setCookie(themeCookieFor(choice, env.hostname, env.secure));
      if (!shared) env.setStored(choice === 'system' ? null : choice); // theme-boot.js reads localStorage off ejmlabs hosts
      apply(choice);
    },
  };
}
