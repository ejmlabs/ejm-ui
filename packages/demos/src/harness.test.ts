// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createManualClock } from './core';
import { createHarnessDemo, type HarnessState } from './harness';
import { harnessScenario } from './scenarios';

const make = (extra: Parameters<typeof createHarnessDemo>[0] = {}) => {
  const clock = createManualClock();
  const demo = createHarnessDemo({ clock, ...extra });
  const step = (n = 1) => { for (let i = 0; i < n; i++) demo.dispatch({ type: 'step' }); };
  return { clock, demo, step };
};
const events = (s: HarnessState, session: string) => s.journal.filter((j) => j.session === session).map((j) => j.event);
const withoutLive = (s: HarnessState) => ({ ...s, live: [] });

describe('first scripted session', () => {
  it('starts with the journal open and four queued sessions', () => {
    const { demo } = make();
    const s = demo.state;
    expect(s.journal.map((j) => [j.seq, j.event])).toEqual([[1, 'engine.start'], [2, 'session.queued'], [3, 'session.queued'], [4, 'session.queued'], [5, 'session.queued']]);
    expect(s.journal[0]!.detail).toBe('journal opened, limit 3, command slots 2');
    expect(s.stats).toEqual({ running: 0, queued: 4, done: 0, commandsHeld: 0 });
    expect(s.canCrash).toBe(false);
    expect(s.sessions.map((x) => x.badge)).toEqual(['queued', 'queued', 'queued', 'queued']);
  });

  it('the governor admits up to the limit, the rest wait, and everyone finishes', () => {
    const { demo, clock } = make();
    demo.dispatch({ type: 'step' });
    expect(demo.state.stats).toMatchObject({ running: 3, queued: 1 });
    expect(demo.state.sessions.map((x) => x.word)).toEqual(['running', 'running', 'running', 'queued']);
    expect(demo.state.journal.find((j) => j.event === 'session.admitted')!.detail).toBe('session-a1 (1/3 running)');
    clock.runAll();
    const s = demo.state;
    expect(s.stats).toEqual({ running: 0, queued: 0, done: 4, commandsHeld: 0 });
    expect(s.sessions.every((x) => x.pct === 100 && x.word === 'done' && x.what === '')).toBe(true);
    expect(clock.pending).toBe(0);
    for (const x of s.sessions) {
      expect(events(s, x.name)).toEqual(expect.arrayContaining(['session.queued', 'session.admitted', 'model.request', 'model.response', 'tool.call', 'tool.result', 'session.done']));
      expect(events(s, x.name).at(-1)).toBe('session.done');
    }
  });

  it('is deterministic for a seed, and the clock sets the tempo', () => {
    const play = (seed?: number) => {
      const { demo, clock } = make({ seed });
      clock.runAll();
      return { state: demo.state, now: clock.now };
    };
    expect(play()).toEqual(play());
    expect(play(7).now % harnessScenario.tickMs).toBe(0);
    expect(play(7).state.sessions.map((s) => s.total)).not.toEqual(play(8).state.sessions.map((s) => s.total));
  });
});

describe('governor', () => {
  it('never runs more sessions than the limit or holds more command slots than allowed', () => {
    const { demo, step } = make();
    demo.dispatch({ type: 'addSession', count: 5 });
    demo.dispatch({ type: 'setCommands', value: 1 });
    let waited = false;
    for (let i = 0; i < 80; i++) {
      step();
      const s = demo.state;
      expect(s.stats.running).toBeLessThanOrEqual(s.limit);
      expect(s.stats.commandsHeld).toBeLessThanOrEqual(1);
      waited ||= s.sessions.some((x) => x.word === 'waiting' && x.what === 'waiting for a command slot');
    }
    expect(waited).toBe(true);
    expect(demo.state.journal.some((j) => j.event === 'command.wait')).toBe(true);
    expect(demo.state.stats.done).toBe(9);
  });

  it('logs a slider change once, when it is committed and different', () => {
    const { demo } = make();
    const n = demo.state.journal.length;
    demo.dispatch({ type: 'setLimit', value: 4 });
    demo.dispatch({ type: 'setLimit', value: 5 });
    expect(demo.state.limit).toBe(5);
    expect(demo.state.journal).toHaveLength(n);
    demo.dispatch({ type: 'setLimit', value: 5, commit: true });
    demo.dispatch({ type: 'setLimit', value: 5, commit: true });
    expect(demo.state.journal.slice(n).map((j) => [j.event, j.detail])).toEqual([['governor.limit', '3 to 5']]);
    demo.dispatch({ type: 'setLimit', value: 3, commit: true });
    expect(demo.state.journal.at(-1)!.detail).toBe('5 to 3');
    demo.dispatch({ type: 'setCommands', value: 3, commit: true });
    expect(demo.state.journal.at(-1)).toMatchObject({ event: 'governor.commands', detail: '2 to 3' });
  });

  it('clamps the sliders to their ranges', () => {
    const { demo } = make();
    demo.dispatch({ type: 'setLimit', value: 99 });
    demo.dispatch({ type: 'setCommands', value: 0 });
    expect([demo.state.limit, demo.state.commands]).toEqual([8, 1]);
  });

  it('lowering the limit lets running sessions finish but admits nobody new', () => {
    const { demo, step } = make();
    step();
    demo.dispatch({ type: 'setLimit', value: 1 });
    step(2);
    expect(demo.state.stats.running).toBe(3);
    expect(demo.state.stats.queued).toBe(1);
  });
});

