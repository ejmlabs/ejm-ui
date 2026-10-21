#!/usr/bin/env node
// Screenshots one URL at every screen size in MATRIX (320 px phones up to a 5120 px super ultrawide),
// checks each for horizontal overflow, and on touch screens lists tap targets under 44 px.
// No dependencies: it starts headless Google Chrome and drives it over the DevTools Protocol (set CHROME to use another binary).
// Point it at a built site: `npm run build`, serve apps/gallery/dist (`npm run preview -w @ejm/gallery`, or
// `python3 -m http.server 4861` inside the dist folder), then `node scripts/shoot.mjs http://localhost:4861/tokens --theme dark`.
// Run it in light and dark; theme-boot.js turns ?theme= into data-theme, so --theme needs that script on the page.
// Exit code 1 is the gate: the matrix check in quality-gates fails the build when any size overflows.
//
// Usage: node scripts/shoot.mjs <url> [--out dir] [--only name,name] [--theme dark|light] [--full] [--layout application] [--report file]
//   --out dir      where the PNGs go (default: <tmpdir>/ejm-shoot)
//   --only a,b     run only these matrix names
//   --theme t      appends ?theme=t to the url and emulates prefers-color-scheme: t
//   --full         save the whole page as strips of up to 2400 CSS px (name-1.png, name-2.png, ...).
//                  Without it each size is one PNG, cut off at 16000 device px of height.
//   --layout application  check the application-layout gallery fixture's rendered spacing and touch targets.
//   --report file  save the viewport measurements, layout findings and screenshot paths as JSON.
// Exit code: 0 clean, 1 on overflow or a failed layout contract, 2 on a usage or launch error.
// Pages are shot with prefers-reduced-motion: reduce so reveal animations cannot hide content.
// Chrome gets a safe-area inset override on the iPhone sizes, so env(safe-area-inset-*) can be seen
// (it only applies when the page sets viewport-fit=cover).
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// name, width x height, device pixel ratio. touch = phone or tablet (mobile emulation, tap targets checked).
// safe = simulated notch and home bar insets in CSS px.
export const MATRIX = [
  { name: 'iphone-se1', w: 320, h: 568, dpr: 2, touch: true },
  { name: 'iphone-mini', w: 375, h: 812, dpr: 3, touch: true, safe: { top: 50, bottom: 34, left: 0, right: 0 } },
  { name: 'android-small', w: 360, h: 800, dpr: 3, touch: true },
  { name: 'iphone-15', w: 393, h: 852, dpr: 3, touch: true, safe: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'iphone-pro-max', w: 430, h: 932, dpr: 3, touch: true, safe: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'phone-landscape', w: 812, h: 375, dpr: 3, touch: true, safe: { top: 0, bottom: 21, left: 47, right: 47 } },
  { name: 'ipad-mini', w: 744, h: 1133, dpr: 2, touch: true },
  { name: 'ipad-landscape', w: 1024, h: 768, dpr: 2, touch: true },
  { name: 'laptop', w: 1440, h: 900, dpr: 2 },
  { name: 'desktop-fhd', w: 1920, h: 1080, dpr: 1 },
  { name: 'qhd', w: 2560, h: 1440, dpr: 1 },
  { name: 'ultrawide-45', w: 3440, h: 1440, dpr: 1 },
  { name: 'uhd-4k', w: 3840, h: 2160, dpr: 1 },
  { name: 'super-ultrawide', w: 5120, h: 1440, dpr: 1 },
];

