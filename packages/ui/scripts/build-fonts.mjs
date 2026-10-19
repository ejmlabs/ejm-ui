#!/usr/bin/env node
// Builds the Latin WOFF2 subsets that styles.css serves, from the full font files in packages/tokens/assets/fonts
// (the originals stay as the source). Needs fontTools with brotli: it runs `pyftsubset` when that is on PATH and
// otherwise `uv run --with fonttools --with brotli pyftsubset`.
//   node packages/ui/scripts/build-fonts.mjs
// The output is committed (packages/ui/src/fonts). It is not byte-checked, because font tools do not promise identical
// bytes across versions; `scripts/size.mjs` and the font test guard the sizes instead.
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = join(here, '..', '..', 'tokens', 'assets', 'fonts');
const out = join(here, '..', 'src', 'fonts');

// Latin, Latin-1, punctuation, currency and common symbols. The same range goes in the @font-face unicode-range, so a
// page that needs another script falls back to the system font and never downloads a font it cannot use.
export const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
// Mono also carries the arrows, box drawing, blocks and check marks that terminal output uses.
export const LATIN_MONO = `${LATIN},U+2190-21FF,U+2500-259F,U+2713`;

const jobs = [
  { src: 'Manrope-Variable.ttf', dest: 'manrope-latin.woff2', unicodes: LATIN, features: 'kern,liga,calt,case,tnum,pnum,frac,locl' },
  { src: 'IBMPlexMono-Medium.ttf', dest: 'ibm-plex-mono-500-latin.woff2', unicodes: LATIN_MONO, features: 'kern,ccmp,zero,ss01,ss02,ss03,frac' },
];

const have = spawnSync('pyftsubset', ['--help'], { stdio: 'ignore' }).status === 0;
const [cmd, pre] = have ? ['pyftsubset', []] : ['uv', ['run', '--quiet', '--with', 'fonttools', '--with', 'brotli', 'pyftsubset']];
for (const j of jobs) {
  execFileSync(cmd, [...pre, join(fonts, j.src), `--unicodes=${j.unicodes}`, `--layout-features=${j.features}`, '--flavor=woff2', '--no-hinting', '--desubroutinize', `--output-file=${join(out, j.dest)}`], { stdio: 'inherit' });
  console.log(`wrote ${j.dest}`);
}
