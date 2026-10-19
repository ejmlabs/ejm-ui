import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThemeStore } from './theme-store';
import { matchHotkey, parseHotkey, useClipboard, useContainerQuery, useHotkeys, useInView, useMediaQuery, useReducedMotion, useTheme } from './index';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ---- matchMedia ----
function stubMatchMedia(initial: Record<string, boolean>) {
  const state = { ...initial };
  const listeners = new Map<string, Set<() => void>>();
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() { return !!state[q]; },
    media: q,
    addEventListener: (_: string, l: () => void) => { (listeners.get(q) ?? listeners.set(q, new Set()).get(q)!).add(l); },
    removeEventListener: (_: string, l: () => void) => void listeners.get(q)?.delete(l),
  }));
  window.matchMedia = globalThis.matchMedia;
  return { set: (q: string, v: boolean) => { state[q] = v; listeners.get(q)?.forEach(l => l()); }, count: (q: string) => listeners.get(q)?.size ?? 0 };
}

describe('useMediaQuery and useReducedMotion', () => {
  it('reads the query and updates when it changes', () => {
    const mm = stubMatchMedia({ '(min-width: 800px)': false });
    const { result } = renderHook(() => useMediaQuery('(min-width: 800px)'));
    expect(result.current).toBe(false);
    act(() => mm.set('(min-width: 800px)', true));
    expect(result.current).toBe(true);
  });

  it('stops listening on unmount', () => {
    const mm = stubMatchMedia({ q: false });
    const { unmount } = renderHook(() => useMediaQuery('q'));
    expect(mm.count('q')).toBe(1);
    unmount();
    expect(mm.count('q')).toBe(0);
  });

  it('reports reduced motion', () => {
    stubMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });
});

// ---- ResizeObserver ----
describe('useContainerQuery', () => {
  let trigger: (w: number) => void;
  let disconnect: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: (e: { contentRect: { width: number } }[]) => void) { trigger = w => cb([{ contentRect: { width: w } }]); }
      observe() {}
      disconnect = disconnect;
    });
  });

  function Probe() {
    const { ref, width, matches } = useContainerQuery<HTMLDivElement>({ minWidth: 400 });
    return <div ref={ref} data-testid="box">{width === null ? 'unmeasured' : width}:{String(matches)}</div>;
  }

  it('is unmeasured and not matching until the observer reports, then follows the width', () => {
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId('box').textContent).toBe('unmeasured:false');
    act(() => trigger(399.6));
    expect(screen.getByTestId('box').textContent).toBe('400:true');
    act(() => trigger(120));
    expect(screen.getByTestId('box').textContent).toBe('120:false');
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});

// ---- IntersectionObserver ----
describe('useInView', () => {
  let fire: (isIntersecting: boolean) => void;
  let disconnect: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) { fire = v => cb([{ isIntersecting: v }]); }
      observe() {}
      disconnect = disconnect;
    });
  });
  function Probe({ once }: { once?: boolean }) {
    const { ref, inView } = useInView<HTMLDivElement>({ once });
    return <div ref={ref} data-testid="box">{String(inView)}</div>;
  }

  it('tracks entering and leaving the viewport', () => {
    render(<Probe />);
    expect(screen.getByTestId('box').textContent).toBe('false');
    act(() => fire(true));
    expect(screen.getByTestId('box').textContent).toBe('true');
    act(() => fire(false));
    expect(screen.getByTestId('box').textContent).toBe('false');
  });

  it('with once, stays true and stops observing after the first sighting', () => {
    render(<Probe once />);
    act(() => fire(true));
    expect(disconnect).toHaveBeenCalled();
    expect(screen.getByTestId('box').textContent).toBe('true');
  });

  it('reports true when IntersectionObserver does not exist, so nothing waits forever', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);
    expect(screen.getByTestId('box').textContent).toBe('true');
  });
});