// Extra sizes for one-off checks, without changing the CLI: EJM_SHOOT_EXTRA="fold:280x653@2,tall:1000x3000@1"
// (add "t" after the dpr for a touch screen, for example 280x653@2t).
for (const part of (process.env.EJM_SHOOT_EXTRA || '').split(',').filter(Boolean)) {
  const m = part.match(/^([\w-]+):(\d+)x(\d+)@([\d.]+)(t?)$/);
  if (m) MATRIX.push({ name: m[1], w: +m[2], h: +m[3], dpr: +m[4], touch: !!m[5] });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseArgs(argv) {
  const o = { url: '', out: join(tmpdir(), 'ejm-shoot'), only: null, theme: '', full: false, layout: '', report: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--only') o.only = String(argv[++i] || '').split(',').filter(Boolean);
    else if (a === '--theme') o.theme = argv[++i];
    else if (a === '--full') o.full = true;
    else if (a === '--layout') o.layout = argv[++i];
    else if (a === '--report') o.report = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else if (!o.url) o.url = a;
    else throw new Error(`unexpected argument ${a}`);
  }
  if (!o.url) throw new Error('missing <url>');
  if (o.theme && !['dark', 'light'].includes(o.theme)) throw new Error('--theme must be dark or light');
  if (argv.includes('--layout') && o.layout !== 'application') throw new Error('--layout must be application');
  if (argv.includes('--report') && !o.report) throw new Error('--report needs a file path');
  if (o.only) {
    const bad = o.only.filter(n => !MATRIX.some(m => m.name === n));
    if (bad.length) throw new Error(`unknown viewport ${bad.join(', ')}. Names: ${MATRIX.map(m => m.name).join(', ')}`);
  }
  return o;
}

// ---- Chrome and the DevTools Protocol ----
let chrome = null, profile = '';
function cleanup() {
  if (chrome && chrome.exitCode === null) { try { chrome.kill('SIGKILL'); } catch {} }
  if (profile) { try { rmSync(profile, { recursive: true, force: true }); } catch {} profile = ''; }
}
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { cleanup(); process.exit(130); });

async function launch() {
  profile = mkdtempSync(join(tmpdir(), 'ejm-chrome-'));
  chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
    '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb', '--disable-gpu', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.on('error', e => { console.error(`cannot start Chrome at ${CHROME}: ${e.message}`); process.exit(2); });
  return await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not report a debugging port in 20 s')), 20000);
    chrome.stderr.on('data', d => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    chrome.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited early (${code})`)); });
  });
}

class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.waiters = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
      } else if (msg.method) {
        for (const w of [...this.waiters]) if (w.method === msg.method && w.session === msg.sessionId) { this.waiters.splice(this.waiters.indexOf(w), 1); w.resolve(msg.params); }
      }
    });
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', () => rej(new Error('websocket failed')), { once: true }); });
    return new Cdp(ws);
  }
  send(method, params = {}, session, timeout = 30000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out after ${timeout} ms`)); }, timeout);
      this.pending.set(id, { method, resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
    });
  }
  once(method, session, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const w = { method, session, resolve: v => { clearTimeout(timer); resolve(v); } };
      const timer = setTimeout(() => { this.waiters.splice(this.waiters.indexOf(w), 1); reject(new Error(`${method} did not fire in ${timeout} ms`)); }, timeout);
      this.waiters.push(w);
    });
  }
}

// ---- In-page measurements ----
const MEASURE = (W, touch) => `(async () => {
  const W = ${W}, touch = ${touch};
  await document.fonts.ready;
  const de = document.documentElement, body = document.body;
  const limit = Math.min(window.innerWidth, W);
  const scrollWidth = Math.max(de.scrollWidth, body ? body.scrollWidth : 0);
  const label = el => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\\s+/).filter(Boolean).slice(0, 3).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 28);
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '') + (txt ? ' "' + txt + '"' : '');
  };
  const depth = el => { let d = 0; for (let p = el; p.parentElement; p = p.parentElement) d++; return d; };
  const clipped = el => {
    for (let p = el.parentElement; p && p !== body && p !== de; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true;
    return false;
  };
  const offenders = [];
  for (const el of body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) continue;
    if (r.right <= limit + 0.5 && r.left >= -0.5) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (clipped(el)) continue;
    offenders.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), depth: depth(el) });
  }
  offenders.sort((a, b) => (b.right - a.right) || (b.depth - a.depth));
  const small = [];
  if (touch) {
    const sel = 'a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button], [role=link], [tabindex]:not([tabindex="-1"])';
    for (const el of body.querySelectorAll(sel)) {
      if (el.closest('.skip-link, .sr-only')) continue;
      const closed = el.closest('details:not([open])');
      if (closed && !(el.tagName === 'SUMMARY' && el.parentElement === closed)) continue; // folded away
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (el.tagName === 'A' && cs.display === 'inline') continue; // inline links in running text are exempt
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.width < 43.5 || r.height < 43.5) small.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return { innerWidth: window.innerWidth, scrollWidth, overflow: scrollWidth > limit || offenders.some(o => o.right > limit + 0.5), offenders: offenders.slice(0, 10), offenderCount: offenders.length, small: small.slice(0, 12), smallCount: small.length };
})()`;

