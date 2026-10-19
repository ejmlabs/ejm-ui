#!/usr/bin/env node
// Copies the generated Rust theme into the ejm-tui crate so the crate builds on its own and ejm-cli can depend on it
// by path. The source of truth is packages/tokens/rust/ejm_theme.rs, which the tokens generator writes from theme.json.
//
//   node scripts/sync-rust-theme.mjs           copy the generated theme to crates/ejm-tui/src/theme.rs
//   node scripts/sync-rust-theme.mjs --check   exit 1 when the copy is missing or stale
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const from = `${root}packages/tokens/rust/ejm_theme.rs`;
const to = `${root}crates/ejm-tui/src/theme.rs`;

if (!existsSync(from)) {
  console.error('sync-rust-theme: packages/tokens/rust/ejm_theme.rs is missing. Run `npm run build -w @ejm/tokens` first.');
  process.exit(2);
}
const source = readFileSync(from, 'utf8');
const current = existsSync(to) ? readFileSync(to, 'utf8') : null;

if (process.argv.includes('--check')) {
  if (current !== source) {
    console.error('sync-rust-theme: crates/ejm-tui/src/theme.rs is stale. Run `node scripts/sync-rust-theme.mjs` and commit it.');
    process.exit(1);
  }
  console.log('sync-rust-theme: crates/ejm-tui/src/theme.rs is current');
} else if (current === source) {
  console.log('sync-rust-theme: already current');
} else {
  writeFileSync(to, source);
  console.log('sync-rust-theme: wrote crates/ejm-tui/src/theme.rs');
}
