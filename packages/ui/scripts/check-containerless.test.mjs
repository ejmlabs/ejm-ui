import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-containerless.mjs');
const dirs = [];
afterAll(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));

/** Write a fixture folder, run the gate on it, return its exit code and what it said. */
function run(files) {
  const dir = mkdtempSync(join(tmpdir(), 'ejm-containerless-'));
  dirs.push(dir);
  for (const [name, src] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), src);
  }
  try {
    return { code: 0, out: execFileSync('node', [script, dir], { encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stderr) };
  }
}

describe('check-containerless', () => {
  it('passes on hairline rows, bands and a hover tone', () => {
    const r = run({
      'Rows.tsx': `export function Rows() { return <ul className="hairline-t"><li className="hairline py-6 hover:bg-tone">x</li></ul>; }`,
      'Band.tsx': `export const Band = () => <section data-band="sage" className="band py-rhythm" />;`,
    });
    expect(r.code).toBe(0);
  });

  it('fails on a card component, a card class, and a rounded filled box', () => {
    const card = run({ 'Card.tsx': `export function Card() { return <div className="p-4">x</div>; }` });
    expect(card.code).toBe(1);
    expect(card.out).toContain('"Card"');
    expect(run({ 'x.tsx': `export const X = () => <div className="ejm-card" />;` }).code).toBe(1);
    expect(run({ 'x.tsx': `export const X = () => <div className="bg-tone rounded-xl p-6" />;` }).code).toBe(1);
    const bordered = run({ 'x.tsx': `export const X = () => <div className={cn('border border-line', 'bg-field p-4')} />;` });
    expect(bordered.code).toBe(1);
    expect(bordered.out).toContain('bordered, filled box');
  });

  it('judges words, not substrings, and allows the ui-panel window color', () => {
    const r = run({ 'x.tsx': `export const Capitalize = () => <div className="bg-ui-panel text-ui-text" />; export const Cardinal = 1;` });
    expect(r.code).toBe(0);
  });

  it('allows the product window and controls on its list, and nothing else', () => {
    const box = `export const Thing = () => <div className="rounded-window border bg-ui-editor" />;`;
    expect(run({ 'layout/ProductWindow.tsx': box }).code).toBe(0);
    expect(run({ 'layout/Other.tsx': box }).code).toBe(1);
  });
});
