#!/usr/bin/env node
// The containerless gate for packages/ui/src: there are no cards, panels or tiles, and no grouping boxes.
//
// Fails when any .ts or .tsx file (outside tests) under the scanned folder
//   1. exports a component, function, type or constant whose name has the word card, panel or tile in it (ProductPanel is "product", "panel"),
//   2. uses a class name with the word card, panel or tile (`card`, `ejm-card`, `bg-card`, `text-card-foreground`; `ui-panel` is the
//      product window color and is allowed), or
//   3. combines a filled background and a box edge in one class string, which is how a grouping box is built:
//        a fill (bg-tone, bg-muted, bg-ground, bg-field, bg-secondary, bg-accent, bg-popover, bg-mist, bg-paper, bg-sage, bg-white, bg-ui-*)
//        with a radius larger than the control radius (rounded-lg, rounded-xl and up, rounded-window), or
//        any fill with an all-sides border (`border`, `border-2`).
//      Variant-prefixed classes (hover:bg-tone, data-[state=open]:border) are states, not resting boxes, and are ignored.
//
// Files that really are controls or objects are in ALLOW with the reason. Add a file there only for a control (input, button, switch,
// select), an overlay (menu, dialog, toast, tooltip) or a product window; a group of content is never a reason.
//
// Usage: node packages/ui/scripts/check-containerless.mjs [folder]    (default: packages/ui/src; exit 1 on any finding)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '..', 'src'));

/** Paths relative to the scanned folder. A trailing slash means every file below it. */
const ALLOW = [
  ['components/ui/', 'controls and overlays: buttons, inputs, selects, switches, tabs, menus, dialogs, toasts, tooltips and badges keep their control shapes'],
  ['layout/ProductWindow.tsx', 'the product window is an object with its own frame and elevation, the one allowed box'],
  ['shell/ThemeToggle.tsx', 'the theme toggle is a control'],
  ['docs/SidebarFilter.tsx', 'the filter is a search input, a control'],
  ['docs/CodeBlock.tsx', 'a code block is an object with a flat ground, not a group of content'],
  ['docs/CodeTabs.tsx', 'a code block is an object with a flat ground, not a group of content'],
];
/** Names that contain a banned word but are not containers. Empty on purpose: add with a reason. */
const ALLOW_NAMES = new Set([]);

const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? (n === 'node_modules' ? [] : walk(join(d, n))) : [join(d, n)]));
const isTest = f => /\.test\.tsx?$/.test(f) || /test-setup\.tsx?$/.test(f) || /\.d\.ts$/.test(f);
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const words = name => name.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+/g) ?? [];
const banned = /^(card|panel|tile)s?$/i;
const bannedClass = /(^|[-:!])(card|panel|tile)s?(?=$|[-/:\]])/;
const allowedClass = /(^|-)ui-panel(?=$|[-/:\]])/;
const classLike = /^[a-z0-9:_\-/[\].\s%()!#&>*=@'",+]+$/;
const FILL = /^bg-(tone|muted|ground|field|secondary|accent|popover|card|mist|paper|sage|white|ui-[a-z0-9-]+)(\/\d+)?$/;
const ANY_FILL = /^bg-(?!transparent$|none$|clip-|origin-|no-repeat$|repeat|center$|cover$|contain$|fixed$|local$|scroll$|linear|radial|conic|gradient|blend-)/;
const BIG_RADIUS = /^rounded(-(lg|xl|2xl|3xl|4xl|window))$/;
const EDGE = /^border(-\d+)?$/;

const literals = text => [...text.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(m => m[2]).filter(s => classLike.test(s) && /[a-z]/.test(s));
const tokens = lit => lit.split(/\s+/).filter(Boolean);

/** Class strings to judge: each literal alone, and the union of the literals inside one cn(...) or clsx(...) call. */
function groups(text) {
  const out = literals(text).map(tokens);
  for (const m of text.matchAll(/\b(?:cn|clsx|twMerge)\(/g)) {
    let depth = 1, i = m.index + m[0].length;
    for (; i < text.length && depth; i++) depth += text[i] === '(' ? 1 : text[i] === ')' ? -1 : 0;
    const union = literals(text.slice(m.index + m[0].length, i - 1)).flatMap(tokens);
    if (union.length) out.push(union);
  }
  return out;
}

export function scan(dir) {
  const problems = [];
  for (const f of walk(dir).filter(f => /\.tsx?$/.test(f) && !isTest(f))) {
    const rel = relative(dir, f).split('\\').join('/');
    const allowed = ALLOW.some(([p]) => (p.endsWith('/') ? rel.startsWith(p) : rel === p));
    if (allowed) continue;
    const text = stripComments(readFileSync(f, 'utf8'));

    const names = [
      ...[...text.matchAll(/^export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]),
      ...[...text.matchAll(/^export\s*(?:type\s*)?\{([^}]*)\}/gm)].flatMap(m => m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop())),
    ];
    for (const n of names) if (n && !ALLOW_NAMES.has(n) && words(n).some(w => banned.test(w))) problems.push(`${rel}: exports "${n}", a card, panel or tile (the design language has none)`);

    for (const g of groups(text)) {
      for (const tok of g) if (!allowedClass.test(tok) && bannedClass.test(tok)) problems.push(`${rel}: class "${tok}" is a card, panel or tile (the design language has none)`);
      const resting = g.filter(t => !t.includes(':'));
      const fill = resting.find(t => FILL.test(t));
      const radius = resting.find(t => BIG_RADIUS.test(t));
      const edge = resting.find(t => EDGE.test(t));
      const anyFill = resting.find(t => ANY_FILL.test(t));
      if (fill && radius) problems.push(`${rel}: "${fill}" with "${radius}" is a filled rounded box. Group with space, hairlines or a band instead`);
      if (edge && anyFill) problems.push(`${rel}: "${edge}" with "${anyFill}" is a bordered, filled box. Group with space, hairlines or a band instead`);
    }
  }
  return [...new Set(problems)];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = scan(root);
  if (problems.length) {
    console.error(`containerless: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`containerless: no card, panel, tile or grouping box under ${relative(process.cwd(), root) || '.'}`);
}
