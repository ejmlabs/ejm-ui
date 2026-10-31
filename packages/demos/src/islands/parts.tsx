import { ProductWindow } from '@ejm/ui/layout/ProductWindow';
import { useContext, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { InShowcaseFrame } from '../ShowcaseFrame';
import { cx } from '../views/cx';
import { Btn } from './btn';
import { useLiveLines } from './liveLog';

export { Btn };

/** A native checkbox with the switch role: keyboard and screen readers get it for free. The label states what it stands in for. */
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="touch-target inline-flex cursor-pointer items-center gap-[0.8em]" title={hint}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="relative inline-block h-[1.5em] w-[2.7em] shrink-0 rounded-pill border border-ui-control-border bg-ui-ground transition-colors duration-fast peer-checked:border-ui-primary peer-checked:bg-ui-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ui-focus peer-focus-visible:outline">
        <span className={cx('absolute start-[0.2em] top-[0.2em] block size-[1.1em] rounded-pill bg-ui-control-border transition-transform duration-fast ease-standard', checked && 'translate-x-[1.2em] bg-ui-on-primary')} />
      </span>
      <span>{label}<span className="sr-only">{checked ? ', on' : ', off'}</span></span>
    </label>
  );
}

/** Running indicator. A spinning ring with motion, and the same ring held still under reduced motion. Plain mode shows an asterisk. */
export function Spinner({ plain }: { plain?: boolean }) {
  if (plain) return <span aria-hidden>*</span>;
  return <span aria-hidden className="inline-block size-[0.8em] rounded-full border-2 border-current border-t-transparent align-[-0.05em] motion-safe:animate-spin motion-reduce:border-t-current" />;
}

export interface ShellProps {
  /** ejm-cli, ejm-ide or ejm-harness. */
  name: string;
  meta: string;
  /** The scenario's label, for example "ejm-cli demo". */
  label: string;
  /** What to try. */
  caption: string;
  /** The honesty sentence. Always visible: below the island, or as the note of the ShowcaseFrame around it. */
  note: string;
  /** Pins the window theme, for the demo's own Toggle theme command. */
  theme?: 'light' | 'dark';
  paused: boolean;
  onPause: () => void;
  onReset: () => void;
  live: string[];
  /** Escape lands here when nothing inside handled it, so the next Shift+Tab leaves the demo. */
  host: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * The frame every island shares: a live window with a visible "Simulated" badge, Pause and Reset, the caption and the honesty
 * note beneath it (inside a ShowcaseFrame the frame's note is the one disclosure, so the island leaves its own out), a skip link
 * before it, and a polite log that announces one sentence per finished step.
 */
export function Shell({ name, meta, label, caption, note, theme, paused, onPause, onReset, live, host, children }: ShellProps) {
  const end = useId();
  const win = useRef<HTMLDivElement>(null);
  const lines = useLiveLines(live);
  const framed = useContext(InShowcaseFrame);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !e.defaultPrevented) win.current?.focus();
  };
  return (
    <div ref={host} className="@container relative">
      <a href={'#' + end} className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-20 focus:rounded-pill focus:bg-fg focus:px-5 focus:py-2 focus:font-semibold focus:text-ground">Skip past this demo</a>
      <div ref={win} data-theme={theme} tabIndex={-1} onKeyDown={onKeyDown} className="rounded-window focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
        <ProductWindow live label={`${label}, simulated`} title={name} meta={meta} elevation="raised">
          <div className="flex h-full min-h-0 flex-col gap-[0.8em]">
            <div className="flex shrink-0 flex-wrap items-center gap-x-[1.2em] gap-y-[0.4em]">
              <span className="rounded-control bg-ui-primary px-[0.7em] py-[0.15em] text-ui-on-primary">Simulated</span>
              <span className="ms-auto flex gap-[0.6em]">
                <Btn onClick={onPause} aria-pressed={paused}>{paused ? 'Resume' : 'Pause'}</Btn>
                <Btn onClick={onReset}>Reset</Btn>
              </span>
            </div>
            {children}
          </div>
        </ProductWindow>
      </div>
      <p className="text-meta mt-4 mb-0 max-w-measure">{caption}</p>
      {!framed && <p className="text-meta mt-1 mb-0 max-w-measure text-muted">{note}</p>}
      <div role="log" aria-live="polite" aria-label={`${name} demo announcements`} className="sr-only">
        {lines.map((l) => (
          <p key={l.id}>{l.text}</p>
        ))}
      </div>
      <span id={end} tabIndex={-1} className="block h-0" />
    </div>
  );
}
