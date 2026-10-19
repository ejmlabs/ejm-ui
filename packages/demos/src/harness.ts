/** ejm-harness demo: sessions admitted by a resource governor, an append-only journal, crash and recovery. Port of buildHarness in design-kit demo.js. */
import { announce, CANCEL, createRuntime, type Demo, type DemoOptions, type Run } from './core';
import { harnessScenario } from './scenarios';
import type { HarnessScenario } from './types';

export type SessionPhase = 'queued' | 'running' | 'recovering' | 'done';
export type Level = 'info' | 'warn' | 'error';

export interface HarnessSession {
  id: number;
  name: string;
  state: SessionPhase;
  /** Index into `plan`, and ticks done inside that phase. */
  phase: number;
  done: number;
  total: number;
  /** Holds a command slot. */
  holds: boolean;
  /** Running but waiting for a command slot. */
  waiting: boolean;
  /** A call was interrupted by a crash, marked uncertain and never run again. */
  uncertain: boolean;
  /** Ticks of recovery left. */
  rec: number;
  plan: { kind: 'model' | 'command'; label: string; ticks: number }[];
  /** Derived for display. */
  word: 'queued' | 'running' | 'waiting' | 'recovering' | 'done';
  /** The badge text: the word, plus ", 1 uncertain" after a crash during a command. */
  badge: string;
  /** What it is doing, in words. Empty when done. */
  what: string;
  /** Progress, 0 to 100. */
  pct: number;
}

export interface JournalEntry {
  /** Starts at 1, increases by one per event, never reused. */
  seq: number;
  tick: number;
  /** Time since start, such as "+0.50s". */
  time: string;
  event: string;
  detail: string;
  level: Level;
  /** The session the event belongs to, or null for engine events. */
  session: string | null;
}

export interface HarnessState {
  tick: number;
  limit: number;
  commands: number;
  sessions: HarnessSession[];
  /** Ids of queued sessions, in admission order. */
  queue: number[];
  journal: JournalEntry[];
  stats: { running: number; queued: number; done: number; commandsHeld: number };
  /** False while no session is running, as the Crash worker button is then disabled. */
  canCrash: boolean;
  /** Selected sample language id. */
  lang: string;
  live: string[];
  paused: boolean;
  visible: boolean;
}

export type HarnessAction =
  | { type: 'addSession'; count?: number }
  /** Slider 1..8. `commit` is the end of a drag; only a committed change is written to the journal. */
  | { type: 'setLimit'; value: number; commit?: boolean }
  /** Slider 1..4. */
  | { type: 'setCommands'; value: number; commit?: boolean }
  | { type: 'crash' }
  /** Advance one tick by hand, without waiting for the clock. */
  | { type: 'step' }
  | { type: 'lang'; id: string };

export interface HarnessOptions extends DemoOptions {
  scenario?: HarnessScenario;
}

type Mutable = Omit<HarnessState, 'stats' | 'canCrash' | 'paused' | 'visible'>;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));

