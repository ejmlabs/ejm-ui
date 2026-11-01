// Pure chart math: nice axis scales, compact axis numbers, thinning of x labels and spacing of end labels. No DOM.
import { formatNumber } from '@ejm/core';

/** Width of one character of the 13 to 14.4px mono axis text, with tracking. Slightly high on purpose: a margin that is too wide beats a clipped label. */
export const CHAR_W = 9;

export interface Scale {
  max: number;
  ticks: number[];
}

/** An axis from 0 to a round maximum, with about `target` steps of 1, 2, 5 or 10 times a power of ten. Values below zero are not supported (counts, durations, sizes). */
export function niceScale(max: number, target = 4): Scale {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] };
  const raw = max / Math.max(1, target);
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= top + step / 2; i++) ticks.push(Math.round(i * step * 1e9) / 1e9);
  return { max: ticks[ticks.length - 1]!, ticks };
}

/** 950, 12k, 1.2M. For axis labels and value labels, where the table carries the exact number. */
export function compact(n: number): string {
  const a = Math.abs(n);
  const trim = (x: number) => String(Math.round(x * 10) / 10);
  if (a >= 1e9) return `${trim(n / 1e9)}B`;
  if (a >= 1e6) return `${trim(n / 1e6)}M`;
  if (a >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (a >= 1e3) return `${trim(n / 1e3)}k`;
  return formatNumber(n, Number.isInteger(n) ? 0 : 1);
}

/** Show every nth x label so neighbours never touch. */
export function labelEvery(count: number, step: number, longest: number): number {
  if (count <= 1 || step <= 0) return 1;
  return Math.max(1, Math.ceil((longest * CHAR_W + 14) / step));
}

/** Cut a label to `max` characters, ending in an ellipsis when cut. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

/** Move labels apart so each is at least `gap` below the last, inside [lo, hi]. Returns positions in the input order. */
export function spread(ys: readonly number[], gap: number, lo: number, hi: number): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a]! - ys[b]!);
  const out = new Array<number>(ys.length);
  let prev = lo - gap;
  for (const i of order) {
    prev = out[i] = Math.max(ys[i]!, prev + gap);
  }
  // Push back up from the bottom when the run overshoots hi.
  let next = hi + gap;
  for (const i of [...order].reverse()) {
    next = out[i] = Math.min(out[i]!, next - gap);
  }
  return out;
}