// Run inside Chrome. Fixture markers identify the contract; every value comes from rendered boxes or computed styles.
function measureApplicationLayout() {
  const breaches = [];
  const metrics = { theme: document.documentElement.dataset.theme, padding: {}, contentGaps: [], fieldGaps: [], tables: {} };
  const near = (label, actual, expected) => {
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > 0.75) breaches.push(`${label}: expected ${expected}px, measured ${actual}px`);
  };
  const one = (selector, parent = document) => {
    const found = parent.querySelectorAll(selector);
    if (found.length !== 1) { breaches.push(`${selector}: expected one visible element, found ${found.length}`); return null; }
    const element = found[0];
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || getComputedStyle(element).visibility === 'hidden') {
      breaches.push(`${selector}: element is not visible`);
      return null;
    }
    return element;
  };
  const gaps = (element, expected, label) => {
    const boxes = [...element.children].map(child => child.getBoundingClientRect());
    if (boxes.length < 2 || boxes.some(box => !box.width || !box.height)) breaches.push(`${label}: visible child boxes are missing`);
    return boxes.slice(1).map((box, index) => {
      const gap = box.top - boxes[index].bottom;
      near(`${label} ${index + 1}`, gap, expected);
      return gap;
    });
  };
  const page = one('[data-application-layout]');
  if (!page) return { breaches, metrics };
  const style = getComputedStyle(page);
  const padding = window.innerWidth >= 640 ? 48 : 32;
  metrics.padding = { top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) };
  near('page top padding', metrics.padding.top, padding);
  near('page bottom padding', metrics.padding.bottom, padding);
  if (page.children.length !== 4) breaches.push(`application page: expected four content groups, found ${page.children.length}`);
  metrics.contentGaps = gaps(page, 24, 'page content gap');
  const heading = one('#application-title', page);
  const description = one('[data-layout-description]', page);
  if (heading && description) {
    const h = heading.getBoundingClientRect(), d = description.getBoundingClientRect();
    metrics.heading = { left: h.left, bottom: h.bottom, copyLeft: d.left, copyTop: d.top, gap: d.top - h.bottom };
    near('heading/copy left alignment', d.left - h.left, 0);
    near('heading/copy gap', d.top - h.bottom, 8);
  }
  if (document.querySelectorAll('h1').length !== 1 || page.querySelector('header header')) breaches.push('application heading: expected one h1 and no nested headers');
  const form = one('[data-layout-form]', page);
  if (form) metrics.formGaps = gaps(form, 24, 'form content gap');
  const fields = [...page.querySelectorAll('[data-layout-field]')];
  if (fields.length !== 2) breaches.push(`fields: expected two groups, found ${fields.length}`);
  metrics.fieldGaps = fields.map((field, index) => {
    if (field.children.length !== 3) breaches.push(`field ${index + 1}: label, control or help is missing`);
    return gaps(field, 8, `field ${index + 1} gap`);
  });
  const inline = one('[data-layout-inline]', page);
  if (inline && (getComputedStyle(inline).display !== 'inline' || !inline.closest('p'))) breaches.push('prose link: expected an inline link within a paragraph');
  const action = one('[data-layout-action]', page);
  if (action) {
    const box = action.getBoundingClientRect();
    metrics.action = { width: box.width, height: box.height };
    if (box.width < 43.5 || box.height < 43.5) breaches.push(`standalone action: measured ${box.width} by ${box.height}px, expected at least 44 by 44px`);
  }
  if (page.querySelectorAll('[data-layout-table]').length !== 8) breaches.push('tables: expected all four states in both densities');
  for (const density of ['comfortable', 'compact']) {
    const expected = density === 'compact' ? 6 : 12;
    const paddingOf = (cell, label) => {
      if (!cell) { breaches.push(`${label}: table cell is missing`); return null; }
      const box = cell.getBoundingClientRect(), css = getComputedStyle(cell);
      if (!box.width || !box.height) breaches.push(`${label}: table cell is not visible`);
      const value = { top: parseFloat(css.paddingTop), bottom: parseFloat(css.paddingBottom), end: parseFloat(css.paddingInlineEnd) };
      near(`${label} top padding`, value.top, expected);
      near(`${label} bottom padding`, value.bottom, expected);
      return value;
    };
    const state = name => one(`[data-layout-table="${name}"][data-layout-density="${density}"]`, page);
    const data = state('default'), loading = state('loading');
    for (const name of ['empty', 'error']) {
      const element = state(name);
      if (element && (!element.querySelector('table thead th') || !element.querySelector('table tbody td'))) breaches.push(`${density} ${name}: table content is missing`);
    }
    const dataPadding = paddingOf(data?.querySelector('tbody tr:first-child > :first-child'), `${density} data`);
    const loadingPadding = paddingOf(loading?.querySelector('tbody tr[aria-hidden="true"] > td:first-child'), `${density} loading`);
    metrics.tables[density] = { data: dataPadding, loading: loadingPadding };
    if (dataPadding && loadingPadding) {
      for (const axis of ['top', 'bottom', 'end']) near(`${density} data/loading ${axis} parity`, loadingPadding[axis] - dataPadding[axis], 0);
    }
  }
  return { breaches, metrics };
}

