import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = join(process.cwd(), 'packages/shots/scripts/clean-build.mjs');
const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function commit(repo) {
  git(repo, 'add', '.');
  git(repo, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture');
  return git(repo, 'rev-parse', 'HEAD');
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'ejm-capture-pin-'));
  const cli = join(root, 'cli'), harness = join(root, 'harness'), bin = join(root, 'bin'), dest = join(root, 'export');
  for (const path of [cli, harness, bin]) mkdirSync(path);
  for (const path of [cli, harness]) git(path, 'init', '-q');
  writeFileSync(join(harness, 'version.txt'), 'pinned');
  const pinned = commit(harness);
  writeFileSync(join(harness, 'version.txt'), 'other HEAD');
  const newer = commit(harness);
  mkdirSync(join(cli, '.github'));
  writeFileSync(join(cli, '.github', 'harness-revision'), `${pinned}\n`);
  commit(cli);
  writeFileSync(join(bin, 'cargo'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const run = () => spawnSync(process.execPath, [script, '--dest', dest, '--no-seed'], {
    encoding: 'utf8',
    env: { ...process.env, EJM_CLI_REPO: cli, EJM_HARNESS_REPO: harness, PATH: `${bin}:${process.env.PATH}` },
  });
  return { root, cli, harness, dest, pinned, newer, run };
}

describe('clean capture source selection', () => {
  it('exports the committed pin even when checkout HEAD and the uncommitted pin differ', () => {
    const f = fixture();
    try {
      writeFileSync(join(f.cli, '.github', 'harness-revision'), `${f.newer}\n`);
      const result = f.run();
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(f.dest, 'ejm-harness', 'version.txt'), 'utf8')).toBe('pinned');
      expect(JSON.parse(readFileSync(join(f.dest, 'ejm-harness', '.ejm-export.json'), 'utf8')).commit).toBe(f.pinned);
      expect(readFileSync(join(f.cli, '.github', 'harness-revision'), 'utf8')).toBe(`${f.newer}\n`);
      expect(git(f.harness, 'rev-parse', 'HEAD')).toBe(f.newer);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it('rejects a malformed committed pin before changing the export', () => {
    const f = fixture();
    try {
      writeFileSync(join(f.cli, '.github', 'harness-revision'), 'main\n');
      commit(f.cli);
      mkdirSync(f.dest);
      writeFileSync(join(f.dest, 'sentinel'), 'keep');
      const result = f.run();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Invalid harness revision');
      expect(readFileSync(join(f.dest, 'sentinel'), 'utf8')).toBe('keep');
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it('leaves an existing export untouched when the committed pin is unavailable', () => {
    const f = fixture();
    try {
      const missing = 'a'.repeat(40);
      writeFileSync(join(f.cli, '.github', 'harness-revision'), `${missing}\n`);
      commit(f.cli);
      mkdirSync(f.dest);
      writeFileSync(join(f.dest, 'sentinel'), 'keep');
      const result = f.run();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(`Pinned harness commit ${missing} is not available`);
      expect(readFileSync(join(f.dest, 'sentinel'), 'utf8')).toBe('keep');
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });
});
