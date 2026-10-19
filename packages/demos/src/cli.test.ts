// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCliDemo, type CliState } from './cli';
import { createManualClock } from './core';
import { cliLabels, cliScenario, project } from './scenarios';

const make = (extra: Parameters<typeof createCliDemo>[0] = {}) => {
  const clock = createManualClock();
  const demo = createCliDemo({ clock, ...extra });
  return { clock, demo, send: (text: string) => demo.dispatch({ type: 'submit', text }) };
};
const texts = (s: CliState, kind: string) => s.blocks.filter((b) => b.kind === kind).map((b) => b.lines.map((l) => l.t).join('\n'));
const withoutLive = (s: CliState) => ({ ...s, live: [] });

describe('first scripted session', () => {
  it('plays "Explain this repository" to the end with the scripted content', () => {
    const { demo, clock, send } = make();
    send(cliScenario.chips[0]!.prompt);
    expect(demo.state.run).toBe('running');
    clock.runAll();
    const s = demo.state;
    expect(s.run).toBe('idle');
    expect([s.agents, s.models, s.tools]).toEqual([0, 0, 0]);
    expect(s.title).toBe('Explain this repository');
    expect(s.blocks.map((b) => b.kind)).toEqual(['you', 'assistant', 'tool', 'tool', 'assistant']);
    expect(s.blocks[2]!.title).toBe('read_file README.md');
    expect(s.blocks[2]!.lines[0]!.t).toBe('  1  # harbor');
    expect(s.blocks[3]!.lines.map((l) => l.t)).toEqual(['README.md', 'src/', 'web/']);
    const last = s.blocks[4]!;
    expect(last.lines[0]).toMatchObject({ t: '# harbor', bold: true });
    expect(last.lines.map((l) => l.t).join('\n')).toContain('src/retry.rs holds the retry backoff');
    expect(s.live.at(-1)).toBe('Run finished.');
  });

  it('is deterministic: same seed, same state and same timing; another seed, other timing', () => {
    const play = (seed?: number) => {
      const { demo, clock, send } = make({ seed });
      send('Explain this repository');
      clock.runAll();
      return { state: demo.state, now: clock.now };
    };
    expect(play()).toEqual(play());
    expect(play(1).now).not.toBe(play(99).now);
    expect(play(1).state.blocks.map((b) => b.lines)).toEqual(play(99).state.blocks.map((b) => b.lines));
  });

  it('every chip finishes with its own title and no leftover run state', () => {
    for (const c of cliScenario.chips) {
      const { demo, clock, send } = make({ reducedMotion: true });
      send(c.prompt);
      clock.runAll();
      expect(demo.state.run, c.id).toBe('idle');
      expect(demo.state.title, c.id).toBe(c.prompt);
      expect(demo.state.live.at(-1), c.id).toBe('Run finished.');
    }
  });

  it('answers an unknown prompt with the scripted fallback', () => {
    const { demo, clock, send } = make();
    send('tell me a joke');
    clock.runAll();
    expect(texts(demo.state, 'notice')).toEqual([cliScenario.fallback]);
  });
});

