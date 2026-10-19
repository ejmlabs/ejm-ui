import type { ReactNode } from 'react';
import type { ChatItem, DiffLine, ToolItem, TreeEntry } from '../ide';
import { Syntax } from './code';
import { cx } from './cx';

const oneLine = 'overflow-hidden text-ellipsis whitespace-pre';

export function Tabs({ paths, active }: { paths: string[]; active: string | null }) {
  return (
    <div className="flex min-w-0 shrink-0 gap-[2ch] overflow-hidden border-b border-ui-line">
      {paths.map((p) => (
        <span key={p} className={cx('-mb-px truncate border-b-2 pb-[0.3em]', p === active ? 'border-ui-accent text-ui-text-strong' : 'border-transparent text-ui-dim')}>
          {p.split('/').pop()}
        </span>
      ))}
    </div>
  );
}

export function Tree({ entries, active }: { entries: TreeEntry[]; active: string | null }) {
  return (
    <ul aria-label="Files" className="m-0 list-none p-0">
      {entries.map((e) => (
        <li key={e.key} className={cx(oneLine, e.key === active ? 'text-ui-text-strong' : e.dir ? 'text-ui-text-muted' : 'text-ui-text')} style={{ paddingInlineStart: e.level * 2 + 'ch' }}>
          {e.dir ? '↓ ' + e.key : e.key.split('/').pop()}
          {e.key === active && <span className="sr-only"> (open)</span>}
        </li>
      ))}
    </ul>
  );
}

const diffTone: Record<DiffLine['kind'], string> = {
  add: 'bg-ui-diff-add-bg text-ui-diff-add',
  del: 'bg-ui-diff-del-bg text-ui-diff-del',
  hunk: 'text-ui-special',
  file: 'text-ui-dim',
  ctx: 'text-ui-text-muted',
};

/** A diff with a +, - or space in the margin, so the change reads without color. The code after the marker is highlighted. */
export function Diff({ lines, lang = 'rust' }: { lines: DiffLine[]; lang?: string }) {
  return (
    <div className="my-[0.3em] overflow-hidden">
      {lines.map((l, i) => {
        const code = l.kind === 'hunk' || l.kind === 'file';
        return (
          <div key={i} className={cx('flex whitespace-pre', diffTone[l.kind])}>
            <span aria-hidden className="w-[2ch] shrink-0 select-none ps-[0.5ch]">{code ? '' : l.text[0]}</span>
            <span className="min-w-0 overflow-hidden text-ellipsis">{code ? l.text : l.kind === 'ctx' ? l.text.slice(1) : <Syntax code={l.text.slice(1)} lang={lang} />}</span>
            <span className="sr-only">{l.kind === 'add' ? 'added: ' : l.kind === 'del' ? 'removed: ' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

const glyph: Record<NonNullable<ToolItem['state']> | 'none', string> = { ok: '✓', error: '×', running: '…', none: '→' };
const stateTone: Record<NonNullable<ToolItem['state']> | 'none', string> = { ok: 'text-ui-success', error: 'text-ui-error', running: 'text-ui-info', none: 'text-ui-warning' };

export function ToolCall({ item, children }: { item: ToolItem; children?: ReactNode }) {
  const k = item.state ?? 'none';
  return (
    <div className="mb-[0.5em]">
      <div className="flex gap-[1.5ch] whitespace-pre">
        <span aria-hidden className={cx('shrink-0', stateTone[k])}>{glyph[k]}</span>
        <span className="shrink-0 font-bold text-ui-text-strong">{item.name}</span>
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis text-ui-text-muted">{item.arg}</span>
        <span className="shrink-0 text-ui-dim">{item.detail ? item.detail + ' · ' : ''}{item.word}</span>
      </div>
      {item.output && (
        <div className="ps-[3ch] text-ui-dim">
          {item.output.map((o) => (
            <div key={o} className={oneLine}>{o}</div>
          ))}
        </div>
      )}
      {item.diff && <Diff lines={item.diff} />}
      {item.note && <div className="text-ui-warning">{item.note}</div>}
      {children}
    </div>
  );
}

export function ChatLine({ item, agent }: { item: ChatItem; agent: string }) {
  switch (item.kind) {
    case 'user':
      return <p className="m-0 mb-[0.5em] break-words text-ui-accent"><span aria-hidden>› </span>{item.text}</p>;
    case 'agent':
      return (
        <p className="m-0 mb-[0.5em] break-words">
          <span className="font-bold text-ui-text-strong">{agent}</span>
          {item.scripted && <span className="text-ui-dim"> (scripted reply)</span>}
          <span> </span>
          {item.text}
        </p>
      );
    case 'tool':
      return <ToolCall item={item} />;
    case 'caption':
      return <p className="m-0 mb-[0.5em] text-ui-warning">{item.text}</p>;
    default:
      return <p className="m-0 mb-[0.5em] text-ui-dim">Stopped.</p>;
  }
}
