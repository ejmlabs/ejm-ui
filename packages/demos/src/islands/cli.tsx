import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createCliDemo, type CliAction, type CliOptions, type CliState } from '../cli';
import type { Demo } from '../core';
import { cliLabels, cliScenario } from '../scenarios';
import { cx } from '../views/cx';
import { CliHeader, CliHints, CliStatus, TermBlock, glyphsFor, roleTone } from '../views/terminal';
import { Btn, Shell, Spinner, Toggle } from './parts';
import { useDemo, type IslandOptions } from './useDemo';

export type CliDemoProps = IslandOptions & Pick<CliOptions, 'scenario' | 'project' | 'labels'>;

const overlayBox = 'absolute inset-x-0 top-[2.5em] z-10 mx-auto max-h-[calc(100%-3em)] w-[min(100%,64ch)] overflow-auto rounded-control border border-ui-line-strong bg-ui-overlay p-[1em] shadow-raised outline-none';

function Overlay({ state, dispatch }: { state: CliState; dispatch: Demo<CliState, CliAction>['dispatch'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const o = state.overlay;
  useEffect(() => ref.current?.focus({ preventScroll: true }), [o?.type]);
  if (!o) return null;
  const g = glyphsFor(state.plain);
  const onKey = (e: KeyboardEvent) => {
    const arrow = o.type === 'sessions' && (e.key === 'ArrowDown' || e.key === 'ArrowUp');
    if (e.key !== 'Escape' && e.key !== 'Enter' && !arrow) return;
    e.preventDefault();
    if (e.key === 'Escape') dispatch({ type: 'closeOverlay' });
    else if (e.key === 'Enter') dispatch({ type: 'overlayChoose' });
    else dispatch({ type: 'overlayMove', delta: e.key === 'ArrowDown' ? 1 : -1 });
  };
  if (o.type === 'help') {
    const sections = Object.entries(cliScenario.help).filter(([k, v]) => k !== 'footer' && Array.isArray(v)) as [string, [string, string][]][];
    return (
      <div ref={ref} role="dialog" aria-label="Help" tabIndex={-1} onKeyDown={onKey} className={overlayBox}>
        <p className="m-0 mb-[0.6em] font-bold text-ui-text-strong">Help <span className="font-normal text-ui-dim">Esc closes</span></p>
        {sections.map(([title, rows]) => (
          <div key={title} className="mb-[0.8em]">
            <p className="m-0 text-ui-accent">{title}</p>
            <dl className="m-0 grid grid-cols-[minmax(0,auto)_1fr] gap-x-[2ch]">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="whitespace-nowrap text-ui-text-strong">{k}</dt>
                  <dd className="m-0 text-ui-text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <p className="m-0 text-ui-dim">{cliScenario.help.footer}</p>
      </div>
    );
  }
  return (
    <div ref={ref} role="listbox" aria-label="Sessions" aria-activedescendant={`cli-s-${o.sel}`} tabIndex={-1} onKeyDown={onKey} className={overlayBox}>
      <p className="m-0 mb-[0.6em] font-bold text-ui-text-strong">Sessions <span className="font-normal text-ui-dim">arrows choose, Enter opens, Esc closes</span></p>
      {state.sessions.map((s, i) => (
        <div
          key={s.id}
          id={`cli-s-${i}`}
          role="option"
          aria-selected={i === o.sel}
          onClick={() => dispatch({ type: 'overlayChoose', index: i })}
          className={cx('touch-target flex cursor-pointer gap-[1.5ch] py-[0.15em]', i === o.sel && 'bg-ui-selection')}
        >
          <span aria-hidden>{i === o.sel ? g.prompt : ' '}</span>
          <span className="text-ui-text-strong">{s.title}</span>
          <span className="ms-auto text-ui-dim">{s.current ? 'open, ' : ''}{s.state}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * The interactive ejm-cli demo: a scripted terminal session on the headless engine. Send a prompt or pick a chip, watch tool calls and a diff
 * stream in, grant write to apply the blocked patch, stop a run, open sessions and help, switch to plain mode. Simulated, labelled, no network.
 */
export default function CliDemo({ scenario = cliScenario, labels = cliLabels, project, ...options }: CliDemoProps) {
  const { state, dispatch, host } = useDemo((o) => createCliDemo({ ...o, scenario, labels, ...(project && { project }) }), options);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const [above, setAbove] = useState(0);
  const g = glyphsFor(state.plain);
  const running = state.run === 'running';
  const lines = state.blocks.reduce((n, b) => n + b.lines.length + 1, 0);

  // Follow the newest line unless the visitor scrolled up. End returns to the latest output.
  useLayoutEffect(() => {
    const el = scroll.current;
    if (el && follow.current) el.scrollTop = el.scrollHeight;
  }, [lines, state.blocks.at(-1)?.lines.at(-1)?.t]);
  const onScroll = () => {
    const el = scroll.current;
    if (!el) return;
    const left = el.scrollHeight - el.clientHeight - el.scrollTop;
    follow.current = left < 8;
    setAbove(follow.current ? 0 : Math.round(left / (parseFloat(getComputedStyle(el).lineHeight) || 20)));
  };
  // Closing an overlay hands focus back to the composer.
  const open = state.overlay !== null;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) input.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  const scrollBy = (dir: 1 | -1) => scroll.current?.scrollBy({ top: dir * (scroll.current.clientHeight - 24) });
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      follow.current = true;
      dispatch({ type: 'submit' });
    } else if ((e.key === 'Enter' && (e.shiftKey || e.altKey)) || (e.ctrlKey && e.key === 'j')) {
      e.preventDefault();
      ta.setRangeText('\n', ta.selectionStart, ta.selectionEnd, 'end');
      dispatch({ type: 'draft', text: ta.value });
    } else if (e.ctrlKey && e.key === 'c' && ta.selectionStart === ta.selectionEnd) {
      e.preventDefault();
      dispatch({ type: 'stop' });
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      dispatch({ type: 'openOverlay', overlay: 'sessions' });
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !ta.value.includes('\n')) {
      e.preventDefault();
      dispatch({ type: e.key === 'ArrowUp' ? 'historyUp' : 'historyDown' });
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      scrollBy(e.key === 'PageUp' ? -1 : 1);
    } else if (e.key === 'End' && !state.draft) {
      follow.current = true;
      if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
      setAbove(0);
    }
  };
  const send = (text: string) => {
    follow.current = true;
    dispatch({ type: 'submit', text });
    input.current?.focus({ preventScroll: true });
  };

  return (
    <Shell
      name="ejm-cli" meta="terminal" label={scenario.label} caption={scenario.caption} note={scenario.note}
      paused={state.paused} onPause={() => dispatch({ type: state.paused ? 'resume' : 'pause' })} onReset={() => dispatch({ type: 'reset' })} live={state.live} host={host}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-[1em] gap-y-[0.2em]" role="group" aria-label="Prompts to try">
        <span className="text-ui-dim">Try</span>
        {scenario.chips.map((c) => (
          <Btn key={c.id} onClick={() => send(c.prompt)}>{c.label}</Btn>
        ))}
      </div>

      <div className="relative flex h-[clamp(22rem,62vh,34rem)] min-h-0 flex-col leading-[1.45]">
        <CliHeader provider={scenario.app.provider} title={state.title} write={state.write} cwd={scenario.app.cwd} sessionId={state.sessionId} plain={state.plain} />
        <div
          ref={scroll} onScroll={onScroll} role="region" aria-label="Transcript" tabIndex={0}
          className="mt-[0.7em] min-h-0 flex-1 overflow-auto overscroll-contain focus-visible:outline-offset-[-2px]"
        >
          {state.blocks.length === 0 ? (
            <div className="text-ui-text-muted">
              <p className={cx('m-0 mb-[0.5em]', roleTone('accent', state.plain, true))}>{scenario.empty.title}</p>
              {scenario.empty.help.map((h) => (
                <p key={h} className="m-0">{h}</p>
              ))}
            </div>
          ) : (
            state.blocks.map((b) => <TermBlock key={b.id} block={b} plain={state.plain} />)
          )}
        </div>
        <div className="shrink-0 border-t border-ui-line pt-[0.4em]">
          <CliStatus
            agents={state.agents} models={state.models} tools={state.tools} plain={state.plain}
            state={
              above > 0 ? `${g.up} ${above} lines above latest ${g.sep} End to follow`
              : running ? <span className={roleTone('accent', state.plain)}><Spinner plain={state.plain} /> Streaming{g.dots}</span>
              : 'Ready'
            }
          />
          <div className={cx('flex items-start gap-[1ch]', roleTone('accent', state.plain))}>
            <span aria-hidden className="pt-[0.25em]">{g.prompt}</span>
            <textarea
              ref={input} rows={Math.min(6, state.draft.split('\n').length)} value={state.draft} aria-label="Message" spellCheck={false} autoComplete="off" autoCapitalize="off"
              placeholder={running ? 'Enter queues your message' : 'Describe a task' + g.dots}
              onChange={(e) => dispatch({ type: 'draft', text: e.target.value })} onKeyDown={onKeyDown}
              className="min-h-[1.6em] w-full min-w-0 resize-none border-0 bg-transparent p-0 py-[0.25em] font-mono text-ui-text caret-ui-accent outline-none placeholder:text-ui-dim [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:text-base"
            />
          </div>
          <CliHints hints={labels.hints} plain={state.plain} />
        </div>
        <Overlay state={state} dispatch={dispatch} />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-[1.6em] gap-y-[0.3em]">
        <Toggle checked={state.write} onChange={(value) => dispatch({ type: 'grantWrite', value })} label={labels.grantWrite} hint={labels.grantHint} />
        <Toggle checked={state.plain} onChange={(value) => dispatch({ type: 'plain', value })} label={labels.plain} hint={labels.plainHint} />
        <Btn onClick={() => dispatch({ type: 'stop' })}>{labels.stopButton}</Btn>
        <Btn onClick={() => dispatch({ type: 'openOverlay', overlay: 'sessions' })}>{labels.sessionsButton}</Btn>
        <Btn onClick={() => dispatch({ type: 'openOverlay', overlay: 'help' })}>Help (/help)</Btn>
      </div>
      <p className="m-0 shrink-0 text-ui-text-muted">{labels.controlsNote}</p>
    </Shell>
  );
}
