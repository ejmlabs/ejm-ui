// The ejm-ui brand family, generated from the approved grid-e mark.
//
//   node scripts/ui-assets.mjs           write assets/projects/ui and its PROVENANCE.md rows
//   node scripts/ui-assets.mjs --check   fail if any written file or row would change
//
// The files follow the cli, ide and harness sets: a 256 grid shipped at 1024 px, 2400 px lockups with Manrope 600
// at 216 units, editable lockups that keep live text, square icons, browser icons, a manifest and a social card.
// Text is outlined from the owned fonts with Python fontTools, rasters come from sharp and the ICO from Pillow.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = join(root, 'packages/tokens');
const directory = join(tokens, 'assets/projects/ui');
const fonts = join(tokens, 'assets/fonts');
const colors = JSON.parse(readFileSync(join(tokens, 'assets/brand/palette.json'), 'utf8')).colors;
const python = process.env.PYTHON || ['python3', '/usr/bin/python3'].find(candidate => {
  try { execFileSync(candidate, ['-I', '-c', 'import fontTools, PIL'], { stdio: 'ignore' }); return true; } catch { return false; }
});
if (!python) throw new Error('fontTools and Pillow are required. Set PYTHON to a Python with both installed.');
// sharp is loaded only when this script generates rasters. `scripts/assets.mjs` verifies committed
// files without importing this module, so a tree without a root sharp dependency still checks clean.
const loadSharp = async () => {
  try {
    return (await import('sharp')).default;
  } catch (error) {
    throw new Error('sharp is required to generate ui assets. Add it with the assets split lockfile, then retry.', { cause: error });
  }
};

