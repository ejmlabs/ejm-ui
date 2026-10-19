import { cn } from '../lib/utils';
import { dashes, hues, Marker, shapes, maxSeries } from './marks';

export interface LegendProps {
  /** One entry per series, in series order. */
  items: { label: string }[];
  kind: 'line' | 'area' | 'bar';
  /** The id the chart gave its bar patterns, so the swatches match the bars. */
  patternId?: string;
  className?: string;
}

/** A text legend. Every series is named in words, next to a swatch that shows its marker and dash, or its bar pattern. */
export function Legend({ items, kind, patternId, className }: LegendProps) {
  return (
    <ul aria-label="Legend" className={cn('m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0', className)}>
      {items.map((item, i) => {
        const n = i % maxSeries;
        return (
          <li key={item.label} className="text-meta inline-flex items-center gap-2 text-fg">
            <svg aria-hidden="true" width="34" height="14" viewBox="0 0 34 14" className="shrink-0 overflow-visible">
              {kind === 'bar' ? (
                <rect x="9" y="1" width="16" height="12" strokeWidth="1.5" fill={`url(#${patternId}-${n})`} className={hues[n]!.stroke} />
              ) : (
                <>
                  <path d="M1 7H33" fill="none" strokeWidth="2" strokeDasharray={dashes[n]} strokeLinecap="round" className={hues[n]!.stroke} />
                  <Marker shape={shapes[n]!} x={17} y={7} index={n} r={4} />
                </>
              )}
            </svg>
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