// ---- clipboard ----
describe('useClipboard', () => {
  it('copies, confirms in words, and returns to idle', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { result } = renderHook(() => useClipboard(1500));
    expect(result.current.label).toBe('Copy');
    await act(async () => { await result.current.copy('npm i'); });
    expect(writeText).toHaveBeenCalledWith('npm i');
    expect(result.current.state).toBe('copied');
    expect(result.current.label).toBe('Copied');
    expect(result.current.announcement).toBe('Copied to clipboard');
    act(() => void vi.advanceTimersByTime(1500));
    expect(result.current.state).toBe('idle');
    expect(result.current.announcement).toBe('');
  });

  it('says so when the browser refuses', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const { result } = renderHook(() => useClipboard());
    await act(async () => { await result.current.copy('x'); });
    expect(result.current.label).toBe('Copy failed');
  });

  it('fails cleanly where there is no clipboard API', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => useClipboard());
    await act(async () => { await result.current.copy('x'); });
    expect(result.current.state).toBe('failed');
  });

  it('clears its timer on unmount', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const { result, unmount } = renderHook(() => useClipboard());
    await act(async () => { await result.current.copy('x'); });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---- hotkeys ----
describe('hotkeys', () => {
  it('parses and matches combos, with mod meaning Command on Apple and Control elsewhere', () => {
    const k = (key: string, o: Partial<KeyboardEvent> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...o });
    expect(matchHotkey(parseHotkey('mod+k'), k('k', { metaKey: true }), true)).toBe(true);
    expect(matchHotkey(parseHotkey('mod+k'), k('k', { ctrlKey: true }), true)).toBe(false);
    expect(matchHotkey(parseHotkey('mod+k'), k('K', { ctrlKey: true }), false)).toBe(true);
    expect(matchHotkey(parseHotkey('k'), k('k', { ctrlKey: true }), false)).toBe(false);
    expect(matchHotkey(parseHotkey('?'), k('?', { shiftKey: true }), false)).toBe(true);
    expect(matchHotkey(parseHotkey('g'), k('G', { shiftKey: true }), false)).toBe(false);
    expect(matchHotkey(parseHotkey('shift+g'), k('G', { shiftKey: true }), false)).toBe(true);
  });

  function Harness({ onSlash, onSave, enabled = true }: { onSlash(): void; onSave(): void; enabled?: boolean }) {
    useHotkeys({ '/': onSlash, 'mod+s': onSave }, { enabled });
    return <input aria-label="field" />;
  }

  it('fires bindings, ignores plain keys typed in inputs, but still honours modifier combos there', async () => {
    const user = userEvent.setup();
    const onSlash = vi.fn();
    const onSave = vi.fn();
    render(<Harness onSlash={onSlash} onSave={onSave} />);
    await user.keyboard('/');
    expect(onSlash).toHaveBeenCalledTimes(1);
    await user.click(screen.getByLabelText('field'));
    await user.keyboard('/');
    expect(onSlash).toHaveBeenCalledTimes(1);
    await user.keyboard('{Control>}s{/Control}');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('removes its listener on unmount and when disabled', async () => {
    const user = userEvent.setup();
    const onSlash = vi.fn();
    const { unmount, rerender } = render(<Harness onSlash={onSlash} onSave={() => {}} enabled={false} />);
    await user.keyboard('/');
    expect(onSlash).not.toHaveBeenCalled();
    rerender(<Harness onSlash={onSlash} onSave={() => {}} />);
    unmount();
    await user.keyboard('/');
    expect(onSlash).not.toHaveBeenCalled();
  });

  it('with a scope, hears only keys pressed inside that element', async () => {
    const user = userEvent.setup();
    const fn = vi.fn();
    function Scoped() {
      const [el, setEl] = useState<HTMLDivElement | null>(null);
      useHotkeys({ j: fn }, { scope: el });
      return (<><button>outside</button><div ref={setEl}><button>inside</button></div></>);
    }
    render(<Scoped />);
    await user.click(screen.getByText('outside'));
    await user.keyboard('j');
    expect(fn).not.toHaveBeenCalled();
    await user.click(screen.getByText('inside'));
    await user.keyboard('j');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---- useTheme with a fake store ----
describe('useTheme', () => {
  it('shows the store value, toggles to the other theme and saves it', () => {
    let dark = false;
    const root: DOMStringMap = {};
    const store = createThemeStore({
      hostname: 'localhost', secure: false, search: '', getCookie: () => '', setCookie: () => {}, getStored: () => null,
      setStored: () => {}, rootData: root,
      systemDark: { get matches() { return dark; }, addEventListener: () => {}, removeEventListener: () => {} },
    });
    const { result } = renderHook(() => useTheme(store));
    expect(result.current).toMatchObject({ choice: 'system', resolved: 'light' });
    act(() => result.current.toggle());
    expect(result.current).toMatchObject({ choice: 'dark', resolved: 'dark' });
    expect(root.theme).toBe('dark');
    act(() => result.current.toggle());
    expect(result.current).toMatchObject({ choice: 'light', resolved: 'light' });
    act(() => result.current.setChoice('system'));
    dark = true;
    expect(result.current.choice).toBe('system');
  });
});
