import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// A bare `@ejm/ui` import loads the whole component barrel. These packages run in every site's first load, so they must use deep
// imports (`@ejm/ui/font-preloads`, `@ejm/ui/hooks/useInView`) or a site cannot keep its JavaScript small.
const packages = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(join(dir, e.name)) : /\.(tsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(dir, e.name)] : []));

describe('shared packages never import the @ejm/ui barrel', () => {
  for (const name of ['site', 'demos', 'ssg']) {
    it(`packages/${name}/src`, () => {
      const barrel = /(?:from|import|require)\s*\(?\s*['"]@ejm\/ui['"]/;
      const bad = files(join(packages, name, 'src')).filter(f => barrel.test(readFileSync(f, 'utf8')));
      expect(bad.map(f => f.slice(packages.length))).toEqual([]);
    });
  }
});
