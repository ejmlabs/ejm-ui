// @vitest-environment node
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { displayWidth } from "@ejm/core";
import { Callout, KeyHints, Prompt, Row, Rule, Stat, StateBlock, Status, Table, Text, componentStates } from "./index";
import { ANSI, show, stripAnsi } from "./support";

const cols = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "note", label: "Note" },
];
const rows = [
  { name: "alpha", size: 1200, note: "first" },
  { name: "beta-with-a-very-long-name-that-needs-cutting", size: 35.5, note: "second row with long text" },
];

/** One element per component state, keyed "Component/state". */
const cases: Record<string, ReactElement> = {
  "Text/default": <Text>Plain words</Text>,
  "Rule/default": <Rule label="Section" />,
  "Row/default": <Row label="build" value="ok" meta="2s" />,
  "Row/selected": <Row label="build" value="ok" meta="2s" state="selected" />,
  "Row/disabled": <Row label="build" value="ok" meta="2s" state="disabled" />,
  "Row/focused": <Row label="build" value="ok" meta="2s" state="focused" />,
  "Status/ok": <Status status="ok" />,
  "Status/warn": <Status status="warn" />,
  "Status/error": <Status status="error" />,
  "Status/info": <Status status="info" />,
  "Status/pending": <Status status="pending" />,
  "Stat/default": <Stat figure="1,204" label="requests" />,
  "Stat/loading": <Stat label="requests" state="loading" />,
  "Stat/error": <Stat label="requests" state="error" />,
  "Stat/empty": <Stat label="requests" state="empty" />,
  "Table/default": <Table columns={cols} rows={rows} />,
  "Table/empty": <Table columns={cols} rows={[]} state="empty" />,
  "Table/loading": <Table columns={cols} rows={[]} state="loading" />,
  "Table/error": <Table columns={cols} rows={[]} state="error" />,
  "Prompt/idle": <Prompt value="ls -la" />,
  "Prompt/busy": <Prompt value="ls -la" state="busy" />,
  "Prompt/error": <Prompt value="ls -la" state="error" message="Command not found." />,
  "KeyHints/default": <KeyHints hints={[{ key: "Enter", label: "send" }, { key: "Esc", label: "close" }]} />,
  "Callout/note": <Callout kind="note">Remember this.</Callout>,
  "Callout/tip": <Callout kind="tip">Try this.</Callout>,
  "Callout/warning": <Callout kind="warning">Careful.</Callout>,
  "StateBlock/empty": <StateBlock kind="empty" message="No sessions yet." action={{ key: "n", label: "New session" }} />,
  "StateBlock/loading": <StateBlock kind="loading" message="Fetching sessions." />,
  "StateBlock/error": <StateBlock kind="error" message="Could not reach the server. Check your network." action={{ key: "r", label: "Retry" }} />,
};

describe("every primitive and state renders", () => {
  it("has a case for exactly the states the package claims", () => {
    const claimed = Object.entries(componentStates).flatMap(([c, ss]) => ss.map((s) => `${c}/${s}`));
    expect(Object.keys(cases).sort()).toEqual(claimed.sort());
  });

  it.each(Object.entries(cases))("%s renders non-empty text in color and without", (_, el) => {
    expect(stripAnsi(show(el, { level: "truecolor" })).trim()).not.toBe("");
    expect(show(el, { level: "none" }).trim()).not.toBe("");
  });
});

