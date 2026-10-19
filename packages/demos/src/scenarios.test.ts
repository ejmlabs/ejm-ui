// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cliScenario, harnessScenario, ideScenario, labels, project } from './scenarios';
import { validateCli, validateHarness, validateIde, validateLabels, validateProject } from './validate';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'scenarios');

describe('scenario files match their types', () => {
  it('project', () => expect(validateProject(project)).toEqual([]));
  it('cli', () => expect(validateCli(cliScenario, project)).toEqual([]));
  it('ide', () => expect(validateIde(ideScenario, project)).toEqual([]));
  it('harness', () => expect(validateHarness(harnessScenario)).toEqual([]));
  it('labels', () => expect(validateLabels(labels)).toEqual([]));

  it('every scenario states that it is simulated', () => {
    for (const s of [cliScenario, ideScenario, harnessScenario]) expect(s.note).toMatch(/^Simulated demo\. Nothing runs on your machine and nothing is sent anywhere\./);
  });
});

describe('the validator catches real mistakes', () => {
  const clone = <T>(v: T): T => structuredClone(v);

  it('a misspelled key', () => {
    const bad = clone(cliScenario) as unknown as Record<string, unknown>;
    bad['chip'] = bad['chips'];
    delete bad['chips'];
    expect(validateCli(bad, project).join('\n')).toMatch(/chip: unknown key[\s\S]*chips: missing/);
  });

  it('a chip with no script', () => {
    const bad = clone(ideScenario);
    bad.chips.push({ id: 'ghost', label: 'Ghost', prompt: 'boo' });
    expect(validateIde(bad, project)).toEqual(['chips: "ghost" has no script']);
  });

  it('an edit whose old text is not in the file once', () => {
    const bad = clone(cliScenario);
    const step = bad.scenarios['fix']!.steps.find((s) => 'patch' in s)!;
    if ('patch' in step) step.patch.edits[0]!.find = 'text that is not in retry.rs';
    expect(validateCli(bad, project).join('\n')).toMatch(/an edit does not match src\/retry\.rs exactly once/);
  });

  it('a read of a file the project does not have', () => {
    const bad = clone(ideScenario);
    const step = bad.scenarios['explain']!.steps.find((s) => 'read' in s)!;
    if ('read' in step && step.read) step.read.path = 'missing.rs';
    expect(validateIde(bad, project).join('\n')).toMatch(/reads missing\.rs/);
  });

  it('a slider default outside the range', () => {
    const bad = clone(harnessScenario);
    bad.defaults.limit = 9;
    expect(validateHarness(bad).join('\n')).toMatch(/defaults\.limit/);
  });
});

describe('provenance', () => {
  it('copied files still match the recorded hashes', () => {
    const doc = readFileSync(join(dir, 'PROVENANCE.md'), 'utf8');
    const rows = [...doc.matchAll(/\| (\w+\.json) \| `[^`]+` \| `([0-9a-f]{64})` \|/g)];
    expect(rows.map((r) => r[1])).toEqual(['cli.json', 'ide.json', 'harness.json', 'harbor.json']);
    for (const [, file, sha] of rows) expect(createHash('sha256').update(readFileSync(join(dir, file!))).digest('hex'), file).toBe(sha);
  });
});