// The approved grid-e mark: one 36-unit ribbon winds out from a round cap into a rounded square and ends in the
// lower-left flick. The filled path is the canonical artwork. Its ink spans 10.12 to 240 by 16 to 240.
const mark = {
  extent: [229.88, 224],
  path: 'M150 114L126 114A12 12 0 0 0 114 126L114 180A24 24 0 0 0 138 204L180 204A24 24 0 0 0 204 180L204 76A24 24 0 0 0 180 52L76 52A24 24 0 0 0 52 76L52 120C51.84 120.37 51.37 121.47 51.06 122.21C50.75 122.94 50.44 123.68 50.12 124.41C49.81 125.14 49.5 125.88 49.19 126.61C48.87 127.34 48.56 128.07 48.25 128.8C47.93 129.53 47.62 130.26 47.31 130.99C47 131.72 46.68 132.45 46.37 133.18C46.06 133.91 45.75 134.63 45.43 135.36C45.12 136.09 44.81 136.81 44.49 137.54C44.18 138.26 43.87 138.98 43.56 139.71C43.24 140.43 42.93 141.15 42.62 141.88C42.31 142.6 42 143.32 41.68 144.04C41.37 144.76 41.06 145.48 40.75 146.2C40.44 146.92 40.12 147.64 39.81 148.35C39.5 149.07 39.19 149.79 38.88 150.51C38.57 151.22 38.26 151.94 37.95 152.65C37.64 153.37 37.33 154.08 37.02 154.8C36.71 155.51 36.4 156.22 36.09 156.93C35.78 157.65 35.47 158.36 35.16 159.07C34.85 159.78 34.54 160.49 34.23 161.2C33.92 161.91 33.62 162.62 33.31 163.33C33 164.04 32.69 164.74 32.39 165.45C32.08 166.16 31.77 166.87 31.47 167.57C31.16 168.28 30.86 168.98 30.55 169.69C30.25 170.39 29.94 171.1 29.64 171.8C29.34 172.5 29.03 173.21 28.73 173.91C28.43 174.61 28.12 175.31 27.82 176.01C27.52 176.71 27.22 177.41 26.92 178.11C26.62 178.81 26.32 179.51 26.02 180.21C25.72 180.91 25.42 181.61 25.13 182.31C24.83 183 24.53 183.7 24.24 184.4C23.94 185.1 23.65 185.79 23.35 186.49C23.06 187.18 22.77 187.88 22.48 188.57C22.18 189.27 21.89 189.96 21.6 190.65C21.31 191.35 21.03 192.04 20.74 192.73C20.45 193.43 20.17 194.12 19.88 194.81C19.6 195.5 19.31 196.19 19.03 196.89C18.75 197.58 18.47 198.27 18.19 198.96C17.91 199.65 17.63 200.34 17.36 201.03C17.08 201.72 16.81 202.41 16.54 203.09C16.27 203.78 16 204.47 15.73 205.16C15.46 205.85 15.2 206.54 14.94 207.22C14.67 207.91 14.41 208.6 14.16 209.29C13.9 209.97 13.65 210.66 13.4 211.35C13.15 212.04 12.9 212.72 12.66 213.41C12.42 214.1 12.18 214.79 11.95 215.47C11.72 216.16 11.49 216.85 11.27 217.54C11.05 218.22 10.84 218.91 10.64 219.6C10.45 220.29 10.21 221.33 10.12 221.68C10.16 221.33 10.28 220.27 10.36 219.57C10.44 218.87 10.52 218.16 10.6 217.46C10.68 216.76 10.75 216.05 10.83 215.35C10.91 214.65 10.98 213.94 11.06 213.24C11.13 212.54 11.21 211.83 11.28 211.13C11.35 210.42 11.43 209.72 11.5 209.02C11.57 208.31 11.64 207.61 11.71 206.9C11.78 206.2 11.85 205.5 11.91 204.79C11.98 204.09 12.05 203.38 12.12 202.68C12.18 201.97 12.25 201.27 12.31 200.56C12.38 199.86 12.44 199.15 12.5 198.45C12.57 197.74 12.63 197.04 12.69 196.33C12.75 195.63 12.81 194.92 12.87 194.22C12.93 193.51 12.99 192.81 13.05 192.1C13.11 191.4 13.16 190.69 13.22 189.99C13.27 189.28 13.33 188.58 13.38 187.87C13.44 187.17 13.49 186.46 13.55 185.75C13.6 185.05 13.65 184.34 13.7 183.64C13.75 182.93 13.8 182.22 13.85 181.52C13.9 180.81 13.95 180.11 14 179.4C14.05 178.69 14.09 177.99 14.14 177.28C14.18 176.58 14.23 175.87 14.27 175.16C14.32 174.46 14.36 173.75 14.4 173.04C14.45 172.34 14.49 171.63 14.53 170.93C14.57 170.22 14.61 169.51 14.65 168.81C14.69 168.1 14.73 167.39 14.76 166.69C14.8 165.98 14.84 165.27 14.87 164.57C14.91 163.86 14.94 163.15 14.98 162.44C15.01 161.74 15.05 161.03 15.08 160.32C15.11 159.62 15.14 158.91 15.17 158.2C15.2 157.5 15.23 156.79 15.26 156.08C15.29 155.37 15.32 154.67 15.35 153.96C15.37 153.25 15.4 152.55 15.43 151.84C15.45 151.13 15.48 150.42 15.5 149.72C15.52 149.01 15.55 148.3 15.57 147.6C15.59 146.89 15.61 146.18 15.63 145.47C15.65 144.77 15.67 144.06 15.69 143.35C15.71 142.64 15.73 141.94 15.74 141.23C15.76 140.52 15.78 139.81 15.79 139.11C15.81 138.4 15.82 137.69 15.84 136.98C15.85 136.28 15.86 135.57 15.87 134.86C15.89 134.15 15.9 133.45 15.91 132.74C15.92 132.03 15.93 131.32 15.94 130.62C15.94 129.91 15.95 129.2 15.96 128.49C15.97 127.78 15.97 127.08 15.98 126.37C15.98 125.66 15.99 124.95 15.99 124.25C15.99 123.54 16 122.83 16 122.12C16 121.42 16 120.35 16 120L16 76A60 60 0 0 1 76 16L180 16A60 60 0 0 1 240 76L240 180A60 60 0 0 1 180 240L138 240A60 60 0 0 1 78 180L78 126A48 48 0 0 1 126 78L150 78A18 18 0 0 1 150 114Z',
};
const name = 'ui';
const title = `${name} by ejmlabs`;
const tagline = 'A design system for every ejmlabs site and app.';

