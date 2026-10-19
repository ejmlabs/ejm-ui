#!/usr/bin/env node
// Color balance of a page screenshot: how much of it is Sage, Paper or Mist, Forest and Ink.
// The design language says Sage leads at about 30 percent, Paper and Mist about 60, and Forest stays under 10 and never sets a
// large ground. This reads the PNG(s) that `node scripts/shoot.mjs <url> [--theme dark] [--full]` writes, assigns every sampled
// pixel to the nearest brand color when it is within the tolerance (text, anti-aliasing, window chrome and art land in "other"),
// prints the shares, and exits 1 when Forest is over the limit. The Sage share is reported against the target and does not fail.
//
// PNG decoding is done by Python Pillow, started with `uv run --with pillow` (the pattern build-fonts.mjs uses for fonttools), or
// by python3 when Pillow is already installed. Nothing is added to the repo's dependencies, and Pillow handles every PNG variant.
//
// Usage: node packages/ui/scripts/check-balance.mjs <page.png> [more strips of the same page ...]
//          [--theme light|dark] [--tolerance 40] [--max-forest 10] [--sage-target 30] [--json]
//   Several files are strips of one page and are combined into one total.
//   --theme dark adds the dark page grounds (131614 and 1C211D, from THEME.md) to the Paper and Mist group.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = { theme: 'light', tolerance: 40, maxForest: 10, sageTarget: 30, json: false };
const files = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--theme') opt.theme = args[++i];
  else if (a === '--tolerance') opt.tolerance = Number(args[++i]);
  else if (a === '--max-forest') opt.maxForest = Number(args[++i]);
  else if (a === '--sage-target') opt.sageTarget = Number(args[++i]);
  else if (a === '--json') opt.json = true;
  else if (a.startsWith('--')) { console.error(`unknown option ${a}`); process.exit(2); }
  else files.push(a);
}
if (!files.length || !['light', 'dark'].includes(opt.theme)) {
  console.error('Usage: node check-balance.mjs <page.png> [more strips ...] [--theme light|dark] [--tolerance 40] [--max-forest 10] [--sage-target 30] [--json]');
  process.exit(2);
}

const brand = JSON.parse(readFileSync(join(here, '..', '..', 'tokens', 'assets', 'brand', 'palette.json'), 'utf8')).colors;
const rgb = h => { const s = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
// group -> the colors that count toward it
const palette = {
  sage: [rgb(brand.sage)],
  paperMist: [rgb(brand.paper), rgb(brand.mist), ...(opt.theme === 'dark' ? [rgb('131614'), rgb('1C211D')] : [])],
  forest: [rgb(brand.forest)],
  ink: [rgb(brand.ink)],
};

const PY = `
import sys, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
palette = json.loads(sys.argv[1]); tol2 = float(sys.argv[2]) ** 2
flat = [(g, c) for g, cs in palette.items() for c in cs]
counts = {g: 0 for g in palette}; counts['other'] = 0; total = 0
paths = sys.argv[3:]
# One sampling step for every strip, so each strip counts in proportion to its area.
area = sum(Image.open(p).size[0] * Image.open(p).size[1] for p in paths)
step = max(1, int((area / 6_000_000) ** 0.5))
for path in paths:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    if step > 1: im = im.resize((max(1, w // step), max(1, h // step)), Image.NEAREST)
    for n, c in im.getcolors(maxcolors=10_000_000):
        best = None; bd = 1e18
        for g, p in flat:
            d = (c[0]-p[0])**2 + (c[1]-p[1])**2 + (c[2]-p[2])**2
            if d < bd: bd = d; best = g
        counts[best if bd <= tol2 else 'other'] += n
        total += n
print(json.dumps({'counts': counts, 'total': total}))
`;

function run(cmd, cmdArgs) {
  return spawnSync(cmd, [...cmdArgs, 'python3', '-I', '-c', PY, JSON.stringify(palette), String(opt.tolerance), ...files], { encoding: 'utf8', maxBuffer: 1 << 26 });
}
// Plain python3 first (works when Pillow is installed), then uv, which fetches it for the run.
let r = spawnSync('python3', ['-I', '-c', PY, JSON.stringify(palette), String(opt.tolerance), ...files], { encoding: 'utf8', maxBuffer: 1 << 26 });
if (r.status !== 0 && /No module named 'PIL'/.test(r.stderr)) r = run('uv', ['run', '--quiet', '--with', 'pillow']);
if (r.status !== 0) {
  console.error(`check-balance: could not decode the PNG. Needs python3 with Pillow, or uv.\n${r.stderr || r.error?.message || ''}`.trim());
  process.exit(2);
}
const { counts, total } = JSON.parse(r.stdout);
const pct = k => (100 * counts[k]) / total;
const shares = { sage: pct('sage'), paperMist: pct('paperMist'), forest: pct('forest'), ink: pct('ink'), other: pct('other') };
const classified = total - counts.other;
const ofClassified = k => (classified ? (100 * counts[k]) / classified : 0);
const forestOver = shares.forest > opt.maxForest;

if (opt.json) {
  console.log(JSON.stringify({ files, theme: opt.theme, tolerance: opt.tolerance, shares, classifiedShare: (100 * classified) / total, forestOver }, null, 2));
} else {
  const f = n => `${n.toFixed(1).padStart(5)}%`;
  console.log(`${files.length} file(s), ${total.toLocaleString()} sampled pixels, ${opt.theme} theme, tolerance ${opt.tolerance}`);
  console.log(`  Sage          ${f(shares.sage)}   (${f(ofClassified('sage'))} of brand pixels)   target about ${opt.sageTarget}%, ${shares.sage >= opt.sageTarget ? 'at or above' : `${(opt.sageTarget - shares.sage).toFixed(1)} points under`}`);
  console.log(`  Paper + Mist  ${f(shares.paperMist)}   (${f(ofClassified('paperMist'))} of brand pixels)   target about 60%`);
  console.log(`  Forest        ${f(shares.forest)}   (${f(ofClassified('forest'))} of brand pixels)   limit ${opt.maxForest}%: ${forestOver ? 'FAIL' : 'ok'}`);
  console.log(`  Ink           ${f(shares.ink)}   (${f(ofClassified('ink'))} of brand pixels)`);
  console.log(`  other         ${f(shares.other)}   text, anti-aliasing, windows and art`);
}
process.exit(forestOver ? 1 : 0);
