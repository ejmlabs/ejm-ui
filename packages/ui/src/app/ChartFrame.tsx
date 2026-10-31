import { formatNumber } from '@ejm/core';
import { ChevronRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { StateBlock } from '../components/StateBlock';
import { Table } from '../components/Table';
import { useDensity } from '../lib/density';
import { cn } from '../lib/utils';
import { partHeading } from './classes';
import { Legend } from './Legend';
import { maxSeries } from './marks';
import { appWords, type PartState } from './messages';
import { useBox } from './useBox';

export interface ChartSeries {
  /** The name in the legend and in the table header. */
  label: string;
  /** A shorter name for the direct label at the end of a line, when the full name is long. */
  short?: string;
  /** One value per category, zero or more. */
  values: number[];
}

export interface ChartProps {
  /** The chart's heading. It also names the figure and the table. */
  title: string;
  /** One line of context under the heading, for example the period or the unit. */
  description?: string;
  /** The x axis: one label per point or bar group. */
  categories: string[];
  /** One to six series. The first is hue 1, and so on. More than six are not drawn (the hue roles run out). */
  series: ChartSeries[];
  /** The first table header, for example "Day". */
  categoryLabel?: string;
  /** The unit, said once in the figure's name for screen readers, for example "calls". */
  unit?: string;
  /** Formats a value for the table and the figure's labels. Defaults to a number with thousands separators. */
  format?: (n: number) => string;
  /** Heading level. Keep levels in order on the page. */
  as?: 'h2' | 'h3' | 'h4';
  state?: PartState | undefined;
  /** Replaces the sentence for empty, loading and error. */
  message?: string | undefined;
  /** Empty and error only: the one action under the sentence. */
  action?: { key?: string; label: string } | undefined;
  onAction?: (() => void) | undefined;
}

export type ChartKind = 'line' | 'area' | 'bar';

// Literal classes so Tailwind finds them. The plot is a fixed height per container width, so a skeleton, an error and the chart take the same space.
const plotH = 'h-52 @xl:h-60 @3xl:h-72 @6xl:h-80';
const plotMinH = 'min-h-52 @xl:min-h-60 @3xl:min-h-72 @6xl:min-h-80';

export interface DrawArgs {
  width: number;
  height: number;
  /** An id prefix that is safe in url(#...), for bar fill patterns. */
  patternId: string;
  /** Series that are drawn (at most six). */
  series: ChartSeries[];
  format: (n: number) => string;
}

interface FrameProps extends ChartProps {
  kind: ChartKind;
  draw: (a: DrawArgs) => ReactNode;
}

function Skeleton({ kind }: { kind: ChartKind }) {
  const heights = [38, 62, 48, 80, 56, 72, 44, 66];
  return (
    <div aria-hidden className={cn('relative hairline', plotH)}>
      {kind === 'bar' ? (
        <div className="absolute inset-0 flex items-end gap-[7%] px-[2%]">
          {heights.map((h, i) => (
            <span key={i} className="block flex-1 bg-line motion-safe:animate-pulse" style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 size-full motion-safe:animate-pulse">
          <polyline points="0,30 14,24 28,27 42,16 57,20 71,10 86,14 100,6" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className="stroke-line" />
        </svg>
      )}
    </div>
  );
}

/**
 * The shared body of the line, area and bar charts: a heading, the drawing, a text legend and a "View as table" disclosure with every value.
 * The legend and the table are real elements in the server HTML. Empty, loading and error keep the heading and the plot's height.
 */
export function ChartFrame({ kind, draw, title, description, categories, series, categoryLabel = 'Period', unit, format = n => formatNumber(n), as: H = 'h3', state, message, action, onAction }: FrameProps) {
  const uid = useId().replace(/:/g, '');
  const headId = `${uid}-h`;
  const compact = useDensity() === 'compact';
  const box = useBox<HTMLDivElement>({ width: 640, height: 256 });
  const drawn = series.slice(0, maxSeries);
  const hasData = categories.length > 0 && drawn.some(s => s.values.some(Number.isFinite));
  const shown: PartState = state && state !== 'default' ? state : hasData ? 'default' : 'empty';

  const columns = [{ key: 'c', label: categoryLabel, width: 24 }, ...drawn.map((s, i) => ({ key: `s${i}`, label: s.label, align: 'right' as const, width: 16 }))];
  const rows = categories.map((c, r) => Object.fromEntries([['c', c], ...drawn.map((s, i) => [`s${i}`, Number.isFinite(s.values[r]) ? format(s.values[r]!) : '-'])]));
  const name = `${title}. ${kind === 'bar' ? 'Bar' : kind === 'area' ? 'Area' : 'Line'} chart of ${drawn.map(s => s.label).join(', ')}${unit ? `, in ${unit}` : ''}, from ${categories[0]} to ${categories[categories.length - 1]}. The values are in the table below the chart.`;

  return (
    <div role="group" aria-labelledby={headId} data-state={shown} className="@container min-w-0">
      <H id={headId} className={partHeading}>{title}</H>
      {description && <p className="text-meta mt-1 mb-0 text-muted">{description}</p>}
      <div className="mt-5">
        {shown === 'default' ? (
          <figure className="m-0 grid grid-cols-1 gap-y-4">
            <div ref={box.ref} className={cn('w-full', plotH)}>
              <svg role="img" aria-label={name} viewBox={`0 0 ${box.width} ${box.height}`} width="100%" height="100%" className="block">
                {draw({ width: box.width, height: box.height, patternId: `${uid}-p`, series: drawn, format })}
              </svg>
            </div>
            <Legend items={drawn} kind={kind} patternId={`${uid}-p`} />
            <details className="group">
              <summary className={cn('link touch-target inline-flex cursor-pointer list-none items-center gap-2 rounded-control [&::-webkit-details-marker]:hidden', compact ? 'min-h-8 compact-target text-sm' : 'min-h-11 text-base')}>
                <ChevronRight aria-hidden strokeWidth={1.5} className="size-4 transition-transform duration-fast ease-standard group-open:rotate-90" />
                View as table
              </summary>
              <div className="mt-2">
                <Table columns={columns} rows={rows} label={`${title}, values`} />
              </div>
            </details>
          </figure>
        ) : shown === 'loading' ? (
          <>
            <Skeleton kind={kind} />
            <StateBlock kind="loading" message={message ?? appWords.chart.loading} skeleton={false} />
          </>
        ) : (
          <div className={cn('flex items-center hairline-t hairline', plotMinH)}>
            <StateBlock kind={shown} message={message ?? appWords.chart[shown]} action={action} onAction={onAction} />
          </div>
        )}
      </div>
    </div>
  );
}
