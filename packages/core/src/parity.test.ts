// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkParity } from "../../../scripts/parity.mjs";
import { contract } from "./contract";

let root: string;
const contractFile = new URL("../contract.json", import.meta.url).pathname;

/** The catalog a target would publish if it implemented the whole contract. */
const full = (target: string) =>
  Object.fromEntries(Object.entries(contract.components).filter(([, c]) => c.targets.includes(target as never)).map(([n, c]) => [n, [...c.states]]));

function write(target: "web" | "ink" | "rust", catalog: unknown) {
  const file = join(root, contract.catalogs[target]);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(catalog));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "parity-"));
  mkdirSync(join(root, "packages/core"), { recursive: true });
  cpSync(contractFile, join(root, "packages/core/contract.json"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("parity check", () => {
  it("passes when every target has every claimed component and state", () => {
    for (const t of ["web", "ink", "rust"] as const) write(t, full(t));
    const r = checkParity({ root, strict: true });
    expect(r.failures).toEqual([]);
    expect(r.ok).toHaveLength(3);
  });

  it("fails and names the target, component and state when a state is removed", () => {
    for (const t of ["web", "ink", "rust"] as const) write(t, full(t));
    const rust = full("rust");
    rust.Row = rust.Row!.filter((s) => s !== "focused");
    write("rust", rust);
    const r = checkParity({ root });
    expect(r.failures).toEqual(['rust: Row is missing state "focused"']);
  });

  it("fails when a claimed component is missing", () => {
    for (const t of ["web", "ink", "rust"] as const) write(t, full(t));
    const ink = full("ink") as Record<string, string[]>;
    delete ink.Table;
    write("ink", ink);
    expect(checkParity({ root }).failures).toEqual(["ink: missing component Table"]);
  });

  it("treats a missing catalog as pending, and as a failure only with strict", () => {
    write("ink", full("ink"));
    const lax = checkParity({ root });
    expect(lax.failures).toEqual([]);
    expect(lax.pending.map((p) => p.split(":")[0])).toEqual(["web", "rust"]);
    const strict = checkParity({ root, strict: true });
    expect(strict.failures.map((p) => p.split(":")[0])).toEqual(["web", "rust"]);
  });

  it("fails on a catalog that is not valid JSON", () => {
    const file = join(root, contract.catalogs.ink);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, "{ not json");
    expect(checkParity({ root }).failures[0]).toMatch(/^ink: .* is not valid JSON/);
  });

  it("ignores components a target does not claim", () => {
    const spec = JSON.parse(JSON.stringify(contract));
    spec.components.Table.targets = ["web", "rust"];
    writeFileSync(join(root, "packages/core/contract.json"), JSON.stringify(spec));
    const ink = full("ink") as Record<string, string[]>;
    delete ink.Table;
    write("ink", ink);
    expect(checkParity({ root }).failures).toEqual([]);
  });

  it("passes against the real ink catalog in this repo", () => {
    const r = checkParity();
    expect(r.failures.filter((f) => f.startsWith("ink:"))).toEqual([]);
  });
});
