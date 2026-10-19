import { cn } from '../lib/utils';

export interface KeyHint {
  key: string;
  label: string;
}

export interface KeyHintsProps {
  /** Most important first. Pairs that do not fit on one line are dropped from the end. */
  hints: KeyHint[];
  /** Names the list for assistive technology. */
  label?: string;
  className?: string;
}

/** A single line of key and label pairs, in plain mono text. The line is clipped to one row, so the pairs that do not fit drop from the end. */
export function KeyHints({ hints, label = 'Keyboard shortcuts', className }: KeyHintsProps) {
  return (
    <ul aria-label={label} className={cn('m-0 flex max-h-[1lh] list-none flex-wrap gap-x-5 overflow-hidden p-0 text-meta', className)}>
      {hints.map(h => (
        <li key={h.key + h.label} className="whitespace-nowrap">
          <kbd className="font-mono text-fg">{h.key}</kbd> <span className="text-muted">{h.label}</span>
        </li>
      ))}
    </ul>
  );
}
