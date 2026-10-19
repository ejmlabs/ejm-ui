import { useTheme } from '@ejm/ui/hooks/useTheme';
import { useEffect, useLayoutEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import type { Demo } from '../core';
import { createIdeDemo, type IdeAction, type IdeOptions, type IdeState } from '../ide';
import { ideScenario } from '../scenarios';
import { CodeLines } from '../views/code';
import { cx } from '../views/cx';
import { ChatLine, ToolCall } from '../views/ide-parts';
import { Btn, Shell } from './parts';
import { useDemo, type IslandOptions } from './useDemo';

export type IdeDemoProps = IslandOptions & Pick<IdeOptions, 'scenario' | 'project' | 'labels'>;
type Dispatch = Demo<IdeState, IdeAction>['dispatch'];

const langOf = (path: string) => (path.endsWith('.rs') ? 'rust' : path.endsWith('.ts') ? 'ts' : 'text');

function Palette({ state, dispatch, onClose }: { state: IdeState; dispatch: Dispatch; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { query, sel, items } = state.palette;
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dispatch({ type: 'paletteClose' });
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') dispatch({ type: 'paletteMove', delta: e.key === 'ArrowDown' ? 1 : -1 });
    else if (e.key === 'Enter') dispatch({ type: 'paletteRun' });
    else return;
    e.preventDefault();
  };
  // Closing the palette, by any route, hands focus back to the button that opened it.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => () => close.current(), []);
  return (
    <div role="dialog" aria-label="Command palette" className="absolute inset-x-0 top-[3em] z-10 mx-auto w-[min(100%,56ch)] rounded-control border border-ui-line-strong bg-ui-overlay p-[0.6em] shadow-raised">
      <input
        ref={input} role="combobox" aria-expanded="true" aria-controls="ide-palette" aria-activedescendant={items.length ? `ide-p-${sel}` : undefined} aria-label="Type a command"
        value={query} onChange={(e) => dispatch({ type: 'paletteQuery', text: e.target.value })} onKeyDown={onKey} placeholder="Type a command" autoComplete="off" spellCheck={false}
        className="min-h-[2.2em] w-full rounded-control border border-ui-control-border bg-ui-ground px-[0.8em] font-mono text-ui-text outline-none placeholder:text-ui-dim focus-visible:outline-2 focus-visible:outline-ui-focus [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:text-base"
      />
      <ul id="ide-palette" role="listbox" aria-label="Commands" className="m-0 mt-[0.4em] max-h-[16em] list-none overflow-auto p-0">
        {items.map((it, i) => (
          <li
            key={it.label} id={`ide-p-${i}`} role="option" aria-selected={i === sel} onClick={() => dispatch({ type: 'paletteRun', index: i })}
            className={cx('touch-target flex cursor-pointer gap-[2ch] px-[0.6em] py-[0.25em]', i === sel && 'bg-ui-selection')}
          >
            <span className="min-w-0 truncate text-ui-text-strong">{it.label}</span>
            <span className="ms-auto shrink-0 text-ui-dim">{it.hint}</span>
          </li>
        ))}
        {items.length === 0 && <li className="px-[0.6em] py-[0.25em] text-ui-dim">No command matches.</li>}
      </ul>
    </div>
  );
}

/**
 * The interactive ejm-ide demo: Edi, a scripted agent, beside a read-only editor. Open files into tabs, pick a prompt, review the diff of the
 * proposed write and accept or reject it, open the command list. Simulated, labelled, no network.
 */
export default function IdeDemo({ scenario = ideScenario, labels, project, ...options }: IdeDemoProps) {
  const theme = useTheme().resolved;
  const { state, dispatch, host } = useDemo((o) => createIdeDemo({ ...o, scenario, pageTheme: theme, ...(labels && { labels }), ...(project && { project }) }), options);
  const chatLog = useRef<HTMLDivElement>(null);
  const cmdBtn = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const prevTheme = useRef(theme);
  useEffect(() => {
    if (prevTheme.current !== theme) dispatch({ type: 'pageTheme', value: theme });
    prevTheme.current = theme;
  }, [theme, dispatch]);

  const last = state.chat.at(-1);
  useLayoutEffect(() => {
    const el = chatLog.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.chat.length, last && 'text' in last ? last.text : '', last?.kind === 'tool' ? last.review : false]);
  useEffect(() => {
    if (state.flash) panel.current?.querySelector('[data-changed]')?.scrollIntoView?.({ block: 'nearest' });
  }, [state.flash]);

  const active = state.active;
  const palette = state.palette.open;
  const closePalette = () => cmdBtn.current?.focus({ preventScroll: true });

  const onTabKey = (e: KeyboardEvent, path: string) => {
    const i = state.openFiles.indexOf(path);
    const n = state.openFiles.length;
    const go = (to: number) => {
      const p = state.openFiles[(to + n) % n];
      if (p) {
        dispatch({ type: 'openFile', path: p });
        tabs.current[p]?.focus();
      }
    };
    if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(n - 1);
    else if (e.key === 'Delete') dispatch({ type: 'closeFile', path });
    else return;
    e.preventDefault();
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = field.current?.value ?? '';
    if (field.current) field.current.value = '';
    dispatch({ type: 'prompt', text });
  };
  const send = (text: string) => dispatch({ type: 'prompt', text });
  const model = scenario.models[state.model];

  return (
    <Shell
      name="ejm-ide" meta={scenario.agent} label={scenario.label} caption={scenario.caption} note={scenario.note} theme={state.theme}
      paused={state.paused} onPause={() => dispatch({ type: state.paused ? 'resume' : 'pause' })} onReset={() => dispatch({ type: 'reset' })} live={state.live} host={host}
    >
      <div className="relative min-h-0 leading-[1.45]">
        <div className="grid gap-x-[3ch] gap-y-[1.2em] @3xl:grid-cols-2">
          <div className="grid min-w-0 gap-x-[2ch] gap-y-[0.8em] @xl:grid-cols-[13ch_minmax(0,1fr)]">
            <ul aria-label="Files" className="m-0 flex max-h-[9em] list-none flex-wrap gap-x-[2ch] overflow-auto p-0 @xl:max-h-none @xl:flex-col @xl:flex-nowrap">
              {state.tree.map((t) => (
                <li key={t.key} style={{ paddingInlineStart: t.level * 2 + 'ch' }} className="min-w-0">
                  <button
                    type="button"
                    aria-expanded={t.dir ? state.folders[t.key] : undefined}
                    aria-current={!t.dir && t.key === active ? 'true' : undefined}
                    onClick={() => dispatch(t.dir ? { type: 'toggleFolder', folder: t.key } : { type: 'openFile', path: t.key })}
                    className={cx('touch-target focus-ring block max-w-full truncate rounded-control text-start', t.key === active ? 'text-ui-text-strong underline underline-offset-4' : t.dir ? 'text-ui-text-muted' : 'text-ui-text')}
                  >
                    {t.dir ? (state.folders[t.key] ? '↓ ' : '→ ') + t.key : t.key.split('/').pop()}
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center border-b border-ui-line">
                <div role="tablist" aria-label="Open files" className="flex min-w-0 overflow-x-auto">
                  {state.openFiles.map((p) => (
                    <button
                      key={p} ref={(el) => void (tabs.current[p] = el)} type="button" role="tab" id={'ide-tab-' + p} aria-selected={p === active} aria-controls="ide-panel" tabIndex={p === active ? 0 : -1}
                      onClick={() => dispatch({ type: 'openFile', path: p })} onKeyDown={(e) => onTabKey(e, p)}
                      className={cx('touch-target focus-ring -mb-px shrink-0 border-b-2 px-[1ch]', p === active ? 'border-ui-accent text-ui-text-strong' : 'border-transparent text-ui-dim')}
                    >
                      {p.split('/').pop()}
                    </button>
                  ))}
                </div>
                {active && (
                  <button type="button" aria-label={'Close ' + active} onClick={() => dispatch({ type: 'closeFile', path: active })} className="touch-target focus-ring ms-auto shrink-0 rounded-control px-[1ch] text-ui-dim hover:text-ui-text-strong">
                    <span aria-hidden>×</span>
                  </button>
                )}
              </div>
              <div
                ref={panel} id="ide-panel" role="tabpanel" aria-labelledby={active ? 'ide-tab-' + active : undefined} tabIndex={0}
                aria-label={active ? `${active}, read only in this demo` : 'Editor, no file open'}
                className="mt-[0.6em] h-[clamp(14rem,34vh,22rem)] overflow-auto @3xl:h-[clamp(20rem,52vh,30rem)]"
              >
                {active ? <CodeLines code={state.files[active] ?? ''} lang={langOf(active)} changed={state.changed[active]} flash={state.flash?.path === active ? state.flash.lines : []} /> : <p className="m-0 text-ui-dim">No file is open. Pick one from the list.</p>}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col" role="region" aria-label={`${scenario.agent} chat`}>
            <div className="flex flex-wrap items-center gap-x-[1.2em] gap-y-[0.3em] border-b border-ui-line pb-[0.4em]">
              <span className="min-w-0 truncate font-bold text-ui-text-strong">{state.chatTitle}</span>
              <span className="text-ui-dim">Model: {model} (label only)</span>
              <span className="ms-auto flex gap-[0.6em]">
                <Btn ref={cmdBtn} onClick={() => dispatch({ type: 'paletteOpen' })} aria-haspopup="dialog">Commands</Btn>
                <Btn onClick={() => dispatch({ type: 'newChat' })}>New chat</Btn>
              </span>
            </div>
            <div role="group" aria-label="Prompts to try" className="flex flex-wrap items-center gap-x-[1em] gap-y-[0.2em] py-[0.4em]">
              <span className="text-ui-dim">Try</span>
              {scenario.chips.map((c) => (
                <Btn key={c.id} onClick={() => send(c.prompt)} disabled={state.running}>{c.label}</Btn>
              ))}
            </div>
            <div ref={chatLog} role="log" aria-live="off" aria-label={`${scenario.agent} messages`} tabIndex={0} className="h-[clamp(16rem,40vh,22rem)] overflow-auto @3xl:h-[clamp(14rem,36vh,24rem)]">
              {state.chat.length === 0 && <p className="m-0 text-ui-text-muted">Ask {scenario.agent} about this repository, or pick a prompt above.</p>}
              {state.chat.map((c) =>
                c.kind === 'tool' ? (
                  <ToolCall key={c.id} item={c}>
                    {c.review && (
                      <div role="group" aria-label="Review the proposed change" className="mt-[0.3em] ps-[3ch]">
                        <span className="flex gap-[0.6em]">
                          <Btn primary onClick={() => dispatch({ type: 'accept', id: c.id })}>Accept</Btn>
                          <Btn onClick={() => dispatch({ type: 'reject', id: c.id })}>Reject</Btn>
                        </span>
                        <p className="m-0 mt-[0.3em] text-ui-dim">{scenario.reviewNote}</p>
                      </div>
                    )}
                  </ToolCall>
                ) : (
                  <ChatLine key={c.id} item={c} agent={scenario.agent} />
                ),
              )}
            </div>
            <form onSubmit={submit} className="mt-[0.6em] flex gap-[0.6em]">
              <input
                ref={field} aria-label={`Message ${scenario.agent}`} placeholder={`Message ${scenario.agent}`} autoComplete="off" spellCheck={false}
                className="min-h-[2.2em] min-w-0 flex-1 rounded-control border border-ui-control-border bg-ui-ground px-[0.8em] font-mono text-ui-text outline-none placeholder:text-ui-dim focus-visible:outline-2 focus-visible:outline-ui-focus [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:text-base"
              />
              {state.running ? <Btn onClick={() => dispatch({ type: 'stop' })}>Stop</Btn> : <Btn primary type="submit">Send</Btn>}
            </form>
          </div>
        </div>
        {palette && <Palette state={state} dispatch={dispatch} onClose={closePalette} />}
      </div>
    </Shell>
  );
}
