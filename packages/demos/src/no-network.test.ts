// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createManualClock, createCliDemo, createHarnessDemo, createIdeDemo } from './index';

afterEach(() => vi.restoreAllMocks());

/**
 * The demos are simulations. They may not touch the network, and the only timers they may use
 * are the ones on the injected clock. A session is played with both globals spied on.
 */
describe('simulated only', () => {
  const spy = () => ({
    fetch: vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network used')),
    timeout: vi.spyOn(globalThis, 'setTimeout'),
    interval: vi.spyOn(globalThis, 'setInterval'),
    xhr: typeof XMLHttpRequest === 'undefined' ? null : vi.spyOn(globalThis, 'XMLHttpRequest' as never),
  });
  const quiet = (s: ReturnType<typeof spy>) => {
    expect(s.fetch).not.toHaveBeenCalled();
    expect(s.timeout).not.toHaveBeenCalled();
    expect(s.interval).not.toHaveBeenCalled();
  };

  it('cli: a full session with a grant, sessions and help', () => {
    const s = spy();
    const clock = createManualClock();
    const demo = createCliDemo({ clock });
    demo.dispatch({ type: 'submit', text: 'Fix the flaky retry test' });
    clock.runAll();
    demo.dispatch({ type: 'grantWrite', value: true });
    clock.runAll();
    demo.dispatch({ type: 'submit', text: '/sessions' });
    demo.dispatch({ type: 'overlayChoose', index: 1 });
    expect(demo.state.run).toBe('idle');
    quiet(s);
  });

  it('ide: a proposal, accept, palette', () => {
    const s = spy();
    const clock = createManualClock();
    const demo = createIdeDemo({ clock });
    demo.dispatch({ type: 'prompt', text: 'Fix the flaky retry test' });
    clock.runAll();
    const t = demo.state.chat.find((c) => c.kind === 'tool' && c.review);
    demo.dispatch({ type: 'accept', id: t!.id });
    demo.dispatch({ type: 'paletteOpen' });
    expect(demo.state.files['src/retry.rs']).toContain('now: Instant');
    quiet(s);
  });

  it('harness: queue, crash, recovery', () => {
    const s = spy();
    const clock = createManualClock();
    const demo = createHarnessDemo({ clock });
    clock.advance(1500);
    demo.dispatch({ type: 'crash' });
    clock.runAll();
    expect(demo.state.stats.done).toBe(4);
    quiet(s);
  });

  it('nothing is scheduled until a clock timer is due: a new demo has no real timers', () => {
    const s = spy();
    const clock = createManualClock();
    createHarnessDemo({ clock });
    expect(clock.pending).toBe(1);
    quiet(s);
  });
});
