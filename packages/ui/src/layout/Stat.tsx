import { contract, type StatState } from '@ejm/core';
import type { ReactNode } from 'react';

export interface StatProps {
  /** The figure, with its unit: "100", "4.2 ms". Large numerals in tabular figures. */
  figure?: ReactNode;
  /** The mono label under the figure. */
  label: string;
  state?: StatState | undefined;
  /** Figure scale. `stat` (default) is the display size; use `title` for dense examples or narrow compositions. */
  size?: 'stat' | 'title';
  /** Replaces the default word for loading, error or empty. */
  message?: string | undefined;
}

/** A large figure with a mono label and a hairline above. No box. Loading, error and empty replace the figure with a word. */
export function Stat({ figure, label, state = 'default', size = 'stat', message }: StatProps) {
  const words = contract.text.stat;
  const error = contract.glyphs.status.error;
  return (
    <div className="hairline-t pt-6" data-state={state} aria-busy={state === 'loading' || undefined}>
      {state === 'default' ? (
        <p className={`${size === 'title' ? 'text-title' : 'text-display'} -ms-[0.05em] tabular-nums`}>{figure}</p>
      ) : state === 'error' ? (
        <p className="text-heading text-danger" role="status" data-status="error">
          <span aria-hidden="true">{error.unicode}</span> {message ?? words.error}
        </p>
      ) : (
        <p className="text-heading text-muted" role={state === 'loading' ? 'status' : undefined}>{message ?? words[state]}</p>
      )}
      <p className="mt-3 text-meta text-muted">{label}</p>
    </div>
  );
}
