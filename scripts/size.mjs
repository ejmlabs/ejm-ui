#!/usr/bin/env node
// Per-route transfer budgets for a built site (design.md decision 7). For every .html file under the build directory it
// adds up what that page loads at first: the HTML itself, the stylesheets and scripts it references (plus modulepreload),
// and the fonts it preloads. Sizes are gzip, except fonts, which are WOFF2 and already compressed. Lazy chunks are not
// referenced from the HTML, so they are not counted. Exits 1 when any route is over budget.
//
//   node scripts/size.mjs [dist-dir]          default apps/gallery/dist
//   node scripts/size.mjs dist --json         machine readable
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// Budgets in KB. Starting numbers, tuned from measurement; changing one is a decision to record in design.md.
export const BUDGET = { html: 30, css: 14, js: 95, fonts: 70 };
const BOOT_MAX = 1024; // theme-boot.js, bytes

const args = process.argv.slice(2);
const dir = resolve(args.find(a => !a.startsWith('--')) || 'apps/gallery/dist');
if (!existsSync(dir)) { console.error(`no build output at ${dir}`); process.exit(2); }

const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const gz = file => gzipSync(readFileSync(file), { level: 9 }).length;
const raw = file => statSync(file).size;
const local = (from, url) => {
  const clean = url.split(/[?#]/)[0];
  if (/^(https?:)?\/\//.test(clean) || !clean) return null;
  const p = clean.startsWith('/') ? join(dir, clean) : join(dirname(from), clean);
  return existsSync(p) ? p : null;
};

const routes = walk(dir).filter(f => f.endsWith('.html')).map(html => {
  const text = readFileSync(html, 'utf8');
  const tags = [...text.matchAll(/<(link|script)\b[^>]*>/g)].map(m => m[0]);
  const attr = (t, n) => (t.match(new RegExp(`\\s${n}=["']([^"']+)["']`)) || [])[1];
  const sets = { css: new Set(), js: new Set(), fonts: new Set() };
  for (const t of tags) {
    const url = t.startsWith('<script') ? attr(t, 'src') : attr(t, 'href');
    const f = url && local(html, url);
    if (!f) continue;
    const rel = attr(t, 'rel') || '';
    if (f.endsWith('.css')) sets.css.add(f);
    else if (f.endsWith('.js') && (t.startsWith('<script') || rel.includes('modulepreload'))) sets.js.add(f);
    else if (f.endsWith('.woff2') && rel.includes('preload')) sets.fonts.add(f);
  }
  const sum = (s, fn) => [...s].reduce((n, f) => n + fn(f), 0) / 1024;
  return { route: `/${relative(dir, html).replace(/index\.html$/, '')}`, html: gz(html) / 1024, css: sum(sets.css, gz), js: sum(sets.js, gz), fonts: sum(sets.fonts, raw) };
});

const boot = join(dir, 'theme-boot.js');
const bootBytes = existsSync(boot) ? raw(boot) : null;
const over = [];
for (const r of routes) for (const k of Object.keys(BUDGET)) if (r[k] > BUDGET[k]) over.push(`${r.route}: ${k} ${r[k].toFixed(1)} KB is over ${BUDGET[k]} KB`);
if (bootBytes !== null && bootBytes > BOOT_MAX) over.push(`theme-boot.js is ${bootBytes} bytes, over ${BOOT_MAX}`);

if (args.includes('--json')) console.log(JSON.stringify({ budget: BUDGET, routes, bootBytes, over }, null, 2));
else {
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${pad('route', 28)}${pad('html', 10)}${pad('css', 10)}${pad('js', 10)}fonts   (gzip KB; fonts are woff2)`);
  for (const r of routes) console.log(`${pad(r.route, 28)}${pad(r.html.toFixed(1), 10)}${pad(r.css.toFixed(1), 10)}${pad(r.js.toFixed(1), 10)}${r.fonts.toFixed(1)}`);
  console.log(`${pad('budget', 28)}${pad(BUDGET.html, 10)}${pad(BUDGET.css, 10)}${pad(BUDGET.js, 10)}${BUDGET.fonts}`);
  if (bootBytes !== null) console.log(`theme-boot.js ${bootBytes} bytes`);
  console.log(over.length ? `\n${over.join('\n')}` : '\nwithin budget');
}
process.exit(over.length ? 1 : 0);
