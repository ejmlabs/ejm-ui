import { contract } from '@ejm/core';
import type { HTMLAttributes } from 'react';
import type { Closed } from '../lib/closed';
import { cn } from '../lib/utils';

export interface GameClockProps extends Closed<Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'aria-label'>> {
  value: string;
  label: string;
  running?: boolean;
  low?: boolean;
}

/**
 * A clock display. The host owns time and ticking. `role="timer"` is a live region that is off, so a tick is never announced; the label
 * names the state in words. Low time also shows the warn glyph, so it does not rely on its fill color.
 */
export function GameClock({ value, label, running = false, low = false, ...props }: GameClockProps) {
  return <span role="timer" {...props} aria-label={label} className={cn(
    'shrink-0 whitespace-nowrap px-3 py-2 text-center font-mono text-heading leading-none tabular-nums',
    low ? 'bg-danger text-on-danger' : running ? 'bg-primary text-on-primary' : 'text-muted',
  )}>{low && <span aria-hidden="true" className="me-2">{contract.glyphs.status.warn.unicode}</span>}{value}</span>;
}
