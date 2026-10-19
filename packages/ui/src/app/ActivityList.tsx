import { formatRelativeTime, type StatusLevel } from '@ejm/core';
import { SkeletonBar, StateBlock } from '../components/StateBlock';
import { cn } from '../lib/utils';
import { Status } from '../layout/Status';
import { appWords, type PartState } from './messages';

export interface ActivityItem {
  id: string;
  /** What happened, in one line. */
  title: string;
  /** Quiet extra detail in mono, for example the tool or the session. */
  detail?: string;
  /** When it happened, in epoch milliseconds. */
  at: number;
  status: StatusLevel;
  /** Replaces the status word (ok, warn, error, info, pending). */
  statusLabel?: string;
}

export interface ActivityListProps {
  items: ActivityItem[];
  /** The current time in epoch milliseconds. Passed in, so the server and the browser agree on "5m ago". */
  now: number;
  /** Names the list for screen readers. */
  label: string;
  state?: PartState;
  /** Replaces the sentence for empty, loading and error. */
  message?: string;
  /** Empty and error only: the one action under the sentence. */
  action?: { key?: string; label: string };
  onAction?: () => void;
  className?: string;
}

const rowClass = 'hairline grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-4';
const SKELETON_ROWS = 3;

/**
 * A feed of hairline rows: what happened, when (relative, with the exact time in a `time` element) and a status that is a glyph and a word.
 * Empty, loading and error put one sentence under the top hairline; loading first draws rows of the same shape.
 */
export function ActivityList({ items, now, label, state, message, action, onAction, className }: ActivityListProps) {
  const shown: PartState = state && state !== 'default' ? state : items.length ? 'default' : 'empty';
  return (
    <div className={cn('min-w-0', className)} data-state={shown}>
      {shown === 'default' ? (
        <ul aria-label={label} className="hairline-t m-0 list-none p-0">
          {items.map(item => (
            <li key={item.id} className={rowClass}>
              <p className="m-0 min-w-0">{item.title}</p>
              <time dateTime={new Date(item.at).toISOString()} className="text-meta tabular-nums whitespace-nowrap text-muted">
                {formatRelativeTime(item.at, now)}
              </time>
              <p className="m-0 col-span-2 flex flex-wrap items-baseline gap-x-4">
                <Status status={item.status} label={item.statusLabel} />
                {item.detail && <span className="text-meta text-muted">{item.detail}</span>}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div role="group" aria-label={label} aria-busy={shown === 'loading' || undefined} className="hairline-t">
          {shown === 'loading' &&
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <div key={i} aria-hidden className={cn(rowClass, 'py-5')}>
                <SkeletonBar className={i % 2 ? 'w-2/3' : 'w-4/5'} />
                <SkeletonBar className="w-12" />
                <SkeletonBar className="col-span-2 h-3 w-1/3" />
              </div>
            ))}
          <div className="hairline">
            <StateBlock kind={shown} message={message ?? appWords.activity[shown]} action={shown === 'loading' ? undefined : action} onAction={onAction} skeleton={false} className="py-6" />
          </div>
        </div>
      )}
    </div>
  );
}
