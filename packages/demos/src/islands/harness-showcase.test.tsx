import { act, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HarnessRecording, HarnessRecordingSource } from '../harness-playback';
import { createManualClock } from '../core';
import type { HarnessFrame } from '../views/frames';
import { expectAccessible, renderIn } from '../test-helpers';
import HarnessShowcase from './harness-showcase';
import { LazyHarnessShowcase } from './harness-lazy';

// Explicit test-only snapshots, not claimed harness execution or capacity measurements.
const id = 'c'.repeat(64);
const journal = (event: string) => [{ seq: 1, tick: 0, time: '+0.00s', event, detail: 'Test-only journal', level: 'info' as const, session: null }];
const initialFrame: HarnessFrame = { limit: 3, commands: 2, stats: { running: 0, queued: 0, done: 0, commandsHeld: 0 }, sessions: [], journal: [], sample: { id: 'rust', label: 'Test fixture', caption: 'No worker was run', code: '// test-only' } };
const finalFrame: HarnessFrame = { ...initialFrame, stats: { running: 0, queued: 0, done: 1, commandsHeld: 0 }, journal: journal('test completed') };
const recording: HarnessRecording = { id, beats: [{ at: 0, update: { stats: { running: 1, queued: 0, done: 0, commandsHeld: 0 }, journal: journal('test started') } }, { at: 100, update: { stats: finalFrame.stats, journal: finalFrame.journal } }] };
const source: HarnessRecordingSource = { id, initialFrame, finalFrame, load: async () => recording };

beforeEach(() => vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible'));
afterEach(() => vi.restoreAllMocks());

describe('recorded Harness source', () => {
  it('serves the supplied read-only snapshot without loading data or simulation controls', () => {
    const load = vi.fn(source.load);
    const html = renderToString(<LazyHarnessShowcase source={{ ...source, load }} />);
    expect(html).toContain('test completed');
    expect(html).not.toMatch(/<(?:input|textarea)\b|contenteditable|Add session|Crash worker|Try the live demo|Simulated screen/);
    expect(load).not.toHaveBeenCalled();
  });

  it('replays only supplied snapshots, preserves recorded limits and rejects a stale source', async () => {
    const clock = createManualClock();
    const { container, rerender, unmount } = renderIn('dark', <HarnessShowcase source={source} options={{ clock }} />);
    await screen.findByText('test started');
    expect(screen.getByText('running 1')).toBeVisible();
    expect(container.querySelectorAll('input, textarea, [contenteditable="true"], [role="slider"]')).toHaveLength(0);
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Pause ejm-harness playback', 'Restart ejm-harness playback']);
    act(() => clock.runAll());
    expect(screen.getByText('test completed')).toBeVisible();
    expect(screen.getByText('done 1')).toBeVisible();
    expect(screen.getByText('max concurrent 3')).toBeVisible();
    expect(screen.getByText('command slots 2')).toBeVisible();
    await expectAccessible(container);
    const stale: HarnessRecordingSource = { ...source, load: async () => ({ ...recording, id: 'd'.repeat(64) }) };
    rerender(<HarnessShowcase source={stale} options={{ clock }} />);
    await screen.findByRole('status');
    expect(screen.queryByText('test started')).toBeNull();
    expect(screen.getByText('test completed')).toBeVisible();
    unmount();
    expect(clock.pending).toBe(0);
  });
});