describe('journal', () => {
  it('is append-only: numbers rise by one and earlier entries never change', () => {
    const { demo, step } = make();
    let seen = demo.state.journal;
    for (let i = 0; i < 15; i++) {
      if (i === 5) { demo.dispatch({ type: 'crash' }); }
      step();
      const j = demo.state.journal;
      expect(j.slice(0, seen.length)).toEqual(seen);
      seen = j;
    }
    expect(seen.map((e) => e.seq)).toEqual(seen.map((_, i) => i + 1));
  });

  it('timestamps entries by tick', () => {
    const { demo, step } = make();
    step(2);
    demo.dispatch({ type: 'addSession' });
    expect(demo.state.journal.at(-1)).toMatchObject({ tick: 2, time: '+0.50s', event: 'session.queued', detail: 'session-a5' });
  });
});

describe('crash and recovery', () => {
  const untilCommand = () => {
    const x = make();
    let victim;
    for (let i = 0; i < 60 && !victim; i++) {
      x.step();
      victim = x.demo.state.sessions.find((s) => s.holds);
    }
    return { ...x, victim: victim! };
  };

  it('is disabled until something runs', () => {
    const { demo } = make();
    const n = demo.state.journal.length;
    demo.dispatch({ type: 'crash' });
    expect(demo.state.journal).toHaveLength(n);
  });

  it('replays the journal and never runs an interrupted command again', () => {
    const { demo, clock, victim } = untilCommand();
    const callsBefore = events(demo.state, victim.name).filter((e) => e === 'tool.call').length;
    expect(callsBefore).toBe(1);
    demo.dispatch({ type: 'crash' });
    const mid = demo.state;
    expect(mid.sessions.find((s) => s.name === victim.name)).toMatchObject({ state: 'recovering', word: 'recovering', what: 'replaying the journal', holds: false });
    expect(mid.stats.commandsHeld).toBe(0);
    const tail = mid.journal.slice(-8).map((j) => j.event);
    expect(tail).toContain('worker.crashed');
    expect(tail).toContain('recovery.start');
    const replay = mid.journal.find((j) => j.event === 'recovery.replay' && j.session === victim.name)!;
    expect(replay.detail).toBe(`replayed ${mid.journal.filter((j) => j.session === victim.name && j.seq < replay.seq).length} events for ${victim.name}`);
    clock.runAll();
    const end = demo.state;
    const ev = events(end, victim.name);
    expect(ev.filter((e) => e === 'tool.call')).toHaveLength(1);
    expect(ev).toContain('tool.uncertain');
    expect(ev).toContain('session.resumed');
    expect(ev.at(-1)).toBe('session.done');
    expect(end.sessions.find((s) => s.name === victim.name)!.badge).toBe('done, 1 uncertain');
    expect(end.stats.done).toBe(4);
  });

  it('a session interrupted during a model request asks again instead of marking anything uncertain', () => {
    const { demo, clock, step } = make();
    step(2);
    demo.dispatch({ type: 'crash' });
    clock.runAll();
    const s = demo.state;
    expect(s.journal.some((j) => j.event === 'model.request' && j.detail.endsWith('restarted after recovery'))).toBe(true);
    expect(s.stats.done).toBe(4);
  });
});

describe('controls', () => {
  it('pause freezes the clock-driven ticks and resume continues', () => {
    const { demo, clock } = make();
    clock.advance(500);
    demo.dispatch({ type: 'pause' });
    clock.runAll();
    const t = demo.state.tick;
    expect(demo.state.paused).toBe(true);
    expect(t).toBe(2);
    demo.dispatch({ type: 'resume' });
    clock.runAll();
    expect(demo.state.stats.done).toBe(4);
  });

  it('reset restores the first state, including the seeded plans, mid run', () => {
    const fresh = make().demo.state;
    const { demo, clock, step } = make();
    step(6);
    demo.dispatch({ type: 'crash' });
    demo.dispatch({ type: 'setLimit', value: 6, commit: true });
    demo.dispatch({ type: 'lang', id: 'python' });
    demo.dispatch({ type: 'reset' });
    expect(withoutLive(demo.state)).toEqual(withoutLive(fresh));
    clock.runAll();
    expect(demo.state.stats.done).toBe(4);
  });

  it('selects a sample language and ignores unknown ids', () => {
    const { demo } = make();
    expect(demo.state.lang).toBe('rust');
    demo.dispatch({ type: 'lang', id: 'python' });
    expect(demo.state.lang).toBe('python');
    demo.dispatch({ type: 'lang', id: 'cobol' });
    expect(demo.state.lang).toBe('python');
  });
});
