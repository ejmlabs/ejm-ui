#!/usr/bin/env node
// Generates the symbol art system into packages/ui/src/art: line art for the hero, section dividers, empty states and error pages,
// each in a light and a dark treatment, plus an inline "draw" form of the small pieces and two grain tiles.
// Everything is derived from the symbol's own outline (packages/tokens/assets/logos/symbol-sage.svg): the outline is sampled, turned into a
// signed distance field, and the art is made of its offsets (contour lines at set distances), repeats and crops.
// Deterministic: seeded math only, no dependencies, same bytes every run.
// Usage: node packages/ui/scripts/build-art.mjs [--check]   (--check verifies files on disk match the generator, and palette only)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = join(here, '..', '..', 'tokens');
const root = join(here, '..', 'src', 'art');
const check = process.argv.includes('--check');

// Brand palette (packages/tokens/assets/brand/palette.json). Nothing else may appear in a generated file.
const brand = JSON.parse(readFileSync(join(tokens, 'assets', 'brand', 'palette.json'), 'utf8')).colors;
const C = Object.fromEntries(['paper', 'mist', 'forest', 'ink', 'sage'].map(k => [k, brand[k].toUpperCase()]));
// Treatments. Light art sits on Paper, Mist or Sage: Forest lines, Sage fills. Dark art sits on Forest, Ink or a dark page:
// Sage lines, Mist accents. Opacity is multiplied per treatment so each reads equally quiet on its ground.
const TREAT = {
  light: { line: C.forest, accent: C.sage, fill: C.sage, kl: 1, ka: 1, kf: 1 },
  dark: { line: C.sage, accent: C.mist, fill: C.sage, kl: 1.25, ka: 0.62, kf: 0.62 },
};

// ---- symbol outline ------------------------------------------------------------------------------------------------
const svgSrc = readFileSync(join(tokens, 'assets', 'logos', 'symbol-sage.svg'), 'utf8');
const rawPaths = [...svgSrc.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
const sampleCubic = (a, b, c, d, n) => { const o = []; for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); } return o; };
const outlines = rawPaths.map(d => {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number), pts = [[nums[0], nums[1]]];
  for (let i = 2; i + 5 < nums.length; i += 6) pts.push(...sampleCubic(pts[pts.length - 1], [nums[i], nums[i + 1]], [nums[i + 2], nums[i + 3]], [nums[i + 4], nums[i + 5]], 6));
  return pts;
});
const all = outlines.flat();
const bb = [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))];
const mid = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];

