import { ChartFrame, type ChartProps, type DrawArgs } from './ChartFrame';
import { XAxis, YAxis, yMargin, type Frame } from './axes';
import { BarPatterns, hues, maxSeries } from './marks';
import { CHAR_W, compact, niceScale } from './scale';

const BAR_MAX = 32;
const GAP = 3;

function BarPlot({ width: w, height: h, series, categories, patternId }: DrawArgs & { categories: string[] }) {
  const n = categories.length;
  const ns = series.length;
  const scale = niceScale(Math.max(0, ...series.flatMap(s => s.values.filter(Number.isFinite))), h < 230 ? 3 : 4);
  const frame: Frame = { left: yMargin(scale), right: 8, top: 20, bottom: h - 36 };
  const band = (w - frame.left - frame.right) / n;
  const groupW = Math.min(band * 0.72, ns * (BAR_MAX + GAP) - GAP);
  const barW = Math.max(2, (groupW - (ns - 1) * GAP) / ns);
  const gx = (i: number) => frame.left + i * band + (band - groupW) / 2;
  const centers = categories.map((_, i) => frame.left + i * band + band / 2);
  const y = (v: number) => frame.top + (frame.bottom - frame.top) * (1 - v / scale.max);

  return (
    <>
      <BarPatterns id={patternId} />
      <YAxis scale={scale} frame={frame} width={w} />
      <XAxis categories={categories} xs={centers} step={band} y={h - 8} />
      <g className="animate-fade">
        {series.map((s, si) =>
          categories.map((_, i) => {
            const v = s.values[i];
            if (!Number.isFinite(v)) return null;
            const x = gx(i) + si * (barW + GAP);
            const top = y(v!);
            const label = compact(v!);
            return (
              <g key={`${si}-${i}`}>
                <rect x={x} y={top} width={barW} height={Math.max(v! > 0 ? 1 : 0, y(0) - top)} strokeWidth={1.5} fill={`url(#${patternId}-${si % maxSeries})`} className={hues[si % maxSeries]!.stroke} />
                {label.length * CHAR_W <= barW + 8 && (
                  <text x={x + barW / 2} y={top - 6} textAnchor="middle" className="text-meta fill-fg tabular-nums">
                    {label}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
    </>
  );
}

/** A bar chart: grouped bars, one pattern fill per series (solid, stripes, dots, lines, hatch), value labels where they fit, a text legend and a table of every value. */
export function ChartBar(props: ChartProps) {
  return <ChartFrame {...props} kind="bar" draw={a => <BarPlot {...a} categories={props.categories} />} />;
}
