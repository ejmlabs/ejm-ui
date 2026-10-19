// Series encodings that do not rely on color: a marker shape and a dash pattern for lines, a fill pattern for bars.
// The hue classes are literal strings so Tailwind finds them. The six hue roles are defined per band and theme (not on Sage).
import type { ReactNode } from 'react';

export const maxSeries = 6;

export const hues = [
  { stroke: 'stroke-hue-1', fill: 'fill-hue-1', tint: 'fill-hue-1/15' },
  { stroke: 'stroke-hue-2', fill: 'fill-hue-2', tint: 'fill-hue-2/15' },
  { stroke: 'stroke-hue-3', fill: 'fill-hue-3', tint: 'fill-hue-3/15' },
  { stroke: 'stroke-hue-4', fill: 'fill-hue-4', tint: 'fill-hue-4/15' },
  { stroke: 'stroke-hue-5', fill: 'fill-hue-5', tint: 'fill-hue-5/15' },
  { stroke: 'stroke-hue-6', fill: 'fill-hue-6', tint: 'fill-hue-6/15' },
] as const;

export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'cross';
export const shapes: MarkerShape[] = ['circle', 'square', 'triangle', 'diamond', 'ring', 'cross'];

/** One dash pattern per series: solid, dashed, dotted, dash-dot, short dash, long dash. */
export const dashes = [undefined, '8 5', '1 5', '10 4 2 4', '4 4', '16 6'] as const;

export function Marker({ shape, x, y, index, r = 4.5 }: { shape: MarkerShape; x: number; y: number; index: number; r?: number }) {
  const hue = hues[index % maxSeries]!;
  switch (shape) {
    case 'square':
      return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} className={hue.fill} />;
    case 'triangle':
      return <path d={`M${x} ${y - r - 1}L${x + r + 1} ${y + r}L${x - r - 1} ${y + r}Z`} className={hue.fill} />;
    case 'diamond':
      return <path d={`M${x} ${y - r - 1.5}L${x + r + 1.5} ${y}L${x} ${y + r + 1.5}L${x - r - 1.5} ${y}Z`} className={hue.fill} />;
    case 'ring':
      return <circle cx={x} cy={y} r={r - 0.5} strokeWidth={2} className={`${hue.stroke} fill-ground`} />;
    case 'cross':
      return <path d={`M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}`} strokeWidth={2.5} fill="none" className={hue.stroke} />;
    default:
      return <circle cx={x} cy={y} r={r} className={hue.fill} />;
  }
}

/** Fill patterns for bars: solid, diagonal stripes, dots, horizontal stripes, cross hatch, vertical stripes. Ids are `${id}-0` to `${id}-5`. */
export function BarPatterns({ id }: { id: string }): ReactNode {
  const s = (i: number) => hues[i]!.stroke;
  const f = (i: number) => hues[i]!.fill;
  return (
    <defs>
      <pattern id={`${id}-0`} width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" className={f(0)} /></pattern>
      <pattern id={`${id}-1`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" strokeWidth="3" className={s(1)} /></pattern>
      <pattern id={`${id}-2`} width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" className={f(2)} /></pattern>
      <pattern id={`${id}-3`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6" strokeWidth="2.4" className={s(3)} /></pattern>
      <pattern id={`${id}-4`} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0L7 7M7 0L0 7" strokeWidth="1.6" fill="none" className={s(4)} /></pattern>
      <pattern id={`${id}-5`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M3 0V6" strokeWidth="2.6" className={s(5)} /></pattern>
    </defs>
  );
}
