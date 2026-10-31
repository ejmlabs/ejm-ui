import type { TableState } from '@ejm/core';
import type { Key, ReactNode } from 'react';
import { useDensity, type Density } from '../lib/density';
import { cn } from '../lib/utils';
import { SkeletonBar, StateBlock } from './StateBlock';

export interface TableColumn {
  key: string;
  label: string;
  /** Defaults to right for a column whose values are all numbers, left otherwise. */
  align?: 'left' | 'right';
  /** Maximum width in characters; longer cells truncate with an ellipsis and keep the full text as a tooltip. */
  width?: number;
}

export type TableRow = Record<string, ReactNode>;

export interface TableProps {
  columns: readonly TableColumn[];
  rows: readonly TableRow[];
  /** Optional visible table caption. The scrolling region keeps its own `label`. */
  caption?: ReactNode;
  /** Column key to render as a native row header. */
  rowHeader?: string;
  /** Stable row identity, from a field or callback. Without it rows keep their positional keys. */
  rowKey?: string | ((row: TableRow, index: number) => Key);
  state?: TableState | undefined;
  /** Overrides the sentence for empty, loading and error. */
  message?: string | undefined;
  /** Names the scrolling region. */
  label?: string;
  /** Empty and error only: the one action under the sentence. */
  action?: { key?: string; label: string } | undefined;
  onAction?: (() => void) | undefined;
  /** Overrides the density of the surface. Compact has `py-2` rows and 14px text. */
  density?: Density;
  /** Cut long text and number cells with an ellipsis (default). Rich cells stay intact. Pass false to let text wrap. */
  truncate?: boolean;
}

// The contract's default words (packages/core/contract.json "text.table"); table.test.tsx checks they have not drifted.
export const tableWords = { empty: 'Nothing to show yet.', loading: 'Loading the table.', error: 'Could not load the table.' } as const;

const SKELETON_ROWS = 3;
const skeletonWidths = ['4/5', '3/5', '2/3'] as const;

/**
 * A table with hairline rows (`py-4`, compact `py-2`). Numbers are right aligned in tabular figures, long cells truncate, and on a narrow screen the
 * table scrolls inside its own labelled region (reachable by keyboard) instead of widening the page.
 * Empty, loading and error keep the header and put one StateBlock under it; loading first draws skeleton rows in the same columns.
 */
export function Table({ columns, rows, caption, rowHeader, rowKey, state = 'default', message, label = 'Table', action, onAction, density, truncate = true }: TableProps) {
  const alignOf = (c: TableColumn) => c.align ?? (rows.length > 0 && rows.every(r => typeof r[c.key] === 'number') ? 'right' : 'left');
  const span = Math.max(1, columns.length);
  const surface = useDensity(density);
  const compact = surface === 'compact';
  const cell = compact ? 'py-2 pe-4' : 'py-4 pe-6';
  const keyOf = (row: TableRow, index: number): Key => {
    const key = typeof rowKey === 'function' ? rowKey(row, index) : rowKey ? row[rowKey] : undefined;
    return typeof key === 'string' || typeof key === 'number' || typeof key === 'bigint' ? key : index;
  };
  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto">
      <table aria-busy={state === 'loading' || undefined} className={cn('w-full border-collapse text-left tabular-nums [&_:focus-visible]:outline-offset-[-2px]', truncate && 'min-w-max', compact && 'text-sm')}>
        {caption !== undefined && <caption className="pb-3 text-start text-meta text-muted">{caption}</caption>}
        <thead>
          <tr className="hairline">
            {columns.map(c => (
              <th key={c.key} scope="col" className={cn(cell, 'text-meta text-muted last:pe-0', alignOf(c) === 'right' && 'text-right')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state === 'default' &&
            rows.map((r, i) => (
              <tr key={keyOf(r, i)} className="hairline">
                {columns.map(c => {
                  const content = r[c.key];
                  const primitive = typeof content === 'string' || typeof content === 'number';
                  const text = primitive ? String(content) : '';
                  const Cell = c.key === rowHeader ? 'th' : 'td';
                  return (
                    <Cell key={c.key} scope={Cell === 'th' ? 'row' : undefined} className={cn(cell, 'align-baseline last:pe-0', Cell === 'th' && 'font-normal', alignOf(c) === 'right' && 'text-right')}>
                      {truncate && primitive ? (
                        <span className="block truncate" style={{ maxWidth: `${c.width ?? 40}ch`, marginInlineStart: alignOf(c) === 'right' ? 'auto' : undefined }} title={text}>{text}</span>
                      ) : (
                        content
                      )}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          {state === 'loading' &&
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <tr key={i} aria-hidden className="hairline">
                {columns.map((c, j) => (
                  <td key={c.key} className={cn(cell, 'last:pe-0')}>
                    <SkeletonBar width={skeletonWidths[(i + j) % skeletonWidths.length]} end={alignOf(c) === 'right'} />
                  </td>
                ))}
              </tr>
            ))}
          {state !== 'default' && (
            <tr>
              <td colSpan={span}>
                <StateBlock kind={state} density={surface} message={message ?? tableWords[state]} action={state === 'loading' ? undefined : action} onAction={onAction} skeleton={false} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
