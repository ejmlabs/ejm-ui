// Shared by the generator (build-ui.mjs) and the contrast gates (contrast.mjs): loads theme.json and the brand
// palette, does the color math, derives the extra ui roles and resolves the web bands to plain hex values.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const tokensRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- color math (WCAG 2.x relative luminance) ----
export const rgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
export const lum = hex => {
  const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
// t is the share of a, 0 to 1, over b. Hex in and out, upper case, no leading #.
export const mix = (a, b, t) => rgb(a).map((v, i) => Math.round(v * t + rgb(b)[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase();

export function loadTheme() {
  const theme = JSON.parse(readFileSync(join(tokensRoot, 'theme.json'), 'utf8'));
  const palette = JSON.parse(readFileSync(join(tokensRoot, 'assets', 'brand', 'palette.json'), 'utf8'));
  const brand = Object.fromEntries(Object.entries(palette.colors).map(([k, v]) => [k, v.slice(1).toUpperCase()]));
  return { theme, brand };
}

// Derived roles: diff tints and the terminal roles the TUI already uses.
export function resolveThemes(theme) {
  const resolve = name => {
    const t = theme.themes[name];
    const r = { ...t.roles };
    r['diff-add'] = r.success;
    r['diff-del'] = r.error;
    r['diff-add-bg'] = mix(r.success, r.editor, 0.16);
    r['diff-del-bg'] = mix(r.error, r.editor, 0.16);
    r.selection = r['tint-2'];
    // Terminal "dim" is the quietest text that still reaches 4.5:1 on the ground color.
    r.dim = ratio(r['text-subtle'], r.ground) >= 4.5 ? r['text-subtle'] : r['text-muted'];
    return { ...t, roles: r };
  };
  return { dark: resolve('dark'), light: resolve('light') };
}

// ---- web bands ----
// A ref is brand.NAME, light.ROLE, dark.ROLE, light.hue1..6, dark.hue1..6, mix(REF,REF,N) or a 6 digit hex.
function ref(value, ctx) {
  const v = String(value).trim();
  let m = v.match(/^mix\((.+),(.+),(\d+(?:\.\d+)?)\)$/);
  if (m) return mix(ref(m[1], ctx), ref(m[2], ctx), Number(m[3]) / 100);
  if (/^[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  m = v.match(/^(brand|light|dark)\.([a-z0-9-]+)$/);
  if (!m) throw new Error(`bad color reference "${v}"`);
  const [, scope, name] = m;
  if (scope === 'brand') {
    if (!ctx.brand[name]) throw new Error(`unknown brand color "${v}"`);
    return ctx.brand[name];
  }
  const hue = name.match(/^hue([1-6])$/);
  const out = hue ? ctx.resolved[scope].hues[Number(hue[1]) - 1] : ctx.resolved[scope].roles[name];
  if (!out) throw new Error(`unknown ui role "${v}"`);
  return out;
}

// Returns { band: { light: {key: HEX, hue1..hue6: HEX}, dark: {...} } }. A band with no dark entry has the same values in both.
export function resolveBands(theme, brand, resolved = resolveThemes(theme)) {
  const ctx = { brand, resolved };
  const out = {};
  for (const [band, spec] of Object.entries(theme.web.bands)) {
    out[band] = {};
    for (const mode of ['light', 'dark']) {
      const s = spec[mode] ?? spec.light;
      const r = {};
      for (const key of theme.web.keys) {
        if (!(key in s)) throw new Error(`web.bands.${band}.${mode} is missing "${key}"`);
        if (key === 'scheme') r.scheme = s.scheme;
        else if (key === 'hues') resolved[s.hues].hues.forEach((h, i) => { r[`hue${i + 1}`] = h; });
        else r[key] = ref(s[key], ctx);
      }
      out[band][mode] = r;
    }
  }
  return out;
}
