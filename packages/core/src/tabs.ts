/** Roving-index tabs: arrow keys move focus, Home and End jump, and selection follows focus or waits for Enter. */
export interface TabsState {
  count: number;
  focused: number;
  selected: number;
  /** auto: selection follows focus. manual: Enter or Space selects. */
  activation: "auto" | "manual";
  loop: boolean;
}

export type TabsAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "first" }
  | { type: "last" }
  | { type: "focus"; index: number }
  | { type: "select"; index: number }
  | { type: "activate" }
  | { type: "setCount"; count: number };

export function createTabsState(opts: { count: number; selected?: number; activation?: "auto" | "manual"; loop?: boolean }): TabsState {
  const count = Math.max(0, opts.count);
  const selected = clamp(opts.selected ?? 0, count);
  return { count, focused: selected, selected, activation: opts.activation ?? "auto", loop: opts.loop ?? true };
}

const clamp = (i: number, count: number) => (count === 0 ? 0 : Math.min(Math.max(i, 0), count - 1));

function moveFocus(s: TabsState, index: number): TabsState {
  if (s.count === 0) return s;
  const focused = clamp(index, s.count);
  const selected = s.activation === "auto" ? focused : s.selected;
  return focused === s.focused && selected === s.selected ? s : { ...s, focused, selected };
}

export function tabsReducer(s: TabsState, a: TabsAction): TabsState {
  switch (a.type) {
    case "next":
      return moveFocus(s, s.focused + 1 >= s.count && s.loop ? 0 : s.focused + 1);
    case "prev":
      return moveFocus(s, s.focused - 1 < 0 && s.loop ? s.count - 1 : s.focused - 1);
    case "first":
      return moveFocus(s, 0);
    case "last":
      return moveFocus(s, s.count - 1);
    case "focus":
      return moveFocus(s, a.index);
    case "select": {
      if (s.count === 0) return s;
      const i = clamp(a.index, s.count);
      return i === s.focused && i === s.selected ? s : { ...s, focused: i, selected: i };
    }
    case "activate":
      return s.selected === s.focused ? s : { ...s, selected: s.focused };
    case "setCount": {
      const count = Math.max(0, a.count);
      return { ...s, count, focused: clamp(s.focused, count), selected: clamp(s.selected, count) };
    }
  }
}

/** Map a keyboard event key to an action, or null when the key is not a tabs key. */
export function tabsKeyAction(key: string, orientation: "horizontal" | "vertical" = "horizontal"): TabsAction | null {
  const [nextKey, prevKey] = orientation === "horizontal" ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
  if (key === nextKey) return { type: "next" };
  if (key === prevKey) return { type: "prev" };
  if (key === "Home") return { type: "first" };
  if (key === "End") return { type: "last" };
  if (key === "Enter" || key === " ") return { type: "activate" };
  return null;
}

/** Roving tabindex: only the focused tab is in the tab order. */
export const tabIndexFor = (s: TabsState, index: number): 0 | -1 => (index === s.focused ? 0 : -1);