describe('write grant', () => {
  const FIX = 'Fix the flaky retry test';
  const original = project.files.find((f) => f.path === 'src/retry.rs')!.text;

  it('blocks the patch while write is off, and says so', () => {
    const { demo, clock, send } = make();
    send(FIX);
    clock.runAll();
    const s = demo.state;
    expect(s.write).toBe(false);
    expect(s.files['src/retry.rs']).toBe(original);
    expect(s.pendingPatch).toBe('src/retry.rs');
    const patchBlocks = s.blocks.filter((b) => b.kind === 'tool' && b.title === 'patch_file src/retry.rs');
    expect(patchBlocks).toHaveLength(1);
    expect(patchBlocks[0]!.lines[0]).toEqual({ t: '✗ blocked: write access is not granted', r: 'err' });
    expect(texts(s, 'notice')).toEqual([cliScenario.blockedNotice]);
    expect(s.blocks.at(-1)!.lines[0]!.t).toBe('I could not write the change. The diff above shows what I would apply.');
    // the diff the visitor sees is the diff of the real edit
    const diff = s.blocks.find((b) => b.kind === 'assistant' && b.lines.some((l) => l.t === '```diff'))!;
    expect(diff.lines.some((l) => l.t.startsWith('-pub fn window_open(started: Instant, budget: Duration)') && l.r === 'err')).toBe(true);
    expect(diff.lines.some((l) => l.t.startsWith('+pub fn window_open(started: Instant, now: Instant') && l.r === 'ok')).toBe(true);
  });

  it('applies the blocked patch once write is granted, and clears the pending state', () => {
    const { demo, clock, send } = make();
    send(FIX);
    clock.runAll();
    const before = demo.state.blocks.length;
    demo.dispatch({ type: 'grantWrite', value: true });
    expect(demo.state.run).toBe('running');
    clock.runAll();
    const s = demo.state;
    expect(s.files['src/retry.rs']).toContain('pub fn window_open(started: Instant, now: Instant, budget: Duration) -> bool');
    expect(s.files['src/retry.rs']).not.toContain('let now = Instant::now();\n    now.duration_since');
    expect(s.pendingPatch).toBeNull();
    const added = s.blocks.slice(before);
    expect(added[0]!.lines.map((l) => l.t).join(' ')).toContain(cliScenario.afterGrant.say);
    expect(added.filter((b) => b.kind === 'tool').map((b) => b.lines[0]!.t)).toEqual([
      '✓ replaced 1 match in src/retry.rs',
      '✓ replaced 1 match in src/retry.rs',
    ]);
    expect(added.at(-1)!.lines[0]!.t).toBe('Done. window_open now takes the time as an argument, and the test passes a fixed time.');
  });

  it('applies straight away when write was granted before the prompt, with no notice', () => {
    const { demo, clock, send } = make();
    demo.dispatch({ type: 'grantWrite', value: true });
    send(FIX);
    clock.runAll();
    const s = demo.state;
    expect(s.files['src/retry.rs']).toContain('now: Instant');
    expect(texts(s, 'notice')).toEqual([]);
    expect(s.pendingPatch).toBeNull();
  });

  it('granting with nothing blocked starts no run, and turning write off is announced', () => {
    const { demo } = make();
    demo.dispatch({ type: 'grantWrite', value: true });
    expect(demo.state.run).toBe('idle');
    expect(demo.state.blocks).toEqual([]);
    demo.dispatch({ type: 'grantWrite', value: false });
    expect(demo.state.live.at(-1)).toBe('Write access off.');
  });

  it('reports a second run of the same fix as an error, not a second patch', () => {
    const { demo, clock, send } = make();
    demo.dispatch({ type: 'grantWrite', value: true });
    send(FIX);
    clock.runAll();
    send(FIX);
    clock.runAll();
    const err = demo.state.blocks.filter((b) => b.kind === 'error');
    expect(err).toHaveLength(1);
    expect(err[0]!.title).toBe('patch_file src/retry.rs');
    expect(err[0]!.lines[0]).toMatchObject({ r: 'err' });
  });
});

