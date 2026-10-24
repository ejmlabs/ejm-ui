// @vitest-environment node
// What these tests protect: the PTY really has the requested size, colors survive the emulator, the rendered text equals
// the emulator text, the transcript check can fail, and the metadata names what it must. They use a tiny shell script,
// not the products, so they run anywhere. Tests that need Chrome skip when it is missing.
// Directory ownership tests use the real filesystem and stub the PTY and Chrome boundaries.
import * as childProcess from 'node:child_process';
import { ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { captureShot, FIXTURES, withWorkspace } from './capture.mjs';
import { UI_ROOT } from './meta.mjs';
import * as renderer from './render.mjs';
import * as session from './session.mjs';
import { CHROME, chromeAvailable, toHtml, withChrome } from './render.mjs';
import { runSession } from './session.mjs';
import { Screen } from './screen.mjs';
import { loadTheme, palette256 } from './theme.mjs';
import { compareToTranscript, domMatches, replayCursorStream } from './verify.mjs';

// Keep real filesystem operations while allowing the capture test to reject unsafe deletion paths.
vi.mock('node:fs', async importOriginal => ({ ...await importOriginal() }));
vi.mock('node:child_process', async importOriginal => ({ ...await importOriginal() }));

const script = join(FIXTURES, 'colors.sh');
const EXPECTED = [
  'red bold green underline',
  '256-color orange truecolor inverse',
  'glyphs: · › ── …',
  'size: 6 40',
];
const chrome = chromeAvailable() ? it : it.skip;
const tmp = mkdtempSync(join(tmpdir(), 'ejm-shots-test-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('capture work directories', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('preserves unrelated paths and isolates overlapping sessions', async () => {
    const parent = mkdtempSync(join(tmp, 'ownership-'));
    for (const name of ['acme-api', 'ejm-shots-work']) {
      mkdirSync(join(parent, name));
      writeFileSync(join(parent, name, 'keep.txt'), name);
    }
    let first = '', second = '';
    const value = await withWorkspace('cli', 'dark', async dark => {
      first = dark.home;
      expect(statSync(dark.home).mode & 0o777).toBe(0o700);
      const fixture = readFileSync(join(dark.workspace, 'src/server.mjs'), 'utf8');
      expect(fixture).toBe(readFileSync(join(FIXTURES, 'acme-api/src/server.mjs'), 'utf8'));
      writeFileSync(join(dark.workspace, 'src/server.mjs'), 'changed by the first session');
      await withWorkspace('cli', 'light', async light => {
        second = light.home;
        expect(light.workspace).not.toBe(dark.workspace);
        expect(readFileSync(join(light.workspace, 'src/server.mjs'), 'utf8')).toBe(fixture);
        expect(readFileSync(join(dark.workspace, 'src/server.mjs'), 'utf8')).toBe('changed by the first session');
      }, parent);
      expect(existsSync(second)).toBe(false);
      expect(existsSync(first)).toBe(true);
      return 'captured';
    }, parent);
    expect(value).toBe('captured');
    expect(existsSync(first)).toBe(false);
    expect(readdirSync(parent).sort()).toEqual(['acme-api', 'ejm-shots-work']);
    for (const name of ['acme-api', 'ejm-shots-work']) {
      expect(readFileSync(join(parent, name, 'keep.txt'), 'utf8')).toBe(name);
    }
  });

  it('removes its own tree when the session fails and preserves the failure', async () => {
    const parent = mkdtempSync(join(tmp, 'failed-session-'));
    writeFileSync(join(parent, 'keep.txt'), 'unrelated');
    const failure = new Error('session failed');
    let home = '';
    await expect(withWorkspace('cli', 'dark', async ctx => {
      home = ctx.home;
      writeFileSync(join(ctx.workspace, 'partial.txt'), 'partial session output');
      throw failure;
    }, parent)).rejects.toBe(failure);
    expect(existsSync(home)).toBe(false);
    expect(readdirSync(parent)).toEqual(['keep.txt']);
    expect(readFileSync(join(parent, 'keep.txt'), 'utf8')).toBe('unrelated');
  });

  it('keeps selected output files separate from cleaned scratch space and records each workspace', async () => {
    const outDir = mkdtempSync(join(tmp, 'output-'));
    const scratch = mkdtempSync(join(tmp, 'scratch-'));
    vi.stubEnv('TMPDIR', scratch);
    const remove = fs.rmSync;
    vi.spyOn(fs, 'rmSync').mockImplementation((path, options) => {
      // A regressed cleanup must fail before it can touch a real shared temporary path.
      if (typeof path !== 'string' || !path.startsWith(scratch + '/')) throw new Error('cleanup escaped test scratch directory');
      remove(path, options);
    });
    const productDir = join(outDir, 'cli');
    mkdirSync(productDir);
    for (const name of ['fixture.dark.png', 'fixture.light.png', 'fixture.json', 'keep.txt']) {
      writeFileSync(join(productDir, name), 'previous output');
    }
    const workspaces = [];
    const screen = new Screen(40, 6);
    await screen.write('captured\r\n');
    vi.spyOn(session, 'runSession').mockImplementation(async opts => {
      workspaces.push(opts.cwd);
      expect(existsSync(join(opts.cwd, 'src/server.mjs'))).toBe(true);
      return { raw: 'captured\r\n', screen, exitCode: 0 };
    });
    vi.spyOn(renderer, 'withChrome').mockImplementation(async run => run(async () => ({
      png: Buffer.from('stubbed renderer output'), rowText: ['captured'],
    })));
    const meta = await captureShot({
      product: 'cli', name: 'fixture', cols: 40, rows: 6, title: 'fixture', caption: 'A fixture.',
      how: 'Exercises filesystem ownership without starting a PTY or Chrome.',
      session: c => ({ file: '/bin/sh', cwd: c.workspace, env: c.env, launch: 'fixture', displayCommand: `sh --cwd ${c.workspace}`, shotEnv: {} }),
    }, { outDir, info: { version: 'fixture 1.0', gitCommit: 'a'.repeat(40), workingTreeChanges: 0, binary: { path: 'fixture', modified: '2026-01-01T00:00:00.000Z', sha256: '0'.repeat(64) } } });
    expect(new Set(workspaces).size).toBe(2);
    for (const [index, theme] of ['dark', 'light'].entries()) {
      const workspace = workspaces[index];
      expect(existsSync(workspace)).toBe(false);
      expect(meta.results[theme].command).toBe(`sh --cwd ${workspace}`);
      expect(resolve(UI_ROOT, meta.results[theme].workingDirectory)).toBe(workspace);
      expect(readFileSync(join(productDir, `fixture.${theme}.png`), 'utf8')).toBe('stubbed renderer output');
    }
    expect(JSON.parse(readFileSync(join(productDir, 'fixture.json'), 'utf8'))).toEqual(meta);
    expect(readFileSync(join(productDir, 'keep.txt'), 'utf8')).toBe('previous output');
    expect(readdirSync(outDir)).toEqual(['cli']);
    expect(readdirSync(scratch)).toEqual([]);
  });
});

