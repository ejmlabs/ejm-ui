import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface Param {
  /** The name, shown in mono: a prop, option, token or command. Can hold a link or inline code. */
  name: ReactNode;
  /** A stable key for the row when `name` is not a string. */
  key?: string;
  /** The type or accepted values. Shown in mono. */
  type?: string;
  /** The default, or "required". */
  default?: string;
  description: ReactNode;
  /** Content for the extra `columns`, by column key. */
  cells?: Record<string, ReactNode>;
}

/** An extra prose column between Default and the description, for tables that are not about props (a gate, its command and what it fails on). */
export interface ParamColumn {
  key: string;
  label: string;
  /** Set in mono like the Type column. Default: prose in the body face. */
  mono?: boolean;
}

/**
 * Reference rows: name, type, default and a sentence, plus any `columns` of prose you add. Hairline rows, no zebra and no box. The wrapper is the scroll
 * container (a labelled, focusable region), so on a narrow screen the table scrolls inside itself and the page does not.
 */
export function ParamTable({
  caption,
  rows,
  labels,
  columns = [],
  className,
}: {
  caption: string;
  rows: readonly Param[];
  /** Column headings when the table is not about props: for example { name: 'Gate', type: 'Command', description: 'Fails on' }. */
  labels?: Partial<Record<'name' | 'type' | 'default' | 'description', string>>;
  /** Extra columns between Default and the description. Each row gives its content in `cells`. */
  columns?: readonly ParamColumn[];
  className?: string;
}) {
  const hasType = rows.some((r) => r.type);
  const hasDefault = rows.some((r) => r.default);
  return (
    <div role="region" aria-label={caption} tabIndex={0} className={cn('focus-ring my-8 overflow-x-auto', className)}>
      <table className={cn('w-full border-collapse text-start text-[0.9375rem] leading-snug', (hasType || hasDefault || columns.length > 0) && 'min-w-[34rem]')}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="hairline text-meta text-muted">
            <th scope="col" className="py-3 pe-6 text-start font-medium">
              {labels?.name ?? 'Name'}
            </th>
            {hasType && (
              <th scope="col" className="py-3 pe-6 text-start font-medium">
                {labels?.type ?? 'Type'}
              </th>
            )}
            {hasDefault && (
              <th scope="col" className="py-3 pe-6 text-start font-medium">
                {labels?.default ?? 'Default'}
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} scope="col" className="py-3 pe-6 text-start font-medium">
                {c.label}
              </th>
            ))}
            <th scope="col" className="py-3 text-start font-medium">
              {labels?.description ?? 'What it does'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key ?? (typeof r.name === 'string' ? r.name : i)} className="hairline align-baseline">
              <th scope="row" className="py-4 pe-6 text-start align-baseline font-mono break-words sm:whitespace-nowrap text-[0.875rem] font-medium text-fg">
                {r.name}
              </th>
              {hasType && <td className="py-4 pe-6 align-baseline font-mono text-[0.875rem] tabular-nums text-muted">{r.type}</td>}
              {hasDefault && <td className="py-4 pe-6 align-baseline font-mono text-[0.875rem] tabular-nums text-muted">{r.default}</td>}
              {columns.map((c) => (
                <td key={c.key} className={cn('py-4 pe-6 align-baseline', c.mono ? 'font-mono text-[0.875rem] text-muted' : 'min-w-[10rem] text-fg')}>
                  {r.cells?.[c.key]}
                </td>
              ))}
              <td className="sm:min-w-[14rem] py-4 align-baseline text-fg">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
