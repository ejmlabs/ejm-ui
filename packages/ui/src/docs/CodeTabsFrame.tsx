import { createTabsState, tabIndexFor, tabsKeyAction, tabsReducer } from '@ejm/core';
import { useEffect, useId, useReducer, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { useDensity } from '../lib/density';
import { cn } from '../lib/utils';
import { CodeGroupContext, tabPreference, useHydrated } from './hooks';

export interface CodeTabContent {
  /** The tab name: CSS, TypeScript, Rust. Groups follow each other when they share a name. */
  label: string;
  children?: ReactNode;
}

/**
 * The same task in several languages. The WAI-ARIA tabs pattern with automatic activation: Left and Right move and
 * wrap, Home and End jump, and only the selected tab is in the tab order. Choosing a language also selects it in every
 * other group that has it. The tab triggers follow the control recipe of the `Tabs` component.
 *
 * Without scripts, and on the server, every panel is shown stacked under its own label. After hydration the labels
 * give way to a tab list and only the selected panel shows.
 */
export function CodeTabsFrame({ label = 'Language', tabs }: { label?: string; tabs: readonly CodeTabContent[] }) {
  const hydrated = useHydrated();
  const compact = useDensity() === 'compact';
  const uid = useId();
  const [state, dispatch] = useReducer(tabsReducer, tabs.length, (count) => createTabsState({ count }));
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const wantFocus = useRef(false);
  const pref = useSyncExternalStore(tabPreference.subscribe, tabPreference.get, () => null);
  const names = tabs.map((t) => t.label).join('\n');

  // Another group chose a language this one has: follow it.
  useEffect(() => {
    const i = pref ? names.split('\n').indexOf(pref) : -1;
    if (i >= 0) dispatch({ type: 'select', index: i });
  }, [pref, names]);

  // A key moved focus: put the DOM focus on the new tab after it renders.
  useEffect(() => {
    if (wantFocus.current) {
      wantFocus.current = false;
      buttons.current[state.focused]?.focus();
    }
  });

  const remember = (index: number) => {
    const tab = tabs[index];
    if (tab) tabPreference.set(tab.label);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const action = tabsKeyAction(event.key);
    if (!action || action.type === 'activate') return;
    event.preventDefault();
    wantFocus.current = true;
    dispatch(action);
    remember(tabsReducer(state, action).selected);
  };

  return (
    <CodeGroupContext.Provider value={hydrated ? 'tabbed' : 'stacked'}>
      <div className="my-8">
        {hydrated && (
          <div role="tablist" aria-label={label} className="hairline flex gap-x-1 overflow-x-auto" onKeyDown={onKeyDown}>
            {tabs.map((t, i) => (
              <button
                key={t.label}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={i === state.selected}
                aria-controls={`${uid}-panel-${i}`}
                tabIndex={tabIndexFor(state, i)}
                onClick={() => {
                  dispatch({ type: 'select', index: i });
                  remember(i);
                }}
                // The same recipe as `Tabs`. The tab list scrolls, so the focus outline goes inside the trigger.
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-control px-3 text-muted touch-target hover:bg-tone hover:text-fg focus-visible:outline-offset-[-2px]',
                  'aria-selected:font-semibold aria-selected:text-fg aria-selected:underline aria-selected:decoration-2 aria-selected:underline-offset-[0.5em]',
                  compact ? 'min-h-8 compact-target text-sm' : 'min-h-11 text-base',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        {tabs.map((t, i) => (
          <div
            key={t.label}
            id={`${uid}-panel-${i}`}
            role={hydrated ? 'tabpanel' : undefined}
            aria-labelledby={hydrated ? `${uid}-tab-${i}` : undefined}
            hidden={hydrated && i !== state.selected}
            className={hydrated ? undefined : 'mt-6 first:mt-0'}
          >
            {!hydrated && <p className="mb-2 text-meta text-muted">{t.label}</p>}
            {t.children}
          </div>
        ))}
      </div>
    </CodeGroupContext.Provider>
  );
}
