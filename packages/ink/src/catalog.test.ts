// @vitest-environment node
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "./catalog";

const file = new URL("../catalog.json", import.meta.url);
const text = JSON.stringify(buildCatalog(), null, 2) + "\n";

describe("catalog.json", () => {
  it("matches what the components implement (run `npm run catalog -w packages/ink` to regenerate)", () => {
    if (process.env.EJM_WRITE_CATALOG) writeFileSync(file, text);
    expect(readFileSync(file, "utf8")).toBe(text);
  });
});
