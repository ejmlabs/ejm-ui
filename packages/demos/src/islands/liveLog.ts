import { useRef } from 'react';

export interface LiveLine {
  id: number;
  text: string;
}

/**
 * Gives each announced sentence a stable id. The engine keeps the 20 most recent sentences, so the list slides: matching the
 * old tail against the new head finds what is new, and only new lines get new ids. The log then gains nodes and never re-adds old ones.
 */
export function useLiveLines(live: string[]): LiveLine[] {
  const last = useRef<LiveLine[]>([]);
  const next = useRef(1);
  const prev = last.current;
  if (prev.length === live.length && prev.every((l, i) => l.text === live[i])) return prev;
  let keep = 0;
  for (let shift = 0; shift <= prev.length; shift++) {
    const overlap = prev.length - shift;
    if (overlap <= live.length && prev.slice(shift).every((l, i) => l.text === live[i])) {
      keep = overlap;
      last.current = [...prev.slice(shift), ...live.slice(keep).map((text) => ({ id: next.current++, text }))];
      return last.current;
    }
  }
  last.current = live.map((text) => ({ id: next.current++, text }));
  return last.current;
}