// ---- math ----------------------------------------------------------------------------------------------------------
const n1 = v => String(+v.toFixed(1)), n2 = v => String(+v.toFixed(2)), n3 = v => String(+v.toFixed(3));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Place the symbol: scale s, centre at (cx, cy), optional rotation in degrees. Returns closed polygons in canvas units.
const place = (s, cx, cy, rot = 0) => {
  const r = rot * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
  return outlines.map(poly => poly.map(([x, y]) => { const px = (x - mid[0]) * s, py = (y - mid[1]) * s; return [cx + px * co - py * si, cy + px * si + py * co]; }));
};
// Signed distance to the placed symbol on a grid over [0,W]x[0,H]: negative inside.
const field = (polys, W, H, cs) => {
  const nx = Math.ceil(W / cs) + 1, ny = Math.ceil(H / cs) + 1, f = new Float32Array(nx * ny);
  const edges = []; for (const p of polys) for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; edges.push(a[0], a[1], b[0], b[1]); }
  const E = edges.length / 4;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = i * cs, y = j * cs; let best = Infinity, odd = false;
    for (let k = 0; k < E; k++) {
      const ax = edges[4 * k], ay = edges[4 * k + 1], bx = edges[4 * k + 2], by = edges[4 * k + 3];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + t * dx - x, ey = ay + t * dy - y, d2 = ex * ex + ey * ey;
      if (d2 < best) best = d2;
      if ((ay > y) !== (by > y) && x < ax + ((y - ay) * dx) / dy) odd = !odd;
    }
    f[j * nx + i] = odd ? -Math.sqrt(best) : Math.sqrt(best);
  }
  return { f, nx, ny, cs };
};
// Marching squares: chains of points where the field crosses `lv`.
const contour = ({ f, nx, ny, cs }, lv) => {
  const V = (i, j) => f[j * nx + i];
  const Hh = (i, j) => j * nx + i, Vv = (i, j) => nx * ny + j * nx + i;
  const segs = [];
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = V(i, j) > lv, b = V(i + 1, j) > lv, c = V(i + 1, j + 1) > lv, d = V(i, j + 1) > lv;
    const idx = a * 8 + b * 4 + c * 2 + d;
    if (idx === 0 || idx === 15) continue;
    const T = Hh(i, j), R = Vv(i + 1, j), B = Hh(i, j + 1), L = Vv(i, j);
    const centre = (V(i, j) + V(i + 1, j) + V(i + 1, j + 1) + V(i, j + 1)) / 4 > lv;
    const table = { 1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 6: [[T, B]], 7: [[T, L]], 8: [[T, L]], 9: [[T, B]], 11: [[T, R]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]], 5: centre ? [[T, L], [B, R]] : [[T, R], [L, B]], 10: centre ? [[T, R], [L, B]] : [[T, L], [B, R]] };
    for (const s of table[idx]) segs.push(s);
  }
  const at = new Map(); segs.forEach((s, k) => s.forEach(e => { if (!at.has(e)) at.set(e, []); at.get(e).push(k); }));
  const pt = id => {
    if (id < nx * ny) { const j = Math.floor(id / nx), i = id % nx, a = V(i, j), b = V(i + 1, j); return [(i + (lv - a) / (b - a)) * cs, j * cs]; }
    id -= nx * ny; const j = Math.floor(id / nx), i = id % nx, a = V(i, j), b = V(i, j + 1);
    return [i * cs, (j + (lv - a) / (b - a)) * cs];
  };
  const used = new Uint8Array(segs.length), out = [];
  const walk = (end, push) => { for (;;) { const nxt = (at.get(end) || []).find(k => !used[k]); if (nxt === undefined) return; used[nxt] = 1; const [p, q] = segs[nxt]; end = p === end ? q : p; push(end); } };
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue; used[k] = 1;
    const chain = [segs[k][0], segs[k][1]];
    walk(chain[1], e => chain.push(e)); walk(chain[0], e => chain.unshift(e));
    const pts = chain.map(pt); let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len > 16) out.push(pts);
  }
  return out;
};
// Ramer-Douglas-Peucker, so contours stay small.
const rdp = (pts, eps) => {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
  let m = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / l; if (d > m) { m = d; at = i; } }
  return m > eps ? [...rdp(pts.slice(0, at + 1), eps).slice(0, -1), ...rdp(pts.slice(at), eps)] : [pts[0], pts[pts.length - 1]];
};
// Chains to path data: one absolute move, then relative lines at 0.1 precision. Closed loops are split at their far point first.
const simplify = ch => {
  const [ax, ay] = ch[0], [bx, by] = ch[ch.length - 1];
  if (Math.hypot(ax - bx, ay - by) > 0.5) return rdp(ch, 0.35);
  let far = 0, m = 0; ch.forEach((q, i) => { const d = Math.hypot(q[0] - ax, q[1] - ay); if (d > m) { m = d; far = i; } });
  return [...rdp(ch.slice(0, far + 1), 0.35).slice(0, -1), ...rdp(ch.slice(far), 0.35)];
};
const dOf = chains => chains.filter(ch => ch.length > 2).map(ch => {
  const p = simplify(ch); let x = Math.round(p[0][0] * 10), y = Math.round(p[0][1] * 10), s = `M${x / 10} ${y / 10}`;
  for (let i = 1; i < p.length; i++) { const X = Math.round(p[i][0] * 10), Y = Math.round(p[i][1] * 10); if (X === x && Y === y) continue; s += `l${(X - x) / 10} ${(Y - y) / 10}`; x = X; y = Y; }
  return s;
}).join('');
// Soften a field with three box-blur passes (radius in cells), so far-out rings lose the creases of the symbol's inner corners.
const blur = ({ f, nx, ny, cs }, r) => {
  let a = Float32Array.from(f), b = new Float32Array(f.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < ny; j++) { let sum = 0, c = 0; for (let i = -r; i <= r; i++) { sum += a[j * nx + Math.min(nx - 1, Math.max(0, i))]; c++; } for (let i = 0; i < nx; i++) { b[j * nx + i] = sum / c; sum += a[j * nx + Math.min(nx - 1, i + r + 1)] - a[j * nx + Math.max(0, i - r)]; } }
    for (let i = 0; i < nx; i++) { let sum = 0, c = 0; for (let j = -r; j <= r; j++) { sum += b[Math.min(ny - 1, Math.max(0, j)) * nx + i]; c++; } for (let j = 0; j < ny; j++) { a[j * nx + i] = sum / c; sum += b[Math.min(ny - 1, j + r + 1) * nx + i] - b[Math.max(0, j - r) * nx + i]; } }
  }
  return { f: a, nx, ny, cs };
};
const polyD = polys => polys.map(p => 'M' + p.filter((_, i) => i % 3 === 0).map(q => `${n1(q[0])} ${n1(q[1])}`).join('L') + 'Z').join('');
// Keep only the parts of chains whose points satisfy `keep`, splitting where they do not.
const clip = (chains, keep) => chains.flatMap(ch => { const out = []; let cur = []; for (const p of ch) { if (keep(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } } if (cur.length > 1) out.push(cur); return out; });

// ---- layers: { tone: 'line' | 'accent' | 'fill', d, w, o } -------------------------------------------------------------
// A piece is { w, h, label, layers }. Ring order is draw order, centre outward.
const geo = (d0, ratio, n) => Array.from({ length: n }, (_, i) => d0 * Math.pow(ratio, i));

const pieces = {};
// Rings from the raw field near the symbol and from softened fields farther out, so near rings follow the symbol exactly
// and far rings relax into smooth echoes.
const tiered = (fld, mids) => { const a = blur(fld, mids[0]), b = blur(fld, mids[1]); return lv => (lv < 40 ? fld : lv < 150 ? a : b); };
const echoes = (fld, levels, w, oAt, tone = 'line', soft) => levels.map((lv, i) => ({ tone, d: dOf(contour(soft ? soft(lv) : fld, lv)), w: typeof w === 'function' ? w(lv, i) : w, o: oAt(lv, i) })).filter(l => l.d);
// A horizontal fade: cut chains into vertical bands and give each band its own opacity, so one hairline can dissolve at its ends.
const faded = (chains, W, bands, env, tone, w, o) => Array.from({ length: bands }, (_, b) => {
  const x0 = (b * W) / bands, x1 = ((b + 1) * W) / bands + 2;
  return { tone, d: dOf(clip(chains, ([x]) => x >= x0 && x <= x1)), w, o: o * env(((b + 0.5) * W) / bands / W) };
}).filter(l => l.d && l.o > 0.01);

// Hero: the symbol large and cropped at the right, its ribbons engraved, its outside rippling out and fading before the text.
{
  const W = 1600, H = 900, polys = place(2.05, 1180, 470), fld = field(polys, W, H, 3.5), soft = tiered(fld, [6, 20]);
  const layers = [{ tone: 'fill', d: polyD(polys), o: 0.2 }];
  layers.push(...echoes(fld, [-14, -28, -42, -56], 1, (lv, i) => 0.55 - 0.08 * i));
  layers.push(...echoes(fld, [0], 1.7, () => 0.95));
  layers.push(...echoes(fld, geo(14, 1.24, 22), (lv, i) => (i % 7 === 6 ? 1.5 : 1), (lv, i) => (i % 7 === 6 ? 0.75 : 0.5) * (1 - 0.88 * smooth(14, 480, lv)), 'line', soft));
  pieces.hero = { w: W, h: H, label: 'Symbol outline engraved and rippling outward', layers, drawable: false };
}

// Divider, flow: a strip cut through the symbol's crossbar at large scale. The ribbon edges and their offsets run level and
// turn where the symbol turns, and dissolve toward both ends.
{
  const W = 1600, H = 150, polys = place(3.4, 800, 129), fld = field(polys, W, H, 2);
  const env = t => smooth(0, 0.22, t) * smooth(0, 0.22, 1 - t);
  const layers = [];
  for (const [lv, tone, w, o] of [[0, 'accent', 1.8, 0.95], [-12, 'line', 1, 0.6], [12, 'line', 1, 0.6], [24, 'line', 1, 0.5], [-24, 'line', 1, 0.5], [38, 'line', 1, 0.4], [-38, 'line', 1, 0.34], [54, 'line', 1, 0.3], [-52, 'line', 1, 0.24]]) layers.push(...faded(contour(fld, lv), W, 20, env, tone, w, o));
  pieces['divider-flow'] = { w: W, h: H, label: 'Level lines taken from the symbol crossbar', layers, drawable: true };
}
// Divider, ripple: a small whole symbol at the centre with its offsets spreading sideways as flat arcs across the strip.
{
  const W = 1600, H = 140, K = 8, wc = W / K, polys = place(0.19, wc / 2, H / 2), fld = field(polys, wc, H, 1);
  const stretch = chains => chains.map(ch => ch.map(([x, y]) => [x * K, y]));
  const layers = [{ tone: 'fill', d: polyD(place(0.19, W / 2, H / 2)), o: 0.35 }];
  const outline = place(0.19, W / 2, H / 2), outF = field(outline, W, H, 1);
  layers.push({ tone: 'accent', d: dOf(contour(outF, 0)), w: 1.6, o: 0.95 });
  [10, 17, 25, 34, 44, 56, 70, 86, 104, 124].forEach((lv, i) => layers.push({ tone: 'line', d: dOf(stretch(contour(fld, lv))), w: 1, o: 0.65 * Math.pow(0.86, i) }));
  pieces['divider-ripple'] = { w: W, h: H, label: 'Small symbol with ripples spreading sideways', layers: layers.filter(l => l.d), drawable: true };
}

// Empty: nothing here yet. The symbol as a vessel (outline only), with a few quiet echoes.
{
  const W = 800, H = 500, polys = place(1.5, 400, 430), fld = field(polys, W, H, 2.5), soft = tiered(fld, [4, 14]);
  const layers = [];
  layers.push(...echoes(fld, [0], 1.8, () => 0.95, 'accent'));
  layers.push(...echoes(fld, [-7], 1, () => 0.34));
  layers.push(...echoes(fld, geo(18, 1.5, 6), 1, (lv, i) => 0.5 * Math.pow(0.7, i), 'line', soft));
  pieces['empty-start'] = { w: W, h: H, label: 'Symbol outline with quiet echoes', layers, drawable: true };
}
// Empty: nothing found. The symbol's outline repeated along a diagonal and fading, as if moving out of reach.
{
  const W = 800, H = 500, layers = [], n = 6;
  for (let k = n - 1; k >= 1; k--) layers.push({ tone: 'line', d: polyD(place(0.95, 300 + k * 38, 275 - k * 11)), w: 1.1, o: 0.52 * Math.pow(0.74, k - 1) });
  layers.push({ tone: 'fill', d: polyD(place(0.95, 300, 275)), o: 0.26 });
  layers.push({ tone: 'accent', d: polyD(place(0.95, 300, 275)), w: 1.8, o: 0.95 });
  pieces['empty-search'] = { w: W, h: H, label: 'Symbol outline repeated and fading away', layers, drawable: true };
}
// Empty: all done. The ribbons filled edge to edge with parallel lines, then one ring.
{
  const W = 800, H = 500, polys = place(1.15, 400, 250), fld = field(polys, W, H, 2);
  const layers = [{ tone: 'fill', d: polyD(polys), o: 0.2 }];
  layers.push(...echoes(fld, [-5, -10, -15, -20, -25], 1, (lv, i) => 0.5 - 0.06 * i));
  layers.push(...echoes(fld, [0], 1.8, () => 0.95, 'accent'));
  layers.push(...echoes(fld, [20, 42], 1, (lv, i) => 0.36 - 0.14 * i));
  pieces['empty-done'] = { w: W, h: H, label: 'Symbol filled with fine lines', layers, drawable: true };
}

// Error: lost. Rings around the symbol, each broken by a gap that turns a little further each time.
{
  const W = 800, H = 500, cx = 400, cy = 250, polys = place(0.8, cx, cy), fld = field(polys, W, H, 2), soft = tiered(fld, [4, 14]);
  const layers = echoes(fld, [0], 1.8, () => 0.95, 'accent');
  geo(14, 1.45, 6).forEach((lv, i) => {
    const gap = i * 1.1 + 0.4, half = 0.75;
    const ch = clip(contour(soft(lv), lv), ([x, y]) => { let a = Math.atan2(y - cy, x - cx) - gap; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) > half; });
    layers.push({ tone: 'line', d: dOf(ch), w: 1, o: 0.6 * Math.pow(0.82, i) });
  });
  pieces['error-lost'] = { w: W, h: H, label: 'Symbol with broken rings', layers: layers.filter(l => l.d), drawable: true };
}
// Error: fault. The symbol cut on a diagonal, one half shifted out of line, the rings carrying on across the cut.
{
  const W = 800, H = 500, cx = 400, cy = 250, dx = 20, dy = 12;
  const polys = place(0.95, cx, cy), fld = field(polys, W, H, 2), soft = tiered(fld, [4, 14]);
  const sideA = ([x, y]) => (x - cx) * 0.5 + (y - cy) * -0.86 > 0;
  const rings2 = [[0, 'accent', 1.8, 0.95], [-8, 'line', 1, 0.34], [-16, 'line', 1, 0.28], [14, 'line', 1, 0.45], [28, 'line', 1, 0.34], [46, 'line', 1, 0.24], [70, 'line', 1, 0.16]];
  const A = [], B = [];
  for (const [lv, tone, w, o] of rings2) {
    const ch = contour(lv > 20 ? soft(lv) : fld, lv);
    A.push({ tone, d: dOf(clip(ch, sideA)), w, o }); B.push({ tone, d: dOf(clip(ch, p => !sideA(p))), w, o, shift: [dx, dy] });
  }
  const layers = [{ tone: 'fill', d: polyD(polys), o: 0.14 }, ...A, ...B];
  pieces['error-fault'] = { w: W, h: H, label: 'Symbol split and shifted out of line', layers: layers.filter(l => l.d), drawable: true };
}

