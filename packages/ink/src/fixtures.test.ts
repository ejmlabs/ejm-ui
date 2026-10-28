// @vitest-environment node
// Cross-target fixtures: Ink must print the same plain lines as the Rust crate for every case in
// packages/core/terminal-fixtures.json. The Rust test records the file; this one only compares.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CommandMenuState, MessageKind, ToolCallState } from "@ejm/core";
import { commandMenuLines, markdownLines, messageLines, toolCallLines } from "./conversation";
import { createTheme } from "./theme";

interface Case {
  component: string;
  glyphs: "unicode" | "ascii";
  width: number;
  expected: string[];
  [key: string]: unknown;
}

const fixtures = JSON.parse(readFileSync(new URL("../../core/terminal-fixtures.json", import.meta.url), "utf8")) as { cases: Case[] };

function render(c: Case): string[] {
  const theme = createTheme({ level: "none", unicode: c.glyphs === "unicode" });
  const lines = (() => {
    switch (c.component) {
      case "Message":
        return messageLines(theme, c.kind as MessageKind, c.text as string, c.width, (c.title as string | null) ?? undefined);
      case "ToolCall":
        return toolCallLines(
          theme,
          {
            state: c.state as ToolCallState,
            name: c.name as string,
            detail: c.detail as string,
            output: c.output as string,
            expanded: c.expanded as boolean,
            expandKey: c.expandKey as string,
          },
          c.width,
        );
      case "Markdown":
        return markdownLines(theme, c.text as string, c.width);
      case "CommandMenu":
        return commandMenuLines(
          theme,
          {
            items: (c.items as [string, string][]).map(([usage, description]) => ({ usage, description })),
            selected: c.selected as number,
            state: undefined as CommandMenuState | undefined,
          },
          c.width,
        );
      default:
        throw new Error(`no fixture renderer for ${c.component}`);
    }
  })();
  return lines.map((line) => line.map((span) => span.text).join(""));
}

describe("shared terminal fixtures", () => {
  it("has recorded cases", () => {
    expect(fixtures.cases.length).toBeGreaterThan(0);
    expect(fixtures.cases.every((c) => c.expected.length > 0)).toBe(true);
  });

  for (const [index, c] of fixtures.cases.entries()) {
    const label = `${index} ${c.component} ${String(c.kind ?? c.state ?? "")} ${c.glyphs}`;
    it(`prints the same lines as the Rust crate: ${label}`, () => {
      expect(render(c)).toEqual(c.expected);
    });
  }
});
