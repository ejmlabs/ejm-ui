export interface FilterResult<T> {
  query: string;
  items: T[];
  count: number;
  total: number;
  /** Text for a live region, for example "3 results". */
  announcement: string;
}

const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

/** True when every whitespace-separated word of the query appears in the text, ignoring case and accents. */
export function matchText(text: string, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const hay = fold(text);
  return words.every((w) => hay.includes(w));
}

export function filterList<T>(items: readonly T[], query: string, getText: (item: T) => string = String): FilterResult<T> {
  const q = query.trim();
  const out = q ? items.filter((item) => matchText(getText(item), q)) : [...items];
  const count = out.length;
  const noun = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const announcement = !q
    ? `Showing all ${noun(items.length, "item", "items")}`
    : count === 0
      ? `No results for "${q}"`
      : noun(count, "result", "results");
  return { query: q, items: out, count, total: items.length, announcement };
}
