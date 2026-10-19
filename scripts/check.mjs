#!/usr/bin/env node
// Repo-wide text checks: no em dashes anywhere in tracked source or docs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage', '.wrangler', 'target', 'build', '.react-router']);
const EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.md', '.json', '.html', '.svg', '.rs', '.toml']);
const DASH = String.fromCharCode(0x2014);
const bad = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(extname(p)) && readFileSync(p, 'utf8').includes(DASH)) bad.push(p.replace(root, ''));
  }
})(root);
if (bad.length) { console.error(`em dashes found in:\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log('check: no em dashes');
