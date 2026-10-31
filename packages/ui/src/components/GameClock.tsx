import type { HTMLAttributes } from 'react';
import type { Closed } from '../lib/closed';
import { cn } from '../lib/utils';

export interface GameClockProps extends Closed<Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'aria-label'>> {
  value: string;
  label: string;
  running?: boolean;
  low?: boolean;
}

/** A clock display. The host owns time and ticking; no per-tick live region is added. */
export function GameClock({ value, label, running = false, low = false, ...props }: GameClockProps) {
  return <span {...props} aria-label={label} className={cn(
    'shrink-0 whitespace-nowrap px-3 py-2 text-center font-mono text-heading leading-none tabular-nums',
    low ? 'bg-danger text-on-danger' : running ? 'bg-primary text-on-primary' : 'text-muted',
  )}>{value}</span>;
}
