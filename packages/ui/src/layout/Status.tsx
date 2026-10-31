import { contract, type StatusLevel } from '@ejm/core';

const tone: Record<StatusLevel, string> = {
  ok: 'text-success',
  warn: 'text-warn',
  error: 'text-danger',
  info: 'text-info',
  pending: 'text-muted',
};

export interface StatusProps {
  status: StatusLevel;
  /** The word next to the glyph. Defaults to the contract word (ok, warn, error, info, pending). */
  label?: string;
}

/** A status as a glyph and a word together, so it reads without color. */
export function Status({ status, label }: StatusProps) {
  const g = contract.glyphs.status[status];
  return (
    <span data-status={status} className={`text-meta inline-flex items-baseline gap-2 ${tone[status]}`}>
      <span aria-hidden="true">{g.unicode}</span>
      <span>{label ?? g.label}</span>
    </span>
  );
}
