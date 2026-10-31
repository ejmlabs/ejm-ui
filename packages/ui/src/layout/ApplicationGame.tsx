import { useEffect, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Button } from '../components/ui/button';

export interface GameWorkspaceProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style' | 'dangerouslySetInnerHTML'> {
  board: ReactNode;
  children: ReactNode;
  after?: ReactNode;
  label?: string;
  detailsLabel?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * The board column is centred on the page and sized to the viewport. From 40rem its height leaves room for a player strip above
 * and below it and, below 64rem, for about two lines of the details that follow. From 64rem the details sit to its right. On a
 * phone the board keeps the full width and the details follow it.
 */
export function GameWorkspace({ board, children, after, label, detailsLabel, ref, ...props }: GameWorkspaceProps) {
  return <section {...props} ref={ref} aria-label={label ?? props['aria-label']} className={[
    'grid min-w-0 grid-cols-1 items-start justify-items-center gap-8 [--ejm-board:42rem]',
    '[--ejm-room:calc(100svh_-_var(--ejm-header-h)_-_env(safe-area-inset-top,0px))]',
    'sm:[--ejm-board:clamp(20rem,calc(var(--ejm-room)_-_26rem),42rem)]',
    'lg:[--ejm-board:clamp(20rem,calc(var(--ejm-room)_-_13rem),42rem)]',
    'lg:grid-cols-[minmax(0,1fr)_minmax(0,var(--ejm-board))_minmax(12rem,1fr)] lg:gap-x-8',
  ].join(' ')}>
    <div className="w-full min-w-0 max-w-(--ejm-board) lg:col-start-2">{board}</div>
    <aside aria-label={detailsLabel} className="grid w-full min-w-0 max-w-(--ejm-board) grid-cols-1 gap-6 lg:col-start-3 lg:max-w-sm lg:justify-self-start">{children}</aside>
    {after && <div className="w-full min-w-0 lg:col-span-3">{after}</div>}
  </section>;
}

export function PlayerStrip({ name, detail, children }: { name: ReactNode; detail?: ReactNode; children?: ReactNode }) {
  return <div className="flex min-w-0 items-center justify-between gap-4">
    <div className="grid min-w-0 gap-1 [overflow-wrap:anywhere]">
      <strong className="text-body font-semibold">{name}</strong>
      {detail && <span className="text-meta text-muted">{detail}</span>}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>;
}

export function BoardPlaceholder({ children }: { children?: ReactNode }) {
  return <div className="grid aspect-square min-w-0 items-center justify-items-center bg-tone p-6">{children}</div>;
}

const atEnd = (list: HTMLElement) => list.scrollHeight - list.scrollTop - list.clientHeight < 4; // under 4px: fractional scroll positions

/** Accepted move pairs. The bounded list follows the latest move, unless the reader scrolled up, and never scrolls its document. */
export function MovePairs({ moves, label = 'Moves' }: { moves: readonly { number: number; white?: string; black?: string }[]; label?: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const following = useRef(true);
  const latest = moves.at(-1);
  useEffect(() => {
    const list = listRef.current;
    if (list && following.current) list.scrollTop = list.scrollHeight;
  }, [moves.length, latest?.black]);
  return <ol ref={listRef} role="list" aria-label={label} onScroll={event => { following.current = atEnd(event.currentTarget); }}
    className="grid max-h-80 min-w-0 gap-2 overflow-y-auto overscroll-contain font-mono text-meta tabular-nums">
    {moves.map(move => <li key={move.number} className="grid grid-cols-[4ch_1fr_1fr] gap-3">
      <span className="whitespace-nowrap text-muted">{move.number}.</span><span>{move.white ?? ''}</span><span>{move.black ?? ''}</span>
    </li>)}
  </ol>;
}

export interface MoveHistoryProps {
  items: readonly { id: number; number: number; color: 'w' | 'b'; san: string }[];
  selectedId: number;
  onSelect: (id: number) => void;
  label?: string;
}

/** Keep the selected move visible by scrolling only this bounded list, never its document. */
export function MoveHistory({ items, selectedId, onSelect, label = 'Moves' }: MoveHistoryProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector('[aria-current="step"]')?.closest('li');
    if (!selected) { list.scrollTop = 0; return; }
    const top = selected.offsetTop;
    const bottom = top + selected.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [selectedId, items.length]);
  return <ol ref={listRef} role="list" aria-label={label} className="relative grid max-h-80 min-w-0 gap-1 overflow-y-auto overscroll-contain font-mono text-meta tabular-nums">
    {items.map(item => <li key={item.id} className="[&>button]:w-full [&>button]:justify-start">
      <Button variant={item.id === selectedId ? 'secondary' : 'ghost'} density="compact" aria-current={item.id === selectedId ? 'step' : undefined} onClick={() => onSelect(item.id)}>
        {item.number}{item.color === 'w' ? '.' : '…'} {item.san}
      </Button>
    </li>)}
  </ol>;
}
