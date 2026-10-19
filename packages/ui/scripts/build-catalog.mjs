#!/usr/bin/env node
// Merges every packages/ui/src/catalog/*.json (one file per workstream: primitives, layout, shell, docs) into
// packages/ui/src/catalog.json, the web catalog that scripts/parity.mjs compares with packages/core/contract.json.
// Each input is { "ComponentName": ["state", ...] }. A component named in two files, an empty state list or a repeated state is an error.
// Usage: node packages/ui/scripts/build-catalog.mjs [--check]
//   --check   write nothing; exit 1 when src/catalog.json is missing or out of date.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ui = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ui, 'src', 'catalog');
const out = join(ui, 'src', 'catalog.json');
const check = process.argv.includes('--check');

const problems = [];
const owner = new Map();
const merged = {};
for (const file of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  let data;
  try { data = JSON.parse(readFileSync(join(dir, file), 'utf8')); } catch (e) { problems.push(`${file}: ${e.message}`); continue; }
  for (const [name, states] of Object.entries(data)) {
    if (!Array.isArray(states) || states.length === 0 || states.some(s => typeof s !== 'string' || !s)) problems.push(`${file}: ${name} needs a non-empty list of state names`);
    else if (new Set(states).size !== states.length) problems.push(`${file}: ${name} repeats a state`);
    if (owner.has(name)) problems.push(`${name} is in both ${owner.get(name)} and ${file}`);
    owner.set(name, file);
    merged[name] = states;
  }
}
if (problems.length) {
  console.error(`catalog: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
const text = JSON.stringify(sorted, null, 2) + '\n';
if (check) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== text) {
    console.error('catalog: packages/ui/src/catalog.json is out of date. Run: node packages/ui/scripts/build-catalog.mjs');
    process.exit(1);
  }
  console.log(`catalog: ${Object.keys(sorted).length} components, up to date`);
} else {
  writeFileSync(out, text);
  console.log(`catalog: wrote ${Object.keys(sorted).length} components to packages/ui/src/catalog.json`);
}