describe('controls', () => {
  it('stop cancels the active run, keeps the session and says so', () => {
    const { demo, clock, send } = make();
    send('Explain this repository');
    clock.advance(1000);
    expect(demo.state.run).toBe('running');
    demo.dispatch({ type: 'stop' });
    const s = demo.state;
    expect(s.run).toBe('idle');
    expect(texts(s, 'notice')).toEqual([cliLabels.runStopped]);
    expect(clock.pending).toBe(0);
    const n = s.blocks.length;
    clock.runAll();
    expect(demo.state.blocks).toHaveLength(n);
  });

  it('stop while idle explains that the real app exits', () => {
    const { demo } = make();
    demo.dispatch({ type: 'stop' });
    expect(texts(demo.state, 'notice')).toEqual([cliLabels.stopIdle]);
  });

  it('queues a message sent during a run and runs it after', () => {
    const { demo, clock, send } = make();
    send('Explain this repository');
    send('Add a --json flag');
    expect(demo.state.queue).toEqual(['Add a --json flag']);
    expect(texts(demo.state, 'notice')).toEqual(['Add a --json flag']);
    clock.runAll();
    const s = demo.state;
    expect(s.queue).toEqual([]);
    expect(s.blocks.filter((b) => b.kind === 'you').map((b) => b.lines[0]!.t)).toEqual(['Explain this repository', 'Add a --json flag']);
    expect(s.run).toBe('idle');
  });

  it('pause freezes progress and resume continues it', () => {
    const { demo, clock, send } = make();
    send('Explain this repository');
    clock.advance(800);
    demo.dispatch({ type: 'pause' });
    clock.runAll();
    const frozen = demo.state;
    expect(frozen.paused).toBe(true);
    expect(frozen.run).toBe('running');
    clock.runAll();
    expect(demo.state.blocks).toEqual(frozen.blocks);
    demo.dispatch({ type: 'resume' });
    clock.runAll();
    expect(demo.state.run).toBe('idle');
    expect(demo.state.blocks.length).toBeGreaterThan(frozen.blocks.length);
  });

  it('does not run while not visible', () => {
    const { demo, clock, send } = make({ visible: false });
    send('Explain this repository');
    clock.runAll();
    expect(demo.state.run).toBe('running');
    demo.dispatch({ type: 'visible', value: true });
    clock.runAll();
    expect(demo.state.run).toBe('idle');
  });

  it('reset returns to the first state, even in the middle of a run', () => {
    const fresh = make().demo.state;
    const { demo, clock, send } = make();
    demo.dispatch({ type: 'grantWrite', value: true });
    demo.dispatch({ type: 'plain', value: true });
    send('Fix the flaky retry test');
    clock.advance(1500);
    demo.dispatch({ type: 'reset' });
    clock.runAll();
    expect(withoutLive(demo.state)).toEqual(withoutLive(fresh));
    expect(demo.state.live.at(-1)).toBe('Demo reset.');
    // and it plays again the same as the first time
    const a = make();
    a.send('Explain this repository');
    a.clock.runAll();
    send('Explain this repository');
    clock.runAll();
    expect(demo.state.blocks.map((b) => b.lines)).toEqual(a.demo.state.blocks.map((b) => b.lines));
  });

  it('reducedMotion makes every delay zero', () => {
    const { demo, clock, send } = make({ reducedMotion: true });
    send('Explain this repository');
    clock.runAll();
    expect(clock.now).toBe(0);
    expect(demo.state.run).toBe('idle');
  });

  it('speed divides the delays', () => {
    const slow = make();
    const fast = make({ speed: 10 });
    for (const x of [slow, fast]) {
      x.send('Explain this repository');
      x.clock.runAll();
    }
    expect(fast.clock.now).toBeCloseTo(slow.clock.now / 10, 5);
  });

  it('plain mode changes the ellipsis in a long title', () => {
    const long = 'Explain this repository in a lot of detail please';
    for (const [plain, dots] of [[false, '…'], [true, '...']] as const) {
      const { demo, send } = make();
      demo.dispatch({ type: 'plain', value: plain });
      send(long);
      expect(demo.state.title).toBe(long.slice(0, 35) + dots);
    }
  });
});

