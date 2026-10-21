// Original chess artwork. Render text with the owned Manrope font, then outline it.
// Requires librsvg and Python Pillow, as does the existing favicon generator.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = join(root, 'packages/tokens');
const directory = join(tokens, 'assets/projects/chess');
const colors = JSON.parse(readFileSync(join(tokens, 'assets/brand/palette.json'), 'utf8')).colors;
const renderer = process.env.RSVG_CONVERT || 'rsvg-convert';
const python = process.env.PYTHON || ['python3', '/usr/bin/python3'].find(candidate => {
  try { execFileSync(candidate, ['-c', 'from PIL import Image'], { stdio: 'ignore' }); return true; } catch { return false; }
});
if (!python) throw new Error('Pillow is required. Set PYTHON to a Python with PIL installed.');
const stage = mkdtempSync(join(tmpdir(), 'ejm-chess-brand-'));
const knight = 'M18 49C18 40 24 35 32 30L23 33L13 28V21L24 14L28 5L37 13C48 16 53 25 53 35C53 41 49 45 48 49ZM31 19A2 2 0 1 0 31 23A2 2 0 1 0 31 19ZM14 53H50V59H14Z';
const art = color => `<path fill="${color}" fill-rule="evenodd" d="${knight}"/>`;
const svg = (width, height, label, content) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><title>${label}</title>${content}</svg>\n`;
const files = new Map();
const add = (name, content) => { writeFileSync(join(stage, name), content); files.set(name, readFileSync(join(stage, name))); };
const render = (name, source, size, format = 'png') => {
  const output = execFileSync(renderer, ['--format', format, ...(size ? ['--width', String(size)] : []), join(stage, source)], { env: renderEnv });
  add(name, output);
};
let renderEnv;
try {
  // Isolate font lookup to the included source. Generated SVG wordmarks contain paths.
  const config = join(stage, 'fonts.conf');
  writeFileSync(config, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${join(tokens, 'assets/fonts')}</dir><cachedir>${stage}/font-cache</cachedir></fontconfig>`);
  renderEnv = { ...process.env, FONTCONFIG_FILE: config };
  const match = execFileSync('fc-match', ['--format', '%{family}', 'Manrope'], { env: renderEnv }).toString();
  if (!match.includes('Manrope')) throw new Error('The owned Manrope font could not be resolved.');
  for (const [name, color] of [['ink', colors.ink], ['paper', colors.paper], ['sage', colors.sage]]) {
    add(`mark-${name}.svg`, svg(64, 64, 'Chess by ejmlabs', art(color)));
  }
  for (const [name, color] of [['ink', colors.ink], ['paper', colors.paper], ['primary', colors.forest]]) {
    const source = `logo-${name}-source.svg`;
    writeFileSync(join(stage, source), svg(218, 64, 'Chess by ejmlabs', `${art(color)}<text x="76" y="47" font-family="Manrope" font-size="46" font-weight="650" letter-spacing="-2" fill="${color}">chess</text>`));
    render(`logo-${name}.svg`, source, undefined, 'svg');
  }
  add('icon-sage.svg', svg(64, 64, 'Chess by ejmlabs', `<path fill="${colors.sage}" d="M0 0H64V64H0Z"/><g transform="translate(6 6) scale(.8125)">${art(colors.ink)}</g>`));
  add('icon-forest.svg', svg(64, 64, 'Chess by ejmlabs', `<path fill="${colors.forest}" d="M0 0H64V64H0Z"/><g transform="translate(6 6) scale(.8125)">${art(colors.paper)}</g>`));
  add('favicon.svg', files.get('icon-sage.svg'));
  for (const [name, size] of [['favicon-16.png', 16], ['favicon-24.png', 24], ['favicon-32.png', 32], ['favicon-48.png', 48], ['apple-touch-icon.png', 180], ['android-chrome-192.png', 192], ['android-chrome-512.png', 512]]) render(name, 'favicon.svg', size);
  execFileSync(python, ['-c', 'from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2], format="ICO", sizes=[(16,16),(32,32),(48,48)])', join(stage, 'android-chrome-512.png'), join(stage, 'favicon.ico')]);
  files.set('favicon.ico', readFileSync(join(stage, 'favicon.ico')));
  add('site.webmanifest', JSON.stringify({ id: '/', name: 'Chess by ejmlabs', short_name: 'Chess', start_url: '/', scope: '/', display: 'standalone', background_color: colors.paper, theme_color: colors.sage, icons: [192, 512].map(size => ({ src: `android-chrome-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })) }, null, 2) + '\n');
  const socialSource = 'social-source.svg';
  writeFileSync(join(stage, socialSource), svg(1200, 630, 'Chess by ejmlabs', `<path fill="${colors.paper}" d="M0 0H1200V630H0Z"/><g transform="translate(90 140) scale(4.5)">${art(colors.forest)}</g><text x="450" y="340" font-family="Manrope" font-size="142" font-weight="650" letter-spacing="-6" fill="${colors.ink}">chess</text><text x="455" y="410" font-family="Manrope" font-size="30" font-weight="500" fill="${colors.forest}">by ejmlabs</text>`));
  render('social-card.svg', socialSource, undefined, 'svg');
  render('social-card.png', 'social-card.svg', 1200);
  const provenance = join(tokens, 'assets/PROVENANCE.md');
  const text = readFileSync(provenance, 'utf8');
  const rows = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([name, buffer]) => `| \`assets/projects/chess/${name}\` | \`generated:chess-assets/${name}\` | \`${createHash('sha256').update(buffer).digest('hex')}\` |`);
  const clean = text.split('\n').filter(line => !line.startsWith('| `assets/projects/chess/')).join('\n');
  const marker = '\n## Moved and then edited';
  if (!clean.includes(marker)) throw new Error('Provenance table insertion point is missing.');
  const updated = clean.replace(marker, rows.join('\n') + '\n' + marker);
  if (process.argv.includes('--check')) {
    for (const [name, buffer] of files) if (!existsSync(join(directory, name)) || !readFileSync(join(directory, name)).equals(buffer)) throw new Error(`Chess asset differs: ${name}`);
    const extra = readdirSync(directory).filter(name => !files.has(name));
    if (extra.length) throw new Error(`Unexpected chess assets: ${extra.join(', ')}`);
    if (text !== updated) throw new Error('Chess asset provenance differs.');
  } else {
    mkdirSync(directory, { recursive: true });
    for (const [name, buffer] of files) writeFileSync(join(directory, name), buffer);
    writeFileSync(provenance, updated);
  }
  console.log(`Chess assets ${process.argv.includes('--check') ? 'verified' : 'generated'}: ${files.size} files.`);
} finally { rmSync(stage, { recursive: true, force: true }); }
