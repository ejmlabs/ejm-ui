// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMachine, createTabsState, tabIndexFor, tabsKeyAction, tabsReducer, type TabsAction } from "./index";

const run = (s: ReturnType<typeof createTabsState>, ...as: TabsAction[]) => as.reduce(tabsReducer, s);

describe("tabs", () => {
  it("moves focus with next and prev and wraps around", () => {
    const s = createTabsState({ count: 3 });
    expect(run(s, { type: "prev" }).focused).toBe(2);
    expect(run(s, { type: "next" }, { type: "next" }, { type: "next" }).focused).toBe(0);
  });

  it("stops at the ends when loop is off", () => {
    const s = createTabsState({ count: 3, loop: false });
    expect(run(s, { type: "prev" }).focused).toBe(0);
    expect(run(s, { type: "last" }, { type: "next" }).focused).toBe(2);
  });

  it("selection follows focus in auto mode and waits for activate in manual mode", () => {
    const auto = run(createTabsState({ count: 3 }), { type: "next" });
    expect([auto.focused, auto.selected]).toEqual([1, 1]);
    const manual = run(createTabsState({ count: 3, activation: "manual" }), { type: "next" });
    expect([manual.focused, manual.selected]).toEqual([1, 0]);
    expect(run(manual, { type: "activate" }).selected).toBe(1);
  });

  it("keeps a single tab stop (roving tabindex)", () => {
    const s = run(createTabsState({ count: 4 }), { type: "last" });
    expect([0, 1, 2, 3].map((i) => tabIndexFor(s, i))).toEqual([-1, -1, -1, 0]);
  });

  it("maps keys by orientation", () => {
    expect(tabsKeyAction("ArrowRight")).toEqual({ type: "next" });
    expect(tabsKeyAction("ArrowDown")).toBeNull();
    expect(tabsKeyAction("ArrowDown", "vertical")).toEqual({ type: "next" });
    expect(tabsKeyAction("Home")).toEqual({ type: "first" });
    expect(tabsKeyAction("End")).toEqual({ type: "last" });
    expect(tabsKeyAction("a")).toBeNull();
  });

  it("clamps when the tab count shrinks and survives zero tabs", () => {
    const s = run(createTabsState({ count: 5, selected: 4 }), { type: "setCount", count: 2 });
    expect([s.focused, s.selected]).toEqual([1, 1]);
    expect(run(createTabsState({ count: 0 }), { type: "next" }, { type: "select", index: 3 }).selected).toBe(0);
  });

  it("notifies subscribers only when the state changes", () => {
    const m = createMachine(tabsReducer, createTabsState({ count: 2 }));
    let calls = 0;
    const off = m.subscribe(() => calls++);
    m.send({ type: "first" });
    expect(calls).toBe(0);
    m.send({ type: "next" });
    expect(calls).toBe(1);
    off();
    m.send({ type: "prev" });
    expect(calls).toBe(1);
  });
});
