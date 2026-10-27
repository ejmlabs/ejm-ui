#!/usr/bin/env node
// Turns every captured PNG into AVIF, WebP and PNG files at 1x and 2x widths, and writes an index the site loader reads.
//
//   node packages/shots/scripts/optimize.mjs                 encode what changed, write generated/shots.json
//   node packages/shots/scripts/optimize.mjs --check         write nothing; exit 1 when the output is stale
//   options: --assets <dir> (default packages/shots/assets)  --out <dir> (default packages/shots/generated)
//
// Input layout: <assets>/<product>/<name>.<theme>.png (theme dark or light) and <assets>/<product>/<name>.json, the metadata.
// Output: <out>/<product>/<name>.<theme>.<width>w.<avif|webp|png> and <out>/shots.json.
//
// Widths: the PNG is a capture at a device scale (metadata `scale`, default 2, which is what the capture tools render at). The 1x
// file is the CSS width (png / scale) and the 2x file is the full capture, so a PNG is never upscaled. Metadata is read through
// shot-meta.mjs, which maps the capture tools' field names; the transcript stays in assets/ and does not enter the index.
// Encoders are sharp (libvips, libaom, libwebp): maintained, prebuilt, no system tools. 4:4:4 chroma keeps colored text crisp.
// AVIF is always lossy (lossless AVIF of a terminal is about 8 times larger than lossless WebP). WebP keeps the smaller of lossless and lossy.
// "Stale" means: a source PNG or metadata changed, an output file is missing or altered, or PIPELINE changed. sharp's version is
// not part of it, so a different machine does not call the output stale.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMeta, readShotMeta } from './shot-meta.mjs';

/** Bump when encoder settings change, so every shot is encoded again. */
export const PIPELINE = 'avif-q55-e6-444;webp-smaller-of-lossless-and-q80;png-palette-q90';
export const THEMES = ['dark', 'light'];
const here = dirname(fileURLToPath(import.meta.url));
export const defaultAssets = join(here, '..', 'assets');
export const defaultOut = join(here, '..', 'generated');

const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const walk = d => (existsSync(d) ? readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])) : []);
const posix = p => p.split('\\').join('/');

/** Widths to encode for a PNG of `pngWidth` pixels captured at device `scale`: the CSS width (1x) and the full capture (2x). */
export function plan(pngWidth, scale = 2) {
  const base = Math.round(pngWidth / Math.max(1, scale));
  return { base, widths: [...new Set([base, pngWidth])].sort((a, b) => a - b) };
}

async function encode(sharp, png, width, pngWidth, format) {
  let img = sharp(png);
  if (width !== pngWidth) img = img.resize({ width, kernel: 'lanczos3' });
  if (format === 'avif') return img.avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
  if (format === 'webp') {
    // Flat terminal text is far smaller (and exact) as lossless WebP; a photographic window capture may be smaller lossy. Keep the smaller.
    const [lossless, lossy] = await Promise.all([img.clone().webp({ lossless: true, effort: 6 }).toBuffer(), img.clone().webp({ quality: 80, effort: 6 }).toBuffer()]);
    return lossless.length <= lossy.length ? lossless : lossy;
  }
  return img.png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 }).toBuffer();
}

/** Reads the inputs only. Returns what the output must contain, without encoding anything. */
async function scan(sharp, assets) {
  const shots = {};
  const problems = [];
  for (const file of walk(assets).filter(f => /\.(dark|light)\.png$/.test(f)).sort()) {
    const rel = posix(relative(assets, file));
    const [product, ...rest] = rel.split('/');
    const base = rest.join('/').replace(/\.(dark|light)\.png$/, '');
    const theme = rel.match(/\.(dark|light)\.png$/)[1];
    const key = `${product}/${base}`;
    const read = readShotMeta(assets, product, base);
    if (read.missing) { problems.push(`${rel}: no metadata file ${product}/${base}.json`); continue; }
    if (read.invalid) { problems.push(`${product}/${base}.json: not valid JSON (${read.invalid})`); continue; }
    const { meta } = normalizeMeta(read.raw, product);
    const bytes = readFileSync(file);
    const info = await sharp(bytes).metadata();
    const p = plan(info.width, meta.scale);
    const entry = (shots[key] ??= { meta, themes: {} });
    entry.themes[theme] = {
      source: { file: rel, sha256: sha256(bytes), width: info.width, height: info.height, bytes: bytes.length },
      width: p.base,
      height: Math.round((info.height * p.base) / info.width),
      widths: p.widths,
      _png: bytes,
    };
  }
  return { shots, problems };
}