// Outline text runs with the owned fonts. Each run is { font, wght?, size, x, y, text }; the result is one path per run.
// Manrope is variable, so it is instanced at the requested weight first.
function outline(runs) {
  const script = `
import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
fonts = {}
def load(path, wght):
    key = (path, wght)
    if key not in fonts:
        font = TTFont(path)
        fonts[key] = instantiateVariableFont(font, {'wght': wght}) if wght else font
    return fonts[key]
def num(v):
    text = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if text == '-0' else text
out = []
for run in json.load(sys.stdin):
    font = load(run['font'], run.get('wght'))
    glyphs, cmap, metrics = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
    scale = run['size'] / font['head'].unitsPerEm
    pen = SVGPathPen(glyphs, num)
    advance, box = 0, [None] * 4
    for char in run['text']:
        glyph = cmap[ord(char)]
        bounds = BoundsPen(glyphs)
        glyphs[glyph].draw(bounds)
        if bounds.bounds:
            l, b, r, t = bounds.bounds
            box = [min(v for v in (box[0], advance + l) if v is not None), min(v for v in (box[1], b) if v is not None),
                   max(v for v in (box[2], advance + r) if v is not None), max(v for v in (box[3], t) if v is not None)]
        glyphs[glyph].draw(TransformPen(pen, (scale, 0, 0, -scale, run['x'] + advance * scale, run['y'])))
        advance += metrics[glyph][0]
    out.append({'d': pen.getCommands(), 'ink': [v * scale for v in box]})
json.dump(out, sys.stdout)
`;
  return JSON.parse(execFileSync(python, ['-I', '-c', script], { input: JSON.stringify(runs) }).toString());
}

const svg = (width, height, viewBox, label, content) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="${viewBox}" role="img" aria-label="${label}"><title>${label}</title>${content}</svg>\n`;
const art = color => `<path fill="${color}" d="${mark.path}"/>`;
const files = new Map();
const add = (file, content) => files.set(file, Buffer.from(content));
let sharp;
const png = async (file, source, width, height, opaque) => {
  if (!sharp) sharp = await loadSharp();
  const image = sharp(files.get(source), { density: 72 * width / Number(/width="([\d.]+)"/.exec(files.get(source).toString())[1]) }).resize(width, height);
  files.set(file, await (opaque ? image.removeAlpha() : image).png({ compressionLevel: 9 }).toBuffer());
};

// Lockup: the 256 mark, then the name in Manrope 600 at 216 units. As in the other lockups, the text ink starts
// at about 280.5, its ink is centered on 127.5 and a 32-unit margin follows it.
const manrope = join(fonts, 'Manrope-Variable.ttf');
const mono = join(fonts, 'IBMPlexMono-Medium.ttf');
const [probe] = outline([{ font: manrope, wght: 600, size: 216, x: 0, y: 0, text: name }]);
const textX = Math.round(280.5 - probe.ink[0]);
const textY = Math.round((127.5 + (probe.ink[1] + probe.ink[3]) / 2) * 4) / 4;
const logoWidth = Math.round(textX + probe.ink[2] + 32);
const [word] = outline([{ font: manrope, wght: 600, size: 216, x: textX, y: textY, text: name }]);
const lockups = [['ink', colors.ink, colors.ink], ['paper', colors.paper, colors.paper], ['primary', colors.sage, colors.ink]];

for (const [variant, color] of [['ink', colors.ink], ['paper', colors.paper], ['sage', colors.sage]]) {
  add(`mark-${variant}.svg`, svg(1024, 1024, '0 0 256 256', `${title}, ${variant} symbol`, art(color)));
  await png(`mark-${variant}.png`, `mark-${variant}.svg`, 1024, 1024);
}
for (const [variant, markColor, textColor] of lockups) {
  const label = `${title}, ${variant} logo`;
  add(`editable/logo-${variant}.svg`, svg(logoWidth, 256, `0 0 ${logoWidth} 256`, label, `${art(markColor)}<text x="${textX}" y="${textY}" font-family="Manrope" font-size="216" font-weight="600" fill="${textColor}">${name}</text>`));
  add(`logo-${variant}.svg`, svg(2400, Math.round(2400 * 256 / logoWidth), `0 0 ${logoWidth} 256`, label, `${art(markColor)}<path fill="${textColor}" d="${word.d}"/>`));
  await png(`logo-${variant}.png`, `logo-${variant}.svg`, 2400, Math.round(2400 * 256 / logoWidth));
}

// Square icons place the 256 box at 16/21 of the canvas. The favicon cut fills 80 percent with the mark's longest side.
const icon = (background, foreground, scale) => `<rect x="0" y="0" width="1024" height="1024" rx="0" fill="${background}"/><g transform="translate(${(1024 - 256 * scale) / 2} ${(1024 - 256 * scale) / 2}) scale(${scale})">${art(foreground)}</g>`;
add('icon-sage.svg', svg(1024, 1024, '0 0 1024 1024', `${title} icon`, icon(colors.sage, colors.ink, 1024 * 16 / 21 / 256)));
add('icon-forest.svg', svg(1024, 1024, '0 0 1024 1024', `${title} icon`, icon(colors.forest, colors.paper, 1024 * 16 / 21 / 256)));
add('favicon.svg', svg(1024, 1024, '0 0 1024 1024', `${title} icon`, icon(colors.sage, colors.ink, 1024 * 0.8 / Math.max(...mark.extent))));
for (const variant of ['sage', 'forest']) await png(`icon-${variant}.png`, `icon-${variant}.svg`, 1024, 1024, true);
for (const [file, size] of [['favicon-16.png', 16], ['favicon-24.png', 24], ['favicon-32.png', 32], ['favicon-48.png', 48], ['apple-touch-icon.png', 180], ['android-chrome-192.png', 192], ['android-chrome-512.png', 512]]) {
  await png(file, 'favicon.svg', size, size, true);
}
const ico = execFileSync(python, ['-I', '-c', 'import io, sys; from PIL import Image; out = io.BytesIO(); Image.open(sys.stdin.buffer).save(out, format="ICO", sizes=[(16,16),(32,32),(48,48)]); sys.stdout.buffer.write(out.getvalue())'], { input: files.get('android-chrome-512.png') });
files.set('favicon.ico', ico);
add('site.webmanifest', JSON.stringify({ id: '/', name: title, short_name: name, start_url: '/', scope: '/', display: 'standalone', background_color: colors.paper, theme_color: colors.sage, icons: [192, 512].map(size => ({ src: `android-chrome-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })) }, null, 2) + '\n');

