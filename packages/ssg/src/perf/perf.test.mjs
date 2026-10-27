// @vitest-environment node
// Tests for scripts/perf.mjs: the pure parts, then a real Lighthouse run against the fixture (skipped when Chrome is missing).
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { THRESHOLD_MS, compare, discoverRoutes, findChrome, median, resolveRoute, serve } from '../../../../scripts/perf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');

describe('median', () => {
  it('takes the middle, averages an even count, ignores missing values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([5, null, NaN, 9, 1])).toBe(5);
    expect(median([])).toBeNull();
  });
});

describe('baseline comparison', () => {
  const baseline = { '/': 1500, '/lazy/': 1600 };
  it('flags a route a whole second or more above its baseline, naming both numbers', () => {
    const { regressions } = compare([{ route: '/', fcp: 2500 }], baseline);
    expect(regressions).toEqual(['/: first contentful paint is 2500 ms, 1000 ms above the 1500 ms baseline (limit 1000 ms)']);
  });
  it('passes a route just under the threshold, a faster route and a route with no baseline', () => {
    const { regressions, results } = compare([{ route: '/', fcp: 1500 + THRESHOLD_MS - 1 }, { route: '/lazy/', fcp: 900 }, { route: '/new/', fcp: 9000 }], baseline);
    expect(regressions).toEqual([]);
    expect(results.map(r => r.delta)).toEqual([999, -700, null]);
  });
});

describe('static server routing', () => {
  const dist = mkdtempSync(join(tmpdir(), 'ejm-perf-dist-'));
  mkdirSync(join(dist, 'lazy'));
  writeFileSync(join(dist, 'index.html'), '<h1>home</h1>');
  writeFileSync(join(dist, 'lazy', 'index.html'), '<h1>lazy</h1>');
  writeFileSync(join(dist, '404.html'), '<h1>none</h1>');
  writeFileSync(join(dist, 'app.js'), 'export const a = "x".repeat(2000);');
  afterAll(() => rmSync(dist, { recursive: true, force: true }));

  it('maps routes to files and unknown paths to 404.html', () => {
    expect(resolveRoute(dist, '/')).toEqual({ status: 200, file: join(dist, 'index.html') });
    expect(resolveRoute(dist, '/lazy/?q=1')).toEqual({ status: 200, file: join(dist, 'lazy', 'index.html') });
    expect(resolveRoute(dist, '/lazy')).toEqual({ status: 200, file: join(dist, 'lazy', 'index.html') });
    expect(resolveRoute(dist, '/nope/')).toEqual({ status: 404, file: join(dist, '404.html') });
  });
  it('lists every page as a route except those matching an ignore glob', () => {
    mkdirSync(join(dist, 'brand', 'kit'), { recursive: true });
    writeFileSync(join(dist, 'brand', 'kit', 'index.html'), '<h1>static</h1>');
    expect(discoverRoutes(dist)).toEqual(['/', '/404.html', '/brand/kit/', '/lazy/']);
    expect(discoverRoutes(dist, ['brand/**', '404.html'])).toEqual(['/', '/lazy/']);
  });
  it('never leaves the dist directory', () => {
    expect(resolveRoute(dist, '/%2e%2e/%2e%2e/etc/passwd').status).toBe(404);
    expect(resolveRoute(dist, '/..%2f..%2fetc/passwd').file).toBe(join(dist, '404.html'));
  });
  it('serves with the right MIME type, gzip for text, and the 404 status', async () => {
    const s = await serve(dist);
    try {
      const js = await fetch(`${s.url}/app.js`);
      expect(js.headers.get('content-type')).toContain('text/javascript');
      expect(await js.text()).toContain('repeat');
      const raw = await fetch(`${s.url}/app.js`, { headers: { 'accept-encoding': 'identity' } });
      expect(raw.headers.get('content-encoding')).toBeNull();
      const gz = await new Promise(res => import('node:http').then(h => h.get(`${s.url}/app.js`, { headers: { 'accept-encoding': 'gzip' } }, r => res(r))));
      expect(gz.headers['content-encoding']).toBe('gzip');
      gz.resume();
      const missing = await fetch(`${s.url}/nope/`);
      expect(missing.status).toBe(404);
      expect(await missing.text()).toContain('none');
    } finally { await s.close(); }
  });
});

// ---- Integration: build the fixture and measure it in Chrome ----
const chrome = findChrome();
if (!chrome) console.warn('perf integration tests skipped: Chrome not found. Install Google Chrome or set CHROME to a Chrome or Chromium binary.');

describe.skipIf(!chrome)('perf.mjs on the ssg fixture', () => {
  // build.test.ts builds fixtures/basic in place, and two builds in one directory would clash, so build a copy that keeps node_modules reachable.
  const work = mkdtempSync(join(tmpdir(), 'ejm-perf-fixture-'));
  const dist = join(work, 'dist');
  const baseline = join(work, 'baseline.json');
  const perf = (...args) => spawnSync('node', [join(repo, 'scripts', 'perf.mjs'), dist, '--runs', '1', '--baseline', baseline, ...args], { encoding: 'utf8', timeout: 170_000 });

  beforeAll(() => {
    const fixture = join(repo, 'packages', 'ssg', 'fixtures', 'basic');
    cpSync(join(fixture, 'src'), join(work, 'src'), { recursive: true });
    if (existsSync(join(fixture, 'public'))) cpSync(join(fixture, 'public'), join(work, 'public'), { recursive: true });
    for (const f of ['index.html', 'vite.config.ts']) cpSync(join(fixture, f), join(work, f));
    symlinkSync(join(repo, 'node_modules'), join(work, 'node_modules'));
    execFileSync('node', [join(repo, 'packages', 'ssg', 'bin', 'ejm-ssg.mjs'), 'build'], { cwd: work, stdio: 'pipe' });
  }, 180_000);
  afterAll(() => rmSync(work, { recursive: true, force: true }));

  it('records a baseline, then passes against it and reports every route', () => {
    expect(existsSync(join(dist, 'index.html'))).toBe(true);
    const update = perf('--update');
    expect(update.status, update.stdout + update.stderr).toBe(0);
    const recorded = JSON.parse(readFileSync(baseline, 'utf8'));
    expect(Object.keys(recorded)).toEqual(['/', '/404.html', '/lazy/']);
    expect(recorded['/']).toBeGreaterThan(0);
    const r = perf('--json');
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(JSON.parse(r.stdout).results.map(x => x.route)).toEqual(['/', '/404.html', '/lazy/']);
  }, 180_000);

  it('fails and names the route when its baseline is a second faster than the measurement', () => {
    const recorded = JSON.parse(readFileSync(baseline, 'utf8'));
    writeFileSync(baseline, JSON.stringify({ '/': recorded['/'] - 2 * THRESHOLD_MS }));
    const r = perf('--routes', '/');
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/\/: first contentful paint is \d+ ms, \d+ ms above the -?\d+ ms baseline/);
  }, 180_000);
});
