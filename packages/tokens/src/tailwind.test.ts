import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'generated', 'tailwind.css'), 'utf8');

describe('automatic band selectors', () => {
  it('give an odd [data-band="auto"] sibling the Mist ground and an even one the Paper ground', () => {
    expect(css).toMatch(/\[data-band="mist"\], \[data-band="auto"\]:nth-child\(odd of \[data-band="auto"\]\) \{\n    --ejm-scheme: [^\n]*\n    --ejm-ground: var\(--ejm-mist-ground\);/);
    expect(css).toMatch(/:root, \[data-theme\], \[data-band="paper"\], \[data-band="auto"\]:nth-child\(even of \[data-band="auto"\]\) \{\n    --ejm-scheme: [^\n]*\n    --ejm-ground: var\(--ejm-paper-ground\);/);
  });

  it('reach both themes through the themed variables, with no separate rule per theme', () => {
    expect(css.match(/\[data-band="auto"\]:nth-child/g)).toHaveLength(2);
    expect(css).toMatch(/\[data-theme="dark"\] \{[^}]*--ejm-mist-ground:/);
    expect(css).toMatch(/\[data-theme="dark"\] \{[^}]*--ejm-paper-ground:/);
  });
});
