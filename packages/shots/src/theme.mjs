// The products' own terminal colors: parsed from the generated Alacritty schemes in @ejm/tokens
// (packages/tokens/generated/terminal), which packages/tokens/theme.json produces.
import { readFileSync } from 'node:fs';

const root = new URL('../../..', import.meta.url).pathname;
export const FONT_FILE = `${root}packages/ui/src/fonts/ibm-plex-mono-500-latin.woff2`;

/** @typedef {{ name: string, background: string, foreground: string, cursor: string, selection: string, ansi: string[] }} Theme */

/** @param {'dark' | 'light'} name @returns {Theme} */
export function loadTheme(name) {
  const toml = readFileSync(`${root}packages/tokens/generated/terminal/ejmlabs-${name}.alacritty.toml`, 'utf8');
  /** @type {Record<string, Record<string, string>>} */
  const sections = {};
  let current = '';
  for (const line of toml.split('\n')) {
    const h = line.match(/^\[(.+)\]$/);
    if (h) { current = h[1] ?? ''; sections[current] = {}; continue; }
    const kv = line.match(/^(\w+) = "(#[0-9a-f]{6})"$/);
    if (kv && current && kv[1] && kv[2]) (sections[current] ??= {})[kv[1]] = kv[2];
  }
  const order = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
  const get = (/** @type {string} */ sec, /** @type {string} */ key) => {
    const v = sections[sec]?.[key];
    if (!v) throw new Error(`incomplete terminal scheme for ${name}: ${sec}.${key}`);
    return v;
  };
  const ansi = [...order.map(k => get('colors.normal', k)), ...order.map(k => get('colors.bright', k))];
  return {
    name,
    background: get('colors.primary', 'background'),
    foreground: get('colors.primary', 'foreground'),
    cursor: get('colors.cursor', 'cursor'),
    selection: get('colors.selection', 'background'),
    ansi,
  };
}

/** The 256-color palette: the theme's 16, then the standard 6x6x6 cube and the 24 grays. @param {Theme} theme */
export function palette256(theme) {
  const out = [...theme.ansi];
  const lv = [0, 95, 135, 175, 215, 255];
  const hex = (/** @type {number} */ r, /** @type {number} */ g, /** @type {number} */ b) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  for (let i = 0; i < 216; i++) out.push(hex(lv[Math.floor(i / 36)] ?? 0, lv[Math.floor(i / 6) % 6] ?? 0, lv[i % 6] ?? 0));
  for (let i = 0; i < 24; i++) out.push(hex(8 + i * 10, 8 + i * 10, 8 + i * 10));
  return out;
}
