// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as core from "./index";

describe("headless core", () => {
  it("loads in plain Node with no DOM globals", () => {
    expect(typeof (globalThis as Record<string, unknown>).window).toBe("undefined");
    expect(typeof (globalThis as Record<string, unknown>).document).toBe("undefined");
    expect(Object.keys(core).length).toBeGreaterThan(20);
  });

  it("never imports React, Ink or the DOM", () => {
    const dir = new URL(".", import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      const src = readFileSync(new URL(file, dir), "utf8");
      expect(src, file).not.toMatch(/from ["'](react|react-dom|ink|preact)/);
      expect(src, file).not.toMatch(/\b(document|window|localStorage)\./);
    }
  });
});
