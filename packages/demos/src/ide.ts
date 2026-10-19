/** ejm-ide demo: scripted agent chat beside a read-only editor. Port of buildIde in design-kit demo.js, without any DOM. */
import { announce, CANCEL, createRuntime, type Demo, type DemoOptions, type Run, type Task } from './core';
import { ideLabels, ideScenario, project as bundledProject } from './scenarios';
import { applyEdits, buildDiff, diffKind, matchPrompt, splitLines, type DiffKind } from './text';
import type { IdeLabels, IdeScenario, Project, ToolStep, WriteStep } from './types';

export interface DiffLine {
  text: string;
  kind: DiffKind;
}

export type ChatItem =
  | { kind: 'user'; id: number; text: string }
  /** `scripted` marks the fallback reply, which carries a "scripted reply" badge. */
  | { kind: 'agent'; id: number; text: string; scripted?: boolean }
  | {
      kind: 'tool';
      id: number;
      name: string;
      arg: string;
      /** Shown after the argument once the call finished, such as "12 lines". */
      detail?: string;
      /** Looks: running, ok, error, or null for a neutral state (proposed, rejected). */
      state: 'running' | 'ok' | 'error' | null;
      /** The visible state word: running, ok, proposed, applied, rejected, error. */
      word: string;
      /** Search results, one per line. */
      output?: string[];
      /** The diff of a proposed write. */
      diff?: DiffLine[];
      /** True while Accept and Reject are offered. */
      review: boolean;
      /** Extra caption under the call, such as why a write could not apply. */
      note?: string;
    }
  | { kind: 'caption'; id: number; text: string }
  | { kind: 'stopped'; id: number };

export type ToolItem = Extract<ChatItem, { kind: 'tool' }>;

export interface TreeEntry {
  /** A file path, or a folder name when `dir` is true. */
  key: string;
  dir: boolean;
  level: 0 | 1;
}

export interface PaletteItem {
  label: string;
  hint: string;
}

export interface IdeState {
  openFiles: string[];
  active: string | null;
  /** Current text of every project file, after accepted edits. */
  files: Record<string, string>;
  /** Zero-based line numbers changed by accepted edits, per path. They stay marked. */
  changed: Record<string, number[]>;
  /** Lines to pulse once, set only right after an accept opened the file. */
  flash: { path: string; lines: number[] } | null;
  folders: Record<string, boolean>;
  tree: TreeEntry[];
  /** Index into the scenario models. A label only: replies stay scripted. */
  model: number;
  running: boolean;
  chatTitle: string;
  chat: ChatItem[];
  palette: { open: boolean; query: string; sel: number; items: PaletteItem[] };
  /** The theme the demo window shows: the page theme unless "Toggle theme" overrode it. */
  theme: 'light' | 'dark';
  live: string[];
  paused: boolean;
  visible: boolean;
}

export type IdeAction =
  /** A typed or chip prompt. Ignored when empty or while a run is active. */
  | { type: 'prompt'; text: string }
  | { type: 'stop' }
  | { type: 'newChat' }
  /** Accept the proposed write of tool call `id`. */
  | { type: 'accept'; id: number }
  | { type: 'reject'; id: number }
  | { type: 'openFile'; path: string }
  | { type: 'closeFile'; path: string }
  | { type: 'toggleFolder'; folder: string }
  | { type: 'paletteOpen' }
  | { type: 'paletteClose' }
  | { type: 'paletteQuery'; text: string }
  | { type: 'paletteMove'; delta: 1 | -1 }
  /** Run the selected command (or the one at `index`) and close the palette. */
  | { type: 'paletteRun'; index?: number }
  /** The page theme changed. Clears the "Toggle theme" override. */
  | { type: 'pageTheme'; value: 'light' | 'dark' };

export interface IdeOptions extends DemoOptions {
  scenario?: IdeScenario;
  project?: Project;
  labels?: IdeLabels;
  /** Initial page theme. Default light. */
  pageTheme?: 'light' | 'dark';
}

type Mutable = Omit<IdeState, 'tree' | 'paused' | 'visible'>;
type NewItem = ChatItem extends infer U ? (U extends ChatItem ? Omit<U, 'id'> : never) : never;

/** Marks the lines of `after` that are not part of the longest common subsequence with `before`. */
function changedLines(before: string, after: string): number[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  const at = (i: number, j: number) => dp[i]?.[j] ?? 0;
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
  const out: number[] = [];
  for (let i = 0, j = 0; j < b.length; ) {
    if (i < a.length && a[i] === b[j]) { i++; j++; }
    else if (i < a.length && at(i + 1, j) >= at(i, j + 1)) i++;
    else out.push(j++);
  }
  return out;
}

