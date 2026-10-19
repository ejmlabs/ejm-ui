// @vitest-environment node
// The honesty check against fixture assets and throw-away git repos. Nothing here is product imagery.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { checkShots, findSimulatedWindows } from '../../../scripts/check-shots.mjs';

const root = mkdtempSync(join(tmpdir(), 'ejm-check-shots-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const git = (repo: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.test', '-C', repo, ...args], { encoding: 'utf8' }).trim();
const commit = (repo: string, file: string, text: string) => {
  mkdirSync(join(repo, file, '..'), { recursive: true });
  writeFileSync(join(repo, file), text);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', `edit ${file}`);
  return git(repo, 'rev-parse', 'HEAD');
};

let n = 0;
let repos = '';
let assets: string;
let first = '';
const config = { products: { cli: { repo: 'ejm-cli', paths: ['crates/ejm-cli/src'], versionFile: 'VERSION' } } };

const good = () => ({
  product: 'cli', name: 'tui', command: 'ejm-cli --replay', themes: ['dark', 'light'], productVersion: 'ejm-cli 0.3.1', gitCommit: first, workingTreeChanges: 0,
  captureDate: '2026-10-18T09:00:00.000Z', how: 'Ran the real binary in a pseudo-terminal.',
  results: { dark: { pixelWidth: 4, pixelHeight: 2, transcript: 'hello' }, light: { pixelWidth: 4, pixelHeight: 2, transcript: 'hello' } },
});

async function write(meta: Record<string, unknown>) {
  const dir = join(assets, 'cli');
  mkdirSync(dir, { recursive: true });
  for (const t of ['dark', 'light']) writeFileSync(join(dir, `tui.${t}.png`), await sharp({ create: { width: 4, height: 2, channels: 3, background: '#123456' } }).png().toBuffer());
  writeFileSync(join(dir, 'tui.json'), JSON.stringify(meta));
}
const nowhere = () => join(root, 'nowhere');
const run = (opts: Record<string, unknown> = {}) => checkShots({ base: root, assets, repos, config, windows: false, ...opts });

// One throw-away repo for the file (git is slow to start here); each test rewinds it to the base commit.
let main = '';
beforeAll(() => {
  repos = join(root, 'repos');
  const repo = join(repos, 'ejm-cli');
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q');
  commit(repo, 'crates/ejm-cli/src/ui.rs', 'v1');
  first = commit(repo, 'VERSION', '0.3.1');
  main = git(repo, 'rev-parse', '--abbrev-ref', 'HEAD');
});

beforeEach(async () => {
  assets = join(root, `assets-${++n}`);
  await write(good());
});

describe('metadata', () => {
  it('passes a complete shot whose commit is the product HEAD', () => {
    expect(run()).toMatchObject({ errors: [], warnings: [] });
    expect(run({ repos: nowhere() }).warnings.join()).toMatch(/not on disk/);
  });

  it.each([
    ['how', (m: Record<string, unknown>) => delete m.how, /how:/],
    ['command', (m: Record<string, unknown>) => delete m.command, /command:/],
    ['date', (m: Record<string, unknown>) => delete m.captureDate, /date:/],
    ['theme', (m: Record<string, unknown>) => delete m.themes, /theme:/],
    ['version and commit', (m: Record<string, unknown>) => { delete m.productVersion; delete m.gitCommit; }, /version or commit:/],
    ['transcript', (m: Record<string, unknown>) => { (m.results as any).dark.transcript = ''; }, /transcript:/],
    ['size', (m: Record<string, unknown>) => { delete (m.results as any).light.pixelWidth; }, /size:/],
  ])('fails when %s is missing', async (_label, strip, message) => {
    const m = good() as Record<string, unknown>;
    strip(m);
    await write(m);
    expect(run({ repos: nowhere() }).errors.join('\n')).toMatch(message);
  });

  it('fails when the recorded size is not the PNG size, a listed theme has no PNG, or images have no metadata', async () => {
    const m = good();
    m.results.dark.pixelWidth = 999;
    await write(m);
    rmSync(join(assets, 'cli', 'tui.light.png'));
    writeFileSync(join(assets, 'cli', 'orphan.dark.png'), 'x');
    const errors = run({ repos: nowhere() }).errors.join('\n');
    expect(errors).toMatch(/dark size in the metadata is 999x2 but the PNG is 4x2/);
    expect(errors).toMatch(/theme light is listed but tui.light.png is missing/);
    expect(errors).toMatch(/cli\/orphan: images without a metadata file/);
  });
});

