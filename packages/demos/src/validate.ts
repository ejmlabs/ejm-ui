/**
 * Hand-written validators for the scenario files. A schema library would add a dependency for
 * four small data files and still could not do the checks that matter here (every edit matches
 * its project file once, every chip id has a script). Each validator returns a list of problems;
 * an empty list means the data matches the types in ./types.ts.
 */
import { buildDiff } from './text';
import type { CliScenario, HarnessScenario, IdeScenario, Project } from './types';

type Check = (value: unknown, path: string, out: string[]) => void;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const str: Check = (v, p, out) => {
  if (typeof v !== 'string') out.push(`${p}: expected a string`);
};
const nonEmpty: Check = (v, p, out) => {
  if (typeof v !== 'string' || v.trim() === '') out.push(`${p}: expected a non-empty string`);
};
const int = (min: number, max = Number.MAX_SAFE_INTEGER): Check => (v, p, out) => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) out.push(`${p}: expected an integer from ${min} to ${max}`);
};
const lit = (...allowed: unknown[]): Check => (v, p, out) => {
  if (!allowed.includes(v)) out.push(`${p}: expected one of ${allowed.map((a) => JSON.stringify(a)).join(', ')}`);
};
const arr = (item: Check, min = 0): Check => (v, p, out) => {
  if (!Array.isArray(v)) return void out.push(`${p}: expected an array`);
  if (v.length < min) out.push(`${p}: expected at least ${min} items`);
  v.forEach((x, i) => item(x, `${p}[${i}]`, out));
};
const tuple = (...items: Check[]): Check => (v, p, out) => {
  if (!Array.isArray(v) || v.length !== items.length) return void out.push(`${p}: expected an array of ${items.length}`);
  items.forEach((c, i) => c(v[i], `${p}[${i}]`, out));
};
/** An object with exactly these keys. Names in `optional` may be missing. Unknown keys are errors, so typos surface. */
const obj = (shape: Record<string, Check>, optional: string[] = []): Check => (v, p, out) => {
  if (!isObj(v)) return void out.push(`${p}: expected an object`);
  for (const k of Object.keys(v)) if (!(k in shape)) out.push(`${p}.${k}: unknown key`);
  for (const [k, c] of Object.entries(shape)) {
    if (k in v) c(v[k], `${p}.${k}`, out);
    else if (!optional.includes(k)) out.push(`${p}.${k}: missing`);
  }
};
const record = (item: Check): Check => (v, p, out) => {
  if (!isObj(v)) return void out.push(`${p}: expected an object`);
  for (const [k, x] of Object.entries(v)) item(x, `${p}.${k}`, out);
};

const edit = obj({ find: nonEmpty, replace: str });
const chip = obj({ id: nonEmpty, label: nonEmpty, prompt: nonEmpty });
const rule = obj({ id: nonEmpty, words: arr(nonEmpty, 1) });
const frame = { label: nonEmpty, name: nonEmpty, caption: nonEmpty, note: nonEmpty };
const say = obj({ say: nonEmpty });
const tool = obj({ tool: nonEmpty, args: str, read: obj({ path: nonEmpty, to: int(1) }, ['to']), search: nonEmpty, list: lit(true) }, ['read', 'search', 'list']);
const patch = (key: 'patch' | 'write', after: string) =>
  obj({ [key]: obj({ path: nonEmpty, edits: arr(edit, 1) }), intro: nonEmpty, applied: nonEmpty, [after]: nonEmpty });
const script = (extra: Check) => obj({ title: nonEmpty, steps: arr(extra, 1) });

/** Picks the step shape from the key it carries, so errors point at the right shape. */
const step = (kind: 'patch' | 'write', after: string): Check => (v, p, out) => {
  if (!isObj(v)) return void out.push(`${p}: expected an object`);
  if ('say' in v) say(v, p, out);
  else if ('tool' in v) tool(v, p, out);
  else if (kind in v) patch(kind, after)(v, p, out);
  else out.push(`${p}: expected a say, tool or ${kind} step`);
};

