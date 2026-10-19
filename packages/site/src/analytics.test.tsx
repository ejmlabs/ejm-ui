import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Analytics, analyticsToken, ANALYTICS_SITES, BEACON_SRC, loadAnalytics, type Env } from './analytics';

// Tokens as they were in design-kit/web/analytics.js. A wrong token silently sends one site's visits to another dashboard.
const TOKENS = {
  'ejmlabs.com': '1ccb35c8ea484d13beb469e289e0adb8',
  'cli.ejmlabs.com': '5815d1d0cf10429ab3ac683193235314',
  'ide.ejmlabs.com': '3c5bc3f589384a77801bbe33c09a95a8',
  'harness.ejmlabs.com': '0bfa5a59716e48008f6b02a8e19389f4',
};
const on = (hostname: string, navigator: Env['navigator'] = {}, window: Env['window'] = {}): Env => ({ location: { hostname }, navigator, window });

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.querySelectorAll('script[data-cf-beacon]').forEach(s => s.remove());
});

describe('analytics host map', () => {
  it('maps the four ejmlabs hosts to their tokens and nothing else', () => {
    expect(ANALYTICS_SITES).toEqual(TOKENS);
    for (const [host, token] of Object.entries(TOKENS)) expect(analyticsToken(on(host))).toBe(token);
  });

  it.each(['localhost', '127.0.0.1', 'ejmlabs.workers.dev', 'ejmlabs.com.evil.example', 'notejmlabs.com', 'www.ejmlabs.com', 'toString', '__proto__', ''])(
    'does nothing on %j',
    host => expect(analyticsToken(on(host))).toBeUndefined(),
  );
});

describe('Do Not Track and Global Privacy Control', () => {
  it.each([
    ['navigator.doNotTrack', on('ejmlabs.com', { doNotTrack: '1' })],
    ['window.doNotTrack', on('ejmlabs.com', {}, { doNotTrack: '1' })],
    ['navigator.globalPrivacyControl', on('ejmlabs.com', { globalPrivacyControl: true })],
  ])('%s switches the beacon off', (_, env) => {
    expect(analyticsToken(env)).toBeUndefined();
    expect(loadAnalytics(env)).toBeNull();
    expect(document.querySelector('script[data-cf-beacon]')).toBeNull();
  });

  it('a visitor who sent no signal, or "0", is measured', () => {
    expect(analyticsToken(on('ide.ejmlabs.com', { doNotTrack: '0', globalPrivacyControl: false }))).toBe(TOKENS['ide.ejmlabs.com']);
    expect(analyticsToken(on('ide.ejmlabs.com', { doNotTrack: null }))).toBe(TOKENS['ide.ejmlabs.com']);
  });
});

describe('the beacon script', () => {
  it('is deferred, points at Cloudflare, carries only the token, and is added once', () => {
    const env = on('cli.ejmlabs.com');
    const script = loadAnalytics(env)!;
    expect(script.defer).toBe(true);
    expect(script.src).toBe(BEACON_SRC);
    expect(JSON.parse(script.getAttribute('data-cf-beacon')!)).toEqual({ token: TOKENS['cli.ejmlabs.com'] });
    expect(loadAnalytics(env)).toBeNull();
    expect(document.querySelectorAll('script[data-cf-beacon]')).toHaveLength(1);
  });

  it('the component renders nothing and adds no script on localhost (the test host)', () => {
    const { container } = render(<Analytics />);
    expect(container.innerHTML).toBe('');
    expect(document.querySelector('script[data-cf-beacon]')).toBeNull();
  });

  it('the component adds the beacon after mount on an ejmlabs host, and not for a visitor who sent Do Not Track', () => {
    vi.stubGlobal('location', { hostname: 'ide.ejmlabs.com' });
    vi.stubGlobal('navigator', { doNotTrack: '1' });
    render(<Analytics />);
    expect(document.querySelector('script[data-cf-beacon]')).toBeNull();
    vi.stubGlobal('navigator', { doNotTrack: null });
    render(<Analytics />);
    expect(document.querySelector('script[data-cf-beacon]')).not.toBeNull();
  });
});
