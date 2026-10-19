/** Decimal (SI) sizes: 1 kB is 1000 bytes. One decimal below 10, none above. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "kB", "MB", "GB", "TB", "PB"];
  let n = bytes;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  if (i === 0) return `${Math.round(n)} B`;
  const rounded = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  // 999.95 kB rounds up to 1000, so promote it to the next unit.
  if (rounded >= 1000 && i < units.length - 1) return `1 ${units[i + 1]}`;
  return `${rounded} ${units[i]}`;
}

/** 850ms, 1.2s, 2m 5s, 1h 3m, 2d 4h. Two units at most. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 10_000) return `${Math.round(ms / 100) / 10}s`;
  const total = Math.round(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d) return h ? `${d}d ${h}h` : `${d}d`;
  if (h) return m ? `${h}h ${m}m` : `${h}h`;
  if (m) return s ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

const UNITS: [number, string][] = [
  [365 * 86400, "y"],
  [30 * 86400, "mo"],
  [7 * 86400, "w"],
  [86400, "d"],
  [3600, "h"],
  [60, "m"],
];

/** "just now", "5m ago", "3h ago", "in 2d". Times are epoch milliseconds. */
export function formatRelativeTime(then: number, now: number): string {
  const diff = Math.round((then - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  const [size, unit] = UNITS.find(([s]) => abs >= s) ?? [60, "m"];
  const n = Math.max(1, Math.floor(abs / size));
  return diff < 0 ? `${n}${unit} ago` : `in ${n}${unit}`;
}

/** Thousands separators and a fixed number of decimals, always en-US so columns match everywhere. */
export const formatNumber = (n: number, decimals = 0): string =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : "-";

// ponytail: approximate East Asian wide and emoji ranges, zero width for combining marks. Rust uses unicode-width; swap in a table if exact parity is needed.
function charWidth(cp: number): number {
  if (cp === 0 || (cp >= 0x300 && cp <= 0x36f) || (cp >= 0x200b && cp <= 0x200f) || cp === 0xfe0f) return 0;
  const wide =
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff);
  return wide ? 2 : 1;
}

/** Width in terminal columns. */
export function displayWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += charWidth(ch.codePointAt(0)!);
  return w;
}

/** Cut text to at most `width` columns, ending in the ellipsis when it was cut. */
export function truncate(text: string, width: number, ellipsis = "…"): string {
  if (width <= 0) return "";
  if (displayWidth(text) <= width) return text;
  const room = width - displayWidth(ellipsis);
  if (room < 0) return ellipsis.slice(0, width);
  let out = "";
  let w = 0;
  for (const ch of text) {
    const cw = charWidth(ch.codePointAt(0)!);
    if (w + cw > room) break;
    out += ch;
    w += cw;
  }
  return out + ellipsis;
}

/** Fit a cell to exactly `width` columns: truncate, then pad on the left (right align, for numbers) or the right. */
export function fitCell(text: string, width: number, align: "left" | "right" = "left", ellipsis = "…"): string {
  const cut = truncate(text, width, ellipsis);
  const pad = " ".repeat(Math.max(0, width - displayWidth(cut)));
  return align === "right" ? pad + cut : cut + pad;
}

/** Right align numbers to one width. With the same decimals on each value, the decimal points line up. */
export function alignNumbers(values: readonly string[]): string[] {
  const width = Math.max(0, ...values.map(displayWidth));
  return values.map((v) => fitCell(v, width, "right"));
}
