#!/usr/bin/env node
// Two gates for packages/ui:
//  1. Every component is listed in packages/ui/COMPONENTS.md. Each file under src/components/** must appear there by its path, and
//     every capitalized component exported from any other src/**/*.tsx file must appear there by name.
//  2. The containerless rule: no component is named or classed card, panel or tile. Names are split into words (ProductPanel is
//     "product", "panel"); class names are the lowercase class-like strings in source. Comments and docs may use the words.
//     `ui-panel` is the product window color from @ejm/tokens and is allowed.
// Usage: node packages/ui/scripts/check-components.mjs   (exit 1 on any failure, naming the component)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ui = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(ui, 'src');
const docs = readFileSync(join(ui, 'COMPONENTS.md'), 'utf8');
const walk = d => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const isTest = f => /\.test\.tsx?$/.test(f) || /test-setup\.tsx?$/.test(f);
const files = walk(src).filter(f => /\.tsx$/.test(f) && !isTest(f));
const problems = [];

const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const exportedComponents = t => [...t.matchAll(/^export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/gm)].map(m => m[1]);
const words = name => name.match(/[A-Z][a-z0-9]*|[a-z0-9]+/g) ?? [];
const bannedWord = /^(card|panel|tile)s?$/i;
const allowedClass = /(^|-)ui-panel(?=$|[-/:\]])/;
const classToken = /(^|[-:!])(card|panel|tile)s?(?=$|[-/:\]])/;
const classLike = /^[a-z0-9:_\-/[\].\s%()!#&>*=@'"]+$/;

for (const f of files) {
  const rel = relative(src, f).split('\\').join('/');
  const text = stripComments(readFileSync(f, 'utf8'));
  const names = exportedComponents(text);
  if (rel.startsWith('components/')) {
    if (!docs.includes(rel)) problems.push(`${rel}: not listed in COMPONENTS.md (add a row naming the file)`);
  } else {
    for (const n of names) if (!new RegExp(`\\b${n}\\b`).test(docs)) problems.push(`${rel}: component ${n} is not listed in COMPONENTS.md`);
  }
  for (const n of names) if (words(n).some(w => bannedWord.test(w))) problems.push(`${rel}: component ${n} is a card, panel or tile (the design language has none)`);
  for (const m of text.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const lit = m[2];
    if (!classLike.test(lit)) continue;
    for (const tok of lit.split(/\s+/)) {
      if (allowedClass.test(tok)) continue;
      if (classToken.test(tok)) problems.push(`${rel}: class "${tok}" is a card, panel or tile (the design language has none)`);
    }
  }
}

if (problems.length) {
  console.error(`components: ${problems.length} problem(s)\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exit(1);
}
console.log(`components: ${files.length} component files listed in COMPONENTS.md, no card, panel or tile`);
