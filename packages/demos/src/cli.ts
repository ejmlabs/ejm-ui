/** ejm-cli demo: a scripted terminal session. Port of buildCli in design-kit demo.js, without any DOM. */
import { announce, CANCEL, createRuntime, type Demo, type DemoOptions, type Run, type Task } from './core';
import { cliLabels, cliScenario, project as bundledProject } from './scenarios';
import { applyEdits, buildDiff, matchPrompt, parseText, pad, roleOf, splitLines, type Role, type TextLine } from './text';
import type { CliLabels, CliScenario, CliStep, PatchStep, Project, SavedSession, ToolStep } from './types';

export type BlockKind = 'you' | 'assistant' | 'tool' | 'notice' | 'error';

export interface CliLine {
  t: string;
  /** Color role. Tool blocks default to dim and error blocks to err, so this is already resolved. */
  r: Role;
  bold?: boolean;
}

export interface CliBlock {
  /** Stable key for rendering. */
  id: number;
  kind: BlockKind;
  /** Tool call text, notice title or error title. Empty for assistant blocks. */
  title: string;
  lines: CliLine[];
}

export interface SessionRow {
  id: string;
  state: string;
  title: string;
  /** The open session, listed first. */
  current: boolean;
}

export interface CliState {
  title: string;
  sessionId: string;
  /** The write grant. Off by default, like ejm-cli without --allow-write. */
  write: boolean;
  /** ASCII glyphs and no color. */
  plain: boolean;
  run: 'idle' | 'running';
  /** Header counters, as in the status line: agents, models, tools. */
  agents: number;
  models: number;
  tools: number;
  blocks: CliBlock[];
  overlay: { type: 'sessions' | 'help'; sel: number } | null;
  /** The rows the sessions overlay shows: the open session, then the sample ones. */
  sessions: SessionRow[];
  /** Messages sent while a run was active, in order. */
  queue: string[];
  /** Path of a patch that was blocked and will apply when write is granted. */
  pendingPatch: string | null;
  /** Composer text. */
  draft: string;
  history: string[];
  historyIndex: number;
  /** Current text of every project file, after any applied patch. */
  files: Record<string, string>;
  /** Live-region sentences, newest last, at most 20. Kept across reset. */
  live: string[];
  paused: boolean;
  visible: boolean;
}

export type CliAction =
  /** Send `text`, or the composer draft (clearing it) when `text` is omitted. Starts with "/" for a command. */
  | { type: 'submit'; text?: string }
  | { type: 'draft'; text: string }
  | { type: 'historyUp' }
  | { type: 'historyDown' }
  /** Ctrl+C: stop the active run, or explain that the real app exits. */
  | { type: 'stop' }
  | { type: 'grantWrite'; value: boolean }
  | { type: 'plain'; value: boolean }
  | { type: 'openOverlay'; overlay: 'help' | 'sessions' }
  | { type: 'closeOverlay' }
  | { type: 'overlayMove'; delta: 1 | -1 }
  /** Open the selected row (or `index`) of the sessions overlay. In help it closes the overlay. */
  | { type: 'overlayChoose'; index?: number };

export interface CliOptions extends DemoOptions {
  scenario?: CliScenario;
  project?: Project;
  labels?: CliLabels;
}

