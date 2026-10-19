#!/usr/bin/env node
// Checks the symbol art system in packages/ui/src/art: every color in every file is a brand color or a brand color at
// reduced opacity, the grain tiles stay under the 0.08 alpha limit, inline art takes its colors from CSS, and
// build-art.mjs --check says the files are current.
// (The old kit also checked text over gradient surfaces. The containerless language has no gradient or panel surfaces, so
// that section is gone.)
// Usage: node packages/ui/scripts/check-art.mjs        (exit 1 on any failure)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ui = join(here, '..');
const artDir = join(ui, 'src', 'art');
const read = f => readFileSync(f, 'utf8');
const problems = [], notes = [], grainMax = {};

// ---- palette ----------------------------------------------------------------------------------------------------------
const brand = JSON.parse(read(join(ui, '..', 'tokens', 'assets', 'brand', 'palette.json'))).colors;
const palette = new Set(['sage', 'forest', 'ink', 'paper', 'mist'].map(k => brand[k].toUpperCase()));
const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const svgs = walk(artDir).filter(f => f.endsWith('.svg'));
for (const f of svgs) {
  const t = read(f);
  const name = f.slice(artDir.length + 1);
  for (const hex of t.match(/#[0-9a-fA-F]{3,8}\b/g) || []) if (!palette.has(hex.toUpperCase())) problems.push(`${name}: ${hex} is not a brand color`);
  if (/(?:rgb|hsl|oklch|color-mix)\(/.test(t)) problems.push(`${name}: uses a color function`);
  for (const m of t.matchAll(/(?:stroke|fill)-opacity="([^"]+)"/g)) if (!(+m[1] > 0 && +m[1] <= 1)) problems.push(`${name}: opacity ${m[1]} out of range`);
  for (const m of t.matchAll(/\s(stroke|fill)="([^"]+)"/g)) if (!/^(none|currentColor|#[0-9A-Fa-f]{6})$/.test(m[2])) problems.push(`${name}: ${m[1]}="${m[2]}" is not a brand color`);
  if (name.startsWith('inline/') && (/#[0-9a-fA-F]{6}/.test(t) || !/^<svg class="art" /.test(t))) problems.push(`${name}: inline art must take its colors from CSS and start with class="art"`);
  if (name.includes('grain')) { // the filter color is numeric: it must equal a brand color
    const v = (t.match(/values="0 0 0 0 ([\d.]+) 0 0 0 0 ([\d.]+) 0 0 0 0 ([\d.]+) 0 0 0 ([\d.]+) (-?[\d.]+)"/) || []).slice(1).map(Number);
    const hex = '#' + v.slice(0, 3).map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    if (!palette.has(hex)) problems.push(`${name}: grain color ${hex} is not a brand color`);
    grainMax[hex] = +(v[3] + v[4]).toFixed(3);
    if (grainMax[hex] > 0.0801) problems.push(`${name}: grain alpha can reach ${grainMax[hex]}, above the 0.08 limit`);
  }
}
notes.push(`${svgs.length} art files use brand colors only`);
try { execFileSync('node', [join(here, 'build-art.mjs'), '--check'], { stdio: 'pipe' }); notes.push('build-art --check: files are current'); }
catch (e) { problems.push(`build-art.mjs --check failed:\n${String(e.stderr || e.stdout).trim()}`); }

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('art ok: ' + notes.join('; '));
