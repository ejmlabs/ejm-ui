export interface HeadingOffset {
  id: string;
  /** Distance of the heading's top from the top of the document, in the same unit as scrollTop. */
  top: number;
}

export interface ScrollMetrics {
  scrollTop: number;
  viewportHeight: number;
  scrollHeight: number;
}

/**
 * The heading that is current at this scroll position: the last one whose top has reached the
 * activation line (scrollTop + offset). At the very bottom the last heading wins, so a short final
 * section can still be selected. Before the first heading it returns null.
 */
export function pickCurrentHeading(headings: readonly HeadingOffset[], scroll: ScrollMetrics, offset = 0): string | null {
  if (headings.length === 0) return null;
  const sorted = [...headings].sort((a, b) => a.top - b.top);
  const atBottom = scroll.scrollHeight > scroll.viewportHeight && scroll.scrollTop + scroll.viewportHeight >= scroll.scrollHeight - 1;
  if (atBottom) return sorted[sorted.length - 1]!.id;
  const line = scroll.scrollTop + offset;
  let current: string | null = null;
  for (const h of sorted) {
    if (h.top <= line) current = h.id;
    else break;
  }
  return current;
}
