import { displayWidth, truncate } from "@ejm/core";
import type { Role } from "./theme";

/** A run of text with one role. A line is a list of segments. */
export interface Seg {
  text: string;
  role?: Role;
  bold?: boolean;
}

export const segWidth = (segs: readonly Seg[]): number => segs.reduce((n, s) => n + displayWidth(s.text), 0);

/** Cut a line to `width` columns. The last kept segment ends in the ellipsis when anything was cut. */
export function fitSegs(segs: readonly Seg[], width: number, ellipsis: string): Seg[] {
  if (width <= 0) return [];
  if (segWidth(segs) <= width) return [...segs];
  const out: Seg[] = [];
  let room = width - displayWidth(ellipsis);
  if (room < 0) return [{ text: truncate(ellipsis, width, "") }];
  for (const seg of segs) {
    const w = displayWidth(seg.text);
    if (w <= room) {
      out.push(seg);
      room -= w;
    } else {
      out.push({ ...seg, text: truncate(seg.text, room, "") + ellipsis });
      return out;
    }
  }
  return out;
}

/**
 * Take `excess` columns out of the parts, in priority order, never going below each part's floor.
 * Returns the new widths.
 */
export function shrinkParts(parts: readonly { width: number; min: number }[], excess: number): number[] {
  const widths = parts.map((p) => p.width);
  for (let i = 0; i < parts.length && excess > 0; i++) {
    const take = Math.min(excess, widths[i]! - parts[i]!.min);
    if (take > 0) {
      widths[i]! -= take;
      excess -= take;
    }
  }
  return widths;
}
