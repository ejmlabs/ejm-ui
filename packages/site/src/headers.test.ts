import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { csp, directives, headersFile } from './headers.mjs';

const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'ejm-site-headers.mjs');
const policy = (options?: Parameters<typeof csp>[0]) => Object.fromEntries(csp(options).split('; ').map(d => [d.split(' ')[0]!, d.split(' ').slice(1)]));

/** Rules of a _headers file: path line, then indented `Name: value` lines. */
const rules = (text: string) =>
  text.split(/\n(?=\S)/).filter(b => !b.startsWith('#')).map(b => {
    const [path, ...lines] = b.trim().split('\n');
    return { path, headers: Object.fromEntries(lines.map(l => [l.trim().split(': ')[0], l.trim().split(': ').slice(1).join(': ')])) as Record<string, string> };
  });

describe('content security policy', () => {
  it('runs no inline script: script-src is self plus the analytics beacon', () => {
    const p = policy();
    expect(p['script-src']).toEqual(["'self'", 'https://static.cloudflareinsights.com']);
    expect(csp()).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
    expect(p['default-src']).toEqual(["'self'"]);
  });

  it('allows the analytics beacon to report and nothing else third party', () => {
    const p = policy();
    expect(p['connect-src']).toEqual(["'self'", 'https://cloudflareinsights.com']);
    expect(p['font-src']).toEqual(["'self'"]);
    expect(p['img-src']).toEqual(["'self'", 'data:']);
    const hosts = csp().match(/https?:\/\/[^\s;]+/g);
    expect(new Set(hosts)).toEqual(new Set(['https://static.cloudflareinsights.com', 'https://cloudflareinsights.com']));
  });

  it('allows style attributes only, never inline style elements', () => {
    const p = policy();
    expect(p['style-src']).toEqual(["'self'"]);
    expect(p['style-src-attr']).toEqual(["'unsafe-inline'"]);
  });

  it('locks down framing, forms, plugins and the base URL', () => {
    const p = policy();
    expect(p['frame-ancestors']).toEqual(["'none'"]);
    expect(p['object-src']).toEqual(["'none'"]);
    expect(p['form-action']).toEqual(["'none'"]);
    expect(p['base-uri']).toEqual(["'self'"]);
    expect(p).toHaveProperty('upgrade-insecure-requests');
  });

  it('drops the analytics hosts when analytics is off, and appends extra sources', () => {
    expect(csp({ analytics: false })).not.toContain('cloudflareinsights');
    expect(policy({ extra: { 'img-src': ['https://img.example'] } })['img-src']).toEqual(["'self'", 'data:', 'https://img.example']);
    expect(directives({ extra: { 'media-src': ['blob:'] } })['media-src']).toEqual(['blob:']);
  });
});

describe('the _headers file', () => {
  const file = headersFile();
  const [all, assets] = rules(file);

  it('sets the security headers once, on every path', () => {
    expect(all!.path).toBe('/*');
    expect(Object.keys(all!.headers).sort()).toEqual(['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options']);
    expect(all!.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(all!.headers['Strict-Transport-Security']).toMatch(/max-age=31536000/);
    expect(all!.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(all!.headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('caches hashed assets for a year and leaves pages on Cloudflare\'s revalidating default', () => {
    // Cloudflare joins a header set by two rules with a comma, so Cache-Control must be on /assets/* only.
    expect(all!.headers).not.toHaveProperty('Cache-Control');
    expect(assets!.path).toBe('/assets/*');
    expect(assets!.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
  });

  it('stays inside Cloudflare limits: 100 rules, 2000 characters a line', () => {
    expect(rules(file).length).toBeLessThanOrEqual(100);
    expect(Math.max(...file.split('\n').map(l => l.length))).toBeLessThan(2000);
  });
});

describe('ejm-site-headers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ejm-headers-'));
  const out = join(dir, 'public', '_headers');
  const run = (...args: string[]) => spawnSync('node', [bin, ...args], { encoding: 'utf8' });

  it('writes the file, then --check passes until the file drifts', () => {
    expect(run(out).status).toBe(0);
    expect(readFileSync(out, 'utf8')).toBe(headersFile());
    expect(run(out, '--check').status).toBe(0);
    writeFileSync(out, readFileSync(out, 'utf8').replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"));
    const drift = run(out, '--check');
    expect(drift.status).toBe(1);
    expect(drift.stderr).toContain('out of date');
  });

  it('--check fails when the file is missing, and --no-analytics writes the smaller policy', () => {
    expect(run(join(dir, 'none'), '--check').status).toBe(1);
    expect(execFileSync('node', [bin, '--list', '--no-analytics'], { encoding: 'utf8' })).not.toContain('cloudflareinsights');
  });
});
