import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { REDUCED_MOTION_QUERY } from '@ejm/ui/hooks/useReducedMotion';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CliRecording, CliRecordingSource } from '../cli-playback';
import { createManualClock } from '../core';
import type { CliFrame } from '../views/frames';
import { expectAccessible, renderIn } from '../test-helpers';
import CliShowcase from './cli-showcase';
import { LazyCliShowcase } from './cli-lazy';

// These are deliberately small test-only frames, not claimed native or model output.
const id = 'a'.repeat(64);
const frame: CliFrame = { provider: 'test fixture', cwd: 'fixture', title: 'Test-only recording', sessionId: 'test', write: false, shell: true, agents: 0, models: 0, tools: 0, hints: [], blocks: [] };
const block = (text: string) => ({ id: 1, kind: 'notice' as const, title: 'Test fixture', lines: [{ t: text, r: null }] });
const recording: CliRecording = { id, beats: [{ at: 0, update: { blocks: [block('first test frame')] } }, { at: 100, update: { blocks: [block('final test frame')] } }] };
const source: CliRecordingSource = { id, initialFrame: frame, finalFrame: { ...frame, blocks: [block('final test frame')] }, load: async () => recording };

beforeEach(() => vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible'));
afterEach(() => vi.restoreAllMocks());

describe('recorded CLI source', () => {
  it('serves a noneditable final frame without loading the record or the interactive simulation', () => {
    const load = vi.fn(source.load);
    const html = renderToString(<LazyCliShowcase source={{ ...source, load }} />);
    expect(html).toContain('final test frame');
    expect(html).toContain('data-showcase="ejm-cli"');
    expect(html).not.toMatch(/<(?:input|textarea)\b|contenteditable|Try the live demo|Simulated screen/);
    expect(load).not.toHaveBeenCalled();
  });

  it('plays only the supplied finite data, exposes two playback controls and stops on unmount', async () => {
    const clock = createManualClock();
    const fetch = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    const { container, unmount } = renderIn('light', <StrictMode><CliShowcase source={source} options={{ clock }} /></StrictMode>);
    await screen.findByText('first test frame');
    expect(container.querySelectorAll('input, textarea, [contenteditable="true"]')).toHaveLength(0);
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Pause ejm-cli playback', 'Restart ejm-cli playback']);
    expect(screen.getByText('grants: read + shell')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Pause ejm-cli playback' }));
    act(() => clock.advance(500));
    expect(screen.getByText('first test frame')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Resume ejm-cli playback' }));
    act(() => clock.runAll());
    expect(screen.getByText('final test frame')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Restart ejm-cli playback' }));
    expect(screen.getByText('first test frame')).toBeVisible();
    await expectAccessible(container);
    unmount();
    expect(clock.pending).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('hydrates reduced motion without loading data and disposes playback when the preference changes', async () => {
    let reduced = true;
    const listeners = new Set<() => void>();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      get matches() { return query === REDUCED_MOTION_QUERY && reduced; },
      media: query, onchange: null,
      addEventListener: (_event: string, listener: EventListenerOrEventListenerObject | ((event: MediaQueryListEvent) => void)) => { if (query === REDUCED_MOTION_QUERY) listeners.add(listener as () => void); },
      removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject | ((event: MediaQueryListEvent) => void)) => { if (query === REDUCED_MOTION_QUERY) listeners.delete(listener as () => void); },
      addListener() {}, removeListener() {}, dispatchEvent: () => false,
    }));
    const clock = createManualClock();
    const load = vi.fn(source.load);
    const stable = { ...source, load };
    const tree = <CliShowcase source={stable} options={{ clock }} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    let root: Root | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, tree); });
      expect(container.textContent).toContain('final test frame');
      expect(load).not.toHaveBeenCalled();
      expect(clock.pending).toBe(0);
      await act(async () => { reduced = false; listeners.forEach((listener) => listener()); });
      await screen.findByText('first test frame');
      expect(load).toHaveBeenCalledTimes(1);
      expect(clock.pending).toBe(1);
      act(() => { reduced = true; listeners.forEach((listener) => listener()); });
      expect(container.textContent).toContain('final test frame');
      expect(container.textContent).not.toContain('first test frame');
      expect(clock.pending).toBe(0);
      await act(async () => { reduced = false; listeners.forEach((listener) => listener()); });
      await screen.findByText('first test frame');
      act(() => clock.runAll());
      expect(container.textContent).toContain('final test frame');
      expect(load).toHaveBeenCalledTimes(1);
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
    expect(clock.pending).toBe(0);
    expect(listeners.size).toBe(0);
  });

  it('keeps static output when the loaded identity is stale or its loader fails', async () => {
    const stale: CliRecordingSource = { ...source, load: async () => ({ ...recording, id: 'b'.repeat(64) }) };
    const { rerender } = render(<CliShowcase source={stale} />);
    await screen.findByRole('status');
    expect(screen.getByText('final test frame')).toBeVisible();
    expect(screen.queryByText('first test frame')).toBeNull();
    const failing: CliRecordingSource = { ...source, load: () => { throw new Error('test-only private loader detail'); } };
    rerender(<CliShowcase source={failing} />);
    await waitFor(() => expect(screen.getByRole('status')).toBeVisible());
    expect(screen.queryByText(/private loader detail/)).toBeNull();
  });
});