const projectCheck = obj({ name: nonEmpty, note: nonEmpty, files: arr(obj({ path: nonEmpty, lang: nonEmpty, text: str }), 1) });
const cliCheck = obj({
  project: nonEmpty,
  ...frame,
  app: obj({ name: nonEmpty, provider: nonEmpty, cwd: nonEmpty, title: nonEmpty, sessionId: nonEmpty }),
  empty: obj({ title: nonEmpty, help: arr(nonEmpty, 1) }),
  chips: arr(chip, 1),
  match: arr(rule, 1),
  scenarios: record(script(step('patch', 'blocked'))),
  afterGrant: obj({ say: nonEmpty }),
  blockedNotice: nonEmpty,
  fallback: nonEmpty,
  sessions: arr(obj({ id: nonEmpty, state: lit('idle', 'interrupted'), title: nonEmpty, transcript: arr(obj({ kind: lit('you', 'assistant'), text: nonEmpty }), 1) }), 1),
  help: (v, p, out) => {
    if (!isObj(v)) return void out.push(`${p}: expected an object`);
    for (const [k, x] of Object.entries(v)) {
      if (k === 'footer') nonEmpty(x, `${p}.footer`, out);
      else arr(tuple(nonEmpty, nonEmpty), 1)(x, `${p}.${k}`, out);
    }
    if (!('footer' in v)) out.push(`${p}.footer: missing`);
  },
});
const ideCheck = obj({
  project: nonEmpty,
  ...frame,
  reviewNote: nonEmpty,
  agent: nonEmpty,
  openFiles: arr(nonEmpty),
  models: arr(nonEmpty, 1),
  chips: arr(chip, 1),
  match: arr(rule, 1),
  scenarios: record(script(step('write', 'rejected'))),
  fallback: nonEmpty,
});
const harnessCheck = obj({
  ...frame,
  seed: int(0),
  tickMs: int(1),
  defaults: obj({ limit: int(1, 8), commands: int(1, 4), start: int(0, 50) }),
  realDefaults: nonEmpty,
  plan: arr(obj({ kind: lit('model', 'command'), label: nonEmpty, min: int(1), max: int(1) }), 1),
  recoveryTicks: int(1),
  langs: arr(obj({ id: nonEmpty, label: nonEmpty, caption: nonEmpty, code: nonEmpty }), 1),
});
const labelsCheck = obj({
  cli: obj({
    grantWrite: nonEmpty, grantHint: nonEmpty, plain: nonEmpty, plainHint: nonEmpty, controlsNote: nonEmpty, stopButton: nonEmpty, sessionsButton: nonEmpty,
    hints: arr(tuple(nonEmpty, nonEmpty), 1), patchTool: nonEmpty, blockedLine: nonEmpty, runStopped: nonEmpty, stopIdle: nonEmpty, quitNotice: nonEmpty,
    unsupportedNotice: nonEmpty, unknownCommand: nonEmpty, commands: arr(nonEmpty, 1), unsupportedCommands: arr(nonEmpty),
  }),
  ide: obj({ writeTool: nonEmpty, paletteSwitchModel: nonEmpty, paletteToggleTheme: nonEmpty, paletteOpenFile: nonEmpty, applyError: nonEmpty }),
});

const run = (check: Check, data: unknown): string[] => {
  const out: string[] = [];
  check(data, '$', out);
  return out;
};

type Rule = { id: string; words: string[] };
type AnyStep = Record<string, unknown>;

/** Cross checks that need the whole scenario: ids line up, and every tool read and edit works against the project. */
function crossCheck(data: { chips: { id: string }[]; match: Rule[]; scenarios: Record<string, { steps: unknown[] }> }, project: Project, kind: 'patch' | 'write'): string[] {
  const out: string[] = [];
  const files = new Map(project.files.map((f) => [f.path, f.text]));
  for (const c of data.chips) if (!(c.id in data.scenarios)) out.push(`chips: "${c.id}" has no script`);
  for (const m of data.match) if (!(m.id in data.scenarios)) out.push(`match: "${m.id}" has no script`);
  for (const [id, sc] of Object.entries(data.scenarios)) {
    sc.steps.forEach((raw, i) => {
      const st = raw as AnyStep;
      const at = `scenarios.${id}.steps[${i}]`;
      const read = st.read as { path: string } | undefined;
      if (read && !files.has(read.path)) out.push(`${at}: reads ${read.path}, which is not in the project`);
      const mod = st[kind] as { path: string; edits: { find: string; replace: string }[] } | undefined;
      if (mod) {
        const text = files.get(mod.path);
        if (text === undefined) out.push(`${at}: edits ${mod.path}, which is not in the project`);
        else if (!buildDiff(text, mod.edits, mod.path)) out.push(`${at}: an edit does not match ${mod.path} exactly once`);
      }
    });
  }
  return out;
}

export const validateProject = (data: unknown): string[] => run(projectCheck, data);
export const validateLabels = (data: unknown): string[] => run(labelsCheck, data);

export function validateCli(data: unknown, project: Project): string[] {
  const out = run(cliCheck, data);
  return out.length ? out : crossCheck(data as CliScenario, project, 'patch');
}
export function validateIde(data: unknown, project: Project): string[] {
  const out = run(ideCheck, data);
  if (out.length) return out;
  const ide = data as IdeScenario;
  for (const f of ide.openFiles) if (!project.files.some((p) => p.path === f)) out.push(`openFiles: ${f} is not in the project`);
  return out.concat(crossCheck(ide, project, 'write'));
}
export function validateHarness(data: unknown): string[] {
  const out = run(harnessCheck, data);
  if (out.length) return out;
  const h = data as HarnessScenario;
  h.plan.forEach((p, i) => { if (p.max < p.min) out.push(`plan[${i}]: max is below min`); });
  return out;
}