describe('commands, sessions and history', () => {
  it('/help and /sessions open overlays; sessions list the open one first', () => {
    const { demo, send } = make();
    send('/help');
    expect(demo.state.overlay).toEqual({ type: 'help', sel: 0 });
    demo.dispatch({ type: 'closeOverlay' });
    send('/sessions');
    expect(demo.state.overlay).toEqual({ type: 'sessions', sel: 0 });
    expect(demo.state.sessions.map((r) => [r.id, r.current])).toEqual([['s_4f2a91', true], ['9f3e07b2', false], ['5c1d88e0', false], ['0b77a4c9', false]]);
    demo.dispatch({ type: 'overlayMove', delta: -1 });
    expect(demo.state.overlay!.sel).toBe(3);
    demo.dispatch({ type: 'overlayMove', delta: 1 });
    expect(demo.state.overlay!.sel).toBe(0);
  });

  it('opens a sample session, replacing the transcript and dropping a blocked patch', () => {
    const { demo, clock, send } = make();
    send('Fix the flaky retry test');
    clock.runAll();
    expect(demo.state.pendingPatch).not.toBeNull();
    send('/sessions');
    demo.dispatch({ type: 'overlayChoose', index: 2 });
    const s = demo.state;
    expect(s.overlay).toBeNull();
    expect(s.title).toBe('Migrate config to TOML');
    expect(s.sessionId).toBe('s_5c1d88');
    expect(s.pendingPatch).toBeNull();
    expect(s.blocks.map((b) => b.kind)).toEqual(['you', 'assistant']);
    expect(s.blocks[0]!.lines[0]!.t).toBe('Migrate config to TOML');
  });

  it('choosing a session during a run stops it without a stray notice in the new session', () => {
    const { demo, clock, send } = make();
    send('Explain this repository');
    clock.advance(1000);
    send('/sessions');
    demo.dispatch({ type: 'overlayChoose', index: 1 });
    clock.runAll();
    expect(demo.state.run).toBe('idle');
    expect(demo.state.blocks).toHaveLength(2);
  });

  it('/new starts a clean session with an optional title and a seeded id', () => {
    const { demo, clock, send } = make();
    send('Explain this repository');
    clock.runAll();
    send('/new my work');
    const s = demo.state;
    expect(s.blocks).toEqual([]);
    expect(s.title).toBe('my work');
    expect(s.sessionId).toMatch(/^s_[0-9a-f]{6}$/);
    expect(s.sessionId).not.toBe('s_4f2a91');
    const again = make();
    again.send('Explain this repository');
    again.clock.runAll();
    again.send('/new my work');
    expect(again.demo.state.sessionId).toBe(s.sessionId);
  });

  it('/new during a run stops it and does not start the queued message', () => {
    const { demo, clock, send } = make();
    send('Explain this repository');
    send('Add a --json flag');
    clock.advance(500);
    send('/new');
    clock.runAll();
    expect(demo.state.blocks).toEqual([]);
    expect(demo.state.run).toBe('idle');
  });

  it('every command the labels list is handled, and unsupported ones answer as such', () => {
    for (const cmd of cliLabels.commands) {
      const { demo, clock, send } = make();
      send(cmd);
      clock.runAll();
      expect(texts(demo.state, 'error'), cmd).toEqual([]);
    }
    for (const cmd of cliLabels.unsupportedCommands) {
      const { demo, send } = make();
      send(cmd + ' something');
      expect(texts(demo.state, 'notice'), cmd).toEqual([`${cmd} exists in ejm-cli but is not part of this demo.`]);
    }
    const { demo, send } = make();
    send('/nope');
    expect(demo.state.blocks[0]).toMatchObject({ kind: 'error', title: 'unknown command' });
    expect(demo.state.blocks[0]!.lines[0]!.t).toBe('Unknown command /nope. Use /help for the list.');
  });

  it('recalls sent messages with up and down, and sends the draft when no text is given', () => {
    const { demo, clock } = make();
    demo.dispatch({ type: 'draft', text: '/new one' });
    demo.dispatch({ type: 'submit' });
    expect(demo.state.draft).toBe('');
    demo.dispatch({ type: 'draft', text: '/new two' });
    demo.dispatch({ type: 'submit' });
    clock.runAll();
    demo.dispatch({ type: 'historyUp' });
    expect(demo.state.draft).toBe('/new two');
    demo.dispatch({ type: 'historyUp' });
    expect(demo.state.draft).toBe('/new one');
    demo.dispatch({ type: 'historyUp' });
    expect(demo.state.draft).toBe('/new one');
    demo.dispatch({ type: 'historyDown' });
    expect(demo.state.draft).toBe('/new two');
    demo.dispatch({ type: 'historyDown' });
    expect(demo.state.draft).toBe('');
  });
});

describe('store', () => {
  it('notifies subscribers once per change batch and stops after unsubscribe', () => {
    const { demo, clock, send } = make();
    let calls = 0;
    const off = demo.subscribe(() => calls++);
    send('/help');
    expect(calls).toBe(1);
    const a = demo.getState();
    expect(demo.getState()).toBe(a);
    send('Explain this repository');
    clock.runAll();
    expect(calls).toBeGreaterThan(5);
    off();
    const n = calls;
    demo.dispatch({ type: 'plain', value: true });
    expect(calls).toBe(n);
  });

  it('a subscriber may dispatch without breaking the run', () => {
    const { demo, clock, send } = make();
    let stopped = false;
    demo.subscribe(() => {
      if (!stopped && demo.state.blocks.length >= 3) {
        stopped = true;
        demo.dispatch({ type: 'stop' });
      }
    });
    send('Explain this repository');
    clock.runAll();
    expect(demo.state.run).toBe('idle');
    expect(texts(demo.state, 'notice')).toEqual([cliLabels.runStopped]);
  });
});
