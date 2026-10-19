import { CHAR_W, compact, labelEvery, type Scale } from './scale';

export interface Frame {
  /** Plot edges in SVG units. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Width the y labels need, plus a gap. */
export function yMargin(scale: Scale): number {
  return Math.max(...scale.ticks.map(t => compact(t).length)) * CHAR_W + 14;
}

/** Hairline gridlines with the y labels on the left. The zero line is a little firmer. Tabular numerals in the mono face. */
export function YAxis({ scale, frame, width }: { scale: Scale; frame: Frame; width: number }) {
  const y = (v: number) => frame.top + (frame.bottom - frame.top) * (1 - v / scale.max);
  return (
    <g>
      {scale.ticks.map(t => (
        <g key={t}>
          <line x1={frame.left} x2={width - frame.right} y1={y(t)} y2={y(t)} strokeWidth={1} className={t === 0 ? 'stroke-control' : 'stroke-line'} />
          <text x={frame.left - 8} y={y(t)} textAnchor="end" dominantBaseline="central" className="text-meta fill-muted tabular-nums">
            {compact(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** x labels at the given centers, thinned so neighbours never touch. */
export function XAxis({ categories, xs, step, y }: { categories: string[]; xs: number[]; step: number; y: number }) {
  const every = labelEvery(categories.length, step, Math.max(...categories.map(c => c.length)));
  return (
    <g>
      {categories.map((c, i) =>
        i % every === 0 ? (
          <text key={`${c}-${i}`} x={xs[i]} y={y} textAnchor="middle" className="text-meta fill-muted tabular-nums">
            {c}
          </text>
        ) : null,
      )}
    </g>
  );
}
