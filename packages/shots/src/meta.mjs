// Facts about the product a shot was captured from, and the metadata file written next to the images.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const here = new URL('..', import.meta.url).pathname;
export const UI_ROOT = resolve(here, '../..');
export const TOOL_VERSION = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version;

/**
 * The clean exports of the products: `git archive HEAD` of each repo plus its release build, made by scripts/clean-build.mjs.
 * Shots are only captured from here. Override the folder with EJM_SHOTS_EXPORT.
 */
export const EXPORT_ROOT = resolve(process.env.EJM_SHOTS_EXPORT || join(tmpdir(), 'ejm-shots-export'));

/** Paths in metadata name the export folder as <clean-export> and are otherwise relative to the ejm-ui root, so no home directory leaks. */
export const rel = (/** @type {string} */ p) => (p.startsWith(EXPORT_ROOT + '/') ? `<clean-export>/${relative(EXPORT_ROOT, p)}` : p.startsWith(dirname(UI_ROOT) + '/') ? relative(UI_ROOT, p) : p);

const git = (/** @type {string} */ dir, /** @type {string[]} */ args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();

/**
 * Where the products live and how to read their version. `dir` is the clean export of the source, `binary` the release build of it
 * (a separate cargo target directory beside it). Override the directories with EJM_CLI_DIR and EJM_HARNESS_DIR.
 */
export const PRODUCTS = {
  cli: {
    dir: resolve(process.env.EJM_CLI_DIR || join(EXPORT_ROOT, 'ejm-cli')),
    binary: resolve(process.env.EJM_CLI_BINARY || join(EXPORT_ROOT, 'target-cli/release/ejm-cli')),
    version: (/** @type {string} */ _dir, /** @type {string} */ binary) => execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim(),
  },
  harness: {
    dir: resolve(process.env.EJM_HARNESS_DIR || join(EXPORT_ROOT, 'ejm-harness')),
    binary: resolve(process.env.EJM_HARNESS_BINARY || join(EXPORT_ROOT, 'target-harness/release/ejm-harness-worker')),
    // The worker has no --version flag. The TypeScript SDK that drives it carries the release version.
    version: (/** @type {string} */ dir) => `ejm-harness ${JSON.parse(readFileSync(join(dir, 'sdk/typescript/package.json'), 'utf8')).version}`,
  },
};

/**
 * Which commit a product directory shows. A clean export has no .git; scripts/clean-build.mjs writes .ejm-export.json into it.
 * A git checkout with uncommitted changes is refused: its commit would not identify the code that was captured.
 */
function sourceOf(/** @type {string} */ dir) {
  const marker = join(dir, '.ejm-export.json');
  if (existsSync(marker)) {
    const m = JSON.parse(readFileSync(marker, 'utf8'));
    return { commit: m.commit, workingTreeChanges: 0, build: `Built from a clean \`git archive\` export of ${m.commit}. ${m.build}` };
  }
  const changes = git(dir, ['status', '--porcelain']).split('\n').filter(Boolean).length;
  if (changes) throw new Error(`${dir} has ${changes} uncommitted change(s); capture from a clean export (node packages/shots/scripts/clean-build.mjs)`);
  const commit = git(dir, ['rev-parse', 'HEAD']);
  return { commit, workingTreeChanges: 0, build: `Built from a clean checkout of ${commit}.` };
}

/** @param {keyof typeof PRODUCTS} name */
export function productInfo(name) {
  const p = PRODUCTS[name];
  const st = statSync(p.binary);
  const src = sourceOf(p.dir);
  return {
    version: p.version(p.dir, p.binary),
    gitCommit: src.commit,
    workingTreeChanges: src.workingTreeChanges,
    build: src.build,
    binary: { path: rel(p.binary), modified: st.mtime.toISOString(), sha256: createHash('sha256').update(readFileSync(p.binary)).digest('hex') },
  };
}

/** Quote one argument the way a POSIX shell would need it. */
export const shellQuote = (/** @type {string} */ a) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