const fileName = (key, theme, width, format) => `${key}.${theme}.${width}w.${format}`;
const FORMATS = ['avif', 'webp', 'png'];

/** @returns {Promise<{ index: object, problems: string[], report: string[] }>} */
export async function optimizeShots({ assets = defaultAssets, out = defaultOut, check = false } = {}) {
  const { default: sharp } = await import('sharp');
  const { shots, problems } = await scan(sharp, assets);
  const indexFile = join(out, 'shots.json');
  const old = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : { shots: {} };
  const keep = new Set();
  const report = [];

  for (const [key, entry] of Object.entries(shots)) {
    const oldEntry = old.pipeline === PIPELINE ? old.shots?.[key] : undefined;
    for (const [theme, t] of Object.entries(entry.themes)) {
      const oldTheme = oldEntry?.themes?.[theme];
      const reusable = oldTheme && oldTheme.source.sha256 === t.source.sha256 && oldTheme.files.every(f => {
        const p = join(out, f.file);
        return existsSync(p) && sha256(readFileSync(p)) === f.sha256;
      });
      if (reusable && oldTheme.files.length === t.widths.length * FORMATS.length) {
        t.files = oldTheme.files;
      } else if (check) {
        problems.push(`${key} ${theme}: ${oldTheme ? 'source or outputs changed' : 'not optimized'}`);
        t.files = [];
        for (const f of oldTheme?.files ?? []) keep.add(f.file); // reported once as stale, not again as stray files
      } else {
        t.files = [];
        for (const width of t.widths) {
          const height = Math.round((t.source.height * width) / t.source.width);
          for (const format of FORMATS) {
            const buf = await encode(sharp, t._png, width, t.source.width, format);
            const file = posix(fileName(key, theme, width, format));
            mkdirSync(dirname(join(out, file)), { recursive: true });
            writeFileSync(join(out, file), buf);
            t.files.push({ file, format, width, height, bytes: buf.length, sha256: sha256(buf) });
          }
        }
      }
      for (const f of t.files) keep.add(f.file);
      delete t._png;
      const kb = fmt => (Math.max(0, ...t.files.filter(f => f.format === fmt).map(f => f.bytes)) / 1024).toFixed(1);
      const kb1 = fmt => ((t.files.find(f => f.format === fmt && f.width === t.widths[0])?.bytes ?? 0) / 1024).toFixed(1);
      report.push(`${key} ${theme}: ${t.width}x${t.height} css, ${t.widths.join('/')}w, avif ${kb1('avif')} KB (1x) ${kb('avif')} KB (2x), webp ${kb('webp')} KB, png ${kb('png')} KB, source ${(t.source.bytes / 1024).toFixed(1)} KB`);
    }
  }

  const index = { format: 1, pipeline: PIPELINE, shots };
  const indexes = new Map([['shots.json', index]]);
  for (const product of new Set(Object.keys(shots).map(key => key.split('/')[0]))) {
    const file = `${product}.json`;
    keep.add(file);
    indexes.set(file, { ...index, shots: Object.fromEntries(Object.entries(shots).filter(([key]) => key.startsWith(`${product}/`))) });
  }
  // Output files nothing refers to are stale too.
  const orphans = walk(out).map(f => posix(relative(out, f))).filter(f => f !== 'shots.json' && !keep.has(f));
  if (check) {
    for (const o of orphans) problems.push(`${o}: output file with no source`);
    for (const [file, data] of indexes) {
      const path = join(out, file);
      const have = existsSync(path) ? readFileSync(path, 'utf8') : '';
      if (have !== JSON.stringify(data, null, 2) + '\n') problems.push(`${file} does not match the sources (run: node packages/shots/scripts/optimize.mjs)`);
    }
  } else {
    for (const o of orphans) rmSync(join(out, o));
    mkdirSync(out, { recursive: true });
    for (const [file, data] of indexes) writeFileSync(join(out, file), JSON.stringify(data, null, 2) + '\n');
  }
  return { index, problems, report };
}

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : process.argv[i + 1];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const { problems, report, index } = await optimizeShots({
    assets: resolve(arg('--assets', defaultAssets)),
    out: resolve(arg('--out', defaultOut)),
    check,
  });
  for (const line of report) console.log(line);
  if (problems.length) {
    console.error(`shots: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`shots: ${check ? 'up to date' : 'wrote'} ${Object.keys(index.shots).length} shot(s)`);
}