describe('stale', () => {
  const repo = () => join(repos, 'ejm-cli');
  beforeEach(() => {
    if (git(repo(), 'rev-parse', '--abbrev-ref', 'HEAD') !== main) git(repo(), 'checkout', '-q', main);
    git(repo(), 'reset', '-q', '--hard', first);
  });

  it('ignores newer commits that do not touch the UI source', () => {
    commit(repo(), 'docs/readme.md', 'words');
    expect(run()).toMatchObject({ errors: [], warnings: [] });
  });

  it('is a warning when the UI source has newer commits, and an error with strict', () => {
    commit(repo(), 'crates/ejm-cli/src/ui.rs', 'v2');
    const warn = run();
    expect(warn.errors).toEqual([]);
    expect(warn.warnings.join()).toMatch(/cli\/tui: STALE: ejm-cli has 1 newer commit\(s\) touching crates\/ejm-cli\/src since /);
    const strict = run({ strict: true });
    expect(strict.errors.join()).toMatch(/STALE/);
  });

  it('is an error when the recorded commit is unknown or not an ancestor', async () => {
    await write({ ...good(), gitCommit: 'deadbeef'.repeat(5) });
    expect(run().errors.join()).toMatch(/is not in ejm-cli/);
    git(repo(), 'checkout', '-q', '-b', 'side', first);
    const other = commit(repo(), 'x.txt', 'side');
    git(repo(), 'checkout', '-q', main);
    await write({ ...good(), gitCommit: other });
    expect(run().errors.join()).toMatch(/is not an ancestor of ejm-cli HEAD/);
  });

  it('compares a version-only shot with the product VERSION file', async () => {
    const m = good() as Record<string, unknown>;
    delete m.gitCommit;
    await write(m);
    expect(run()).toMatchObject({ errors: [], warnings: [] });
    commit(repo(), 'VERSION', '0.4.0');
    expect(run().warnings.join()).toMatch(/STALE: recorded version 0.3.1, ejm-cli is now 0.4.0/);
  });

  it('warns about uncommitted changes at capture, and about a product repo that is not on disk (error with strict)', async () => {
    await write({ ...good(), workingTreeChanges: 3 });
    expect(run().warnings.join()).toMatch(/3 uncommitted change/);
    const away = run({ repos: join(root, 'nowhere') });
    expect(away.warnings.join()).toMatch(/not on disk/);
    expect(run({ repos: join(root, 'nowhere'), strict: true }).errors.join()).toMatch(/not on disk/);
  });
});

describe('simulated windows', () => {
  const find = (jsx: string) => findSimulatedWindows(jsx).map(f => `${f.tag}:${f.line}`);

  it('flags a stage and a window without live, and accepts a live window', () => {
    expect(find('<ProductStage>\n  <ProductWindow title="a" elevation="rest">x</ProductWindow>\n</ProductStage>')).toEqual(['ProductStage:1', 'ProductWindow:2']);
    expect(find('<ProductWindow title="a" live label="Demo" onClick={() => go(live)}>x</ProductWindow>')).toEqual([]);
    expect(find('<ProductWindow live={false} title="a">x</ProductWindow>')).toEqual(['ProductWindow:1']);
    expect(find('<ProductWindow title={`live ${x}`} meta="live">x</ProductWindow>')).toEqual(['ProductWindow:1']);
  });

  it('accepts a usage marked as component documentation, with a reason', () => {
    expect(find('// ejm-shots-allow: documents the component itself\n<ProductWindow title="a">x</ProductWindow>')).toEqual([]);
    expect(find('// ejm-shots-allow:\n<ProductWindow title="a">x</ProductWindow>')).toEqual(['ProductWindow:2']);
  });

  it('scans the configured folders and names file and line', () => {
    mkdirSync(join(root, 'scan', 'apps/gallery/src'), { recursive: true });
    writeFileSync(join(root, 'scan', 'apps/gallery/src/home.tsx'), 'export const A = () => (\n  <ProductWindow title="x">y</ProductWindow>\n);\n');
    const r = checkShots({ base: join(root, 'scan'), assets, repos, config, windowDirs: ['apps/gallery/src'] });
    expect(r.findings).toEqual(['apps/gallery/src/home.tsx:2: <ProductWindow> is a drawn window without `live` (it shows "Simulated screen"); replace it with a ProductShot']);
  });
});

