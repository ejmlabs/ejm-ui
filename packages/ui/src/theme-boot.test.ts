import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, '../public/theme-boot.js'), 'utf8');

interface Env { search?: string; host?: string; cookie?: string; stored?: string | null; systemDark?: boolean; storageThrows?: boolean }

// Runs the real file against a fake window and document and returns the data-theme it set.
function boot(env: Env): string | undefined {
  const dataset: Record<string, string> = {};
  const win = {
    location: { search: env.search ?? '', hostname: env.host ?? 'localhost' },
    localStorage: { getItem: (k: string) => { if (env.storageThrows) throw new Error('blocked'); return k === 'ejm-theme' ? (env.stored ?? null) : null; } },
    matchMedia: (q: string) => ({ matches: q.includes('dark') && !!env.systemDark }),
  };
  const doc = { cookie: env.cookie ?? '', documentElement: { dataset } };
  new Function('window', 'document', source)(win, doc);
  return dataset.theme;
}

describe('theme-boot.js', () => {
  it('reads the shared cookie on ejmlabs.com and its subdomains', () => {
    expect(boot({ host: 'ejmlabs.com', cookie: 'a=1; ejm-theme=dark; b=2' })).toBe('dark');
    expect(boot({ host: 'docs.ejmlabs.com', cookie: 'ejm-theme=light' })).toBe('light');
  });

  it('uses localStorage elsewhere and ignores the cookie there', () => {
    expect(boot({ host: 'localhost', stored: 'dark', cookie: 'ejm-theme=light' })).toBe('dark');
    expect(boot({ host: 'notejmlabs.com', cookie: 'ejm-theme=dark', stored: 'light' })).toBe('light');
  });

  it('lets ?theme= win over everything', () => {
    expect(boot({ host: 'ejmlabs.com', search: '?x=1&theme=light', cookie: 'ejm-theme=dark', systemDark: true })).toBe('light');
    expect(boot({ search: '?theme=dark', stored: 'light' })).toBe('dark');
  });

  it('falls back to the system preference, and when storage is blocked or the value is invalid', () => {
    expect(boot({ systemDark: true })).toBe('dark');
    expect(boot({ systemDark: false })).toBe('light');
    expect(boot({ storageThrows: true, systemDark: true })).toBe('dark');
    expect(boot({ host: 'ejmlabs.com', cookie: 'ejm-theme=purple', systemDark: false })).toBe('light');
    expect(boot({ search: '?theme=purple', systemDark: true })).toBe('dark');
  });
});
