import { createTabsState, tabIndexFor, tabsKeyAction, tabsReducer, type TabsState } from '@ejm/core';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
}

export interface TabsProps {
  /** Names the tab list for assistive technology. */
  label: string;
  tabs: TabItem[];
  /** The id of the tab selected first. Defaults to the first tab. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** auto: arrows select as they move. manual: arrows move focus and Enter or Space selects. */
  activation?: 'auto' | 'manual';
  className?: string;
}

/**
 * Tabs on the @ejm/core tabs model, so the web, Ink and Rust tabs move the same way: arrows (wrapping), Home and End,
 * a roving tabindex (only the current tab is in the tab order), and the selected tab announced by aria-selected.
 */
export function Tabs({ label, tabs, defaultValue, onValueChange, activation = 'auto', className }: TabsProps) {
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const start = Math.max(0, tabs.findIndex(t => t.id === defaultValue));
  const [state, setState] = useState<TabsState>(() => createTabsState({ count: tabs.length, selected: start, activation }));
  // Keep the model's count in step with the tabs prop without an effect: reduce during render.
  const model = state.count === tabs.length ? state : tabsReducer(state, { type: 'setCount', count: tabs.length });
  const move = (next: TabsState, focus: boolean) => {
    setState(next);
    if (focus) refs.current[next.focused]?.focus();
    if (next.selected !== model.selected) {
      const picked = tabs[next.selected];
      if (picked) onValueChange?.(picked.id);
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const action = tabsKeyAction(e.key);
    if (!action) return;
    // Enter and Space on a button already click it, which selects. Only arrows, Home and End are handled here.
    if (action.type === 'activate') return;
    e.preventDefault();
    move(tabsReducer(model, action), true);
  };
  return (
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="hairline flex gap-x-6 overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={n => { refs.current[i] = n; }}
            id={`${uid}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={i === model.selected}
            aria-controls={`${uid}-panel-${t.id}`}
            tabIndex={tabIndexFor(model, i)}
            onClick={() => move(tabsReducer(model, { type: 'select', index: i }), false)}
            className={cn(
              'touch-target focus-ring min-h-11 shrink-0 focus-visible:-outline-offset-2 border-b-2 border-transparent font-semibold text-muted hover:text-fg',
              'aria-selected:border-fg aria-selected:text-fg',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          id={`${uid}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={i !== model.selected}
          tabIndex={0}
          className="focus-ring pt-6"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
