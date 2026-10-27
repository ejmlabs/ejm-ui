#!/usr/bin/env node
// Load-time check for a built site: first contentful paint per route, measured with Lighthouse on its desktop profile
// (simulated 10 Mbps, 40 ms round trip, no CPU slowdown: a normal connection). It fails when a route's median is a whole second or more above its recorded baseline.
// See scripts/PERF.md.
//
//   node scripts/perf.mjs <dist-dir> [--routes /,/lazy/] [--ignore glob]... [--runs 1] [--baseline file.json] [--update] [--json]
//
// The dist directory is served from a small static server that gzips text like a host would. Every .html file is a route unless it
// matches an --ignore glob or `ignore` in .ejm-ssg/build.json. Exit code: 0 within the threshold, 1 on a regression, 2 on a usage or
// Chrome error. Set CHROME to use another Chrome or Chromium binary.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { Launcher, launch } from 'chrome-launcher';
import picomatch from 'picomatch';

export const THRESHOLD_MS = 1000; // a route this much slower than its baseline is a regression
const DEFAULT_BASELINE = join(dirname(fileURLToPath(import.meta.url)), 'perf-baseline.json');

// ---- Pure parts ----

export const median = nums => {
  const v = nums.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

/** Rows [{ route, fcp }] against a baseline { route: ms }. A route without a baseline is reported, not failed. */
export function compare(rows, baseline, threshold = THRESHOLD_MS) {
  const regressions = [];
  const results = rows.map(({ route, fcp }) => {
    const base = baseline[route] ?? null;
    const delta = base == null ? null : fcp - base;
    if (delta != null && delta >= threshold) regressions.push(`${route}: first contentful paint is ${Math.round(fcp)} ms, ${Math.round(delta)} ms above the ${Math.round(base)} ms baseline (limit ${threshold} ms)`);
    return { route, fcp, baseline: base, delta };
  });
  return { results, regressions };
}

/** Whether a page is ignored. A glob is tried against the file path under dist (`brand/kit/index.html`) and the route without its leading slash (`brand/kit/`). */
export const isIgnored = (ignore, rel, route) => ignore.map(g => picomatch(g.replace(/^\/+/, ''), { dot: true })).some(match => match(rel) || match(route.replace(/^\//, '')));

/** Route paths of every prerendered page under dist: '/', '/lazy/', '/404.html'. Pages matching an `ignore` glob are left out. */
export function discoverRoutes(dist, ignore = []) {
  const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  return walk(dist).filter(f => f.endsWith('.html')).map(f => relative(dist, f).split(sep).join('/'))
    .map(rel => ({ rel, route: rel === 'index.html' ? '/' : '/' + rel.replace(/index\.html$/, '') }))
    .filter(({ rel, route }) => !isIgnored(ignore, rel, route)).map(({ route }) => route).sort();
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon' };
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest)|image\/svg)/;

/** Maps a request url to { status, file }. Directories serve their index.html; unknown paths get 404.html (or no file). */
export function resolveRoute(dist, rawUrl) {
  const root = resolve(dist);
  const notFound = existsSync(join(root, '404.html')) ? join(root, '404.html') : null;
  let target;
  try { target = resolve(root, '.' + decodeURIComponent(new URL(rawUrl, 'http://x').pathname)); } catch { return { status: 404, file: notFound }; }
  if (target !== root && !target.startsWith(root + sep)) return { status: 404, file: notFound };
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  return existsSync(target) && statSync(target).isFile() ? { status: 200, file: target } : { status: 404, file: notFound };
}

/** Serves `dist` on a free local port. Text is gzipped when the client accepts it. Resolves { url, close }. */
export function serve(dist) {
  const cache = new Map();
  const server = createServer((req, res) => {
    const { status, file } = resolveRoute(dist, req.url ?? '/');
    if (!file) return void res.writeHead(status, { 'content-type': 'text/plain' }).end('not found');
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    let body = readFileSync(file);
    const headers = { 'content-type': type, 'cache-control': 'no-store' };
    if (COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      if (!cache.has(file)) cache.set(file, gzipSync(body, { level: 9 }));
      body = cache.get(file);
      headers['content-encoding'] = 'gzip';
    }
    res.writeHead(status, { ...headers, 'content-length': body.length }).end(req.method === 'HEAD' ? undefined : body);
  });
  return new Promise(res => server.listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => { server.close(r); server.closeAllConnections(); }) })));
}

export function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  try { return Launcher.getFirstInstallation() ?? null; } catch { return null; }
}

// ---- Lighthouse ----

/** First contentful paint of one cold load of `url`, in ms. Lighthouse clears storage and the cache before each run. */
async function fcpOnce(lighthouse, config, port, url) {
  const result = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance'], onlyAudits: ['first-contentful-paint'] }, config);
  if (result.lhr.runtimeError) throw new Error(`${url}: ${result.lhr.runtimeError.message}`);
  const fcp = result.lhr.audits['first-contentful-paint'].numericValue;
  if (!Number.isFinite(fcp)) throw new Error(`${url}: first contentful paint was not measured`);
  return fcp;
}