export function createHarnessDemo(options: HarnessOptions = {}): Demo<HarnessState, HarnessAction> {
  const D = options.scenario ?? harnessScenario;
  const rt = createRuntime(options, options.seed ?? D.seed);
  let m: Mutable;
  let next = 1;
  let loop = false;
  let loggedLimit = 0;
  let loggedCmds = 0;

  const say = (t: string) => announce(m.live, t);
  const fmt = (t: number) => '+' + ((t * D.tickMs) / 1000).toFixed(2) + 's';
  const log = (event: string, detail: string, level: Level = 'info', session: string | null = null) => {
    m.journal.push({ seq: m.journal.length + 1, tick: m.tick, time: fmt(m.tick), event, detail, level, session });
  };
  const countFor = (name: string) => m.journal.filter((j) => j.session === name).length;
  const active = () => m.sessions.filter((x) => x.state === 'running' || x.state === 'recovering');

  type Raw = Omit<HarnessSession, 'word' | 'badge' | 'what' | 'pct'>;
  function add(n: number): void {
    for (let i = 0; i < n; i++) {
      const id = next++;
      const name = 'session-a' + id;
      const plan = D.plan.map((p) => ({ kind: p.kind, label: p.label, ticks: p.min + Math.floor(rt.rand() * (p.max - p.min + 1)) }));
      const se: Raw = { id, name, state: 'queued', plan, phase: 0, done: 0, total: plan.reduce((a, p) => a + p.ticks, 0), holds: false, waiting: false, uncertain: false, rec: 0 };
      m.sessions.push(se as HarnessSession);
      m.queue.push(id);
      log('session.queued', name, 'info', name);
    }
    ensureLoop();
  }

  function advance(se: HarnessSession): void {
    const ph = se.plan[se.phase];
    if (!ph) return;
    if (ph.kind === 'command' && !se.holds) {
      if (m.sessions.filter((x) => x.holds).length >= m.commands) {
        if (!se.waiting) {
          se.waiting = true;
          log('command.wait', se.name + ' waits for a free command slot', 'warn', se.name);
        }
        return;
      }
      se.holds = true;
      se.waiting = false;
      log('tool.call', se.name + ' starts a local command', 'info', se.name);
    }
    if (se.done === 0 && ph.kind === 'model') log('model.request', se.name, 'info', se.name);
    se.done++;
    if (se.done >= ph.ticks) {
      if (ph.kind === 'command') {
        se.holds = false;
        log('tool.result', se.name + ' command finished', 'info', se.name);
      } else log('model.response', se.name, 'info', se.name);
      se.phase++;
      se.done = 0;
      if (se.phase >= se.plan.length) {
        se.state = 'done';
        log('session.done', se.name, 'info', se.name);
        say(se.name + ' done.');
      }
    }
  }

  function recoverStep(se: HarnessSession): void {
    if (--se.rec > 0) return;
    const ph = se.plan[se.phase];
    if (ph?.kind === 'command') {
      log('tool.uncertain', se.name + ' call marked uncertain, not run again', 'warn', se.name);
      se.uncertain = true;
      se.phase++;
      se.done = 0;
    } else {
      log('model.request', se.name + ' restarted after recovery', 'info', se.name);
      se.done = 0;
    }
    se.state = se.phase >= se.plan.length ? 'done' : 'running';
    log('session.resumed', se.name, 'info', se.name);
    say(se.name + ' resumed from the journal.' + (ph?.kind === 'command' ? ' Its interrupted command was marked uncertain and not run again.' : ''));
    if (se.state === 'done') {
      log('session.done', se.name, 'info', se.name);
      say(se.name + ' done.');
    }
  }

  function step(): void {
    m.tick++;
    for (const se of m.sessions) {
      if (se.state === 'running') advance(se);
      else if (se.state === 'recovering') recoverStep(se);
    }
    while (m.queue.length && active().length < m.limit) {
      const id = m.queue.shift();
      const se = m.sessions.find((x) => x.id === id);
      if (!se) continue;
      se.state = 'running';
      log('session.admitted', se.name + ' (' + active().length + '/' + m.limit + ' running)', 'info', se.name);
      say(se.name + ' admitted.');
    }
  }

  function crash(): void {
    const victims = m.sessions.filter((x) => x.state === 'running');
    if (!victims.length) return;
    log('worker.crashed', victims.length + ' running session' + (victims.length > 1 ? 's' : '') + ' interrupted', 'error');
    say('Worker crashed. ' + victims.length + ' running sessions interrupted. Recovering from the journal.');
    for (const se of victims) {
      se.holds = false;
      se.waiting = false;
      se.state = 'recovering';
      se.rec = D.recoveryTicks;
      log('session.interrupted', se.name, 'warn', se.name);
    }
    log('recovery.start', 'journal is read, nothing is erased', 'warn');
    for (const se of victims) log('recovery.replay', 'replayed ' + countFor(se.name) + ' events for ' + se.name, 'warn', se.name);
    ensureLoop();
  }

  /** Ticks every `tickMs` while any session is unfinished. Re-armed by add, crash and a limit change. */
  function ensureLoop(): void {
    if (loop) return;
    loop = true;
    function* ticks(): Run {
      try {
        while (m.sessions.some((x) => x.state !== 'done')) {
          yield D.tickMs;
          step();
          rt.changed();
        }
      } catch (e) {
        if (e !== CANCEL) throw e;
        return;
      }
      loop = false;
    }
    rt.start(ticks());
  }

  function slider(kind: 'limit' | 'commands', raw: number, commit: boolean | undefined): void {
    const limit = kind === 'limit';
    const v = clamp(raw, 1, limit ? 8 : 4);
    if (limit) m.limit = v;
    else m.commands = v;
    const prev = limit ? loggedLimit : loggedCmds;
    if (commit && v !== prev) {
      log(limit ? 'governor.limit' : 'governor.commands', prev + ' to ' + v);
      say((limit ? 'Max concurrent set to ' : 'Command slots set to ') + v + '.');
      if (limit) loggedLimit = v;
      else loggedCmds = v;
    }
    if (limit) ensureLoop();
  }

  function boot(live: string[]): void {
    next = 1;
    loop = false;
    m = { tick: 0, limit: D.defaults.limit, commands: D.defaults.commands, sessions: [], queue: [], journal: [], lang: D.langs[0]?.id ?? '', live };
    loggedLimit = m.limit;
    loggedCmds = m.commands;
    log('engine.start', 'journal opened, limit ' + m.limit + ', command slots ' + m.commands);
    add(D.defaults.start);
  }
  boot([]);

  const view = (se: HarnessSession): HarnessSession => {
    const word = se.state === 'running' ? (se.waiting ? 'waiting' : 'running') : se.state;
    const ph = se.plan[se.phase];
    const pct = se.state === 'done' ? 100 : Math.round((se.plan.slice(0, se.phase).reduce((a, p) => a + p.ticks, 0) + se.done) / se.total * 100);
    const what =
      se.state === 'running' ? (se.waiting ? 'waiting for a command slot' : ph?.label ?? '')
      : se.state === 'recovering' ? 'replaying the journal'
      : se.state === 'queued' ? 'waiting for the governor' : '';
    return { ...se, word, pct, what, badge: word + (se.uncertain && se.state !== 'queued' ? ', 1 uncertain' : '') };
  };

  const getState = (): HarnessState =>
    rt.snapshot(() => {
      const snap = structuredClone(m);
      return {
        ...snap,
        sessions: snap.sessions.map(view),
        stats: {
          running: active().length,
          queued: m.queue.length,
          done: m.sessions.filter((x) => x.state === 'done').length,
          commandsHeld: m.sessions.filter((x) => x.holds).length,
        },
        canCrash: m.sessions.some((x) => x.state === 'running'),
        paused: rt.paused,
        visible: rt.visible,
      };
    });

  function handle(a: HarnessAction): void {
    switch (a.type) {
      case 'addSession':
        add(clamp(a.count ?? 1, 1, 50));
        break;
      case 'setLimit':
        slider('limit', a.value, a.commit);
        break;
      case 'setCommands':
        slider('commands', a.value, a.commit);
        break;
      case 'crash':
        crash();
        break;
      case 'step':
        step();
        break;
      case 'lang':
        if (D.langs.some((l) => l.id === a.id)) m.lang = a.id;
        break;
    }
    rt.changed();
  }

  return {
    getState,
    get state() {
      return getState();
    },
    dispatch(a) {
      rt.act(() => {
        if (!rt.common(a, say, () => boot(m.live))) handle(a as HarnessAction);
      });
    },
    subscribe: rt.subscribe,
    destroy: rt.killAll,
  };
}
