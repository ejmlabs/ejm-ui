// Per-route budget gate for a built site. For every .html file under dist it follows only what that page references:
// scripts and modulepreload links (plus the static imports inside those files), stylesheets, and preloaded fonts.
// Lazy chunks (dynamic imports) are not referenced, so they do not count. Sizes are gzip, except fonts (raw: WOFF2).
// 1 KB = 1024 bytes.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

export const DEFAULT_BUDGET = { js: 95, css: 14, fonts: 70, html: 30 };
const KB = 1024;

const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const gz = file => gzipSync(readFileSync(file), { level: 9 }).length;
const kb = bytes => (bytes / KB).toFixed(1);
const STATIC_IMPORT = /\b(?:import|export)\s*(?:[\w*${},\s]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+)["']/g;

function tags(html) {
  const out = [];
  for (const m of html.matchAll(/<(script|link)\b([^>]*)>/gi)) {
    const attrs = {};
    for (const a of m[2].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? '';
    out.push({ tag: m[1].toLowerCase(), ...attrs });
  }
  return out;
}

/** Files one HTML page loads at first paint: { js, css, fonts } as absolute paths. */
export function referencedFiles(dist, htmlFile, base = '/') {
  const resolveUrl = url => {
    if (!url || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return null;
    const clean = url.split(/[?#]/)[0];
    const path = clean.startsWith('/')
      ? join(dist, base !== '/' && clean.startsWith(base) ? clean.slice(base.length) : clean)
      : join(dirname(htmlFile), clean);
    return existsSync(path) ? path : null;
  };
  const js = new Set();
  const css = new Set();
  const fonts = new Set();
  for (const t of tags(readFileSync(htmlFile, 'utf8'))) {
    if (t.tag === 'script' && t.src) js.add(resolveUrl(t.src));
    else if (t.tag === 'link' && t.rel === 'modulepreload') js.add(resolveUrl(t.href));
    else if (t.tag === 'link' && t.rel === 'stylesheet') css.add(resolveUrl(t.href));
    else if (t.tag === 'link' && t.rel === 'preload' && t.as === 'font') fonts.add(resolveUrl(t.href));
    else if (t.tag === 'link' && t.rel === 'preload' && t.as === 'script') js.add(resolveUrl(t.href));
  }
  js.delete(null), css.delete(null), fonts.delete(null);
  // A preloaded file still pulls in its static imports, so follow them.
  for (const f of js) {
    if (!/\.m?js$/.test(f)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(STATIC_IMPORT)) {
      const dep = resolve(dirname(f), m[1]);
      if (existsSync(dep)) js.add(dep);
    }
  }
  return { js: [...js], css: [...css], fonts: [...fonts] };
}

/** A glob (`*` within a folder, `**` across folders, `?`) as a RegExp over a slash-separated path. */
export function globToRegExp(glob) {
  const body = glob.replace(/^\/+/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\/?|\*|\?/g, m => (m === '*' ? '[^/]*' : m === '?' ? '[^/]' : m.length === 3 ? '(?:.*/)?' : '.*'));
  return new RegExp(`^${body}$`);
}

/** Whether a page is ignored. A glob is tried against the file path under dist (`brand/kit/index.html`) and the route without its leading slash (`brand/kit/`). */
export const isIgnored = (ignore, rel, route) => ignore.map(globToRegExp).some(re => re.test(rel) || re.test(route.replace(/^\//, '')));

const sum = (files, size) => files.reduce((n, f) => n + size(f), 0);

/** Measures every page under `dist` except those matching `ignore` globs (static pages that are not routes). `budget` overrides DEFAULT_BUDGET (KB). */
export function checkBudget(dist, budget = {}, { base = '/', ignore = [] } = {}) {
  const limits = { ...DEFAULT_BUDGET, ...budget };
  const rows = [];
  const breaches = [];
  for (const file of walk(dist).filter(f => f.endsWith('.html')).sort()) {
    const rel = relative(dist, file).split('\\').join('/');
    const route = rel === 'index.html' ? '/' : rel === '404.html' ? '/404' : '/' + rel.replace(/\/?index\.html$/, '/');
    if (isIgnored(ignore, rel, route)) continue;
    const refs = referencedFiles(dist, file, base);
    const bytes = { html: gz(file), js: sum(refs.js, gz), css: sum(refs.css, gz), fonts: sum(refs.fonts, f => statSync(f).size) };
    rows.push({ route, bytes, files: refs });
    for (const k of /** @type {const} */ (['html', 'js', 'css', 'fonts'])) {
      if (bytes[k] > limits[k] * KB)
        breaches.push(`${route}: ${k} is ${kb(bytes[k])} KB${k === 'fonts' ? '' : ' gzip'}, over the ${limits[k]} KB budget by ${kb(bytes[k] - limits[k] * KB)} KB`);
    }
  }
  if (!rows.length) breaches.push(`no .html files under ${dist}`);
  return { rows, breaches, limits };
}

export function formatReport({ rows, breaches, limits }) {
  const cell = (b, k) => `${kb(b[k])}${bytesOver(b[k], limits[k]) ? '!' : ''}`;
  const bytesOver = (n, limit) => n > limit * KB;
  const w = Math.max(5, ...rows.map(r => r.route.length));
  const line = (...c) => c[0].padEnd(w) + c.slice(1).map(x => x.padStart(10)).join('');
  return [
    `ejm-ssg budget (KB; limits js ${limits.js}, css ${limits.css}, fonts ${limits.fonts}, html ${limits.html})`,
    line('route', 'js', 'css', 'fonts', 'html'),
    ...rows.map(r => line(r.route, cell(r.bytes, 'js'), cell(r.bytes, 'css'), cell(r.bytes, 'fonts'), cell(r.bytes, 'html'))),
    breaches.length ? `\nOVER BUDGET\n  ${breaches.join('\n  ')}` : '\nall routes within budget',
  ].join('\n');
}

/** `ejm-ssg budget [dist] [--js N] [--css N] [--fonts N] [--html N] [--ignore glob]... [--json]`. Returns the exit code. */
export function main(argv, cwd = process.cwd()) {
  const flags = {};
  const pos = [];
  const ignore = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') flags.json = true;
    else if (argv[i] === '--ignore') ignore.push(String(argv[++i] ?? ''));
    else if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = Number(argv[++i]);
    else pos.push(argv[i]);
  }
  const readConfig = dir => {
    const p = join(dir, '.ejm-ssg', 'build.json');
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
  };
  const dist = resolve(cwd, pos[0] ?? readConfig(cwd)?.dist ?? 'dist');
  if (!existsSync(dist)) return console.error(`ejm-ssg budget: no build output at ${dist}`), 2;
  const saved = readConfig(dirname(dist)) ?? readConfig(cwd) ?? {};
  const override = Object.fromEntries(['js', 'css', 'fonts', 'html'].filter(k => Number.isFinite(flags[k])).map(k => [k, flags[k]]));
  const report = checkBudget(dist, { ...saved.budget, ...override }, { base: saved.base ?? '/', ignore: [...(saved.ignore ?? []), ...ignore] });
  console.log(flags.json ? JSON.stringify(report, null, 2) : formatReport(report));
  return report.breaches.length ? 1 : 0;
}
