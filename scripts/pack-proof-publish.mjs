#!/usr/bin/env node
// The publish-set proof: do the four packages that go to npm work from their own tarballs alone?
//
//   node scripts/pack-proof-publish.mjs [--dir <folder outside the repo>]
//
// NEEDS NETWORK: the throwaway consumer installs react, vite, tailwind and typescript from the npm registry.
// Unlike scripts/pack-proof.mjs, nothing private is installed (no site, demos, ink or shots), and nothing from this repo is copied
// in except tsconfig.base.json. Steps:
//   1. `npm pack` for @ejm/tokens, core, ui and ssg into <dir>/tarballs,
//   2. check the tokens tarball holds no reserved brand artwork and keeps the fonts and their notices,
//   3. install ONLY those four tarballs in <dir>/consumer (no workspace, no links),
//   4. typecheck a probe that imports the documented entry points, then `vite build` a page that uses @ejm/ui and @ejm/ssg's plugin.
// Exit code 0 only if every step passed. The folder is kept; without --dir it is a new folder under the system temp directory.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argValue = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const dir = resolve(argValue('--dir') ?? mkdtempSync(join(tmpdir(), 'ejm-publish-proof-')));
if (dir === repo || dir.startsWith(repo + sep)) throw new Error(`pack-proof-publish: --dir must be outside the repo, got ${dir}`);

const PACKAGES = ['tokens', 'core', 'ui', 'ssg'];
const step = title => console.log(`\n== ${title}`);
const run = (cmd, cmdArgs, cwd) => execFileSync(cmd, cmdArgs, { cwd, stdio: 'inherit' });
const read = (cmd, cmdArgs, cwd) => execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

step('npm pack');
const tarballs = join(dir, 'tarballs');
rmSync(tarballs, { recursive: true, force: true });
mkdirSync(tarballs, { recursive: true });
const packed = PACKAGES.map(p => {
  const [info] = JSON.parse(read('npm', ['pack', '-w', `packages/${p}`, '--pack-destination', tarballs, '--json'], repo));
  console.log(`${info.name.padEnd(14)} ${String(info.size).padStart(9)} bytes gzip, ${String(info.unpackedSize).padStart(9)} unpacked, ${String(info.entryCount).padStart(4)} files`);
  return info;
});

step('tokens tarball contents');
const tokens = packed.find(i => i.name === '@ejm/tokens');
const paths = tokens.files.map(f => f.path);
const stripped = paths.filter(f => f.startsWith('assets/') && !/^assets\/(fonts|brand|icons)\//.test(f));
if (stripped.length) throw new Error(`reserved brand artwork in the tokens tarball:\n${stripped.join('\n')}`);
for (const required of ['assets/fonts/Manrope-OFL.txt', 'assets/fonts/IBMPlexMono-OFL.txt', 'assets/fonts/Manrope-Variable.woff2', 'assets/brand/palette.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  if (!paths.includes(required)) throw new Error(`the tokens tarball is missing ${required}`);
}
console.log(`${paths.length} files, no reserved brand artwork`);

step('consumer install from the tarballs only');
const consumer = join(dir, 'consumer');
rmSync(consumer, { recursive: true, force: true });
mkdirSync(join(consumer, 'src'), { recursive: true });
const rootPkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
const range = name => rootPkg.dependencies?.[name] ?? rootPkg.devDependencies?.[name] ?? (() => { throw new Error(`pack-proof-publish: ${name} is not in the root package.json`); })();
writeFileSync(join(consumer, 'package.json'), JSON.stringify({
  name: 'ejm-publish-proof-consumer',
  version: '0.0.0',
  private: true,
  type: 'module',
  dependencies: {
    ...Object.fromEntries(packed.map(i => [i.name, `file:../tarballs/${i.filename}`])),
    react: range('react'),
    'react-dom': range('react-dom'),
    tailwindcss: range('tailwindcss'),
  },
  devDependencies: Object.fromEntries(['@tailwindcss/vite', '@types/node', '@types/react', '@types/react-dom', '@vitejs/plugin-react', 'typescript', 'vite'].map(n => [n, range(n)])),
}, null, 2) + '\n');
// No `extends` into the repo and no `paths`: types must resolve through the packages' `exports`.
const base = JSON.parse(readFileSync(join(repo, 'tsconfig.base.json'), 'utf8')).compilerOptions;
delete base.paths;
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { ...base, types: ['node', 'vite/client'] }, include: ['src', 'vite.config.ts'] }, null, 2) + '\n');
writeFileSync(join(consumer, 'vite.config.ts'), `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [tailwindcss(), react()], resolve: { dedupe: ['react', 'react-dom'] }, build: { target: 'es2022' } });
`);
writeFileSync(join(consumer, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>proof</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n');
writeFileSync(join(consumer, 'src', 'styles.css'), '@import "tailwindcss";\n@import "@ejm/ui/styles.css";\n');
writeFileSync(join(consumer, 'src', 'main.tsx'), `import { createRoot } from 'react-dom/client';
import { Button } from '@ejm/ui';
import { Hero } from '@ejm/ui/layout/Hero';
import { useTheme } from '@ejm/ui/hooks/useTheme';
import './styles.css';

function App() {
  const { resolved } = useTheme();
  return <Hero title={resolved}><Button>Proof</Button></Hero>;
}
createRoot(document.getElementById('root')!).render(<App />);
`);
writeFileSync(join(consumer, 'src', 'deep-imports.ts'), `// Written by scripts/pack-proof-publish.mjs.
import { BANDS, THEMES } from '@ejm/tokens';
import theme from '@ejm/tokens/theme.json';
import { cn, fontPreloads, Button } from '@ejm/ui';
import { tokenize } from '@ejm/ui/docs/highlight';
import { Header } from '@ejm/ui/shell/Header';
import { useReducedMotion } from '@ejm/ui/hooks/useReducedMotion';
import { ejmSsg } from '@ejm/ssg/vite';
import * as core from '@ejm/core';
export const probe = [BANDS, THEMES, theme, cn, fontPreloads, Button, tokenize, Header, useReducedMotion, ejmSsg, core];
`);
run('npm', ['install', '--no-audit', '--no-fund'], consumer);

const bin = name => join(consumer, 'node_modules', '.bin', name);
step('typecheck');
run(bin('tsc'), ['-p', 'tsconfig.json', '--pretty', 'false'], consumer);
step('vite build');
run(bin('vite'), ['build'], consumer);
const css = readdirSync(join(consumer, 'dist', 'assets')).filter(f => f.endsWith('.css'));
if (!css.length) throw new Error('the build produced no CSS');
console.log(`\npack-proof-publish ok. Kept: ${dir}`);
