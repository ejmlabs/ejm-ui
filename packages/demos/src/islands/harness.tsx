import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import type { Demo } from '../core';
import { createHarnessDemo, type HarnessAction, type HarnessState } from '../harness';
import { harnessScenario } from '../scenarios';
import type { HarnessScenario } from '../types';
import { Syntax } from '../views/code';
import { cx } from '../views/cx';
import { JournalLine, SessionRow } from '../views/harness-parts';
import { Btn, Shell } from './parts';
import { useDemo, type IslandOptions } from './useDemo';

export type HarnessDemoProps = IslandOptions & { scenario?: HarnessScenario };
type Dispatch = Demo<HarnessState, HarnessAction>['dispatch'];

function Slider({ id, label, value, min, max, onChange, onCommit }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void; onCommit: (v: number) => void }) {
  return (
    <div className="flex items-center gap-[1.2ch]">
      <label htmlFor={id} className="w-[16ch] shrink-0">{label}</label>
      <input
        id={id} type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit(Number(e.currentTarget.value))} onKeyUp={(e) => onCommit(Number(e.currentTarget.value))} onBlur={(e) => onCommit(Number(e.currentTarget.value))}
        className="touch-target focus-ring min-w-0 flex-1 accent-ui-primary"
      />
      <output htmlFor={id} className="w-[2ch] text-end tabular-nums text-ui-text-strong">{value}</output>
    </div>
  );
}

function Samples({ scenario, state, dispatch }: { scenario: HarnessScenario; state: HarnessState; dispatch: Dispatch }) {
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const ids = scenario.langs.map((l) => l.id);
  const onKey = (e: KeyboardEvent) => {
    const i = ids.indexOf(state.lang);
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const id = ids[(to + ids.length) % ids.length]!;
    dispatch({ type: 'lang', id });
    tabs.current[id]?.focus();
  };
  const cur = scenario.langs.find((l) => l.id === state.lang) ?? scenario.langs[0]!;
  return (
    <div className="min-w-0">
      <div role="tablist" aria-label="Sample language" onKeyDown={onKey} className="flex gap-[1ch] border-b border-ui-line">
        {scenario.langs.map((l) => (
          <button
            key={l.id} ref={(el) => void (tabs.current[l.id] = el)} type="button" role="tab" id={'hn-tab-' + l.id} aria-selected={l.id === cur.id} aria-controls="hn-panel" tabIndex={l.id === cur.id ? 0 : -1}
            onClick={() => dispatch({ type: 'lang', id: l.id })}
            className={cx('touch-target focus-ring -mb-px border-b-2 px-[1.2ch]', l.id === cur.id ? 'border-ui-accent text-ui-text-strong' : 'border-transparent text-ui-dim')}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div id="hn-panel" role="tabpanel" aria-labelledby={'hn-tab-' + cur.id} className="pt-[0.6em]">
        <p className="m-0 mb-[0.4em] text-ui-text-muted">{cur.caption}</p>
        <pre tabIndex={0} aria-label={cur.label + ' sample'} className="m-0 max-h-[24em] overflow-auto font-[inherit] text-[length:inherit] leading-[1.45]"><code><Syntax code={cur.code} lang={cur.id} /></code></pre>
      </div>
    </div>
  );
}

/**
 * The interactive ejm-harness demo: sessions admitted by a resource governor, an append-only journal, a crash and recovery that never runs an
 * interrupted call again. Move the sliders, add sessions, press Crash worker. Every number is a sample value. Simulated, labelled, no network.
 */
export default function HarnessDemo({ scenario = harnessScenario, ...options }: HarnessDemoProps) {
  const { state, dispatch, host } = useDemo((o) => createHarnessDemo({ ...o, scenario }), options);
  const journal = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useLayoutEffect(() => {
    const el = journal.current;
    if (el && follow.current) el.scrollTop = el.scrollHeight;
  }, [state.journal.length]);
  const s = state.stats;

  return (
    <Shell
      name="ejm-harness" meta="governor" label={scenario.label} caption={scenario.caption} note={scenario.note}
      paused={state.paused} onPause={() => dispatch({ type: state.paused ? 'resume' : 'pause' })} onReset={() => dispatch({ type: 'reset' })} live={state.live} host={host}
    >
      <div className="grid min-h-0 gap-x-[4ch] gap-y-[1.4em] leading-[1.45] @3xl:grid-cols-2">
        <div className="min-w-0">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-[0.4em] p-0 font-bold text-ui-text-strong">Governor <span className="font-normal text-ui-dim">sample values</span></legend>
            <Slider id="hn-limit" label="Max concurrent" value={state.limit} min={1} max={8}
              onChange={(v) => dispatch({ type: 'setLimit', value: v })} onCommit={(v) => dispatch({ type: 'setLimit', value: v, commit: true })} />
            <Slider id="hn-cmds" label="Command slots" value={state.commands} min={1} max={4}
              onChange={(v) => dispatch({ type: 'setCommands', value: v })} onCommit={(v) => dispatch({ type: 'setCommands', value: v, commit: true })} />
          </fieldset>
          <p className="m-0 mt-[0.4em] text-ui-dim">{scenario.realDefaults}</p>
          <div className="mt-[0.8em] flex flex-wrap gap-[0.6em]">
            <Btn primary onClick={() => dispatch({ type: 'addSession' })}>Add session</Btn>
            <Btn onClick={() => dispatch({ type: 'addSession', count: 5 })}>Add 5</Btn>
            <Btn onClick={() => dispatch({ type: 'crash' })} disabled={!state.canCrash}>Crash worker</Btn>
          </div>
          <dl className="m-0 mt-[0.8em] grid grid-cols-2 gap-x-[2ch] gap-y-[0.2em] @xl:grid-cols-4">
            {([['running', s.running], ['queued', s.queued], ['done', s.done], ['commands held', s.commandsHeld]] as const).map(([k, v]) => (
              <div key={k} className="border-t border-ui-line pt-[0.3em]">
                <dd className="m-0 text-[1.6em] leading-none font-bold tabular-nums text-ui-text-strong">{v}</dd>
                <dt className="text-ui-dim">{k}</dt>
              </div>
            ))}
          </dl>
          <ul aria-label="Sessions" className="m-0 mt-[0.8em] list-none p-0">
            {state.sessions.length === 0 && <li className="text-ui-dim">No sessions yet. Add one.</li>}
            {state.sessions.map((x) => (
              <SessionRow key={x.id} s={x} detail interactive />
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <p className="m-0 mb-[0.3em] font-bold text-ui-text-strong">Journal <span className="font-normal text-ui-dim">append only, only Reset clears it</span></p>
          <div
            ref={journal} aria-label="Journal" role="log" aria-live="off" tabIndex={0}
            onScroll={(e) => void (follow.current = e.currentTarget.scrollHeight - e.currentTarget.clientHeight - e.currentTarget.scrollTop < 8)}
            className="h-[clamp(14rem,40vh,26rem)] overflow-auto"
          >
            <ul className="m-0 list-none p-0">
              {state.journal.map((e) => (
                <JournalLine key={e.seq} e={e} />
              ))}
            </ul>
          </div>
        </div>
        <div className="min-w-0 @3xl:col-span-2">
          <Samples scenario={scenario} state={state} dispatch={dispatch} />
        </div>
      </div>
    </Shell>
  );
}
