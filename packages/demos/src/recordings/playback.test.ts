// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createManualClock } from '../core';
import { createRecordedPlayback, validateRecording, type Recording, type RecordingSource } from './playback';

// Test-only counters protect the playback contract; they are not product output.
const id = 'a'.repeat(64);
const source: Pick<RecordingSource<number, number>, 'id' | 'initialFrame' | 'finalFrame'> = { id, initialFrame: 0, finalFrame: 3 };
const recording: Recording<number> = { id, beats: [{ at: 0, update: 1 }, { at: 100, update: 2 }, { at: 200, update: 3 }] };
const make = () => {
  const clock = createManualClock();
  const player = createRecordedPlayback(source, recording, (_frame, update) => update, { clock });
  return { player, clock };
};

describe('finite recorded playback', () => {
  it('keeps a useful static result, then plays the finite record and supports pause and restart', () => {
    const { player, clock } = make();
    expect(player.state.frame).toBe(3);
    expect(clock.pending).toBe(0);
    player.dispatch({ type: 'start' });
    expect(player.state.frame).toBe(1);
    player.dispatch({ type: 'pause' });
    clock.advance(1_000);
    expect(player.state.frame).toBe(1);
    player.dispatch({ type: 'resume' });
    clock.runAll();
    expect(player.state).toMatchObject({ frame: 3, playback: 'completed', paused: false });
    player.dispatch({ type: 'reset' });
    player.dispatch({ type: 'start' });
    expect(player.state).toMatchObject({ frame: 1, playback: 'running' });
    expect(clock.pending).toBe(1);
    clock.runAll();
    expect(player.state.frame).toBe(3);
    expect(clock.pending).toBe(0);
  });

  it('requires both page and viewport visibility, and disposes every pending update', () => {
    const { player, clock } = make();
    player.dispatch({ type: 'start' });
    player.dispatch({ type: 'page-visible', value: false });
    player.dispatch({ type: 'visible', value: false });
    clock.advance(1_000);
    player.dispatch({ type: 'visible', value: true });
    expect(player.state.frame).toBe(1);
    player.dispatch({ type: 'page-visible', value: true });
    expect(player.state.frame).toBe(2);
    player.destroy();
    expect(clock.pending).toBe(0);
    clock.runAll();
    expect(player.state.frame).toBe(2);
    player.dispatch({ type: 'start' });
    expect(clock.pending).toBe(0);
    // The existing island lifecycle explicitly resets its retained instance after Strict Mode cleanup.
    player.dispatch({ type: 'reset' });
    player.dispatch({ type: 'start' });
    clock.runAll();
    expect(player.state).toMatchObject({ frame: 3, playback: 'completed' });
  });

  it('rejects a different source or unbounded/nonmonotonic data before scheduling work', () => {
    expect(() => validateRecording(id, { ...recording, id: 'b'.repeat(64) })).toThrow();
    for (const beats of [[], [{ at: -1, update: 1 }], [{ at: NaN, update: 1 }], [{ at: 120_001, update: 1 }], [{ at: 20, update: 1 }, { at: 10, update: 2 }], Array.from({ length: 257 }, () => ({ at: 0, update: 1 }))]) {
      const clock = createManualClock();
      expect(() => createRecordedPlayback(source, { id, beats }, (_frame, update) => update, { clock })).toThrow();
      expect(clock.pending).toBe(0);
    }
    const clock = createManualClock();
    const player = createRecordedPlayback(source, recording, (_frame, update) => update, { clock, reducedMotion: true });
    player.dispatch({ type: 'start' });
    expect(player.state).toMatchObject({ frame: 3, playback: 'completed' });
    expect(clock.pending).toBe(0);
  });
});
