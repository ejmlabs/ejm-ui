#!/usr/bin/env node
// Parity gate: compares packages/core/contract.json with each target's catalog.json
// ({ "Component": ["state", ...] }). A target must have every component and state it claims.
// A missing catalog file is pending, and fails only with --strict.
// Usage: node scripts/parity.mjs [--strict] [--root <dir>]
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('..', import.meta.url));

export function checkParity({ root = defaultRoot, strict = false } = {}) {
  const contract = JSON.parse(readFileSync(join(root, 'packages/core/contract.json'), 'utf8'));
  const failures = [];
  const pending = [];
  const ok = [];
  const warnings = [];

  for (const target of contract.targets) {
    const rel = contract.catalogs[target];
    if (!rel) {
      failures.push(`${target}: the contract has no catalog path`);
      continue;
    }
    const file = join(root, rel);
    if (!existsSync(file)) {
      pending.push(`${target}: ${rel} not written yet`);
      if (strict) failures.push(`${target}: ${rel} is missing`);
      continue;
    }
    let catalog;
    try {
      catalog = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      failures.push(`${target}: ${rel} is not valid JSON (${e.message})`);
      continue;
    }
    let states = 0;
    let bad = 0;
    for (const [name, spec] of Object.entries(contract.components)) {
      if (!spec.targets.includes(target)) continue;
      const have = catalog[name];
      if (!Array.isArray(have)) {
        failures.push(`${target}: missing component ${name}`);
        bad++;
        continue;
      }
      for (const state of spec.states) {
        if (have.includes(state)) states++;
        else {
          failures.push(`${target}: ${name} is missing state "${state}"`);
          bad++;
        }
      }
      for (const extra of have) if (!spec.states.includes(extra)) warnings.push(`${target}: ${name} has state "${extra}" that the contract does not list`);
    }
    if (!bad) ok.push(`${target}: ${states} states match`);
  }
  return { failures, pending, ok, warnings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const { failures, pending, ok, warnings } = checkParity({
    strict: args.includes('--strict'),
    root: rootIdx >= 0 ? resolve(args[rootIdx + 1]) : defaultRoot,
  });
  for (const l of ok) console.log(`parity ok       ${l}`);
  for (const l of pending) console.log(`parity pending  ${l}`);
  for (const l of warnings) console.log(`parity warning  ${l}`);
  for (const l of failures) console.error(`parity FAIL     ${l}`);
  if (failures.length) process.exit(1);
  console.log('parity: passed');
}