// ---- svg writers -------------------------------------------------------------------------------------------------------
const opac = (v) => n2(Math.min(1, v));
// Standalone file: explicit brand colors, transparent ground, used as an image or a CSS background.
const standalone = (name, p, t) => {
  const T = TREAT[t], body = p.layers.map(l => {
    const sh = l.shift ? ` transform="translate(${l.shift[0]} ${l.shift[1]})"` : '';
    if (l.tone === 'fill') return `<path d="${l.d}" fill="${T.fill}" fill-opacity="${opac(l.o * T.kf)}"${sh}/>`;
    return `<path d="${l.d}" stroke="${T[l.tone]}" stroke-width="${l.w}" stroke-opacity="${opac(l.o * (l.tone === 'accent' ? T.ka : T.kl))}"${sh}/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true"><g fill="none" stroke-linejoin="round">${body}</g></svg>\n`;
};
// Inline file: no colors of its own. Lines inherit currentColor (styles.css sets it from the band), accents and fills have a class.
// Each ring is its own path with pathLength 1, so the draw-on utility can draw it. The file is fully drawn as is: add the
// draw-on class from script to play the draw once. Paste it into a page as is.
const inline = (name, p) => {
  const body = p.layers.map(l => {
    const sh = l.shift ? ` transform="translate(${l.shift[0]} ${l.shift[1]})"` : '';
    if (l.tone === 'fill') return `<path class="art-fill" d="${l.d}" fill-opacity="${opac(l.o)}" stroke="none"${sh}/>`;
    return `<path${l.tone === 'accent' ? ' class="art-accent"' : ''} d="${l.d}" pathLength="1" stroke-width="${l.w}" stroke-opacity="${opac(l.o)}"${sh}/>`;
  }).join('');
  return `<svg class="art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-linejoin="round">${body}</g></svg>\n`;
};
// Grain: an alpha-only noise tile in one brand color. Alpha tops out at k + b (0.08 for Ink specks, 0.05 for Paper specks),
// which scripts/check-art.mjs reads back and assumes in its contrast pairs.
const grain = (color, seed, k, b) => {
  const rgb = [1, 3, 5].map(i => +(parseInt(color.slice(i, i + 2), 16) / 255).toFixed(3));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" aria-hidden="true"><filter id="n" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 ${k} ${b}"/></filter><rect width="160" height="160" filter="url(#n)"/></svg>\n`;
};

// ---- outputs -------------------------------------------------------------------------------------------------------
const files = new Map();
for (const [name, p] of Object.entries(pieces)) {
  for (const t of Object.keys(TREAT)) files.set(`${name}-${t}.svg`, standalone(name, p, t));
  if (p.drawable) files.set(`inline/${name}.svg`, inline(name, p));
}
files.set('grain-light.svg', grain(C.ink, 7, 0.1, -0.02));
files.set('grain-dark.svg', grain(C.paper, 11, 0.06, -0.01));

// ---- write or check -------------------------------------------------------------------------------------------------
const palette = new Set(Object.values(C).map(v => v.toLowerCase()));
const problems = [];
for (const [rel, text] of files) {
  for (const hex of text.match(/#[0-9a-fA-F]{3,6}\b/g) || []) if (!palette.has(hex.toLowerCase())) problems.push(`${rel}: color ${hex} is not in the palette`);
  if (/(?:rgb|hsl)a?\(|NaN|undefined|\u2014/.test(text)) problems.push(`${rel}: contains a non-brand color function, NaN, undefined or an em dash`);
  if (/stroke="(?!none|currentColor)[^#"]/.test(text) || /fill="(?!none|currentColor)[^#"]/.test(text)) problems.push(`${rel}: unexpected paint value`);
  const path = join(root, rel);
  if (check) { if (!existsSync(path) || readFileSync(path, 'utf8') !== text) problems.push(`${rel}: missing or out of date, run node packages/ui/scripts/build-art.mjs`); }
  else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(check ? `art ok (${files.size} files)` : `wrote ${files.size} files to packages/ui/src/art`);
