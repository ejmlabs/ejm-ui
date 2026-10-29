// A project brand family in the ejmlabs format, generated from one approved mark. `scripts/ui-assets.mjs` and
// `scripts/gerry-assets.mjs` call it with their mark, name and copy.
//
// The files follow the cli, ide and harness sets: a 256 grid shipped at 1024 px, 2400 px lockups with Manrope 600
// at 216 units, editable lockups that keep live text, square icons, browser icons, a manifest and a social card.
// Text is outlined from the owned fonts with Python fontTools, rasters come from sharp and the ICO from Pillow.
// `--check` fails if any written file or provenance row would change.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = join(root, 'packages/tokens');
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
    throw new Error('sharp is required to generate brand assets. Add it with the assets split lockfile, then retry.', { cause: error });
  }
};

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

/** Write, or with `--check` verify, `assets/projects/<id>/` and its PROVENANCE.md rows.
 *  `mark` is { path, extent }: the filled 256-grid artwork and its ink width and height. */
export async function writeFamily({ id, name, mark, tagline, kicker, host }) {
  const directory = join(tokens, `assets/projects/${id}`);
  const title = `${name} by ejmlabs`;
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
  const [kickerRun, line, hostRun] = outline([
    { font: mono, size: 16, x: 72, y: 183.4, text: kicker },
    { font: manrope, wght: 400, size: 27, x: 72, y: 510.8, text: tagline },
    { font: mono, size: 16, x: 72, y: 586.4, text: host },
  ]);
  add('social-card.svg', svg(1200, 630, '0 0 1200 630', `${title}: ${tagline}`, [
    `<rect x="0" y="0" width="1200" height="630" rx="0" fill="${colors.sage}"/>`,
    `<g transform="translate(72 64) scale(${180 / vw})"><g transform="translate(${-vx} ${-vy}) scale(1)">${parentPaths}</g></g>`,
    `<path fill="${colors.forest}" d="${kickerRun.d}"/>`,
    `<g transform="translate(64 245) scale(0.72)">${art(colors.ink)}<path fill="${colors.ink}" d="${word.d}"/></g>`,
    `<path fill="${colors.ink}" d="${line.d}"/>`,
    `<path fill="${colors.forest}" d="${hostRun.d}"/>`,
  ].join('')));
  await png('social-card.png', 'social-card.svg', 1200, 630, true);

  const provenance = join(tokens, 'assets/PROVENANCE.md');
  const text = readFileSync(provenance, 'utf8');
  const sha = buffer => createHash('sha256').update(buffer).digest('hex');
  const rows = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([file, buffer]) => `| \`assets/projects/${id}/${file}\` | \`generated:${id}-assets/${file}\` | \`${sha(buffer)}\` |`);
  // Replace this family's rows where they are, so families keep their order whichever generator runs last.
  // A new family goes in before the marker.
  const own = row => row.startsWith(`| \`assets/projects/${id}/`);
  const lines = text.split('\n');
  const at = lines.findIndex(own);
  const kept = lines.filter(row => !own(row));
  let updated;
  if (at >= 0) {
    kept.splice(at, 0, ...rows);
    updated = kept.join('\n');
  } else {
    const clean = kept.join('\n');
    const marker = '\n\n## Moved and then edited';
    if (!clean.includes(marker)) throw new Error('Provenance table insertion point is missing.');
    updated = clean.replace(marker, `\n${rows.join('\n')}${marker}`);
  }
  const walk = dir => readdirSync(dir).flatMap(entry => statSync(join(dir, entry)).isDirectory() ? walk(join(dir, entry)) : [join(dir, entry)]);
  if (process.argv.includes('--check')) {
    for (const [file, buffer] of files) if (!existsSync(join(directory, file)) || !readFileSync(join(directory, file)).equals(buffer)) throw new Error(`${id} asset differs: ${file}`);
    const extra = walk(directory).map(file => relative(directory, file).split('\\').join('/')).filter(file => !files.has(file));
    if (extra.length) throw new Error(`Unexpected ${id} assets: ${extra.join(', ')}`);
    if (text !== updated) throw new Error(`${id} asset provenance differs.`);
  } else {
    for (const [file, buffer] of files) {
      mkdirSync(dirname(join(directory, file)), { recursive: true });
      writeFileSync(join(directory, file), buffer);
    }
    writeFileSync(provenance, updated);
  }
  console.log(`${id} assets ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${files.size} files.`);
}
