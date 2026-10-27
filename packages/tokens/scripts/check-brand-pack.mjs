#!/usr/bin/env node
// Protect the published tokens tarball: reserved brand artwork stays out, fonts, palette JSON and icons stay in.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLISHED = ['assets/fonts/', 'assets/brand/', 'assets/icons/'];
const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: pkg, encoding: 'utf8' }));
const packed = new Set(pack.files.map(file => file.path));
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const file = join(path, entry.name);
    return entry.isDirectory() ? files(file) : [relative(pkg, file).replaceAll('\\', '/')];
  });
}
const expected = files(join(pkg, 'assets')).filter(file => PUBLISHED.some(dir => file.startsWith(dir)) && !file.endsWith('/.DS_Store'));
const missing = expected.filter(file => !packed.has(file));
if (missing.length) throw new Error(`Published asset inputs missing from package:\n${missing.join('\n')}`);
const reserved = [...packed].filter(file => file.startsWith('assets/') && !PUBLISHED.some(dir => file.startsWith(dir)));
if (reserved.length) throw new Error(`Reserved brand artwork must not be packed:\n${reserved.join('\n')}`);
console.log(`brand-pack: ${expected.length} font, palette and icon files included, no reserved brand artwork`);