// Scroll through the page once so lazy images and scroll-driven parts have run, then return to the top.
const SCROLL_PASS = `(async () => {
  const step = Math.max(200, window.innerHeight - 100);
  const max = document.documentElement.scrollHeight;
  for (let y = 0, n = 0; y < max && n < 80; y += step, n++) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 150));
})()`;

async function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`${e.message}\nUsage: node scripts/shoot.mjs <url> [--out dir] [--only name,name] [--theme dark|light] [--full] [--layout application] [--report file]`);
    process.exit(2);
  }
  const target = new URL(opts.url);
  if (opts.theme) target.searchParams.set('theme', opts.theme);
  mkdirSync(opts.out, { recursive: true });
  const base = (target.pathname.split('/').filter(Boolean).pop() || 'index').replace(/\.[a-z]+$/, '') + (opts.theme ? `-${opts.theme}` : '');
  const matrix = MATRIX.filter(m => !opts.only || opts.only.includes(m.name));

  const wsUrl = await launch();
  const cdp = await Cdp.connect(wsUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, s);
  await cdp.send('Runtime.enable', {}, s);
  const evalIn = async expr => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, s, 60000);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };

  const rows = [];
  for (const m of matrix) {
    const row = { m, error: '' };
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: m.w, height: m.h, deviceScaleFactor: m.dpr, mobile: !!m.touch, screenWidth: m.w, screenHeight: m.h }, s);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: !!m.touch, maxTouchPoints: m.touch ? 5 : 1 }, s);
      await cdp.send('Emulation.setEmulatedMedia', { features: [
        { name: 'prefers-reduced-motion', value: 'reduce' },
        { name: 'prefers-color-scheme', value: opts.theme || 'light' },
        { name: 'hover', value: m.touch ? 'none' : 'hover' },
        { name: 'pointer', value: m.touch ? 'coarse' : 'fine' },
      ] }, s).catch(() => {});
      // Experimental; ignored when this Chrome lacks it. Lets env(safe-area-inset-*) show up with viewport-fit=cover.
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: m.safe || { top: 0, bottom: 0, left: 0, right: 0 } }, s).catch(() => {});
      const loaded = cdp.once('Page.loadEventFired', s, 45000);
      await cdp.send('Page.navigate', { url: target.href }, s);
      await loaded;
      await evalIn('document.fonts.ready.then(() => true)');
      await evalIn(SCROLL_PASS);
      // EJM_SHOOT_TEXT=2 doubles every font size, to check layouts at 200% text size.
      const k = Number(process.env.EJM_SHOOT_TEXT) || 1;
      if (k !== 1) await evalIn(`(() => { const els = [document.documentElement, ...document.body.querySelectorAll('*')]; const px = els.map(e => parseFloat(getComputedStyle(e).fontSize)); els.forEach((e, i) => e.style.setProperty('font-size', px[i] * ${k} + 'px', 'important')); })()`);
      await sleep(250);

      row.result = await evalIn(MEASURE(m.w, !!m.touch));
      if (opts.layout === 'application') {
        row.layout = await evalIn(`(${measureApplicationLayout.toString()})()`);
        if (opts.theme && row.layout.metrics.theme !== opts.theme) row.layout.breaches.push(`theme: expected ${opts.theme}, measured ${row.layout.metrics.theme}`);
      }
      const lm = await cdp.send('Page.getLayoutMetrics', {}, s);
      const cw = Math.ceil(lm.cssContentSize.width), ch = Math.ceil(lm.cssContentSize.height);
      row.pageHeight = ch;
      const width = Math.max(m.w, cw);
      const shot = async (y, h, file) => {
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true, clip: { x: 0, y, width, height: h, scale: 1 } }, s, 90000);
        writeFileSync(file, Buffer.from(data, 'base64'));
      };
      const files = [];
      if (opts.full) {
        const strip = 2400;
        for (let y = 0, n = 1; y < ch; y += strip, n++) {
          const f = join(opts.out, `${base}-${m.name}-${n}.png`);
          await shot(y, Math.min(strip, ch - y), f); files.push(f);
        }
      } else {
        const f = join(opts.out, `${base}-${m.name}.png`);
        const cap = Number(process.env.EJM_SHOOT_CAP) || Math.floor(16000 / m.dpr); // EJM_SHOOT_CAP=900 keeps only the top 900 CSS px
        await shot(0, Math.min(ch, cap), f); files.push(f);
        if (ch > cap) row.cut = true;
      }
      row.files = files;
    } catch (e) { row.error = e.message; }
    rows.push(row);
  }

  // ---- Report ----
  console.log(`\n${target.href}\nscreenshots in ${opts.out}\n`);
  const pad = (v, n) => String(v).padEnd(n);
  console.log(`${pad('viewport', 17)}${pad('size', 14)}${pad('page height', 12)}${pad('scrollW', 9)}${pad('overflow', 10)}tap<44`);
  let bad = 0;
  for (const { m, result: r, error, pageHeight, cut, layout } of rows) {
    const size = `${m.w}x${m.h}@${m.dpr}`;
    if (error) { bad++; console.log(`${pad(m.name, 17)}${pad(size, 14)}ERROR ${error}`); continue; }
    if (r.overflow || (opts.layout && (r.smallCount || !layout || layout.breaches.length))) bad++;
    const tap = m.touch ? r.smallCount : '-';
    console.log(`${pad(m.name, 17)}${pad(size, 14)}${pad(pageHeight + (cut ? '+' : ''), 12)}${pad(r.scrollWidth, 9)}${pad(r.overflow ? 'YES' : 'no', 10)}${tap}`);
  }
  for (const { m, result: r } of rows) {
    if (!r) continue;
    if (r.overflow || r.innerWidth !== m.w) {
      console.log(`\n${m.name}: innerWidth ${r.innerWidth}, scrollWidth ${r.scrollWidth}${r.innerWidth !== m.w ? ' (the browser widened the layout viewport, check the viewport meta tag)' : ''}`);
      for (const o of r.offenders) console.log(`  ${o.el}  left ${o.left} right ${o.right} width ${o.width}`);
      if (r.offenderCount > r.offenders.length) console.log(`  ... ${r.offenderCount - r.offenders.length} more`);
    }
  }
  for (const { m, result: r } of rows) {
    if (!r || !r.smallCount) continue;
    console.log(`\n${m.name}: ${r.smallCount} tap target(s) under 44 px`);
    for (const t of r.small) console.log(`  ${t.el}  ${t.w}x${t.h}`);
  }
  for (const { m, layout } of rows) {
    if (!layout?.breaches.length) continue;
    console.log(`\n${m.name}: application layout contract failed`);
    for (const breach of layout.breaches) console.log(`  ${breach}`);
  }
  if (opts.report) writeFileSync(opts.report, JSON.stringify({ url: target.href, theme: opts.theme, layout: opts.layout, rows, failed: bad }, null, 2) + '\n');
  console.log(bad ? `\n${bad} viewport(s) with overflow, errors or failed layout checks` : opts.layout ? '\napplication layout passed at every size' : '\nno horizontal overflow at any size');
  try { await cdp.send('Browser.close', {}, undefined, 3000); } catch {}
  cleanup();
  process.exit(bad ? 1 : 0);
}

main().catch(e => { console.error(e.message); cleanup(); process.exit(2); });
