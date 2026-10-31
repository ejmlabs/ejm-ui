import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from './Reveal';
import { Stagger } from './Stagger';
import { useDrawOn } from './useDrawOn';

type Entry = { isIntersecting: boolean; boundingClientRect: { top: number } };
let fire: (e: Partial<Entry>) => void;
let disconnect: ReturnType<typeof vi.fn>;

function setup({ reduced = false, top = 2000 }: { reduced?: boolean; top?: number } = {}) {
  disconnect = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: (e: Entry[]) => void) { fire = e => cb([{ isIntersecting: false, boundingClientRect: { top: 100 }, ...e }]); }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const box = () => screen.getByTestId('box');

describe('Reveal (data-reveal contract)', () => {
  it('renders visible: the server markup has no data-reveal, so with no scripts nothing is hidden', () => {
    expect(renderToString(<Reveal>x</Reveal>)).not.toContain('data-reveal=');
  });

  it('hides only below the fold, then plays once when it enters and stops observing', () => {
    setup({ top: 2000 });
    render(<Reveal data-testid="box">x</Reveal>);
    expect(box().dataset.reveal).toBe('pending');
    act(() => fire({ isIntersecting: false }));
    expect(box().dataset.reveal).toBe('pending');
    act(() => fire({ isIntersecting: true }));
    expect(box().dataset.reveal).toBe('in');
    expect(disconnect).toHaveBeenCalled();
  });

  it('leaves elements that are already on screen alone', () => {
    setup({ top: 120 });
    render(<Reveal data-testid="box">x</Reveal>);
    expect(box().dataset.reveal).toBeUndefined();
  });

  it('touches nothing under reduced motion', () => {
    setup({ reduced: true });
    render(<Reveal data-testid="box">x</Reveal>);
    expect(box().dataset.reveal).toBeUndefined();
  });

  it('touches nothing where IntersectionObserver does not exist', () => {
    setup();
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Reveal data-testid="box">x</Reveal>);
    expect(box().dataset.reveal).toBeUndefined();
  });

  it('shows the element if the observer never answers (watchdog)', () => {
    setup();
    render(<Reveal data-testid="box">x</Reveal>);
    act(() => void vi.advanceTimersByTime(999));
    expect(box().dataset.reveal).toBe('pending');
    act(() => void vi.advanceTimersByTime(2));
    expect(box().dataset.reveal).toBe('in');
  });

  it('keeps waiting for scroll once the observer has answered', () => {
    setup();
    render(<Reveal data-testid="box">x</Reveal>);
    act(() => fire({ isIntersecting: false })); // the observer's first, normal answer
    act(() => void vi.advanceTimersByTime(10_000));
    expect(box().dataset.reveal).toBe('pending');
  });

  it('shows an element that was scrolled past without being seen', () => {
    setup();
    render(<Reveal data-testid="box">x</Reveal>);
    act(() => fire({ isIntersecting: false, boundingClientRect: { top: -300 } }));
    expect(box().dataset.reveal).toBe('in');
  });

  it('cleans up: unmounting leaves no timer and stops the observer', () => {
    setup();
    const { unmount } = render(<Reveal data-testid="box">x</Reveal>);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });

  it('sets direction, stagger index (capped at 8) and delay', () => {
    setup({ top: 0 });
    render(<Reveal data-testid="box" from="left" index={20} delay={120}>x</Reveal>);
    expect(box().getAttribute('data-reveal-from')).toBe('left');
    expect(box().style.getPropertyValue('--ejm-i')).toBe('8');
    expect(box().style.getPropertyValue('--ejm-delay')).toBe('120ms');
  });

  it('omits the direction for the default and renders as another element', () => {
    setup({ top: 0 });
    render(<Reveal as="section" data-testid="box">x</Reveal>);
    expect(box().tagName).toBe('SECTION');
    expect(box().hasAttribute('data-reveal-from')).toBe(false);
  });

  it('renders as each element of its closed set and passes an id and ARIA attributes through', () => {
    setup({ top: 0 });
    for (const as of ['div', 'section', 'ul', 'ol', 'li'] as const) {
      const { unmount } = render(<Reveal as={as} id={`r-${as}`} aria-label={`label ${as}`}>x</Reveal>);
      const el = document.getElementById(`r-${as}`)!;
      expect(el.tagName).toBe(as.toUpperCase());
      expect(el.getAttribute('aria-label')).toBe(`label ${as}`);
      unmount();
    }
  });

  it('takes no class, style or event props, and no element outside its set', () => {
    // The types are the test: tsc fails when an expected error disappears.
    const elements = [
      // @ts-expect-error h2 is not in the closed set: render the heading yourself inside a Reveal
      <Reveal key="as" as="h2">x</Reveal>,
      // @ts-expect-error className was removed
      <Reveal key="class" className="x">x</Reveal>,
      // @ts-expect-error style was removed
      <Reveal key="style" style={{ color: 'red' }}>x</Reveal>,
      // @ts-expect-error element props such as onClick were removed
      <Reveal key="click" onClick={() => {}}>x</Reveal>,
    ];
    expect(elements).toHaveLength(4);
  });
});

describe('Stagger', () => {
  it('gives each child the enter class and its step, capped at 8', () => {
    render(
      <Stagger data-testid="box">
        {Array.from({ length: 10 }, (_, i) => <p key={i} className="mt-2">row {i}</p>)}
      </Stagger>,
    );
    const kids = [...box().children] as HTMLElement[];
    expect(kids.every(k => k.className.includes('animate-enter') && k.className.includes('mt-2'))).toBe(true);
    expect(kids.map(k => k.style.getPropertyValue('--ejm-i'))).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '8']);
  });

  it('renders as each element of its closed set and passes an id and ARIA attributes through', () => {
    for (const as of ['div', 'section', 'ul', 'ol'] as const) {
      const { unmount } = render(<Stagger as={as} id={`s-${as}`} aria-label={`label ${as}`}><li>row</li></Stagger>);
      const el = document.getElementById(`s-${as}`)!;
      expect(el.tagName).toBe(as.toUpperCase());
      expect(el.getAttribute('aria-label')).toBe(`label ${as}`);
      unmount();
    }
  });

  it('takes no class, style or element outside its set', () => {
    const elements = [
      // @ts-expect-error h2 is not in the closed set
      <Stagger key="as" as="h2">x</Stagger>,
      // @ts-expect-error className was removed
      <Stagger key="class" className="x">x</Stagger>,
      // @ts-expect-error style was removed
      <Stagger key="style" style={{ color: 'red' }}>x</Stagger>,
    ];
    expect(elements).toHaveLength(3);
  });
});

describe('useDrawOn', () => {
  it('adds draw-on only when the art is in view', () => {
    setup();
    function Art() {
      const ref = useDrawOn<SVGSVGElement>();
      return <svg ref={ref} data-testid="box" className="art" />;
    }
    render(<Art />);
    expect(box().classList.contains('draw-on')).toBe(false);
    act(() => fire({ isIntersecting: true }));
    expect(box().classList.contains('draw-on')).toBe(true);
    expect(box().classList.contains('art')).toBe(true);
  });
});
