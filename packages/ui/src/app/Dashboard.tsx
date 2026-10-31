import type { StatState, StatusLevel, TableState } from '@ejm/core';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useId } from 'react';
import { StateBlock } from '../components/StateBlock';
import { Table, type TableColumn } from '../components/Table';
import { Stat } from '../layout/Stat';
import { cn } from '../lib/utils';
import { ActivityList, type ActivityListProps } from './ActivityList';
import { partHeading } from './classes';
import { ChartBar } from './ChartBar';
import { ChartArea, ChartLine } from './ChartLine';
import type { ChartKind, ChartProps } from './ChartFrame';
import { appWords, type PartState } from './messages';

export interface DashboardStat {
  label: string;
  /** The figure with its unit, already formatted: "12,480", "1.8s". */
  figure: string;
  /** A change over the period. It is words and a glyph, with a sign in the text, so it reads without color. `status` colors it with the Status vocabulary: ok for a change that helps, error or warn for one that hurts. Leave it out for a neutral change. */
  delta?: { text: string; direction: 'up' | 'down' | 'flat'; status?: StatusLevel };
  state?: StatState;
  message?: string;
}

export interface DashboardProps {
  title: string;
  /** The period the figures cover, in mono under the title. */
  period?: string;
  /** Marks every figure as invented. Pass true for any demo or documentation; a real product leaves it off. */
  sample?: boolean;
  /** The whole dashboard: loading dims and holds the sections, error and empty replace them with one sentence and one action. */
  state?: PartState;
  message?: string;
  action?: { key?: string; label: string };
  onAction?: () => void;
  stats: DashboardStat[];
  chart: ChartProps & { kind?: ChartKind };
  table: {
    title: string;
    columns: TableColumn[];
    rows: Record<string, string | number>[];
    state?: TableState;
    message?: string;
    action?: { key?: string; label: string };
    onAction?: () => void;
  };
  activity: Omit<ActivityListProps, 'label'> & { title: string };
  /** Heading level of the title. The sections use the next level. */
  as?: 'h2' | 'h3';
}

const deltaTone: Record<StatusLevel, string> = { ok: 'text-success', warn: 'text-warn', error: 'text-danger', info: 'text-info', pending: 'text-muted' };
const deltaIcon = { up: ArrowUp, down: ArrowDown, flat: Minus } as const;
const deltaWord = { up: 'Up', down: 'Down', flat: 'No change' } as const;

function Delta({ delta }: { delta: NonNullable<DashboardStat['delta']> }) {
  const Icon = deltaIcon[delta.direction];
  return (
    <p className={cn('text-meta m-0 mt-2 flex items-center gap-1.5', delta.status ? deltaTone[delta.status] : 'text-muted')}>
      <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
      <span className="sr-only">{deltaWord[delta.direction]}</span>
      <span>{delta.text}</span>
    </p>
  );
}

const Chart = { line: ChartLine, area: ChartArea, bar: ChartBar } as const;

/**
 * An application overview with no boxes: a row of stat figures, a chart, a hairline table and an activity feed.
 * It reflows by its own width (container queries): one column on a phone, two columns with a full-width chart from 48rem,
 * and from 80rem one editorial row with the chart, the table and the activity side by side under the figures.
 */
export function Dashboard({ title, period, sample, state = 'default', message, action, onAction, stats, chart, table, activity, as: H = 'h2' }: DashboardProps) {
  const uid = useId();
  const loading = state === 'loading';
  const Sub = H === 'h2' ? 'h3' : 'h4';
  // While the whole dashboard loads, every part loads; otherwise a part keeps its own state.
  const part = <S,>(own: S | undefined): S | 'loading' | undefined => (loading ? 'loading' : own);
  const { kind = 'line', ...chartProps } = chart;
  const Plot = Chart[kind];
  const tableId = `${uid}-table`;
  const activityId = `${uid}-activity`;

  return (
    <section aria-labelledby={`${uid}-title`} data-state={state} className="@container min-w-0">
      <header>
        {sample && <p className="text-meta m-0 text-muted">Sample data. Every figure on this page is invented for the demo.</p>}
        <H id={`${uid}-title`} className={cn('text-heading m-0', sample && 'mt-3')}>{title}</H>
        {period && <p className="text-meta mt-3 mb-0 text-muted">{period}</p>}
      </header>

      {state === 'error' || state === 'empty' ? (
        <div className="mt-10 hairline-t hairline">
          <StateBlock kind={state} message={message ?? appWords.dashboard[state]} action={action} onAction={onAction} />
        </div>
      ) : (
        <>
          {loading && <p role="status" className="text-meta mt-6 mb-0 text-muted">{message ?? appWords.dashboard.loading}</p>}
          {/* While loading, the placeholders are inert: the one status above speaks for all of them. */}
          <div inert={loading || undefined} className="mt-10">
            <div role="group" aria-label="Key figures" className="grid grid-cols-2 gap-x-6 gap-y-8 @2xl:grid-cols-4 @2xl:gap-x-8">
              {stats.map(s => (
                <div key={s.label} className="min-w-0">
                  <Stat size="title" figure={s.figure} label={s.label} state={part(s.state)} message={s.message} />
                  {s.delta && !loading && (s.state ?? 'default') === 'default' && <Delta delta={s.delta} />}
                </div>
              ))}
            </div>

            <div className="mt-14 grid gap-x-12 gap-y-14 @3xl:grid-cols-12">
              <div className="min-w-0 @3xl:col-span-12 @7xl:col-span-5">
                <Plot {...chartProps} as={Sub} state={part(chartProps.state)} />
              </div>
              <div role="group" aria-labelledby={tableId} className="min-w-0 @3xl:col-span-7 @7xl:col-span-4">
                <Sub id={tableId} className={partHeading}>{table.title}</Sub>
                <div className="mt-5">
                  <Table columns={table.columns} rows={table.rows} label={table.title} state={part(table.state)} message={table.message} action={table.action} onAction={table.onAction} />
                </div>
              </div>
              <div role="group" aria-labelledby={activityId} className="min-w-0 @3xl:col-span-5 @7xl:col-span-3">
                <Sub id={activityId} className={partHeading}>{activity.title}</Sub>
                <div className="mt-5">
                  <ActivityList {...activity} label={activity.title} state={part(activity.state)} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