describe("NO_COLOR", () => {
  it.each(Object.entries(cases))("%s has no ANSI escapes", (_, el) => {
    for (const unicode of [true, false]) expect(show(el, { level: "none", unicode })).not.toMatch(ANSI);
  });

  it("color levels do emit escapes, so the check above can fail", () => {
    for (const level of ["basic", "256", "truecolor"] as const) expect(show(<Status status="error" />, { level })).toMatch(ANSI);
  });

  it("makes every state of a component distinguishable by text or glyph alone", () => {
    for (const [component, states] of Object.entries(componentStates)) {
      const frames = states.map((s) => show(cases[`${component}/${s}`]!, { level: "none" }));
      expect(new Set(frames).size, `${component} states look identical without color`).toBe(states.length);
    }
  });

  it("does the same in ASCII", () => {
    for (const [component, states] of Object.entries(componentStates)) {
      const frames = states.map((s) => show(cases[`${component}/${s}`]!, { level: "none", unicode: false }));
      expect(new Set(frames).size, component).toBe(states.length);
      for (const f of frames) expect(f).toMatch(/^[\x20-\x7e\n]*$/);
    }
  });

  it("names status levels with a glyph and a word", () => {
    expect(show(<Status status="ok" />)).toBe("✓ ok");
    expect(show(<Status status="error" />, { unicode: false })).toBe("x error");
    expect(show(<Status status="pending" label="Deploying" />)).toBe("○ pending  Deploying");
  });

  it("marks row states with glyphs and words", () => {
    expect(show(<Row label="build" state="selected" />)).toBe("› build");
    expect(show(<Row label="build" state="focused" />)).toBe("▸ build");
    expect(show(<Row label="build" state="disabled" />)).toBe("  build  (disabled)");
  });
});

describe("color", () => {
  it("uses the brand hex in truecolor", () => {
    expect(show(<Status status="error" />, { level: "truecolor" })).toContain("38;2;238;160;160");
  });
  it("uses the 256 palette and the named 16 colors on lesser terminals", () => {
    expect(show(<Status status="error" />, { level: "256" })).toMatch(/38;5;\d+/);
    expect(show(<Status status="error" />, { level: "basic" })).toContain("[31m");
  });
});

describe("layout at 40, 80 and 200 columns", () => {
  const long = "x".repeat(300);
  const stress: ReactElement[] = [
    <Row key="r" label={long} value={long} meta={long} />,
    <Row key="r2" label={long} state="disabled" />,
    <Table key="t" columns={cols} rows={rows} />,
    <Table key="t2" columns={[...cols, { key: "a", label: "Another long heading" }, { key: "b", label: "More" }, { key: "c", label: "Even more" }]} rows={[{ name: long, size: 9, note: long, a: long, b: long, c: long }]} />,
    <Stat key="s" figure={long} label={long} />,
    <Status key="st" status="warn" label={long} />,
    <Prompt key="p" value={long} state="busy" />,
    <Prompt key="p2" value="x" state="error" message={long} />,
    <KeyHints key="k" hints={Array.from({ length: 30 }, (_, i) => ({ key: `Ctrl+${i}`, label: "do something" }))} />,
    <Rule key="ru" label={long} />,
    <Text key="tx">{long + " " + long}</Text>,
    <Callout key="c" kind="warning">{long}</Callout>,
    <StateBlock key="sb" kind="error" message={long} action={{ key: "r", label: long }} />,
  ];

  it.each([40, 80, 200])("never exceeds %s columns", (columns) => {
    for (const unicode of [true, false]) {
      stress.forEach((el, i) => {
        const lines = show(el, { columns, unicode }).split("\n");
        for (const line of lines) expect(displayWidth(line), `case ${i} line "${line}"`).toBeLessThanOrEqual(columns);
      });
    }
  });

  it("truncates a long row label with an ellipsis and keeps the value", () => {
    const out = show(<Row label={long} value="42" />, { columns: 40 });
    expect(out).toMatch(/^ {2}x+… {2}42$/);
    expect(displayWidth(out)).toBeLessThanOrEqual(40);
  });

  it("uses a three-dot ellipsis in ASCII", () => {
    expect(show(<Row label={long} />, { columns: 20, unicode: false })).toMatch(/\.\.\.$/);
  });

  it("right aligns numbers in a table and keeps decimals consistent", () => {
    const out = show(
      <Table columns={[{ key: "n", label: "Name" }, { key: "v", label: "Value" }]} rows={[{ n: "a", v: 5 }, { n: "bb", v: 1234.5 }]} />,
      { columns: 80 },
    );
    expect(out.split("\n")).toEqual(["Name    Value", "─────────────", "a         5.0", "bb    1,234.5"]);
  });

  it("drops key hints from the end when they do not fit", () => {
    const out = show(<KeyHints hints={[{ key: "Enter", label: "send" }, { key: "Esc", label: "close" }, { key: "Ctrl+C", label: "stop the current run" }]} />, { columns: 30 });
    expect(out).toBe("Enter send · Esc close");
  });
});
