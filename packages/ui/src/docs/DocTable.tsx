import type { ReactNode } from 'react';
import { useDensity } from '../lib/density';

/** A Markdown table with all columns intact and a labelled local scroll region. Hairline rows: `py-4`, or `py-2` on a compact surface. */
export function DocTable({ caption, heads, rows }: { caption: string; heads: readonly ReactNode[]; rows: readonly (readonly ReactNode[])[] }) {
  const cell = useDensity() === 'compact' ? 'py-2 pe-6 align-baseline last:pe-0' : 'py-4 pe-6 align-baseline last:pe-0';
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="relative my-8 overflow-x-auto">
      <table className="w-full border-collapse text-start text-sm leading-snug">
        <caption className="sr-only">{caption}</caption>
        <thead><tr className="hairline text-meta text-muted">
          {heads.map((head, i) => <th key={i} scope="col" className={`${cell} text-start font-medium`}>{head}</th>)}
        </tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="hairline">
          {heads.map((_, j) => j === 0
            ? <th key={j} scope="row" className={`${cell} text-start font-medium text-fg`}>{row[j]}</th>
            : <td key={j} className={`${cell} text-fg`}>{row[j]}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  );
}
