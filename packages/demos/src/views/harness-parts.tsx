import type { HarnessSession, JournalEntry } from '../harness';
import { cx } from './cx';

const oneLine = 'overflow-hidden text-ellipsis whitespace-pre';

export function Governor({ limit, commands, stats }: { limit: number; commands: number; stats: { running: number; queued: number; done: number; commandsHeld: number } }) {
  return (
    <div>
      <p className="m-0 flex flex-wrap gap-x-[2ch]">
        <span className="font-bold text-ui-text-strong">Governor</span>
        <span className="text-ui-dim">sample values</span>
      </p>
      <p className="m-0 flex flex-wrap gap-x-[2ch] text-ui-text">
        <span>max concurrent {limit}</span>
        <span>command slots {commands}</span>
      </p>
      <p className="m-0 flex flex-wrap gap-x-[2ch] text-ui-text-muted tabular-nums">
        <span>running {stats.running}</span>
        <span>queued {stats.queued}</span>
        <span>done {stats.done}</span>
        <span>commands {stats.commandsHeld}/{commands}</span>
      </p>
    </div>
  );
}

const tone: Record<HarnessSession['word'], string> = { queued: 'text-ui-dim', running: 'text-ui-success', waiting: 'text-ui-warning', recovering: 'text-ui-warning', done: 'text-ui-text-muted' };

/** One session: name, state word, what it is doing, and a thin progress line (transform only). */
export function SessionRow({ s, detail, interactive }: { s: HarnessSession; detail?: boolean; interactive?: boolean }) {
  return (
    <li className="py-[0.25em]">
      <div className="flex items-baseline gap-x-[2ch] whitespace-pre">
        <span className="shrink-0 font-bold text-ui-text-strong">{s.name}</span>
        <span className={cx('shrink-0', tone[s.word])}>{s.badge}</span>
        {detail && <span className={cx('min-w-0 flex-1 text-ui-dim', oneLine)}>{s.what}</span>}
        {!detail && <span className="flex-1" />}
        <span className="shrink-0 tabular-nums text-ui-text-muted">{s.pct}%</span>
      </div>
      <div
        {...(interactive ? { role: 'progressbar', 'aria-label': s.name + ' progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': s.pct } : { 'aria-hidden': true })}
        className="mt-[0.2em] h-[0.2em] overflow-hidden bg-ui-line"
      >
        <div className={cx('h-full origin-left bg-ui-accent', s.state === 'recovering' && 'bg-ui-warning')} style={{ transform: `scaleX(${s.pct / 100})` }} />
      </div>
    </li>
  );
}

const levelTone: Record<JournalEntry['level'], string> = { info: 'text-ui-text-muted', warn: 'text-ui-warning', error: 'text-ui-error' };

/** An append-only journal line: sequence, time since start, event, detail. Warnings and errors start with "!" so they read without color. */
export function JournalLine({ e }: { e: JournalEntry }) {
  return (
    <li className={cx('flex gap-[1.5ch] whitespace-pre', levelTone[e.level])}>
      <span className="w-[3ch] shrink-0 text-end tabular-nums text-ui-dim">{e.seq}</span>
      <span aria-hidden className="shrink-0">{e.level === 'info' ? ' ' : '!'}</span>
      <span className="shrink-0 tabular-nums text-ui-dim">{e.time}</span>
      <span className="shrink-0 font-bold">{e.event}</span>
      <span className={cx('min-w-0 flex-1', oneLine)}>{e.detail}</span>
    </li>
  );
}
