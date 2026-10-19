#!/usr/bin/env node
// Makes the clean builds the shots are captured from: `git archive HEAD` of ejm-cli and ejm-harness (no uncommitted changes, no
// untracked files, no ignored files), and a release build of each in its own cargo target directory.
//
//   node packages/shots/scripts/clean-build.mjs [--dest dir] [--no-seed]
//
// --dest   the export folder (default: EJM_SHOTS_EXPORT, else <tmp>/ejm-shots-export). Layout:
//            ejm-cli/ ejm-harness/        the exported sources, side by side, so ejm-cli's `../ejm-harness` path dependencies resolve
//            target-cli/ target-harness/  the cargo target directories (outside the exports, like CARGO_TARGET_DIR)
// --no-seed  do not clone the repo's own target/release into an empty target directory first. The clone (`cp -cR`, an APFS
//            copy-on-write clone, nearly free) only saves a cold build; cargo still rebuilds every crate whose path changed.
// Repos are read from ../ejm-cli and ../ejm-harness beside this repo (EJM_CLI_REPO, EJM_HARNESS_REPO). They are only read
// (`git archive`); nothing in them is changed. ejm-cli has no committed pin of the harness revision, so the harness HEAD is used.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ui = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const arg = n => { const i = process.argv.indexOf(n); return i === -1 ? undefined : process.argv[i + 1]; };
const dest = resolve(arg('--dest') || process.env.EJM_SHOTS_EXPORT || join(tmpdir(), 'ejm-shots-export'));
const repos = { cli: resolve(process.env.EJM_CLI_REPO || join(ui, '../ejm-cli')), harness: resolve(process.env.EJM_HARNESS_REPO || join(ui, '../ejm-harness')) };
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts });
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

mkdirSync(dest, { recursive: true });
const commits = Object.fromEntries(Object.entries(repos).map(([k, r]) => [k, out('git', ['-C', r, 'rev-parse', 'HEAD'])]));

/** @param {'cli' | 'harness'} k */
function exportRepo(k, name, build) {
  const dir = join(dest, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  const tar = execFileSync('git', ['-C', repos[k], 'archive', 'HEAD'], { maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  writeFileSync(join(dir, '.ejm-export.json'), JSON.stringify({ repo: name, commit: commits[k], method: 'git archive HEAD', build }, null, 2) + '\n');
  console.log(`exported ${name} ${commits[k].slice(0, 12)} -> ${dir}`);
}
exportRepo('cli', 'ejm-cli', `Release build of the ejm-cli binary, with its \`../ejm-harness\` path dependencies resolved to a clean export of ejm-harness ${commits.harness}.`);
exportRepo('harness', 'ejm-harness', 'Release build of the ejm-harness-worker binary. sdk/typescript/dist and the Python SDK are the committed files.');

for (const [name, pkg] of [['cli', 'ejm-cli'], ['harness', 'ejm-harness-worker']]) {
  const target = join(dest, `target-${name}`), src = join(dest, name === 'cli' ? 'ejm-cli' : 'ejm-harness'), own = join(repos[name], 'target/release');
  if (!process.argv.includes('--no-seed') && !existsSync(join(target, 'release')) && existsSync(own)) {
    mkdirSync(target, { recursive: true });
    try { run('cp', ['-cR', own, join(target, 'release')]); } catch { cpSync(own, join(target, 'release'), { recursive: true }); }
  }
  console.log(`building ${pkg} in ${src}`);
  run('cargo', ['build', '--release', '--offline', '--locked', '-p', pkg], { cwd: src, env: { ...process.env, CARGO_TARGET_DIR: target } });
}
console.log(`done. Capture with: EJM_SHOTS_EXPORT=${dest} node scripts/capture-terminal.mjs all`);