export const GLYPHS_UNICODE = { prompt: '›', run: '●', done: '✓', fail: '✗', tool: '▸', up: '↑', sep: '·', dots: '…', tl: '╭', tr: '╮', bl: '╰', br: '╯', v: '│', hz: '─', spin: [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'] };
export const GLYPHS_ASCII = { prompt: '>', run: '*', done: '+', fail: 'x', tool: '>', up: '^', sep: '-', dots: '...', tl: '+', tr: '+', bl: '+', br: '+', v: '|', hz: '-', spin: ['*'] };
export const cliGlyphs = (plain: boolean) => (plain ? GLYPHS_ASCII : GLYPHS_UNICODE);

type Mutable = Omit<CliState, 'sessions' | 'paused' | 'visible'>;

export function createCliDemo(options: CliOptions = {}): Demo<CliState, CliAction> {
  const D = options.scenario ?? cliScenario;
  const L = options.labels ?? cliLabels;
  const project = options.project ?? bundledProject;
  const rt = createRuntime(options, options.seed ?? D.seed ?? 1);
  let nextId = 1;
  let tok: Task | null = null;
  let pending: PatchStep | null = null;
  const fill = (cmd: string, tpl: string) => tpl.replace('{cmd}', cmd);

  const initial = (live: string[]): Mutable => ({
    title: D.app.title, sessionId: D.app.sessionId, write: false, plain: false, run: 'idle', agents: 0, models: 0, tools: 0,
    blocks: [], overlay: null, queue: [], pendingPatch: null, draft: '', history: [], historyIndex: -1,
    files: Object.fromEntries(project.files.map((f) => [f.path, f.text])), live,
  });
  let m = initial([]);

  const say = (t: string) => announce(m.live, t);
  const chg = () => rt.changed();
  const sessionRows = (): SessionRow[] => [
    { id: m.sessionId, state: m.run === 'idle' ? 'idle' : 'running', title: m.title, current: true },
    ...D.sessions.map((s) => ({ id: s.id, state: s.state, title: s.title, current: false })),
  ];

  function addBlock(kind: BlockKind, title: string, lines: (string | CliLine)[]): CliBlock {
    const b: CliBlock = { id: nextId++, kind, title, lines: [] };
    m.blocks.push(b);
    for (const l of lines) b.lines.push(norm(b, l));
    chg();
    return b;
  }
  const norm = (b: CliBlock, l: string | CliLine): CliLine => {
    const dflt: Role = b.kind === 'tool' ? 'dim' : b.kind === 'error' ? 'err' : null;
    return typeof l === 'string' ? { t: l, r: dflt } : { ...l, r: l.r ?? dflt };
  };

  /* ---- scripted runs (generators: yield milliseconds to wait) ---- */
  const tick = () => rt.rand() * 250 + 350;
  function* pushLines(b: CliBlock, lines: (string | CliLine)[], gap: number): Run {
    for (const l of lines) {
      b.lines.push(norm(b, l));
      chg();
      yield gap;
    }
  }
  function* stream(b: CliBlock, lines: TextLine[]): Run {
    for (const l of lines) {
      const row: CliLine = { t: '', r: l.r, ...(l.bold ? { bold: true } : {}) };
      b.lines.push(row);
      if (rt.reduced) {
        row.t = l.t;
        chg();
        continue;
      }
      for (let i = 0; i < l.t.length; ) {
        const n = 2 + Math.floor(rt.rand() * 4);
        row.t += l.t.slice(i, i + n);
        i += n;
        chg();
        yield 22;
      }
      chg();
      yield 60;
    }
  }
  const readOut = (path: string, to?: number) => {
    const all = splitLines(m.files[path] ?? '');
    const end = Math.min(all.length, to ?? all.length);
    return all.slice(0, Math.min(end, 40)).map((l, i) => pad(i + 1, 3) + '  ' + l);
  };
  const searchOut = (q: string) => {
    const o: string[] = [];
    for (const [p, t] of Object.entries(m.files)) splitLines(t).forEach((l, i) => { if (l.includes(q)) o.push(p + ':' + (i + 1) + ':' + l.trim()); });
    return o.length ? o.slice(0, 8) : ['no matches'];
  };
  const listOut = () => [...new Set(Object.keys(m.files).map((p) => (p.includes('/') ? p.split('/')[0] + '/' : p)))].sort();

  function* toolStep(st: ToolStep): Run {
    m.tools = 1;
    const b = addBlock('tool', st.tool + ' ' + st.args, []);
    yield tick();
    const out = st.read ? readOut(st.read.path, st.read.to) : st.search ? searchOut(st.search) : listOut();
    yield* pushLines(b, out, 30);
    m.tools = 0;
    chg();
    say('Tool ' + st.tool + ' ' + st.args + ' finished, ' + out.length + ' lines.');
  }
  function* sayStep(t: string): Run {
    m.models = 1;
    const b = addBlock('assistant', '', []);
    yield* stream(b, parseText(t));
    m.models = 0;
    chg();
    say('ejm-cli: ' + t.replace(/\n/g, ' ').slice(0, 160));
  }
  function* patchStep(st: PatchStep, intro: boolean): Run {
    const p = st.patch;
    const fail = cliGlyphs(m.plain).fail;
    const done = cliGlyphs(m.plain).done;
    if (intro) {
      const diff = buildDiff(m.files[p.path] ?? '', p.edits, p.path);
      m.models = 1;
      const b = addBlock('assistant', '', []);
      yield* stream(b, parseText(st.intro));
      if (diff) yield* pushLines(b, [{ t: '```diff', r: 'dim' }, ...diff.map((l) => ({ t: l, r: roleOf(l) })), { t: '```', r: 'dim' }], 35);
      m.models = 0;
      say('ejm-cli proposes a patch to ' + p.path + '.');
    }
    let result: 'applied' | 'blocked' | 'failed' = 'applied';
    for (const e of p.edits) {
      m.tools = 1;
      const b = addBlock('tool', L.patchTool + ' ' + p.path, []);
      yield tick();
      if (!m.write) {
        yield* pushLines(b, [{ t: fail + ' ' + L.blockedLine, r: 'err' }], 30);
        m.tools = 0;
        result = 'blocked';
        break;
      }
      const r = applyEdits(m.files[p.path] ?? '', [e]);
      if (r.ok) {
        m.files[p.path] = r.text;
        yield* pushLines(b, [{ t: done + ' replaced 1 match in ' + p.path, r: 'ok' }], 30);
      } else {
        yield* pushLines(b, [{ t: fail + ' ' + r.error, r: 'err' }], 30);
        result = 'failed';
        m.tools = 0;
        break;
      }
      m.tools = 0;
    }
    chg();
    if (result === 'blocked') {
      pending = st;
      m.pendingPatch = p.path;
      addBlock('notice', 'notice', [D.blockedNotice]);
      say('Patch blocked because write access is off. Turn on Grant write to apply it.');
      if (intro) yield* sayStep(st.blocked);
    } else {
      if (pending === st) {
        pending = null;
        m.pendingPatch = null;
      }
      say('Patch ' + (result === 'applied' ? 'applied to ' + p.path : 'failed') + '.');
      if (result === 'applied') yield* sayStep(st.applied);
    }
  }

  function runSteps(fn: () => Run): void {
    m.run = 'running';
    m.agents = 1;
    say('Run started.');
    function* body(): Run {
      try {
        yield* fn();
        say('Run finished.');
      } catch (e) {
        if (e !== CANCEL) throw e;
        addBlock('notice', 'notice', [L.runStopped]);
        say('Run stopped.');
      }
      m.run = 'idle';
      m.agents = 0;
      m.models = 0;
      m.tools = 0;
      tok = null;
      chg();
      const next = m.queue.shift();
      if (next !== undefined) submit(next, true);
    }
    const t = rt.start(body());
    if (!t.dead) tok = t;
    chg();
  }

  function runTurn(t: string): void {
    if (m.title === D.app.title) m.title = t.length > 36 ? t.slice(0, 35) + cliGlyphs(m.plain).dots : t;
    addBlock('you', 'you', [t]);
    const id = matchPrompt(D.match, t);
    runSteps(function* () {
      if (!id) {
        m.models = 1;
        chg();
        yield tick();
        m.models = 0;
        addBlock('notice', 'demo notice', [D.fallback]);
        say('Demo notice: ' + D.fallback);
        return;
      }
      for (const st of D.scenarios[id]?.steps ?? ([] as CliStep[])) {
        if ('say' in st) yield* sayStep(st.say);
        else if ('tool' in st) yield* toolStep(st);
        else {
          const { path, edits } = st.patch;
          if (!buildDiff(m.files[path] ?? '', edits, path)) {
            addBlock('error', L.patchTool + ' ' + path, ['no match for the old text; it may already be applied in this session.']);
            continue;
          }
          yield* patchStep(st, true);
        }
      }
    });
  }

  /** Cancels the active run without letting its end-of-run code start a queued message. */
  function abortRun(): void {
    m.queue = [];
    tok?.cancel();
  }

  function setWrite(v: boolean): void {
    if (m.write === v) return;
    m.write = v;
    say(v ? 'Write access granted. The grants line now shows write.' : 'Write access off.');
    if (v && pending && m.run === 'idle') {
      const st = pending;
      runSteps(function* () {
        yield* sayStep(D.afterGrant.say);
        yield* patchStep(st, false);
      });
    }
  }

  function stop(): void {
    if (m.run === 'idle') addBlock('notice', 'notice', [L.stopIdle]);
    else tok?.cancel();
  }

  function openOverlay(type: 'help' | 'sessions'): void {
    m.overlay = { type, sel: 0 };
    say(type === 'help' ? 'Help opened. Escape closes it.' : 'Sessions opened. Use the arrow keys, Enter to open, Escape to close.');
  }

  function chooseSession(index?: number): void {
    const o = m.overlay;
    if (!o) return;
    if (o.type === 'sessions') {
      const i = index ?? o.sel;
      const r = sessionRows()[i];
      const saved: SavedSession | undefined = D.sessions.find((s) => s.id === r?.id);
      if (r && !r.current && saved) {
        abortRun();
        pending = null;
        m.pendingPatch = null;
        m.title = saved.title;
        m.sessionId = 's_' + saved.id.slice(0, 6);
        m.blocks = [];
        for (const t of saved.transcript) addBlock(t.kind, t.kind, [t.text]);
        say('Opened sample session: ' + saved.title);
      }
    }
    m.overlay = null;
  }

  function command(t: string): void {
    const [cmd = '', ...rest] = t.split(/\s+/);
    if (cmd === '/help') openOverlay('help');
    else if (cmd === '/sessions') openOverlay('sessions');
    else if (cmd === '/stop') stop();
    else if (cmd === '/new') {
      abortRun();
      m.blocks = [];
      pending = null;
      m.pendingPatch = null;
      m.title = rest.join(' ') || D.app.title;
      m.sessionId = 's_' + Math.floor(rt.rand() * 0xffffff).toString(16).padStart(6, '0');
      say('New session.');
    } else if (cmd === '/quit') addBlock('notice', 'notice', [L.quitNotice]);
    else if (L.unsupportedCommands.includes(cmd)) addBlock('notice', 'notice', [fill(cmd, L.unsupportedNotice)]);
    else addBlock('error', 'unknown command', [fill(cmd, L.unknownCommand)]);
  }

  function submit(t: string, fromQueue = false): void {
    t = t.trim();
    if (!t) return;
    if (!fromQueue) {
      m.history.push(t);
      m.historyIndex = -1;
    }
    if (t.startsWith('/')) return command(t);
    if (m.run !== 'idle') {
      m.queue.push(t);
      addBlock('notice', 'queued message', [t]);
      return;
    }
    runTurn(t);
  }

  function handle(a: CliAction): void {
    switch (a.type) {
      case 'submit':
        if (a.text === undefined) {
          const d = m.draft;
          m.draft = '';
          submit(d);
        } else submit(a.text);
        break;
      case 'draft':
        m.draft = a.text;
        break;
      case 'historyUp':
        if (m.history.length) {
          m.historyIndex = m.historyIndex < 0 ? m.history.length - 1 : Math.max(0, m.historyIndex - 1);
          m.draft = m.history[m.historyIndex] ?? '';
        }
        break;
      case 'historyDown':
        if (m.historyIndex >= 0) {
          m.historyIndex++;
          if (m.historyIndex >= m.history.length) {
            m.historyIndex = -1;
            m.draft = '';
          } else m.draft = m.history[m.historyIndex] ?? '';
        }
        break;
      case 'stop':
        stop();
        break;
      case 'grantWrite':
        setWrite(a.value);
        break;
      case 'plain':
        m.plain = a.value;
        say(a.value ? 'Plain mode on: ASCII glyphs, no color.' : 'Plain mode off.');
        break;
      case 'openOverlay':
        openOverlay(a.overlay);
        break;
      case 'closeOverlay':
        m.overlay = null;
        break;
      case 'overlayMove':
        if (m.overlay?.type === 'sessions') {
          const n = sessionRows().length;
          m.overlay.sel = (m.overlay.sel + (a.delta > 0 ? 1 : n - 1)) % n;
        }
        break;
      case 'overlayChoose':
        chooseSession(a.index);
        break;
    }
    chg();
  }

  const getState = (): CliState =>
    rt.snapshot(() => ({ ...structuredClone(m), sessions: sessionRows(), paused: rt.paused, visible: rt.visible }));

  return {
    getState,
    get state() {
      return getState();
    },
    dispatch(a) {
      rt.act(() => {
        const reset = () => {
          nextId = 1;
          tok = null;
          pending = null;
          m = initial(m.live);
        };
        if (!rt.common(a, say, reset)) handle(a as CliAction);
      });
    },
    subscribe: rt.subscribe,
    destroy: rt.killAll,
  };
}
