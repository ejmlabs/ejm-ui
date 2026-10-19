import { THEME_COOKIE } from '@ejm/tokens';
import { describe, expect, it, vi } from 'vitest';
import { createThemeStore, themeCookieFor, type ThemeEnv } from './theme-store';

function fakeEnv({ systemDark = false, stored: storedInit = null, cookie: cookieInit = '', ...over }: Omit<Partial<ThemeEnv>, 'systemDark'> & { systemDark?: boolean; stored?: string | null; cookie?: string } = {}) {
  const listeners = new Set<() => void>();
  const writes: string[] = [];
  let cookie = cookieInit;
  let stored = storedInit;
  const mq = {
    matches: systemDark,
    addEventListener: (_: string, l: unknown) => void listeners.add(l as () => void),
    removeEventListener: (_: string, l: unknown) => void listeners.delete(l as () => void),
  } as unknown as ThemeEnv['systemDark'] & { matches: boolean };
  const env: ThemeEnv = {
    hostname: 'localhost',
    secure: false,
    search: '',
    getCookie: () => cookie,
    setCookie: c => {
      writes.push(c);
      cookie = c.split(';')[0] ?? '';
    },
    getStored: () => stored,
    setStored: v => void (stored = v),
    rootData: {},
    systemDark: mq,
    ...over,
  };
  return { env, writes, mq, flipSystem: (dark: boolean) => { mq.matches = dark; listeners.forEach(l => l()); }, listeners, stored: () => stored };
}

describe('theme cookie (shared across ejmlabs.com)', () => {
  it('uses exactly the THEME_COOKIE attributes on ejmlabs hosts, so a second subdomain reads the same choice', () => {
    for (const host of ['ejmlabs.com', 'docs.ejmlabs.com']) {
      expect(themeCookieFor('dark', host, true)).toBe(
        `${THEME_COOKIE.name}=dark; Domain=${THEME_COOKIE.domain}; Path=${THEME_COOKIE.path}; SameSite=${THEME_COOKIE.sameSite}; Max-Age=${THEME_COOKIE.maxAge}; Secure`,
      );
    }
    expect(themeCookieFor('light', 'ejmlabs.com', false)).not.toContain('Secure');
  });

  it('is host-only on localhost and look-alike domains', () => {
    expect(themeCookieFor('dark', 'localhost', false)).toBe(`ejm-theme=dark; Path=/; SameSite=Lax; Max-Age=${THEME_COOKIE.maxAge}`);
    expect(themeCookieFor('dark', 'notejmlabs.com', false)).not.toContain('Domain=');
  });

  it('clears the cookie for system', () => {
    expect(themeCookieFor('system', 'ejmlabs.com', false)).toContain('ejm-theme=;');
    expect(themeCookieFor('system', 'ejmlabs.com', false)).toContain('Max-Age=0');
  });

  it('a choice written on one ejmlabs host is the choice read on another', () => {
    const jar = { value: '' };
    const a = fakeEnv({ hostname: 'ejmlabs.com' });
    a.env.setCookie = c => void (jar.value = c.split(';')[0] ?? '');
    createThemeStore(a.env).setChoice('dark');
    const b = fakeEnv({ hostname: 'docs.ejmlabs.com', cookie: jar.value });
    expect(createThemeStore(b.env).getSnapshot().choice).toBe('dark');
  });
});

describe('theme store', () => {
  it('starts as system and changes nothing on screen when nothing is saved', () => {
    const { env, writes } = fakeEnv({ systemDark: true });
    const store = createThemeStore(env);
    expect(store.getSnapshot()).toEqual({ choice: 'system', resolved: 'dark' });
    expect(env.rootData.theme).toBeUndefined();
    expect(writes).toEqual([]);
  });

  it('reads the saved choice, and keeps the data-theme the boot script set', () => {
    const { env } = fakeEnv({ stored: 'light', systemDark: true });
    env.rootData.theme = 'light';
    expect(createThemeStore(env).getSnapshot()).toEqual({ choice: 'light', resolved: 'light' });
  });

  it('writes the cookie and localStorage and sets data-theme when the visitor chooses', () => {
    const { env, writes, stored } = fakeEnv();
    const store = createThemeStore(env);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setChoice('dark');
    expect(env.rootData.theme).toBe('dark');
    expect(env.rootData.themeChoice).toBe('dark');
    expect(stored()).toBe('dark');
    expect(writes[0]).toMatch(/^ejm-theme=dark; Path=\//);
    expect(store.getSnapshot()).toEqual({ choice: 'dark', resolved: 'dark' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not touch localStorage on ejmlabs hosts', () => {
    const { env, stored } = fakeEnv({ hostname: 'ejmlabs.com' });
    createThemeStore(env).setChoice('dark');
    expect(stored()).toBeNull();
  });

  it('follows the OS while no choice is saved, and stops once the visitor chooses', () => {
    const { env, flipSystem } = fakeEnv();
    const store = createThemeStore(env);
    store.subscribe(() => {});
    flipSystem(true);
    expect(env.rootData.theme).toBe('dark');
    expect(store.getSnapshot().resolved).toBe('dark');
    store.setChoice('light');
    flipSystem(false);
    flipSystem(true);
    expect(env.rootData.theme).toBe('light');
  });

  it('choosing system returns to following the OS and clears the saved value', () => {
    const { env, flipSystem, stored } = fakeEnv({ stored: 'light' });
    const store = createThemeStore(env);
    store.subscribe(() => {});
    store.setChoice('system');
    expect(stored()).toBeNull();
    flipSystem(true);
    expect(env.rootData.theme).toBe('dark');
  });

  it('never overrides a ?theme= test override when the OS changes', () => {
    const { env, flipSystem } = fakeEnv({ search: '?theme=light' });
    env.rootData.theme = 'light';
    createThemeStore(env).subscribe(() => {});
    flipSystem(true);
    expect(env.rootData.theme).toBe('light');
  });

  it('listens to the OS only while something subscribes', () => {
    const { env, listeners } = fakeEnv();
    const store = createThemeStore(env);
    const off = store.subscribe(() => {});
    expect(listeners.size).toBe(1);
    off();
    expect(listeners.size).toBe(0);
  });
});
