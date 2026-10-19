/** Pure text helpers ported from design-kit demo.js: edits, unified diffs, line roles and the seeded random source. */
import type { Edit } from './types';

export const splitLines = (text: string): string[] => {
  const l = text.split('\n');
  if (l[l.length - 1] === '') l.pop();
  return l;
};

export type ApplyResult = { ok: true; text: string } | { ok: false; error: string; text: string };

/** Applies edits in order. Each `find` must match exactly once at the time it is applied. */
export function applyEdits(text: string, edits: Edit[]): ApplyResult {
  let t = text;
  for (const e of edits) {
    const i = t.indexOf(e.find);
    if (i < 0) return { ok: false, error: 'no match for the old text; it may already be applied', text };
    if (t.indexOf(e.find, i + 1) >= 0) return { ok: false, error: 'the old text matches more than once', text };
    t = t.slice(0, i) + e.replace + t.slice(i + e.find.length);
  }
  return { ok: true, text: t };
}

/** Unified diff of the edits against `text` with two lines of context, or null when an edit does not match once. */
export function buildDiff(text: string, edits: Edit[], path: string): string[] | null {
  const lines = ['--- a/' + path, '+++ b/' + path];
  let t = text;
  let delta = 0;
  for (const e of edits) {
    const i = t.indexOf(e.find);
    if (i < 0 || t.indexOf(e.find, i + 1) >= 0) return null;
    const start = t.lastIndexOf('\n', i - 1) + 1;
    const end = i + e.find.length;
    let stop = t.indexOf('\n', end);
    if (stop < 0) stop = t.length;
    const oldB = t.slice(start, stop).split('\n');
    const newB = (t.slice(start, i) + e.replace + t.slice(end, stop)).split('\n');
    const all = splitLines(t);
    const a = t.slice(0, start).split('\n').length - 1;
    let p = 0;
    while (p < oldB.length && p < newB.length && oldB[p] === newB[p]) p++;
    let s = 0;
    while (s < oldB.length - p && s < newB.length - p && oldB[oldB.length - 1 - s] === newB[newB.length - 1 - s]) s++;
    const rem = oldB.slice(p, oldB.length - s);
    const add = newB.slice(p, newB.length - s);
    const c0 = Math.max(0, a + p - 2);
    const before = all.slice(c0, a + p);
    const after = all.slice(a + oldB.length - s, a + oldB.length - s + 2);
    lines.push(`@@ -${c0 + 1},${before.length + rem.length + after.length} +${c0 + 1 + delta},${before.length + add.length + after.length} @@`);
    for (const l of before) lines.push(' ' + l);
    for (const l of rem) lines.push('-' + l);
    for (const l of add) lines.push('+' + l);
    for (const l of after) lines.push(' ' + l);
    delta += add.length - rem.length;
    t = t.slice(0, i) + e.replace + t.slice(end);
  }
  return lines;
}

export type DiffKind = 'hunk' | 'file' | 'add' | 'del' | 'ctx';
export const diffKind = (l: string): DiffKind =>
  l.startsWith('@@') ? 'hunk' : l.startsWith('+++') || l.startsWith('---') ? 'file' : l[0] === '+' ? 'add' : l[0] === '-' ? 'del' : 'ctx';

/** Color role of a line: the cli transcript colors diff lines by these. */
export type Role = 'special' | 'dim' | 'ok' | 'err' | 'accent' | null;
export const roleOf = (l: string): Role => {
  const k = diffKind(l);
  return k === 'hunk' ? 'special' : k === 'file' ? 'dim' : k === 'add' ? 'ok' : k === 'del' ? 'err' : null;
};

export interface TextLine {
  t: string;
  r: Role;
  /** True for bold accent headings ("# Title"). */
  bold?: boolean;
}

/** Splits assistant text into transcript lines: fences and fenced code are dim (diff fences use diff roles), "# " lines are headings. */
export function parseText(text: string): TextLine[] {
  const out: TextLine[] = [];
  let fence: string | null = null;
  for (const t of text.split('\n')) {
    if (t.startsWith('```')) {
      fence = fence === null ? t.slice(3) : null;
      out.push({ t, r: 'dim' });
    } else if (fence !== null) out.push({ t, r: fence === 'diff' ? roleOf(t) : 'dim' });
    else if (t.startsWith('# ')) out.push({ t, r: 'accent', bold: true });
    else out.push({ t, r: null });
  }
  return out;
}

/** mulberry32, the same generator demo.js used, so a seed gives the same timing. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The first match rule with a word found in the lower-cased text, or null. */
export function matchPrompt(rules: { id: string; words: string[] }[], text: string): string | null {
  const w = text.toLowerCase();
  for (const m of rules) if (m.words.some((x) => w.includes(x))) return m.id;
  return null;
}

export const pad = (n: number, w: number): string => String(n).padStart(w, ' ');
