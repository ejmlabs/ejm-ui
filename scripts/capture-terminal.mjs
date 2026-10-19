#!/usr/bin/env node
// Captures REAL terminal sessions of the real ejm-cli and ejm-harness binaries as PNG product shots.
// It runs each program in a pseudo-terminal, types the scripted keystrokes, feeds the recorded bytes to a
// terminal emulator, and draws the final screen in headless Chrome with IBM Plex Mono and the product's own
// terminal colors. Nothing is drawn by hand. See packages/shots/README.md.
//
// Usage: node scripts/capture-terminal.mjs [--list] [--theme dark|light] [--out dir] <product/name | product | all>...
//   --list         print the shot names and exit
//   --theme t      capture one theme only (default: dark and light)
//   --out dir      write assets under dir instead of packages/shots/assets
// Prerequisites: Google Chrome (or CHROME=/path), built release binaries in ../ejm-cli and ../ejm-harness
// (see README), Node 22+. Exit code 0 when every shot was captured and verified, 1 otherwise.
import { captureShot } from '../packages/shots/src/capture.mjs';
import { SHOTS } from '../packages/shots/src/shots.mjs';

const args = process.argv.slice(2);
/** @type {string[]} */
const names = [];
let themes;
let out;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--list') { for (const s of SHOTS) console.log(`${s.product}/${s.name}  ${s.cols}x${s.rows}`); process.exit(0); }
  else if (a === '--theme') themes = [args[++i]];
  else if (a === '--out') out = args[++i];
  else if (a?.startsWith('--')) { console.error(`unknown option ${a}`); process.exit(2); }
  else if (a) names.push(a);
}
if (themes && !themes.every(t => t === 'dark' || t === 'light')) { console.error('--theme must be dark or light'); process.exit(2); }
if (!names.length) { console.error('usage: node scripts/capture-terminal.mjs [--list] [--theme dark|light] [--out dir] <product/name | product | all>...'); process.exit(2); }

const picked = SHOTS.filter(s => names.includes('all') || names.includes(s.product) || names.includes(`${s.product}/${s.name}`));
if (!picked.length) { console.error(`no shot matches ${names.join(', ')}; try --list`); process.exit(2); }

let failed = 0;
for (const shot of picked) {
  try {
    const meta = await captureShot(shot, { themes: /** @type {any} */ (themes), outDir: out });
    const v = Object.values(/** @type {Record<string, any>} */ (meta.results)).map(r => r.verification.transcriptMatch).join('/');
    console.log(`ok   ${shot.product}/${shot.name}  ${shot.cols}x${shot.rows}  text check: ${v}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${shot.product}/${shot.name}: ${e instanceof Error ? e.message : e}`);
  }
}
process.exit(failed ? 1 : 0);
