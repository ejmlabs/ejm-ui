// Captures one shot: runs the real program in a PTY, renders the final screen in both themes, writes PNG + JSON.
import { cpSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productInfo, rel, TOOL_VERSION, UI_ROOT, PRODUCTS } from './meta.mjs';
import { toHtml, METRICS, withChrome } from './render.mjs';
import { runSession } from './session.mjs';
import { loadTheme } from './theme.mjs';
import { compareToTranscript, domMatches } from './verify.mjs';

export const ASSETS = join(UI_ROOT, 'packages/shots/assets');
export const FIXTURES = join(UI_ROOT, 'packages/shots/fixtures');
const WORK = join(tmpdir(), 'ejm-shots-work');
/** The demo project the agents work in. A fixed path, because the TUI header prints it. */
export const WORKSPACE = '/tmp/acme-api';

/**
 * @typedef {object} Shot
 * @property {keyof typeof PRODUCTS} product
 * @property {string} name
 * @property {number} cols
 * @property {number} rows
 * @property {'screen' | 'content'} [crop] draw the whole screen, or only down to the last row that has text
 * @property {string} title short name for a caption or frame title, for example ejm-cli
 * @property {string} caption one sentence on what the shot shows
 * @property {string} how one plain sentence on how it was made
 * @property {(ctx: Ctx) => Omit<import('./session.mjs').SessionOptions, 'cols' | 'rows'> & { launch: string, displayCommand: string, shotEnv: Record<string, string> }} session
 * @typedef {{ theme: 'dark' | 'light', dir: string, bin: string, workspace: string, state: string, home: string, fixtures: string, env: Record<string, string> }} Ctx
 */

/** Fresh work directories for one session: state, an empty HOME, a bin dir with the product binaries on PATH. */
function prepare(/** @type {Shot} */ shot, /** @type {'dark' | 'light'} */ theme) {
  rmSync(WORK, { recursive: true, force: true });
  rmSync(WORKSPACE, { recursive: true, force: true });
  const state = join(WORK, 'state'), home = join(WORK, 'home'), bin = join(WORK, 'bin');
  for (const d of [state, home, bin]) mkdirSync(d, { recursive: true, mode: 0o700 });
  cpSync(join(FIXTURES, 'acme-api'), WORKSPACE, { recursive: true });
  for (const p of Object.values(PRODUCTS)) {
    const name = p.binary.split('/').pop() ?? '';
    try { symlinkSync(p.binary, join(bin, name)); } catch { /* binary list is static; duplicates are not expected */ }
  }
  const p = PRODUCTS[shot.product];
  /** @type {Ctx} */
  const ctx = {
    theme, dir: p.dir, bin: p.binary, workspace: WORKSPACE, state, home, fixtures: FIXTURES,
    env: {
      PATH: `${bin}:${process.env.PATH ?? ''}`, HOME: home, LANG: 'en_US.UTF-8', TERM: 'xterm-256color', COLORTERM: 'truecolor',
      PS1: '$ ', EJM_HARNESS_DIR: PRODUCTS.harness.dir, EJM_CLI_STATE_DIR: state, EJM_STATE_DIR: state,
      // A user with a light terminal: the products pick their own light palette from COLORFGBG and EJM_CLI_APPEARANCE.
      EJM_CLI_APPEARANCE: theme, COLORFGBG: theme === 'light' ? '0;15' : '15;0',
    },
  };
  return ctx;
}

/**
 * @param {Shot} shot
 * @param {{ themes?: ('dark' | 'light')[], outDir?: string, info?: ReturnType<typeof productInfo> }} [opts] info: product facts, for tests that run without a product
 */
export async function captureShot(shot, opts = {}) {
  const themes = opts.themes ?? ['dark', 'light'];
  const outDir = join(opts.outDir ?? ASSETS, shot.product);
  mkdirSync(outDir, { recursive: true });
  const info = opts.info ?? productInfo(shot.product);
  /** @type {Record<string, object>} */
  const results = {};
  let command = '';
  let cwd = '';
  let launch = '';
  await withChrome(async render => {
    for (const theme of themes) {
      const ctx = prepare(shot, theme);
      const s = shot.session(ctx);
      const { raw, screen, exitCode } = await runSession({ ...s, cols: shot.cols, rows: shot.rows });
      const lines = screen.lines();
      const rowsShown = shot.crop === 'content' ? Math.max(1, lines.length) : shot.rows;
      const th = loadTheme(theme);
      const { html, width, height } = toHtml(screen.grid(), th, { rows: rowsShown, cursor: screen.cursor() });
      const { png, rowText } = await render(html, width, height);
      const cmp = compareToTranscript(lines, raw, shot.cols, shot.rows);
      const dom = domMatches(rowText, lines, rowsShown);
      if (!cmp.ok) throw new Error(`${shot.product}/${shot.name} (${theme}): text on screen does not match the PTY transcript: ${cmp.detail}`);
      if (!dom) throw new Error(`${shot.product}/${shot.name} (${theme}): the rendered text differs from the emulator rows`);
      writeFileSync(join(outDir, `${shot.name}.${theme}.png`), png);
      command = s.displayCommand;
      cwd = s.cwd ? rel(s.cwd) : '';
      launch = s.launch;
      results[theme] = {
        png: `${shot.name}.${theme}.png`, pixelWidth: width * 2, pixelHeight: height * 2,
        environment: s.shotEnv,
        exitCode, rawBytes: raw.length, rawSha256: createHash('sha256').update(raw).digest('hex'),
        verification: { transcriptMatch: cmp.mode, renderedTextEqualsEmulator: dom },
        transcript: lines.slice(0, rowsShown).join('\n'),
      };
    }
  });
  // Other work may rebuild a product while it is being captured. A shot must show one binary, so stop if it changed.
  if (!opts.info && productInfo(shot.product).binary.sha256 !== info.binary.sha256) throw new Error(`${shot.product} binary changed during the capture; run it again`);
  const meta = {
    product: shot.product,
    name: shot.name,
    title: shot.title,
    caption: shot.caption,
    command,
    workingDirectory: cwd,
    terminal: { cols: shot.cols, rows: shot.rows, rowsDrawn: shot.crop === 'content' ? 'to the last line of text' : shot.rows, font: 'IBM Plex Mono 500, 15px', colorScheme: '@ejm/tokens generated/terminal/ejmlabs-<theme>' },
    themes,
    productVersion: info.version,
    gitCommit: info.gitCommit,
    workingTreeChanges: info.workingTreeChanges,
    build: info.build,
    binary: info.binary,
    captureDate: new Date().toISOString(),
    captureTool: { name: '@ejm/shots', version: TOOL_VERSION, source: rel(join(UI_ROOT, 'scripts/capture-terminal.mjs')) },
    launch,
    how: shot.how,
    results,
  };
  writeFileSync(join(outDir, `${shot.name}.json`), JSON.stringify(meta, null, 2) + '\n');
  return meta;
}

export { METRICS };
