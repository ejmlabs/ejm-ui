import type { ReactNode } from 'react';
import type { CliBlock, CliLine } from '../cli';
import type { Role } from '../text';
import { cx } from './cx';
import { glyphs, type Glyphs } from './glyphs';

const roleClass: Record<NonNullable<Role>, string> = {
  accent: 'text-ui-accent',
  dim: 'text-ui-dim',
  ok: 'text-ui-success',
  err: 'text-ui-error',
  special: 'text-ui-special',
};

/** Color of a terminal role. Plain mode (NO_COLOR) drops color and keeps weight, so every line reads from its glyph or word. */
export function roleTone(r: Role, plain: boolean, bold?: boolean): string {
  if (plain) return cx((r === 'accent' || r === 'err' || bold) && 'font-bold');
  return cx(r && roleClass[r], bold && 'font-bold');
}

export const glyphsFor = (plain: boolean): Glyphs => (plain ? glyphs.ascii : glyphs.unicode);

/** Code-like lines (tool output, diffs) are cut with an ellipsis; prose wraps. */
const isCode = (b: CliBlock, l: CliLine) => b.kind === 'tool' || (b.kind === 'assistant' && l.r !== null && l.r !== 'accent');

export function BlockTitle({ block, plain }: { block: CliBlock; plain: boolean }) {
  const g = glyphsFor(plain);
  const tone = (r: Role) => roleTone(r, plain);
  switch (block.kind) {
    case 'you':
      return <div className={tone('accent')}>you</div>;
    case 'assistant':
      return <div className="font-bold text-ui-text-strong">ejm-cli</div>;
    case 'tool':
      return <div className={cx('overflow-hidden text-ellipsis whitespace-pre', tone('dim'))}>{g.tool + ' ' + block.title}</div>;
    case 'notice':
      return <div className={plain ? 'font-bold' : 'text-ui-warning'}>{'! ' + block.title}</div>;
    default:
      return <div className={tone('err')}>{g.fail + ' ' + block.title}</div>;
  }
}

export function TermBlock({ block, plain = false }: { block: CliBlock; plain?: boolean }) {
  const dflt: Role = block.kind === 'tool' ? 'dim' : block.kind === 'error' ? 'err' : null;
  return (
    <div data-kind={block.kind} className="mb-[0.7em]">
      {/* A titleless assistant block (the compact frame's diff) still names who speaks, as the real transcript does. */}
      <BlockTitle block={block} plain={plain} />
      {block.lines.map((l, i) => (
        <div
          key={i}
          className={cx(roleTone(l.r ?? dflt, plain, l.bold), isCode(block, l) ? 'overflow-hidden text-ellipsis whitespace-pre' : 'whitespace-pre-wrap break-words')}
        >
          {l.t || ' '}
        </div>
      ))}
    </div>
  );
}

const oneLine = 'overflow-hidden whitespace-pre text-ellipsis';

export function CliHeader({ provider, title, write, shell = false, cwd, sessionId, plain = false }: { provider: string; title: string; write: boolean; shell?: boolean; cwd: string; sessionId: string; plain?: boolean }) {
  const g = glyphsFor(plain);
  return (
    <div className="shrink-0">
      <div className={oneLine}>
        <span className={roleTone('accent', plain, true)}>{'>_ ejm-cli '}</span>
        {provider}
        <span className={roleTone('dim', plain)}>{'  ' + g.sep + '  ' + title}</span>
      </div>
      <div className={oneLine}>
        <span className={plain ? 'font-bold' : write ? 'text-ui-warning' : 'text-ui-dim'}>{'grants: read' + (write ? ' + write' : '') + (shell ? ' + shell' : '')}</span>
        <span className={roleTone('dim', plain)}>{'  ' + g.sep + '  ' + cwd + '  ' + g.sep + '  ' + sessionId}</span>
      </div>
    </div>
  );
}

/** Counts and state on one line. Parts that do not fit wrap onto a hidden second line, so they drop from the end. */
export function CliStatus({ agents, models, tools, plain = false, state }: { agents: number; models: number; tools: number; plain?: boolean; state?: ReactNode }) {
  const g = glyphsFor(plain);
  return (
    <div className={cx('flex max-h-[1lh] flex-wrap overflow-hidden whitespace-pre', roleTone('dim', plain))}>
      <span>{' ' + agents + ' agents'}</span>
      <span>{' ' + g.sep + ' models ' + models + '+0q'}</span>
      <span>{' ' + g.sep + ' tools ' + tools + '+0q'}</span>
      <span>{' ' + g.sep + ' '}{state ?? 'Ready'}</span>
    </div>
  );
}

export function CliHints({ hints, plain = false }: { hints: [string, string][]; plain?: boolean }) {
  const g = glyphsFor(plain);
  return (
    <ul aria-label="Keyboard shortcuts" className={cx('m-0 flex max-h-[1lh] list-none flex-wrap overflow-hidden whitespace-pre p-0', roleTone('dim', plain))}>
      {hints.map(([k, a], i) => (
        <li key={k}>{(i ? ' ' + g.sep + ' ' : ' ') + k + ' ' + a}</li>
      ))}
    </ul>
  );
}
