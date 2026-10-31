import { render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { expectAccessible, renderIn, themes } from '../components/test-setup';
import { DensityProvider } from '../lib/density';
import { ActivityList, ChartArea, ChartBar, ChartLine, Dashboard, Legend, appWords, type ActivityItem, type ChartProps, type DashboardProps } from './index';
import { compact, niceScale, spread } from './scale';

const NOW = Date.UTC(2026, 9, 18, 14, 0, 0);
const categories = ['Mon', 'Tue', 'Wed', 'Thu'];
const series = [
  { label: 'Started', values: [1204, 1380, 990, 1512] },
  { label: 'Finished', values: [1100, 1290, 940, 1488] },
  { label: 'Errored', values: [12, 31, 7, 20] },
];
const chart: ChartProps = { title: 'Sessions per day', categories, series, categoryLabel: 'Day' };
const items: ActivityItem[] = [
  { id: '1', title: 'Session finished', detail: 'sess_1', at: NOW - 3 * 60_000, status: 'ok' },
  { id: '2', title: 'Tool timed out', at: NOW - 3 * 3600_000, status: 'error' },
];
const dash: DashboardProps = {
  title: 'Agent activity',
  sample: true,
  stats: [{ label: 'sessions', figure: '1,284', delta: { text: '+8.2% vs last week', direction: 'up', status: 'ok' } }, { label: 'tool calls', figure: '18,406' }],
  chart,
  table: { title: 'Busiest tools', columns: [{ key: 'tool', label: 'Tool' }, { key: 'calls', label: 'Calls', align: 'right' }], rows: [{ tool: 'read_file', calls: '6,120' }] },
  activity: { title: 'Recent activity', items, now: NOW },
};

describe('charts, server rendered', () => {
  // The legend and the table are real elements in the HTML a browser gets before any script runs.
  it.each([['line', ChartLine], ['bar', ChartBar], ['area', ChartArea]] as const)('%s: every series name and every value is in the document text', (_, Chart) => {
    const html = renderToString(<Chart {...chart} />);
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
    for (const s of series) {
      expect(text).toContain(s.label);
      for (const v of s.values) expect(text).toContain(v.toLocaleString('en-US'));
    }
    for (const c of categories) expect(text).toContain(c);
    expect(text).toContain('View as table');
    expect(html).toContain('aria-label="Legend"');
  });

  it('uses a custom value format in the table', () => {
    const html = renderToString(<ChartArea {...chart} format={n => `${n / 1000}k`} />);
    expect(html).toContain('1.204k');
  });

  it('tells the series apart without color: distinct dashes on lines, distinct fill patterns on bars', () => {
    const { container, unmount } = render(<ChartLine {...chart} />);
    const dashes = [...container.querySelectorAll('svg[role="img"] path[stroke-dasharray]')].map(p => p.getAttribute('stroke-dasharray'));
    expect(new Set(dashes).size).toBe(2); // the first series is solid; the other two are dashed differently
    // Each line also has its own marker shape.
    expect(container.querySelectorAll('svg[role="img"] circle').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('svg[role="img"] rect').length).toBeGreaterThan(0);
    unmount();
    const bar = render(<ChartBar {...chart} />);
    const fills = new Set([...bar.container.querySelectorAll('svg[role="img"] rect[fill^="url"]')].map(r => r.getAttribute('fill')?.replace(/^url\(#.*-p-/, '')));
    expect(fills.size).toBe(3);
  });

  it('names the figure for screen readers and points to the table', () => {
    render(<ChartLine {...chart} unit="sessions" />);
    expect(screen.getByRole('img', { name: /Sessions per day.*Line chart of Started, Finished, Errored, in sessions, from Mon to Thu.*table/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sessions per day, values' })).toBeInTheDocument();
  });
});

describe('chart math', () => {
  it('niceScale rounds up to 1, 2, 5 or 10 steps and never returns an empty axis', () => {
    expect(niceScale(190)).toEqual({ max: 200, ticks: [0, 50, 100, 150, 200] });
    expect(niceScale(3912).max).toBe(4000);
    expect(niceScale(0).ticks).toEqual([0, 1]);
    expect(niceScale(Number.NaN).max).toBe(1);
  });
  it('compact keeps axis labels short', () => {
    expect([compact(950), compact(1500), compact(12_400), compact(41_200_000)]).toEqual(['950', '1.5k', '12k', '41.2M']);
  });
  it('spread keeps end labels apart and inside the plot', () => {
    const out = spread([100, 102, 104, 300], 16, 0, 320);
    const sorted = [...out].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(16);
    expect(Math.max(...out)).toBeLessThanOrEqual(320);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    expect(spread([300, 310, 318], 16, 0, 320).every(y => y <= 320)).toBe(true);
  });
});

describe('ActivityList', () => {
  it('shows relative times with the exact time kept, and a status glyph with its word', () => {
    render(<ActivityList items={items} now={NOW} label="Activity" />);
    const list = screen.getByRole('list', { name: 'Activity' });
    expect(within(list).getByText('3m ago')).toHaveAttribute('datetime', new Date(NOW - 180_000).toISOString());
    expect(within(list).getByText('3h ago')).toBeInTheDocument();
    expect(list).toHaveTextContent('ok');
    expect(list).toHaveTextContent('error');
  });
});

describe('empty, loading and error states', () => {
  it('an empty list is a sentence and one action, never a blank area', async () => {
    const onAction = vi.fn();
    render(<ActivityList items={[]} now={NOW} label="Activity" action={{ label: 'Start a session' }} onAction={onAction} />);
    const group = screen.getByRole('group', { name: 'Activity' });
    expect(group).toHaveTextContent(appWords.activity.empty);
    expect(within(group).getAllByRole('button')).toHaveLength(1);
    await userEvent.setup().click(within(group).getByRole('button', { name: /Start a session/ }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('loading is a polite status with skeleton rows; error is an alert with its one action', () => {
    const { rerender } = render(<ActivityList items={[]} now={NOW} label="Activity" state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent(appWords.activity.loading);
    expect(screen.getByRole('group', { name: 'Activity' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ActivityList items={[]} now={NOW} label="Activity" state="error" action={{ label: 'Try again' }} />);
    expect(within(screen.getByRole('alert')).getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });

  it('a chart with no data says so instead of drawing an empty plot', () => {
    render(<ChartBar title="Calls" categories={[]} series={[]} action={{ label: 'Widen the period' }} />);
    expect(screen.getByText(appWords.chart.empty)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('chart loading and error use the same words and roles as the other parts', () => {
    const { rerender } = render(<ChartLine {...chart} state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent(appWords.chart.loading);
    expect(screen.queryByRole('img', { name: /Line chart/ })).toBeNull();
    rerender(<ChartLine {...chart} state="error" message="The metrics service did not answer." />);
    expect(screen.getByRole('alert')).toHaveTextContent('The metrics service did not answer.');
  });

  it('the whole dashboard loading speaks once and holds its placeholders inert', () => {
    const { container } = render(<Dashboard {...dash} state="loading" />);
    expect(screen.getAllByRole('status').filter(s => s.textContent === appWords.dashboard.loading)).toHaveLength(1);
    expect(container.querySelector('[inert]')).not.toBeNull();
    expect(screen.queryByText('1,284')).toBeNull();
  });

  it('the whole dashboard in error or empty is one sentence and one action', () => {
    const { rerender } = render(<Dashboard {...dash} state="error" action={{ label: 'Try again' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(appWords.dashboard.error);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    rerender(<Dashboard {...dash} state="empty" action={{ label: 'Start a session' }} />);
    expect(screen.getByText(appWords.dashboard.empty)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('one part can fail while the others keep their data', () => {
    render(<Dashboard {...dash} chart={{ ...chart, state: 'error' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(appWords.chart.error);
    expect(screen.getByText('1,284')).toBeInTheDocument();
    expect(screen.getByText('read_file')).toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  it('labels demo data as sample data, and a delta carries a word and a sign', () => {
    render(<Dashboard {...dash} />);
    expect(screen.getByText(/^Sample data\./)).toBeInTheDocument();
    expect(screen.getByText('+8.2% vs last week').parentElement).toHaveTextContent('Up');
  });
  it('does not call itself sample data unless asked', () => {
    render(<Dashboard {...dash} sample={false} />);
    expect(screen.queryByText(/Sample data/)).toBeNull();
  });
});

describe('the application kit follows the one system', () => {
  const tokens = (root: Element) => [...root.querySelectorAll('[class]')].flatMap(el => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
  // One control system (openspec/changes/systemic-kit/design.md): these utilities no longer exist in the kit.
  const retired = /^(focus-ring|transition-colors|transition-all|uppercase|tracking-wider|rounded-(sm|md|lg|compact)|text-(xs|lg|xl|2xl|3xl|stat|display-lg|\[.*\]))$/;
  const everything = (
    <>
      <Dashboard {...dash} />
      <ChartBar {...chart} />
      <ChartArea {...chart} />
      <ChartLine title="Loading" categories={[]} series={[]} state="loading" />
      <ChartLine title="Error" categories={[]} series={[]} state="error" action={{ label: 'Try again' }} />
      <ActivityList items={items} now={NOW} label="Activity" />
      <ActivityList items={[]} now={NOW} label="Loading activity" state="loading" />
      <Dashboard {...dash} title="Failed" state="error" action={{ label: 'Try again' }} />
    </>
  );

  it('uses none of the retired utilities: color changes are instant, type has no literal sizes, focus is global', () => {
    const { container } = render(everything);
    const used = new Set(tokens(container).map(t => t.split(':').pop()!));
    expect([...used].filter(t => retired.test(t))).toEqual([]);
  });

  it('ignores a class or style an untyped caller still passes: the kit owns every class', () => {
    const stray = { className: 'stray-class', style: { color: 'red' } } as object;
    const { container } = render(
      <>
        <Dashboard {...dash} {...stray} />
        <ChartLine {...chart} {...stray} />
        <ActivityList items={items} now={NOW} label="Activity" {...stray} />
        <Legend items={series} kind="line" {...stray} />
      </>,
    );
    expect(container.querySelector('.stray-class')).toBeNull();
    expect(container.querySelector('[style*="red"]')).toBeNull();
  });

  it('shows each dashboard figure at the title size through Stat, with no selector reaching into it', () => {
    const { container } = render(<Dashboard {...dash} />);
    const figure = screen.getByText('1,284');
    expect(figure).toHaveClass('text-title');
    expect(tokens(container).some(t => t.includes('text-stat'))).toBe(false);
  });

  it('colors a delta with the Status vocabulary, and leaves a neutral one muted', () => {
    const delta = (status?: 'ok' | 'warn' | 'error' | 'info' | 'pending') => ({ text: `change ${status ?? 'none'}`, direction: 'up' as const, status });
    render(<Dashboard {...dash} stats={[
      { label: 'a', figure: '1', delta: delta('ok') },
      { label: 'b', figure: '2', delta: delta('warn') },
      { label: 'c', figure: '3', delta: delta('error') },
      { label: 'd', figure: '4', delta: delta('info') },
      { label: 'e', figure: '5', delta: delta('pending') },
      { label: 'f', figure: '6', delta: delta() },
    ]} />);
    const colorOf = (text: string) => screen.getByText(text).parentElement!.className;
    expect(colorOf('change ok')).toContain('text-success');
    expect(colorOf('change warn')).toContain('text-warn');
    expect(colorOf('change error')).toContain('text-danger');
    expect(colorOf('change info')).toContain('text-info');
    expect(colorOf('change pending')).toContain('text-muted');
    expect(colorOf('change none')).toContain('text-muted');
  });

  it('sets activity rows in hairlines of py-4, and py-2 on a compact surface', () => {
    const comfortable = render(<ActivityList items={items} now={NOW} label="Activity" />);
    for (const row of screen.getAllByRole('listitem')) expect(row).toHaveClass('hairline', 'py-4');
    comfortable.unmount();
    render(<DensityProvider density="compact"><ActivityList items={items} now={NOW} label="Activity" /></DensityProvider>);
    for (const row of screen.getAllByRole('listitem')) expect(row).toHaveClass('hairline', 'py-2');
  });

  it('draws the loading rows of a list on the same hairlines and padding as the real rows', () => {
    render(<ActivityList items={[]} now={NOW} label="Activity" state="loading" />);
    const rows = screen.getByRole('group', { name: 'Activity' }).querySelectorAll(':scope > [aria-hidden]');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toHaveClass('hairline', 'py-4');
  });

  it('opens the table of a chart with a 44px disclosure, and a 32px one on a compact surface', () => {
    const summary = () => screen.getByText('View as table').closest('summary')!;
    const comfortable = render(<ChartLine {...chart} />);
    expect(summary()).toHaveClass('min-h-11', 'text-base', 'rounded-control', 'link');
    comfortable.unmount();
    render(<DensityProvider density="compact"><ChartLine {...chart} /></DensityProvider>);
    expect(summary()).toHaveClass('min-h-8', 'compact-target', 'text-sm');
  });
});

describe('accessibility', () => {
  it.each(themes)('dashboard, charts and every state pass axe in %s', async theme => {
    const { container } = renderIn(
      theme,
      <main>
        <h1>Page</h1>
        <Dashboard {...dash} />
        <ChartBar {...chart} />
        <ChartArea {...chart} />
        <ChartLine title="Empty" categories={[]} series={[]} />
        <ChartLine title="Loading" categories={[]} series={[]} state="loading" />
        <ActivityList items={[]} now={NOW} label="Empty activity" />
        <ActivityList items={[]} now={NOW} label="Loading activity" state="loading" />
        <ActivityList items={[]} now={NOW} label="Failed activity" state="error" action={{ label: 'Try again' }} />
        <Dashboard {...dash} title="Loading dashboard" state="loading" />
      </main>,
    );
    await expectAccessible(container);
  });
});
