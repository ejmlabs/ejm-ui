// Runs one command in a real pseudo-terminal, plays scripted keystrokes, and records every byte it prints.
//
// PTY choice: node-pty (the library VS Code's terminal uses). It forks the child with a real controlling tty
// at an exact cols x rows, so programs see isatty(), TIOCGWINSZ and SIGWINCH as in a real terminal. The
// alternative, Python's pty module driven from Node, would add a second runtime for no gain. node-pty ships
// prebuilt binaries for macOS and Windows; on Linux it compiles at install time.
import { chmodSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Screen } from './screen.mjs';

const require = createRequire(import.meta.url);
const pty = require('node-pty');

// node-pty 1.1.0 publishes its macOS spawn-helper without the execute bit, which makes every spawn fail
// with "posix_spawnp failed". Restore the bit once, before the first spawn.
function fixSpawnHelper() {
  try {
    const dir = join(dirname(require.resolve('node-pty/package.json')), 'prebuilds');
    for (const d of readdirSync(dir)) { try { chmodSync(join(dir, d, 'spawn-helper'), 0o755); } catch { /* no helper on this platform */ } }
  } catch { /* prebuilds absent: node-pty was compiled from source and needs no fix */ }
}

export const KEYS = {
  enter: '\r', tab: '\t', escape: '\x1b', backspace: '\x7f', up: '\x1b[A', down: '\x1b[B', right: '\x1b[C', left: '\x1b[D',
  'ctrl-c': '\x03', 'ctrl-d': '\x04', 'ctrl-k': '\x0b', 'ctrl-s': '\x13', 'alt-enter': '\x1b\r',
};

const sleep = (/** @type {number} */ ms) => new Promise(r => setTimeout(r, ms));

/**
 * @typedef {{ wait: number } | { settle: number } | { waitFor: string, timeout?: number } | { type: string, delay?: number } | { key: keyof typeof KEYS }} Step
 * @typedef {{ file: string, args?: string[], cwd?: string, env?: Record<string, string>, cols: number, rows: number,
 *   steps?: Step[], settleMs?: number, timeoutMs?: number, waitExit?: boolean }} SessionOptions
 */

/** @param {SessionOptions} o @returns {Promise<{ raw: string, screen: Screen, exitCode: number | null }>} */
export async function runSession(o) {
  fixSpawnHelper();
  const screen = new Screen(o.cols, o.rows);
  const term = pty.spawn(o.file, o.args ?? [], { name: 'xterm-256color', cols: o.cols, rows: o.rows, cwd: o.cwd, env: o.env });
  let raw = '';
  let lastData = Date.now();
  let queue = Promise.resolve();
  let exitCode = /** @type {number | null} */ (null);
  let exited = false;
  term.onData(d => { raw += d; lastData = Date.now(); queue = queue.then(() => screen.write(d)); });
  term.onExit(e => { exited = true; exitCode = e.exitCode; });

  const text = async () => { await queue; return screen.lines().join('\n'); };
  const settle = async (/** @type {number} */ quiet, timeout = 15000) => {
    const end = Date.now() + timeout;
    while (Date.now() - lastData < quiet && Date.now() < end) await sleep(25);
    await queue;
  };

  try {
    for (const step of o.steps ?? []) {
      if ('wait' in step) await sleep(step.wait);
      else if ('settle' in step) await settle(step.settle);
      else if ('waitFor' in step) {
        const re = new RegExp(step.waitFor);
        const end = Date.now() + (step.timeout ?? 15000);
        while (!re.test(await text())) {
          if (Date.now() > end) throw new Error(`timed out waiting for /${step.waitFor}/. Screen:\n${screen.lines().join('\n')}`);
          if (exited) throw new Error(`process exited while waiting for /${step.waitFor}/. Screen:\n${screen.lines().join('\n')}`);
          await sleep(50);
        }
      } else if ('type' in step) {
        for (const ch of step.type) { term.write(ch); await sleep(step.delay ?? 40); }
      } else if ('key' in step) {
        const seq = KEYS[step.key];
        if (!seq) throw new Error(`unknown key ${step.key}`);
        term.write(seq);
      }
    }
    if (o.waitExit) {
      const end = Date.now() + (o.timeoutMs ?? 30000);
      while (!exited) {
        if (Date.now() > end) throw new Error(`process did not exit in ${o.timeoutMs ?? 30000} ms. Screen:\n${screen.lines().join('\n')}`);
        await sleep(25);
      }
    }
    await settle(o.settleMs ?? 600);
    await queue;
    return { raw, screen, exitCode };
  } finally {
    if (!exited) term.kill();
  }
}
