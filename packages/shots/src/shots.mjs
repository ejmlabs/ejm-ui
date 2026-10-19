// The shots. Each one names a real program and the keystrokes a person would type; nothing is drawn by hand.
// Add a shot here and run `node scripts/capture-terminal.mjs <product>/<name>`.
import { join } from 'node:path';
import { rel } from './meta.mjs';

const REPLAY = 'read-then-write.json';
const PROMPT = 'Add request logging to the order service';

/** Types one command at a `$ ` prompt in a plain sh and waits for it to finish printing. */
const shell = (/** @type {string} */ typed, /** @type {string} */ until) => [
  { waitFor: '\\$' }, { type: typed, delay: 25 }, { key: /** @type {'enter'} */ ('enter') }, { waitFor: until, timeout: 20000 },
];

/** @typedef {import('./capture.mjs').Shot} Shot */
/** @type {Shot[]} */
export const SHOTS = [
  {
    product: 'cli', name: 'tui-read-refused', cols: 100, rows: 30,
    title: 'ejm-cli',
    caption: 'A prompt sent in the TUI: the file read runs, and the write is refused because the session only has read access.',
    how: 'Started the real ejm-cli TUI with a replay file of scripted tool calls (no assistant text) in a 100x30 terminal, typed one prompt and pressed Enter; the real read_file tool ran and the real binary refused write_file because the session only has read access.',
    session: c => ({
      file: c.bin, args: ['--replay-file', REPLAY, '--cwd', c.workspace], cwd: join(c.fixtures, 'replay'), env: c.env,
      launch: 'spawned directly in the pseudo-terminal', displayCommand: `${rel(c.bin)} --replay-file ${REPLAY} --cwd ${c.workspace}`,
      shotEnv: { EJM_CLI_APPEARANCE: c.theme, COLORFGBG: c.env.COLORFGBG ?? '' },
      steps: [{ waitFor: 'Describe a task' }, { type: PROMPT }, { key: 'enter' }, { waitFor: 'not granted by this host' }, { settle: 800 }],
    }),
  },
  {
    product: 'cli', name: 'tui-write-granted', cols: 100, rows: 30,
    title: 'ejm-cli',
    caption: 'The same prompt with --allow-write: the header shows the grant and the file is written.',
    how: 'Same session as tui-read-refused but started with --allow-write: the header shows the write grant and the real write_file tool creates src/log.mjs in the demo project.',
    session: c => ({
      file: c.bin, args: ['--replay-file', 'read-then-write-granted.json', '--allow-write', '--cwd', c.workspace], cwd: join(c.fixtures, 'replay'), env: c.env,
      launch: 'spawned directly in the pseudo-terminal', displayCommand: `${rel(c.bin)} --replay-file read-then-write-granted.json --allow-write --cwd ${c.workspace}`,
      shotEnv: { EJM_CLI_APPEARANCE: c.theme, COLORFGBG: c.env.COLORFGBG ?? '' },
      steps: [{ waitFor: 'Describe a task' }, { type: PROMPT }, { key: 'enter' }, { waitFor: 'Wrote src' }, { settle: 800 }],
    }),
  },
  {
    product: 'cli', name: 'tui-replay', cols: 80, rows: 24,
    title: 'ejm-cli',
    caption: 'The offline demo: type a prompt and the replay provider answers.',
    how: 'Started the real ejm-cli TUI with the documented offline demo (--replay) in an 80x24 terminal, typed a prompt and pressed Enter; the replay provider echoes the prompt.',
    session: c => ({
      file: c.bin, args: ['--replay', '--cwd', c.workspace], cwd: c.workspace, env: c.env,
      launch: 'spawned directly in the pseudo-terminal', displayCommand: `${rel(c.bin)} --replay --cwd ${c.workspace}`,
      shotEnv: { EJM_CLI_APPEARANCE: c.theme, COLORFGBG: c.env.COLORFGBG ?? '' },
      steps: [{ waitFor: 'Describe a task' }, { type: 'Hello, what can you do?' }, { key: 'enter' }, { waitFor: 'Demo:' }],
    }),
  },
  {
    product: 'cli', name: 'run-hello', cols: 80, rows: 24, crop: 'content',
    title: 'ejm-cli',
    caption: 'One turn without the TUI, printed to the terminal.',
    how: 'Typed the documented command ejm-cli --replay run "Hello" at a plain $ prompt in an 80x24 terminal and let it finish; the lines are the shell prompt, the typed command and the real output.',
    session: c => ({
      file: '/bin/sh', cwd: c.workspace, env: c.env, launch: 'typed into /bin/sh with the prompt "$ " and ejm-cli on PATH',
      displayCommand: 'ejm-cli --replay run "Hello"', shotEnv: { EJM_CLI_STATE_DIR: '(a fresh private directory)' },
      steps: shell('ejm-cli --replay run "Hello"', 'Demo: Hello'),
    }),
  },
  {
    product: 'harness', name: 'journal', cols: 100, rows: 30, crop: 'content',
    title: 'ejm-harness',
    caption: 'The event journal of one run, with the governor and harness status the engine reports.',
    how: 'Ran a small script (fixtures/harness/journal.mjs) that drives the real ejm-harness TypeScript SDK and Rust worker with a replay file of scripted tool calls (no assistant text), then prints the durable event journal of the run and the governor and harness status the worker reports. The script only formats values the engine returned.',
    session: c => {
      const h = join(c.fixtures, 'harness');
      return {
        file: '/bin/sh', cwd: h, launch: 'typed into /bin/sh with the prompt "$ " and ejm-harness-worker on PATH',
        env: { ...c.env, EJM_WORKSPACE: c.workspace, EJM_RESPONSES: join(c.fixtures, 'replay', REPLAY) },
        displayCommand: 'node journal.mjs',
        shotEnv: { EJM_HARNESS_DIR: rel(c.dir), EJM_WORKSPACE: c.workspace, EJM_RESPONSES: '../replay/' + REPLAY, EJM_STATE_DIR: '(a fresh private directory)' },
        steps: shell('node journal.mjs', 'harness +agents'),
      };
    },
  },
  {
    product: 'harness', name: 'sdk-typescript', cols: 80, rows: 24, crop: 'content',
    title: 'ejm-harness',
    caption: 'The TypeScript example from the README, running against the Rust worker.',
    how: 'Typed the documented TypeScript example, node examples/sdk_typescript.mjs, at a plain $ prompt from the clean ejm-harness export; the SDK starts the real Rust worker with its default echo provider.',
    session: c => ({
      file: '/bin/sh', cwd: c.dir, env: c.env, launch: 'typed into /bin/sh with the prompt "$ " and ejm-harness-worker on PATH',
      displayCommand: 'node examples/sdk_typescript.mjs', shotEnv: {},
      steps: shell('node examples/sdk_typescript.mjs', 'completed'),
    }),
  },
  {
    product: 'harness', name: 'sdk-python', cols: 80, rows: 24, crop: 'content',
    title: 'ejm-harness',
    caption: 'The Python example from the README, running against the same worker.',
    how: 'Typed the documented Python example, python3 examples/sdk_async.py, at a plain $ prompt from the clean ejm-harness export, with the in-tree Python SDK on PYTHONPATH; the SDK starts the real Rust worker with its echo provider.',
    session: c => ({
      file: '/bin/sh', cwd: c.dir, env: { ...c.env, PYTHONPATH: join(c.dir, 'sdk/python'), PYTHONDONTWRITEBYTECODE: '1' },
      launch: 'typed into /bin/sh with the prompt "$ " and ejm-harness-worker on PATH',
      displayCommand: 'python3 examples/sdk_async.py', shotEnv: { PYTHONPATH: `${rel(c.dir)}/sdk/python` },
      steps: shell('python3 examples/sdk_async.py', 'completed'),
    }),
  },
];