describe('Chrome profile cleanup', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('waits for Chrome to close before removing its profile and preserves a startup failure', async () => {
    const child = new ChildProcess();
    child.stderr = new PassThrough();
    const exists = fs.existsSync;
    vi.spyOn(fs, 'existsSync').mockImplementation(path => path === CHROME || exists(path));
    let profile = '';
    vi.spyOn(childProcess, 'spawn').mockImplementation((file, args) => {
      profile = args.find(arg => arg.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
      return child;
    });
    const kill = vi.spyOn(child, 'kill').mockReturnValue(true);
    const failure = new Error('Chrome could not start');
    const pending = withChrome(() => { throw new Error('renderer must not run'); });
    let settled = false;
    void pending.catch(() => { settled = true; });
    try {
      child.emit('error', failure);
      await setImmediate();
      expect(kill).toHaveBeenCalledWith('SIGKILL');
      expect(existsSync(profile)).toBe(true);
      expect(settled).toBe(false);
      child.emit('close', null, 'SIGKILL');
      await expect(pending).rejects.toBe(failure);
      expect(existsSync(profile)).toBe(false);
    } finally {
      child.emit('close', null, 'SIGKILL');
      await pending.catch(() => {});
      child.stderr.destroy();
      if (profile) rmSync(profile, { recursive: true, force: true });
    }
  });

  it('bounds a missing close event and retains the profile and original failure', async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(milliseconds => {
      expect(milliseconds).toBe(5000);
      return timeout.signal;
    });
    const child = new ChildProcess();
    child.stderr = new PassThrough();
    const exists = fs.existsSync;
    vi.spyOn(fs, 'existsSync').mockImplementation(path => path === CHROME || exists(path));
    let profile = '';
    vi.spyOn(childProcess, 'spawn').mockImplementation((file, args) => {
      profile = args.find(arg => arg.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);
      return child;
    });
    const kill = vi.spyOn(child, 'kill').mockReturnValue(true);
    const failure = new Error('Chrome could not start');
    const pending = withChrome(() => { throw new Error('renderer must not run'); });
    let outcome;
    void pending.catch(error => { outcome = error; });
    try {
      child.emit('error', failure);
      await setImmediate();
      expect(kill).toHaveBeenCalledWith('SIGKILL');
      timeout.abort();
      await setImmediate();
      expect(outcome).toBeInstanceOf(AggregateError);
      expect(outcome.cause).toBe(failure);
      expect(outcome.errors[0]).toBe(failure);
      expect(outcome.errors[1]).toMatchObject({ name: 'AbortError' });
      expect(existsSync(profile)).toBe(true);
    } finally {
      child.emit('close', null, 'SIGKILL');
      await pending.catch(() => {});
      child.stderr.destroy();
      if (profile) rmSync(profile, { recursive: true, force: true });
    }
  });
});