const ms = n => (n == null ? '-' : String(Math.round(n)));

export function formatReport(results, regressions, runs) {
  const head = ['route', 'FCP ms', 'baseline', 'change'];
  const body = results.map(r => [r.route, ms(r.fcp), ms(r.baseline), r.delta == null ? 'new' : (r.delta > 0 ? '+' : '') + Math.round(r.delta)]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map(b => b[i].length)));
  const line = c => c.map((x, i) => (i ? x.padStart(w[i]) : x.padEnd(w[i]))).join('  ');
  return [
    `ejm perf: first contentful paint, Lighthouse desktop profile (simulated 10 Mbps, 40 ms round trip), median of ${runs} run${runs === 1 ? '' : 's'}`,
    line(head), ...body.map(line),
    regressions.length ? `\nSLOWER BY A SECOND OR MORE\n  ${regressions.join('\n  ')}` : `\nno route is ${THRESHOLD_MS} ms or more above its baseline`,
  ].join('\n');
}

// ---- CLI ----

function parseArgs(argv) {
  const o = { dist: null, routes: null, ignore: [], runs: 1, baseline: DEFAULT_BASELINE, update: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--update') o.update = true;
    else if (a === '--routes') o.routes = String(argv[++i] ?? '').split(',').filter(Boolean);
    else if (a === '--ignore') o.ignore.push(String(argv[++i] ?? ''));
    else if (a === '--baseline') o.baseline = resolve(String(argv[++i] ?? ''));
    else if (a === '--runs') { o.runs = Math.floor(Number(argv[++i])); if (!(o.runs >= 1)) throw new Error('--runs needs a number of 1 or more'); }
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else o.dist = a;
  }
  if (!o.dist) throw new Error('missing <dist-dir>');
  return o;
}

const asRoute = r => (r.startsWith('/') ? r : '/' + r) + (/[./]$|\.[a-z0-9]+$/i.test(r) ? '' : '/');

export async function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) {
    console.error(`${e.message}\nUsage: node scripts/perf.mjs <dist-dir> [--routes a,b] [--ignore glob]... [--runs 1] [--baseline f.json] [--update] [--json]`);
    return 2;
  }
  const chromePath = findChrome();
  if (!chromePath) return console.error('perf: Chrome not found. Install Google Chrome or set CHROME to a Chrome or Chromium binary.'), 2;
  const dist = resolve(o.dist);
  if (!existsSync(dist) || !statSync(dist).isDirectory()) return console.error(`perf: no build output at ${dist}`), 2;
  let server, chrome;
  try {
    const saved = join(dirname(dist), '.ejm-ssg', 'build.json'); // the ignore list the site declared at build time
    const ignore = [...(existsSync(saved) ? JSON.parse(readFileSync(saved, 'utf8')).ignore ?? [] : []), ...o.ignore];
    const routes = o.routes ? o.routes.map(asRoute) : discoverRoutes(dist, ignore);
    if (!routes.length) throw new Error(`no .html pages to measure under ${dist}`);
    const { default: lighthouse } = await import('lighthouse');
    const { default: desktopConfig } = await import('lighthouse/core/config/desktop-config.js');
    const hasBaseline = existsSync(o.baseline);
    if (!o.update && !hasBaseline) throw new Error(`no baseline at ${o.baseline}. Run with --update to record one.`);
    server = await serve(dist);
    chrome = await launch({ chromePath, chromeFlags: ['--headless=new'] });
    const rows = [];
    for (const route of routes) {
      const runs = [];
      for (let i = 0; i < o.runs; i++) runs.push(await fcpOnce(lighthouse, desktopConfig, chrome.port, new URL(route, server.url).href));
      rows.push({ route, fcp: median(runs) });
    }
    if (o.update) {
      const merged = { ...(hasBaseline && o.routes ? JSON.parse(readFileSync(o.baseline, 'utf8')) : {}), ...Object.fromEntries(rows.map(r => [r.route, Math.round(r.fcp)])) };
      writeFileSync(o.baseline, JSON.stringify(Object.fromEntries(Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))), null, 2) + '\n');
      console.log(`perf: recorded ${rows.length} baselines in ${o.baseline}`);
      return 0;
    }
    const baseline = JSON.parse(readFileSync(o.baseline, 'utf8'));
    const { results, regressions } = compare(rows, baseline);
    console.log(o.json ? JSON.stringify({ runs: o.runs, thresholdMs: THRESHOLD_MS, results, regressions }, null, 2) : formatReport(results, regressions, o.runs));
    return regressions.length ? 1 : 0;
  } catch (e) {
    console.error(`perf: ${e.message}`);
    return 2;
  } finally {
    await server?.close();
    await chrome?.kill();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main(process.argv.slice(2));
