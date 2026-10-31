import { ChartFrame, type ChartProps, type DrawArgs } from './ChartFrame';
import { XAxis, YAxis, yMargin, type Frame } from './axes';
import { dashes, hues, Marker, maxSeries, shapes } from './marks';
import { CHAR_W, clip, niceScale, spread } from './scale';

const TOP = 12;
const BOTTOM = 36;
const PAD = 8;

function LinePlot({ width: w, height: h, series, categories, filled }: DrawArgs & { categories: string[]; filled: boolean }) {
  const n = categories.length;
  const values = series.flatMap(s => s.values.filter(Number.isFinite));
  const scale = niceScale(Math.max(0, ...values), h < 230 ? 3 : 4);

  // The names go at the end of each line, so the right margin is as wide as the longest name (fewer characters on a phone).
  const names = series.map(s => s.short ?? s.label);
  const chars = Math.min(Math.max(...names.map(l => l.length)), w < 480 ? 9 : 16);
  const frame: Frame = { left: yMargin(scale), right: chars * CHAR_W + 22, top: TOP, bottom: h - BOTTOM };

  const x0 = frame.left + PAD;
  const x1 = w - frame.right - PAD;
  const step = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0;
  const xs = categories.map((_, i) => (n === 1 ? (x0 + x1) / 2 : x0 + i * step));
  const y = (v: number) => frame.top + (frame.bottom - frame.top) * (1 - v / scale.max);
  const markEvery = Math.max(1, Math.ceil(28 / Math.max(step, 1)));

  // A run of finite values is one segment, so a gap in the data is a gap in the line.
  const segments = series.map(s => {
    const out: { i: number; v: number }[][] = [];
    s.values.forEach((v, i) => {
      if (!Number.isFinite(v) || i >= n) return;
      const last = out[out.length - 1];
      if (last && last[last.length - 1]!.i === i - 1) last.push({ i, v });
      else out.push([{ i, v }]);
    });
    return out;
  });
  const line = (seg: { i: number; v: number }[]) => seg.map((p, k) => `${k ? 'L' : 'M'}${xs[p.i]!.toFixed(1)} ${y(p.v).toFixed(1)}`).join('');

  const ends = series.map(s => {
    const lastI = s.values.reduce((a, v, i) => (Number.isFinite(v) && i < n ? i : a), -1);
    return lastI < 0 ? y(0) : y(s.values[lastI]!);
  });
  const labelYs = spread(ends, 16, frame.top + 4, frame.bottom - 6);

  return (
    <>
      <YAxis scale={scale} frame={frame} width={w} />
      <XAxis categories={categories} xs={xs} step={step} y={h - 8} />
      <g className="animate-fade">
        {filled &&
          segments.map((segs, si) =>
            segs.map((seg, k) => (
              <path key={`a${si}-${k}`} d={`${line(seg)}L${xs[seg[seg.length - 1]!.i]!.toFixed(1)} ${y(0)}L${xs[seg[0]!.i]!.toFixed(1)} ${y(0)}Z`} stroke="none" className={hues[si % maxSeries]!.tint} />
            )),
          )}
        {segments.map((segs, si) =>
          segs.map((seg, k) => (
            <path key={`l${si}-${k}`} d={line(seg)} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashes[si % maxSeries]} className={hues[si % maxSeries]!.stroke} />
          )),
        )}
        {series.map((s, si) =>
          s.values.map((v, i) =>
            Number.isFinite(v) && i < n && (i % markEvery === 0 || i === n - 1) ? <Marker key={`m${si}-${i}`} shape={shapes[si % maxSeries]!} x={xs[i]!} y={y(v)} index={si} /> : null,
          ),
        )}
        {series.map((_, si) => (
          <text key={`t${si}`} x={w - frame.right + 4} y={labelYs[si]} dominantBaseline="central" className="text-meta fill-fg">
            {clip(names[si]!, chars)}
          </text>
        ))}
      </g>
    </>
  );
}

/** A line chart: one line per series, each with its own marker shape and dash pattern, a direct label at the end of the line, a text legend and a table of every value. */
export function ChartLine(props: ChartProps) {
  return <ChartFrame {...props} kind="line" draw={a => <LinePlot {...a} categories={props.categories} filled={false} />} />;
}

/** An area chart: the line chart with a light tint under each line. Series overlap, so the first series is drawn first and the lines stay on top. */
export function ChartArea(props: ChartProps) {
  return <ChartFrame {...props} kind="area" draw={a => <LinePlot {...a} categories={props.categories} filled />} />;
}