describe('pseudo-terminal session', () => {
  it('runs at the requested size and keeps colors and glyphs', async () => {
    const { raw, screen } = await runSession({ file: '/bin/sh', args: [script], cols: 40, rows: 6, env: { PATH: process.env.PATH ?? '', TERM: 'xterm-256color', LANG: 'en_US.UTF-8' }, waitExit: true });
    expect(screen.lines()).toEqual(EXPECTED);
    const [first, second] = screen.grid();
    expect(first?.[0]).toMatchObject({ ch: 'r', fg: 1, fgRgb: false });
    expect(first?.[4]).toMatchObject({ ch: 'b', fg: 2, bold: true });
    expect(second?.[0]).toMatchObject({ fg: 208 });
    expect(second?.[17]).toMatchObject({ ch: 't', fg: 0x0a141e, fgRgb: true });
    expect(compareToTranscript(screen.lines(), raw, 40, 6).mode).toBe('exact');
  }, 30000);

  it('types scripted keys into a program that reads them', async () => {
    const { screen } = await runSession({
      file: '/bin/sh', cols: 30, rows: 4, env: { PATH: process.env.PATH ?? '', PS1: '$ ' },
      steps: [{ waitFor: '\\$' }, { type: 'echo typed', delay: 5 }, { key: 'enter' }, { waitFor: '\\ntyped\\n' }],
    });
    expect(screen.lines().slice(0, 2)).toEqual(['$ echo typed', 'typed']);
  }, 30000);
});

