/**
 * Shared runtime for the three demos: an injected clock, a seeded random source, pause and
 * visibility gating, cancellable scripted runs, and a batched change notification.
 *
 * A scripted run is a generator. It does its work, then `yield`s the number of milliseconds to
 * wait. The runtime resumes it from the clock. This keeps the control flow of the original
 * async code with no promises and no timers of its own.
 */
import { rng } from './text';

/** The only source of time. `after` returns a function that cancels the timer. */
export interface Clock {
  after(ms: number, fn: () => void): () => void;
}

/** Real timers, for the browser. Tests and islands that need control pass their own clock. */
export const systemClock: Clock = {
  after(ms, fn) {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
};

export interface ManualClock extends Clock {
  readonly now: number;
  readonly pending: number;
  /** Runs every timer due within `ms`, in time order. */
  advance(ms: number): void;
  /** Runs timers until none are left, ignoring their delay. Throws if more than `limit` fire. */
  runAll(limit?: number): number;
}

/** A clock that only moves when told to, so tests run instantly and deterministically. */
export function createManualClock(): ManualClock {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const next = (): [number, { at: number; fn: () => void }] | undefined => {
    let best: [number, { at: number; fn: () => void }] | undefined;
    for (const e of timers) if (!best || e[1].at < best[1].at || (e[1].at === best[1].at && e[0] < best[0])) best = e;
    return best;
  };
  return {
    get now() {
      return now;
    },
    get pending() {
      return timers.size;
    },
    after(ms, fn) {
      const id = seq++;
      timers.set(id, { at: now + Math.max(0, ms), fn });
      return () => void timers.delete(id);
    },
    advance(ms) {
      const end = now + ms;
      for (let e = next(); e && e[1].at <= end; e = next()) {
        timers.delete(e[0]);
        now = Math.max(now, e[1].at);
        e[1].fn();
      }
      now = end;
    },
    runAll(limit = 200_000) {
      let n = 0;
      for (let e = next(); e; e = next()) {
        if (++n > limit) throw new Error('manual clock: too many timers, a run never ends');
        timers.delete(e[0]);
        now = Math.max(now, e[1].at);
        e[1].fn();
      }
      return n;
    },
  };
}

export interface DemoOptions {
  /** Default: real timers. */
  clock?: Clock;
  /** Divides every delay. Clamped to 0.1..1000; 0 means 1000 (the old `?demo-speed=0` and `max`). Default 1. */
  speed?: number;
  /** No character streaming and zero delays, like prefers-reduced-motion. Default false. */
  reducedMotion?: boolean;
  /** Seed for timing jitter and ids. Default: the scenario seed, else 1. */
  seed?: number;
  /** Runs only while visible, as the old demo waited for the viewport. Default true. */
  visible?: boolean;
}

/** Actions every demo accepts. */
export type CommonAction = { type: 'pause' } | { type: 'resume' } | { type: 'reset' } | { type: 'visible'; value: boolean };

export interface Demo<S, A> {
  getState(): S;
  readonly state: S;
  /** Never throws for unknown or ill-timed actions; they are ignored. Safe to call from a subscriber. */
  dispatch(action: A | CommonAction): void;
  /** The listener runs after each state change, once per batch. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Stops every timer. The demo can still be reset and used again. */
  destroy(): void;
}

export const CANCEL = Symbol('cancel');
/** A scripted run. Yield milliseconds to wait. A cancelled run gets CANCEL thrown at its yield. */
export type Run = Generator<number, void, undefined>;

export interface Task {
  readonly dead: boolean;
  cancel(): void;
}

export const LIVE_MAX = 20;

export function createRuntime(opts: DemoOptions, seed: number) {
  const clock = opts.clock ?? systemClock;
  const reduced = opts.reducedMotion ?? false;
  const raw = opts.speed ?? 1;
  const speed = raw === 0 || !Number.isFinite(raw) ? 1000 : Math.min(1000, Math.max(0.1, raw));
  let rand = rng(seed);
  let paused = false;
  let visible = opts.visible ?? true;
  let depth = 0;
  let dirty = false;
  let waiters: (() => void)[] = [];
  const queued: (() => void)[] = [];
  const tasks = new Set<{ dead: boolean; off: () => void; gen: Run }>();
  const listeners = new Set<() => void>();
  let snap: unknown = null;
  let hasSnap = false;

  const delayOf = (ms: number) => (reduced ? 0 : Math.max(0, ms / speed));
  const gate = () => !paused && visible;
  const flush = () => {
    if (gate()) {
      const w = waiters;
      waiters = [];
      w.forEach((f) => f());
    }
  };
  const settle = () => {
    while (queued.length) {
      depth++;
      try {
        queued.shift()!();
      } finally {
        depth--;
      }
    }
    if (dirty) {
      dirty = false;
      [...listeners].forEach((l) => l());
    }
  };
  /** Runs `fn` as one batch: changes inside notify subscribers once, at the end. */
  const batch = (fn: () => void) => {
    depth++;
    try {
      fn();
    } finally {
      depth--;
    }
    if (depth === 0) settle();
  };

  /** Drops every run without letting it clean up. Used by reset and destroy. */
  const killAll = () => {
    for (const t of tasks) {
      t.dead = true;
      t.off();
    }
    tasks.clear();
    waiters = [];
  };

  return {
    reduced,
    rand: () => rand(),
    get paused() {
      return paused;
    },
    get visible() {
      return visible;
    },
    batch,
    /** Dispatch entry point: runs now, or after the current batch if one is running. */
    act(fn: () => void) {
      if (depth > 0) queued.push(fn);
      else batch(fn);
    },
    changed() {
      dirty = true;
      hasSnap = false;
    },
    /** Builds a snapshot at most once per change. */
    snapshot<T>(build: () => T): T {
      if (!hasSnap) {
        snap = build();
        hasSnap = true;
      }
      return snap as T;
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    start(gen: Run): Task {
      const t = { dead: false, off: () => {}, gen };
      tasks.add(t);
      const finish = () => {
        t.dead = true;
        tasks.delete(t);
      };
      const step = (resume: () => IteratorResult<number, void>) => {
        let r: IteratorResult<number, void>;
        try {
          r = resume();
        } catch (e) {
          finish();
          throw e;
        }
        if (r.done) finish();
        else t.off = clock.after(delayOf(r.value), fire);
      };
      const fire = () => {
        if (t.dead) return;
        if (!gate()) return void waiters.push(fire);
        batch(() => step(() => gen.next()));
      };
      batch(() => step(() => gen.next()));
      return {
        get dead() {
          return t.dead;
        },
        cancel() {
          if (t.dead) return;
          t.off();
          finish();
          batch(() => {
            try {
              gen.throw(CANCEL);
            } catch (e) {
              if (e !== CANCEL) throw e;
            }
          });
        },
      };
    },
    killAll,
    reseed() {
      rand = rng(seed);
    },
    /** Handles pause, resume, reset and visible. `reset` must rebuild the product state. */
    common(a: { type: string }, say: (text: string) => void, reset: () => void): boolean {
      switch (a.type) {
        case 'pause':
          paused = true;
          say('Demo paused.');
          break;
        case 'resume':
          paused = false;
          say('Demo resumed.');
          flush();
          break;
        case 'visible':
          visible = (a as { value?: boolean }).value ?? true;
          flush();
          break;
        case 'reset':
          paused = false;
          killAll();
          rand = rng(seed);
          reset();
          say('Demo reset.');
          break;
        default:
          return false;
      }
      dirty = true;
      hasSnap = false;
      return true;
    },
  };
}

export type Runtime = ReturnType<typeof createRuntime>;

/** Appends to the live-region log, keeping the most recent LIVE_MAX lines. */
export function announce(live: string[], text: string): void {
  live.push(text);
  while (live.length > LIVE_MAX) live.shift();
}