export function createIdeDemo(options: IdeOptions = {}): Demo<IdeState, IdeAction> {
  const D = options.scenario ?? ideScenario;
  const L = options.labels ?? ideLabels;
  const project = options.project ?? bundledProject;
  const rt = createRuntime(options, options.seed ?? D.seed ?? 1);
  const dirs = [...new Set(project.files.filter((f) => f.path.includes('/')).map((f) => f.path.split('/')[0]!))];
  let nextId = 1;
  let tok: Task | null = null;
  let pageTheme = options.pageTheme ?? 'light';
  let reviews = new Map<number, WriteStep>();
  let pendingFlash: { path: string; lines: number[] } | null = null;

  const initial = (live: string[]): Mutable => ({
    openFiles: [...D.openFiles], active: D.openFiles[0] ?? null,
    files: Object.fromEntries(project.files.map((f) => [f.path, f.text])), changed: {}, flash: null,
    folders: Object.fromEntries(dirs.map((d) => [d, true])), model: 0, running: false, chatTitle: 'New chat', chat: [],
    palette: { open: false, query: '', sel: 0, items: [] }, theme: pageTheme, live,
  });
  let m = initial([]);

  const say = (t: string) => announce(m.live, t);
  const chg = () => rt.changed();
  const push = (item: NewItem): ChatItem => {
    const it = { ...item, id: nextId++ } as ChatItem;
    m.chat.push(it);
    chg();
    return it;
  };
  const treeEntries = (): TreeEntry[] => [
    ...project.files.filter((f) => !f.path.includes('/')).map((f) => ({ key: f.path, dir: false, level: 0 as const })),
    ...dirs.flatMap((d) => [{ key: d, dir: true, level: 0 as const }, ...(m.folders[d] ? project.files.filter((f) => f.path.startsWith(d + '/')).map((f) => ({ key: f.path, dir: false, level: 1 as const })) : [])]),
  ];

  /* ---- files ---- */
  function openFile(path: string, flash = false): void {
    if (!(path in m.files)) return;
    if (!m.openFiles.includes(path)) m.openFiles.push(path);
    m.active = path;
    m.flash = flash && pendingFlash?.path === path ? pendingFlash : null;
  }
  function closeFile(path: string): void {
    const i = m.openFiles.indexOf(path);
    if (i < 0) return;
    m.openFiles.splice(i, 1);
    if (m.active === path) m.active = m.openFiles[Math.min(i, m.openFiles.length - 1)] ?? null;
    m.flash = null;
  }

  /* ---- palette ---- */
  const commands = (): (PaletteItem & { run: () => void })[] => [
    ...D.models.map((name, i) => ({
      label: L.paletteSwitchModel + name, hint: i === m.model ? 'current' : 'label only',
      run: () => { m.model = i; say('Model label set to ' + name + '. Replies stay scripted.'); },
    })),
    { label: L.paletteToggleTheme, hint: 'this demo only', run: () => { m.theme = m.theme === 'dark' ? 'light' : 'dark'; say('Theme: ' + m.theme + '.'); } },
    ...project.files.map((f) => ({ label: L.paletteOpenFile + f.path, hint: '', run: () => openFile(f.path) })),
  ];
  const paletteItems = () => commands().filter((c) => c.label.toLowerCase().includes(m.palette.query.toLowerCase()));
  const clampSel = () => { m.palette.sel = Math.min(m.palette.sel, Math.max(0, paletteItems().length - 1)); };

  /* ---- scripted runs ---- */
  function* sayStep(t: string): Run {
    const item = push({ kind: 'agent', text: '' }) as Extract<ChatItem, { kind: 'agent' }>;
    if (rt.reduced) item.text = t;
    else for (let i = 0; i < t.length; ) {
      const n = 2 + Math.floor(rt.rand() * 5);
      item.text += t.slice(i, i + n);
      i += n;
      chg();
      yield 20;
    }
    chg();
    say(D.agent + ': ' + t.slice(0, 160));
  }
  function* toolStep(st: ToolStep): Run {
    const t = push({ kind: 'tool', name: st.tool, arg: st.args, state: 'running', word: 'running', review: false }) as ToolItem;
    yield rt.rand() * 250 + 350;
    let out: string;
    if (st.read) out = splitLines(m.files[st.read.path] ?? '').length + ' lines';
    else if (st.search) {
      const o: string[] = [];
      for (const [p, tx] of Object.entries(m.files)) splitLines(tx).forEach((l, i) => { if (l.includes(st.search!)) o.push(p + ':' + (i + 1) + ': ' + l.trim()); });
      t.output = o.length ? o : ['no matches'];
      out = o.length + ' matches';
    } else out = Object.keys(m.files).length + ' files';
    t.detail = out;
    t.state = 'ok';
    t.word = 'ok';
    chg();
    say('Tool ' + st.tool + ' ' + st.args + ' ok, ' + out + '.');
  }
  function* writeStep(st: WriteStep): Run {
    const w = st.write;
    yield* sayStep(st.intro);
    const diff = buildDiff(m.files[w.path] ?? '', w.edits, w.path);
    const t = push({ kind: 'tool', name: L.writeTool, arg: w.path, state: null, word: 'proposed', review: false }) as ToolItem;
    yield 450;
    if (!diff) {
      t.state = 'error';
      t.word = 'error';
      t.note = L.applyError;
      chg();
      return;
    }
    t.diff = diff.map((text) => ({ text, kind: diffKind(text) }));
    t.review = true;
    reviews.set(t.id, st);
    chg();
    say('Review needed: ' + D.agent + ' proposes a change to ' + w.path + '. Accept or Reject.');
  }

  function run(text: string): void {
    m.running = true;
    if (m.chatTitle === 'New chat') m.chatTitle = text.length > 28 ? text.slice(0, 27) + '…' : text;
    push({ kind: 'user', text });
    say('Run started.');
    function* body(): Run {
      try {
        const id = matchPrompt(D.match, text);
        if (!id) {
          yield 400;
          push({ kind: 'agent', text: D.fallback, scripted: true });
          say('Scripted reply: ' + D.fallback);
        } else {
          for (const st of D.scenarios[id]?.steps ?? []) {
            if ('say' in st) yield* sayStep(st.say);
            else if ('tool' in st) yield* toolStep(st);
            else yield* writeStep(st);
          }
        }
        say('Run finished.');
      } catch (e) {
        if (e !== CANCEL) throw e;
        push({ kind: 'stopped' });
        say('Run stopped.');
      }
      m.running = false;
      tok = null;
      chg();
    }
    const t = rt.start(body());
    if (!t.dead) tok = t;
    chg();
  }

  function review(id: number, accept: boolean): void {
    const st = reviews.get(id);
    const t = m.chat.find((c): c is ToolItem => c.kind === 'tool' && c.id === id);
    if (!st || !t || !t.review) return;
    const w = st.write;
    reviews.delete(id);
    t.review = false;
    if (!accept) {
      t.state = null;
      t.word = 'rejected';
      push({ kind: 'agent', text: st.rejected });
      say('Change rejected. ' + w.path + ' is unchanged.');
      return;
    }
    const r = applyEdits(m.files[w.path] ?? '', w.edits);
    if (!r.ok) {
      t.state = 'error';
      t.word = 'error';
      push({ kind: 'caption', text: r.error });
      return;
    }
    const lines = changedLines(m.files[w.path] ?? '', r.text);
    m.files[w.path] = r.text;
    m.changed[w.path] = [...new Set([...(m.changed[w.path] ?? []), ...lines])].sort((x, y) => x - y);
    pendingFlash = { path: w.path, lines };
    t.state = 'ok';
    t.word = 'applied';
    openFile(w.path, true);
    push({ kind: 'agent', text: st.applied });
    say('Change accepted and applied to ' + w.path + '.');
  }

  function handle(a: IdeAction): void {
    switch (a.type) {
      case 'prompt': {
        const t = a.text.trim();
        if (t && !m.running) run(t);
        break;
      }
      case 'stop':
        tok?.cancel();
        break;
      case 'newChat':
        tok?.cancel();
        m.chat = [];
        reviews = new Map();
        m.chatTitle = 'New chat';
        say('New chat.');
        break;
      case 'accept':
        review(a.id, true);
        break;
      case 'reject':
        review(a.id, false);
        break;
      case 'openFile':
        openFile(a.path);
        break;
      case 'closeFile':
        closeFile(a.path);
        break;
      case 'toggleFolder':
        if (dirs.includes(a.folder)) m.folders[a.folder] = !m.folders[a.folder];
        break;
      case 'paletteOpen':
        m.palette = { open: true, query: '', sel: 0, items: [] };
        say('Command palette opened. Type to filter, arrows to choose, Enter to run, Escape to close.');
        break;
      case 'paletteClose':
        m.palette.open = false;
        break;
      case 'paletteQuery':
        m.palette.query = a.text;
        m.palette.sel = 0;
        break;
      case 'paletteMove': {
        const n = paletteItems().length;
        if (n) m.palette.sel = (m.palette.sel + (a.delta > 0 ? 1 : n - 1)) % n;
        break;
      }
      case 'paletteRun': {
        if (!m.palette.open) break;
        clampSel();
        const c = paletteItems()[a.index ?? m.palette.sel];
        m.palette.open = false;
        c?.run();
        break;
      }
      case 'pageTheme':
        pageTheme = a.value;
        m.theme = a.value;
        break;
    }
    chg();
  }

  const getState = (): IdeState =>
    rt.snapshot(() => {
      const snap = structuredClone(m);
      const items = paletteItems();
      snap.palette.items = items.map(({ label, hint }) => ({ label, hint }));
      snap.palette.sel = Math.min(snap.palette.sel, Math.max(0, items.length - 1));
      return { ...snap, tree: treeEntries(), paused: rt.paused, visible: rt.visible };
    });

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
          pendingFlash = null;
          reviews = new Map();
          m = initial(m.live);
        };
        if (!rt.common(a, say, reset)) handle(a as IdeAction);
      });
    },
    subscribe: rt.subscribe,
    destroy: rt.killAll,
  };
}