describe('illustrations', () => {
  const drawn = (extra: Record<string, unknown> = {}) => ({
    product: 'cli', name: 'tui', kind: 'illustration', themes: ['dark', 'light'], captureDate: '2026-10-19', how: 'Drawn in React from the README, not run.',
    results: { dark: { pixelWidth: 4, pixelHeight: 2 }, light: { pixelWidth: 4, pixelHeight: 2 } }, caption: 'A chat with a diff.', ...extra,
  });

  it('accepts a labelled illustration that records no capture, and skips the stale comparison', async () => {
    await write(drawn());
    commit(join(repos, 'ejm-cli'), 'crates/ejm-cli/src/ui.rs', 'newer');
    expect(run({ strict: true })).toMatchObject({ errors: [], warnings: [] });
    git(join(repos, 'ejm-cli'), 'reset', '-q', '--hard', first);
  });

  it.each([
    ['a command', { command: 'ejm-ide' }],
    ['a version', { productVersion: '1.0.0' }],
    ['a commit', { gitCommit: 'abcdef0123456' }],
    ['a transcript', { transcript: 'text' }],
    ['a binary', { binary: { path: 'x' } }],
  ])('rejects an illustration that records %s as if it were real', async (_what, extra) => {
    await write(drawn(extra));
    expect(run({ repos: nowhere() }).errors.join()).toMatch(/illustration claims a capture/);
  });

  it('rejects an illustration whose caption calls it a screenshot or a capture, but not the words "not a screenshot"', async () => {
    await write(drawn({ caption: 'A real screenshot of the chat.' }));
    expect(run({ repos: nowhere() }).errors.join()).toMatch(/calls it a screenshot or a capture/);
    await write(drawn({ caption: 'This is not a screenshot.' }));
    expect(run({ repos: nowhere() }).errors).toEqual([]);
  });

  it('rejects a source file that shows an illustration without ProductShot or Illustration', async () => {
    await write(drawn());
    const base = join(root, 'use');
    mkdirSync(join(base, 'apps/site/src'), { recursive: true });
    writeFileSync(join(base, 'apps/site/src/bad.tsx'), "const s = getShot('cli', 'tui');\nexport const A = () => <img src={s.variants.dark.src} />;\n");
    writeFileSync(join(base, 'apps/site/src/good.tsx'), "const s = getShot('cli', 'tui');\nexport const A = () => <ProductShot shot={s} alt=\"x\" />;\n");
    const r = checkShots({ base, assets, repos: nowhere(), config });
    expect(r.findings).toEqual(['apps/site/src/bad.tsx:1: cli/tui is an illustration but is not shown with ProductShot or Illustration, so it has no label']);
  });

  it('fails when the label source is removed from the components', () => {
    const base = join(root, 'labels');
    mkdirSync(join(base, 'packages/ui/src/layout'), { recursive: true });
    writeFileSync(join(base, 'packages/ui/src/layout/Illustration.tsx'), 'export const x = 1;');
    writeFileSync(join(base, 'packages/ui/src/layout/ProductShot.tsx'), 'export const y = 1;');
    const r = checkShots({ base, assets, repos: nowhere(), config, windows: false });
    expect(r.errors.join()).toMatch(/Illustration.tsx: no longer contains "not a screenshot"/);
  });

  it('allows a drawn window inside Illustration and nowhere else', () => {
    const jsx = '<Illustration product="ejm-ide"><ProductWindow title="a">x</ProductWindow></Illustration>\n<ProductWindow title="b">y</ProductWindow>';
    expect(findSimulatedWindows(jsx).map(f => f.line)).toEqual([2]);
  });
});