// Social card, laid out as the other project cards: the ejmlabs logo, a mono kicker, the ink lockup at 0.72,
// the tagline and the host.
const parent = readFileSync(join(tokens, 'assets/logos/ejmlabs-ink.svg'), 'utf8');
const [vx, vy, vw] = /viewBox="([^"]+)"/.exec(parent)[1].split(/\s+/).map(Number);
const parentPaths = parent.match(/<path\b[^>]*\/>/g).join('');
const [kicker, line, host] = outline([
  { font: mono, size: 16, x: 72, y: 183.4, text: 'OPEN SOURCE / THE SYSTEM.' },
  { font: manrope, wght: 400, size: 27, x: 72, y: 510.8, text: tagline },
  { font: mono, size: 16, x: 72, y: 586.4, text: `${name}.ejmlabs.com` },
]);
add('social-card.svg', svg(1200, 630, '0 0 1200 630', `${title}: ${tagline}`, [
  `<rect x="0" y="0" width="1200" height="630" rx="0" fill="${colors.sage}"/>`,
  `<g transform="translate(72 64) scale(${180 / vw})"><g transform="translate(${-vx} ${-vy}) scale(1)">${parentPaths}</g></g>`,
  `<path fill="${colors.forest}" d="${kicker.d}"/>`,
  `<g transform="translate(64 245) scale(0.72)">${art(colors.ink)}<path fill="${colors.ink}" d="${word.d}"/></g>`,
  `<path fill="${colors.ink}" d="${line.d}"/>`,
  `<path fill="${colors.forest}" d="${host.d}"/>`,
].join('')));
await png('social-card.png', 'social-card.svg', 1200, 630, true);

const provenance = join(tokens, 'assets/PROVENANCE.md');
const text = readFileSync(provenance, 'utf8');
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const rows = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, buffer]) => `| \`assets/projects/ui/${file}\` | \`generated:ui-assets/${file}\` | \`${sha(buffer)}\` |`);
const clean = text.split('\n').filter(row => !row.startsWith('| `assets/projects/ui/')).join('\n');
const marker = '\n\n## Moved and then edited';
if (!clean.includes(marker)) throw new Error('Provenance table insertion point is missing.');
const updated = clean.replace(marker, `\n${rows.join('\n')}${marker}`);
const walk = dir => readdirSync(dir).flatMap(entry => statSync(join(dir, entry)).isDirectory() ? walk(join(dir, entry)) : [join(dir, entry)]);
if (process.argv.includes('--check')) {
  for (const [file, buffer] of files) if (!existsSync(join(directory, file)) || !readFileSync(join(directory, file)).equals(buffer)) throw new Error(`ui asset differs: ${file}`);
  const extra = walk(directory).map(file => relative(directory, file).split('\\').join('/')).filter(file => !files.has(file));
  if (extra.length) throw new Error(`Unexpected ui assets: ${extra.join(', ')}`);
  if (text !== updated) throw new Error('ui asset provenance differs.');
} else {
  for (const [file, buffer] of files) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), buffer);
  }
  writeFileSync(provenance, updated);
}
console.log(`ui assets ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${files.size} files.`);
