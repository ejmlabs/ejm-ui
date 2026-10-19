// @vitest-environment node
// What these tests protect: the PTY really has the requested size, colors survive the emulator, the rendered text equals
// the emulator text, the transcript check can fail, and the metadata names what it must. They use a tiny shell script,
// not the products, so they run anywhere. Tests that need Chrome skip when it is missing.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { captureShot, FIXTURES } from './capture.mjs';
import { chromeAvailable, toHtml, withChrome } from './render.mjs';
import { runSession } from './session.mjs';
import { loadTheme, palette256 } from './theme.mjs';
import { compareToTranscript, domMatches, replayCursorStream } from './verify.mjs';

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
    const { png, rowText } = await withChrome(render => render(html, width, height));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width * 2, height * 2]);
    expect(domMatches(rowText, screen.lines(), 6)).toBe(true);
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
