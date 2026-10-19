// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contract } from "./index";

describe("component contract", () => {
  it("lists the ten primitives, each with states and a target claim", () => {
    expect(Object.keys(contract.components).sort()).toEqual(
      ["Callout", "KeyHints", "Prompt", "Row", "Rule", "Stat", "StateBlock", "Status", "Table", "Text"],
    );
    for (const [name, c] of Object.entries(contract.components)) {
      expect(c.states.length, name).toBeGreaterThan(0);
      expect(new Set(c.states).size, `${name} states unique`).toBe(c.states.length);
      expect(c.targets.length, name).toBeGreaterThan(0);
      for (const t of c.targets) expect(contract.targets, name).toContain(t);
    }
  });

  it("gives every stateful component a state prop whose values match its states", () => {
    for (const [name, c] of Object.entries(contract.components)) {
      const prop = c.props.find((p) => ["state", "status", "kind"].includes(p.name));
      if (c.states.length > 1) expect(prop?.values, name).toEqual(c.states);
    }
  });

  it("names every status and state in words so none depends on color", () => {
    for (const level of contract.components.Status.states) {
      const g = contract.glyphs.status[level as keyof typeof contract.glyphs.status];
      expect(g.label.length).toBeGreaterThan(0);
      expect(g.unicode.length).toBeGreaterThan(0);
      expect(g.ascii).toMatch(/^[\x20-\x7e]+$/);
    }
    const glyphs = Object.values(contract.glyphs.status).map((g) => g.ascii + g.label);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});
