// Draws a terminal screen (see screen.mjs) as HTML in IBM Plex Mono with a product color scheme, and
// photographs it with headless Chrome over the DevTools Protocol (no automation library).
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FONT_FILE, palette256 } from './theme.mjs';

export const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const chromeAvailable = () => existsSync(CHROME);

// IBM Plex Mono advances 0.6 em. At 15 px that is exactly 9 px, so cells sit on whole pixels.
export const METRICS = { fontSize: 15, cellWidth: 9, cellHeight: 20, margin: 20 };

const esc = (/** @type {string} */ s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** @param {string} a @param {string} b @param {number} t share of a */
function mix(a, b, t) {
  const p = (/** @type {string} */ h, /** @type {number} */ i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map(i => Math.round(p(a, i) * t + p(b, i) * (1 - t)).toString(16).padStart(2, '0')).join('');
}

/**
 * @param {import('./screen.mjs').Cell[][]} grid
 * @param {import('./theme.mjs').Theme} theme
 * @param {{ rows?: number, cursor?: { x: number, y: number, visible: boolean } }} [opts] rows: how many rows to draw
 * @returns {{ html: string, width: number, height: number }}
 */
export function toHtml(grid, theme, opts = {}) {
  const { fontSize, cellWidth: cw, cellHeight: ch, margin } = METRICS;
  const pal = palette256(theme);
  const rowsShown = opts.rows ?? grid.length;
  const font = readFileSync(FONT_FILE).toString('base64');
  const cols = Math.max(...grid.map(r => r.reduce((n, c) => n + c.width, 0)));
  const width = cols * cw + margin * 2;
  const height = rowsShown * ch + margin * 2;
  const color = (/** @type {number | null} */ v, /** @type {boolean} */ rgb, /** @type {string} */ dflt) =>
    v === null ? dflt : rgb ? '#' + v.toString(16).padStart(6, '0') : (pal[v] ?? dflt);

  let rowsHtml = '';
  for (let y = 0; y < rowsShown; y++) {
    const row = grid[y] ?? [];
    let bgs = '';
    let text = '';
    let x = 0;
    let open = '';
    /** merge neighbouring cells with the same look into one span */
    for (const c of row) {
      let fg = color(c.fg, c.fgRgb, theme.foreground);
      let bg = c.bg === null ? null : color(c.bg, c.bgRgb, theme.background);
      if (c.inverse) { const t = fg; fg = bg ?? theme.background; bg = t; }
      const cur = opts.cursor?.visible && opts.cursor.x === x && opts.cursor.y === y;
      if (cur) { bg = theme.cursor; fg = theme.background; }
      if (c.dim && !cur) fg = mix(fg, bg ?? theme.background, 0.6);
      if (bg) bgs += `<b style="left:${x * cw}px;width:${c.width * cw}px;background:${bg}"></b>`;
      const style = `color:${fg}${c.bold ? ';font-weight:700' : ''}${c.italic ? ';font-style:italic' : ''}` +
        (c.underline || c.strike ? `;text-decoration:${[c.underline && 'underline', c.strike && 'line-through'].filter(Boolean).join(' ')}` : '');
      const ch1 = c.hidden ? ' ' : c.ch;
      const piece = /^[\x20-\x7e]$/.test(ch1) ? esc(ch1) : `<i style="width:${c.width * cw}px">${esc(ch1)}</i>`;
      if (style !== open) { text += open ? '</span>' : ''; text += `<span style="${style}">`; open = style; }
      text += piece;
      x += c.width;
    }
    if (open) text += '</span>';
    rowsHtml += `<div class="r" style="top:${y * ch}px">${bgs}<p>${text}</p></div>`;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"IBM Plex Mono";font-weight:500;src:url(data:font/woff2;base64,${font}) format("woff2")}
html,body{margin:0;background:${theme.background}}
#t{position:relative;margin:${margin}px;width:${cols * cw}px;height:${rowsShown * ch}px;font:500 ${fontSize}px/${ch}px "IBM Plex Mono",Menlo,monospace;font-synthesis:weight;font-variant-ligatures:none;-webkit-font-smoothing:antialiased;color:${theme.foreground}}
.r{position:absolute;left:0;height:${ch}px;width:100%}
.r p{margin:0;position:relative;white-space:pre;height:${ch}px}
.r b{position:absolute;top:0;height:${ch}px}
.r i{display:inline-block;font-style:normal;white-space:pre;overflow:visible}
</style></head><body><div id="t">${rowsHtml}</div></body></html>`;
  return { html, width, height };
}

// ---- Chrome over the DevTools Protocol (same technique as scripts/shoot.mjs) ----
class Cdp {
  /** @param {WebSocket} ws */
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(String(ev.data));
      const p = msg.id && this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
    });
  }
  /** @param {string} url */
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', () => rej(new Error('websocket failed')), { once: true }); });
    return new Cdp(ws);
  }
  /** @param {string} method @param {object} [params] @param {string} [session] */
  send(method, params = {}, session) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, 30000);
      this.pending.set(id, { method, resolve: (/** @type {any} */ v) => { clearTimeout(timer); resolve(v); }, reject: (/** @type {Error} */ e) => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
    });
  }
}

/**
 * Starts headless Chrome, runs `fn` with a renderer, and always shuts Chrome down.
 * `render(html, width, height)` returns the 2x PNG and the text of each terminal row as the browser laid it out.
 * @template T
 * @param {(render: (html: string, width: number, height: number) => Promise<{ png: Buffer, rowText: string[] }>) => Promise<T>} fn
 */
export async function withChrome(fn) {
  if (!chromeAvailable()) throw new Error(`Chrome not found at ${CHROME}; set CHROME to a Chrome or Chromium binary`);
  const profile = mkdtempSync(join(tmpdir(), 'ejm-shots-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb', '--disable-gpu', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let closed = false;
  chrome.once('close', () => { closed = true; });
  let failure;
  try {
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error('Chrome did not report a debugging port in 20 s')), 20000);
      chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
      chrome.once('error', error => { clearTimeout(timer); reject(error); });
      chrome.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited early (${code})`)); });
    });
    const cdp = await Cdp.connect(/** @type {string} */ (wsUrl));
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    return await fn(async (html, width, height) => {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false }, sessionId);
      await cdp.send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') }, sessionId);
      const ev = await cdp.send('Runtime.evaluate', {
        expression: `(async()=>{await document.fonts.load('500 15px "IBM Plex Mono"');await document.fonts.ready;
          if(!document.fonts.check('500 15px "IBM Plex Mono"'))throw new Error('IBM Plex Mono did not load');
          return [...document.querySelectorAll('.r p')].map(p=>p.textContent)})()`,
        awaitPromise: true, returnByValue: true,
      }, sessionId);
      if (ev.exceptionDetails) throw new Error(ev.exceptionDetails.exception?.description || ev.exceptionDetails.text);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width, height, scale: 1 } }, sessionId);
      return { png: Buffer.from(shot.data, 'base64'), rowText: ev.result.value };
    });
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    try {
      if (!closed) {
        const stopped = once(chrome, 'close', { signal: AbortSignal.timeout(5000) });
        try { chrome.kill('SIGKILL'); } catch (error) { void stopped.catch(() => {}); throw error; }
        await stopped;
      }
      rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      if (failure) throw new AggregateError([failure.error, error], 'Chrome rendering and cleanup failed', { cause: failure.error });
      throw error;
    }
  }
}
