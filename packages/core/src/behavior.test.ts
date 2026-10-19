// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  copyLabel, createCopy, createDisclosureState, disclosureReducer, filterList, matchText, nextThemeChoice,
  parseThemeChoice, pickCurrentHeading, resolveTheme, themeAttributes, themeCookie,
} from "./index";

describe("disclosure", () => {
  it("toggles, and open or close on the same state keeps the same object", () => {
    const closed = createDisclosureState();
    const open = disclosureReducer(closed, { type: "toggle" });
    expect(open.open).toBe(true);
    expect(disclosureReducer(open, { type: "open" })).toBe(open);
    expect(disclosureReducer(open, { type: "close" }).open).toBe(false);
  });
});

describe("copy with confirmation", () => {
  const timers = () => {
    const pending: { fn: () => void; ms: number; id: number }[] = [];
    return {
      pending,
      schedule: (fn: () => void, ms: number) => (pending.push({ fn, ms, id: pending.length }), pending.length - 1),
      cancel: (h: unknown) => void pending.splice(0, pending.length, ...pending.filter((p) => p.id !== h)),
    };
  };

  it("shows Copied after a write, then returns to idle", async () => {
    const t = timers();
    const written: string[] = [];
    const c = createCopy({ write: (s) => void written.push(s), schedule: t.schedule, cancel: t.cancel });
    await c.copy("npm i");
    expect(written).toEqual(["npm i"]);
    expect(copyLabel(c.machine.getState())).toBe("Copied");
    expect(t.pending[0]?.ms).toBe(2000);
    t.pending[0]!.fn();
    expect(c.machine.getState()).toBe("idle");
  });

  it("reports a failed write in words and still resets", async () => {
    const t = timers();
    const c = createCopy({ write: () => Promise.reject(new Error("denied")), schedule: t.schedule, cancel: t.cancel });
    await c.copy("x");
    expect(copyLabel(c.machine.getState())).toBe("Copy failed");
    t.pending[0]!.fn();
    expect(c.machine.getState()).toBe("idle");
  });

  it("restarts the timer when copied again", async () => {
    const t = timers();
    const c = createCopy({ write: () => {}, schedule: t.schedule, cancel: t.cancel });
    await c.copy("a");
    await c.copy("b");
    expect(t.pending).toHaveLength(1);
  });
});

describe("list filter", () => {
  const items = ["Button", "Café menu", "Data table", "Tabs"];
  it("matches every word, ignoring case and accents", () => {
    expect(matchText("Café menu", "CAFE")).toBe(true);
    expect(filterList(items, "data tab").items).toEqual(["Data table"]);
    expect(filterList(items, "tab zzz").count).toBe(0);
  });
  it("announces the result count in words", () => {
    expect(filterList(items, "").announcement).toBe("Showing all 4 items");
    expect(filterList(items, "tabs").announcement).toBe("1 result");
    expect(filterList(items, "t").announcement).toBe("3 results");
    expect(filterList(items, "zzz").announcement).toBe('No results for "zzz"');
  });
  it("filters objects through getText", () => {
    expect(filterList([{ n: "a" }, { n: "b" }], "b", (x) => x.n).items).toEqual([{ n: "b" }]);
  });
});

describe("scrollspy", () => {
  const h = [{ id: "intro", top: 0 }, { id: "usage", top: 500 }, { id: "api", top: 1200 }, { id: "faq", top: 1500 }];
  const at = (scrollTop: number, scrollHeight = 3000) => ({ scrollTop, viewportHeight: 800, scrollHeight });
  it("picks the last heading above the activation line", () => {
    expect(pickCurrentHeading(h, at(0))).toBe("intro");
    expect(pickCurrentHeading(h, at(499))).toBe("intro");
    expect(pickCurrentHeading(h, at(500))).toBe("usage");
    expect(pickCurrentHeading(h, at(1100), 100)).toBe("api");
  });
  it("picks the last heading at the bottom even when it cannot reach the line", () => {
    expect(pickCurrentHeading(h, at(1000, 1800))).toBe("faq");
  });
  it("returns null before the first heading or with none", () => {
    expect(pickCurrentHeading([{ id: "a", top: 300 }], at(0))).toBeNull();
    expect(pickCurrentHeading([], at(0))).toBeNull();
  });
  it("does not depend on input order", () => {
    expect(pickCurrentHeading([...h].reverse(), at(600))).toBe("usage");
  });
});

describe("theme model", () => {
  it("treats anything but light or dark as system", () => {
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("purple")).toBe("system");
    expect(parseThemeChoice(undefined)).toBe("system");
  });
  it("resolves system from the OS and always emits light or dark", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(themeAttributes("system", false)).toEqual({ "data-theme": "light", "data-theme-choice": "system" });
  });
  it("cycles through all three choices", () => {
    expect(nextThemeChoice(nextThemeChoice(nextThemeChoice("light")))).toBe("light");
  });
  it("writes the shared ejm-theme cookie and clears it for system", () => {
    expect(themeCookie("dark", { secure: true })).toBe("ejm-theme=dark; Domain=.ejmlabs.com; Path=/; SameSite=Lax; Max-Age=31536000; Secure");
    expect(themeCookie("system")).toContain("Max-Age=0");
  });
});
