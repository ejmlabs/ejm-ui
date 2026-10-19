// @vitest-environment node
// Tests for scripts/perf.mjs: the pure parts, then a real run against the fixture in headless Chrome (skipped when Chrome is missing).
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTally, discoverRoutes, evaluate, findChrome, median, medianRun, resolveRoute, serve } from '../../../../scripts/perf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..');
const KB = 1024;

describe('median', () => {
  it('takes the middle, averages an even count, ignores missing values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([5, null, NaN, 9, 1])).toBe(5);
    expect(median([])).toBeNull();
  });
});

describe('transfer tally', () => {
  const ev = (id, url, type, bytes, finish = true) => [
    ['Network.requestWillBeSent', { requestId: id, request: { url }, type }],
    ['Network.responseReceived', { requestId: id, type }],
    ...(finish ? [['Network.loadingFinished', { requestId: id, encodedDataLength: bytes }]] : []),
  ];
  it('groups bytes by resource type and counts requests', () => {
    const t = createTally();
    for (const [m, p] of [
      ...ev('1', 'http://x/', 'Document', 800), ...ev('2', 'http://x/a.js', 'Script', 70000), ...ev('3', 'http://x/b.js', 'Script', 1000),
      ...ev('4', 'http://x/a.css', 'Stylesheet', 600), ...ev('5', 'http://x/f.woff2', 'Font', 8000), ...ev('6', 'http://x/i.png', 'Image', 300),
    ]) t.push(m, p);
    expect(t.summary()).toEqual({ bytes: { html: 800, css: 600, js: 71000, fonts: 8000, other: 300 }, requests: 6 });
  });
  it('skips data urls, favicon, and requests that never finished; a redirect counts once', () => {
    const t = createTally();
    for (const [m, p] of [
      ...ev('1', 'data:image/png;base64,AAAA', 'Image', 0), ...ev('2', 'http://x/favicon.ico', 'Other', 200), ...ev('3', 'http://x/slow.js', 'Script', 0, false),
      ['Network.requestWillBeSent', { requestId: '4', request: { url: 'http://x/old' }, type: 'Document' }],
      ['Network.requestWillBeSent', { requestId: '4', request: { url: 'http://x/new/' }, type: 'Document' }],
      ['Network.loadingFinished', { requestId: '4', encodedDataLength: 500 }],
    ]) t.push(m, p);
    expect(t.summary()).toEqual({ bytes: { html: 500, css: 0, js: 0, fonts: 0, other: 0 }, requests: 1 });
  });
  it('medianRun takes the median per field', () => {
    const run = (js, lcp) => ({ bytes: { html: 1, css: 1, js, fonts: 1, other: 0 }, requests: 3, fcp: 100, lcp, cls: 0, tbt: 0, longTasks: 0 });
    const m = medianRun([run(10, 900), run(30, 700), run(20, 800)]);
    expect([m.bytes.js, m.lcp]).toEqual([20, 800]);
  });
});

describe('budget comparison', () => {
  const row = (over = {}) => ({ route: '/lazy/', bytes: { html: 2 * KB, css: 3 * KB, js: 80 * KB, fonts: 10 * KB, other: 0 }, lcp: 900, cls: 0.01, ...over });
  it('passes a route inside every limit', () => expect(evaluate([row()]).breaches).toEqual([]));
  it('names route, metric and overage for each size breach, using the budget override', () => {
    const { breaches, limits } = evaluate([row()], { budget: { js: 75, css: 2 } });
    expect(limits).toMatchObject({ js: 75, css: 2, fonts: 70, html: 30 });
    expect(breaches).toEqual([
      '/lazy/: css is 3.0 KB transferred, over the 2 KB budget by 1.0 KB',
      '/lazy/: js is 80.0 KB transferred, over the 75 KB budget by 5.0 KB',
    ]);
  });
  it('allows LCP up to the target plus the tolerance, and no more', () => {
    expect(evaluate([row({ lcp: 1380 })]).breaches).toEqual([]); // 1200 + 15% = 1380
    const [b] = evaluate([row({ lcp: 1500 })]).breaches;
    expect(b).toBe('/lazy/: LCP is 1500 ms, over the 1200 ms target (+15% tolerance = 1380 ms) by 120 ms');
    expect(evaluate([row({ lcp: 1250 })], { tolerance: 0 }).breaches).toHaveLength(1);
  });
  it('CLS must be strictly under the target; a missing metric is a breach, not a pass', () => {
    expect(evaluate([row({ cls: 0.05 })]).breaches[0]).toMatch(/CLS is 0.050, not under 0.05/);
    expect(evaluate([row({ lcp: null })]).breaches).toEqual(['/lazy/: LCP was not measured']);
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
  const perf = (...args) => spawnSync('node', [join(repo, 'scripts', 'perf.mjs'), dist, '--runs', '1', ...args], { encoding: 'utf8', timeout: 170_000 });

  beforeAll(() => {
    for (const d of ['src', 'public']) cpSync(join(repo, 'packages', 'ssg', 'fixtures', 'basic', d), join(work, d), { recursive: true });
    for (const f of ['index.html', 'vite.config.ts']) cpSync(join(repo, 'packages', 'ssg', 'fixtures', 'basic', f), join(work, f));
    symlinkSync(join(repo, 'node_modules'), join(work, 'node_modules'));
    execFileSync('node', [join(repo, 'packages', 'ssg', 'bin', 'ejm-ssg.mjs'), 'build'], { cwd: work, stdio: 'pipe' });
  }, 180_000);
  afterAll(() => rmSync(work, { recursive: true, force: true }));

  it('passes within the default budgets and reports every metric', () => {
    expect(existsSync(join(dist, 'index.html'))).toBe(true);
    const r = perf('--json');
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.breaches).toEqual([]);
    expect(report.rows.map((x) => x.route)).toEqual(['/', '/404.html', '/lazy/']);
    const home = report.rows[0];
    expect(home.bytes.js).toBeGreaterThan(30 * KB); // React, transferred gzipped
    expect(home.bytes.js).toBeLessThan(95 * KB);
    expect(home.bytes.fonts).toBeGreaterThan(1000);
    expect(home.lcp).toBeGreaterThan(0);
    expect(home.noJs.lcp).toBeGreaterThan(0);
    expect(home.cls).toBeLessThan(0.05);
    expect(home.requests).toBeGreaterThanOrEqual(3);
  }, 180_000);

  it('fails and names route, metric and overage when a budget is lowered below the measured size', () => {
    const file = join(work, 'tight.json');
    writeFileSync(file, JSON.stringify({ js: 50 }));
    const r = perf('--routes', '/', '--budget-file', file);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/OVER BUDGET\n\s+\/: js is \d+\.\d KB transferred, over the 50 KB budget by \d+\.\d KB/);
  }, 180_000);
});