describe('transcript comparison', () => {
  it('rebuilds a cursor-addressed screen from the bytes and rejects text that was never printed', () => {
    // Words arrive separately with cursor jumps between them, the way a TUI repaints.
    const raw = '\x1b[2J\x1b[1;1H\x1b[1mHello\x1b[0m\x1b[1;7Hworld\x1b[3;1Hdone';
    const screen = ['Hello world', '', 'done'];
    expect(replayCursorStream(raw, 20, 5).rows).toEqual(screen);
    expect(compareToTranscript(screen, raw, 20, 5)).toMatchObject({ mode: 'replayed', ok: true });
    expect(compareToTranscript(['Hello wurld', '', 'done'], raw, 20, 5)).toMatchObject({ mode: 'failed', ok: false });
  });

  it('flags the renderer dropping or changing a row', () => {
    expect(domMatches(['a  ', 'b'], ['a', 'b'])).toBe(true);
    expect(domMatches(['a', 'x'], ['a', 'b'])).toBe(false);
  });
});

describe('terminal colors', () => {
  it('come from the generated product schemes, 256-color cube included', () => {
    const dark = loadTheme('dark');
    expect(dark).toMatchObject({ background: '#131614', foreground: '#e3e5dc' });
    expect(loadTheme('light').background).toBe('#fdfdfc');
    const pal = palette256(dark);
    expect(pal).toHaveLength(256);
    expect(pal[16]).toBe('#000000');
    expect(pal[231]).toBe('#ffffff');
  });
});

describe('rendering and capture', () => {
  chrome('draws the screen in Chrome with the rendered text equal to the emulator text', async () => {
    const { screen } = await runSession({ file: '/bin/sh', args: [script], cols: 40, rows: 6, env: { PATH: process.env.PATH ?? '', TERM: 'xterm-256color', LANG: 'en_US.UTF-8' }, waitExit: true });
    const { html, width, height } = toHtml(screen.grid(), loadTheme('dark'), { rows: 6 });
    const failure = new Error('caller stopped after rendering');
    await expect(withChrome(async render => {
      const { png, rowText } = await render(html, width, height);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width * 2, height * 2]);
      expect(domMatches(rowText, screen.lines(), 6)).toBe(true);
      throw failure;
    })).rejects.toBe(failure);
  }, 60000);

  chrome('writes both themes and a metadata file that records how the shot was made', async () => {
    const meta = await captureShot({
      product: 'cli', name: 'fixture', cols: 40, rows: 6, title: 'fixture', caption: 'A fixture.',
      how: 'Ran the colors.sh fixture in a pseudo-terminal.',
      session: c => ({ file: '/bin/sh', args: [script], env: c.env, waitExit: true, launch: 'spawned directly', displayCommand: 'sh colors.sh', shotEnv: {} }),
    }, { outDir: tmp, info: { version: 'fixture 1.0', gitCommit: 'a'.repeat(40), workingTreeChanges: 0, binary: { path: 'fixtures/colors.sh', modified: '2026-01-01T00:00:00.000Z', sha256: '0'.repeat(64) } } });
    const onDisk = JSON.parse(readFileSync(join(tmp, 'cli', 'fixture.json'), 'utf8'));
    expect(onDisk).toEqual(meta);
    expect(meta).toMatchObject({ product: 'cli', command: 'sh colors.sh', themes: ['dark', 'light'], terminal: { cols: 40, rows: 6 }, how: 'Ran the colors.sh fixture in a pseudo-terminal.' });
    expect(new Date(meta.captureDate).toISOString()).toBe(meta.captureDate);
    expect(meta).toMatchObject({ productVersion: 'fixture 1.0', gitCommit: 'a'.repeat(40), binary: { path: 'fixtures/colors.sh' } });
    for (const theme of /** @type {const} */ (['dark', 'light'])) {
      expect(meta.results[theme].transcript).toBe(EXPECTED.join('\n'));
      expect(meta.results[theme].verification).toEqual({ transcriptMatch: 'exact', renderedTextEqualsEmulator: true });
      expect(readFileSync(join(tmp, 'cli', `fixture.${theme}.png`)).readUInt32BE(16)).toBe(meta.results[theme].pixelWidth);
    }
  }, 90000);
});
