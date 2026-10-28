# Tasks

## 1. Contract

- [x] 1.1 Add the four components, glyphs and words to `contract.json` and its types; verify with the core contract tests.

## 2. Targets

- [x] 2.1 Implement the blocks and `ActivityLine` details in `crates/ejm-tui`; verify with render, glyph, word and workspace tests, Clippy and rustfmt.
- [x] 2.2 Implement the blocks in `packages/ink`; verify with state and conversation tests and typecheck.
- [x] 2.3 Regenerate both catalogs; verify with `node scripts/parity.mjs --strict`.

## 3. Integration

- [x] 3.1 Run `npm run check` and `npm run check:rust`.

  - Passed: parity for web, Ink and Rust; 101 test files, 979 tests (two skipped); crate tests, Clippy and rustfmt. Shared fixtures in `packages/core/terminal-fixtures.json` hold Rust and Ink to the same lines. `ansi_colours` (LGPL-3.0) was replaced by `ansi256`, a port of Ink's `toAnsi256`, and `unicode-truncate` follows ratatui's 2.x series so consumers build one copy.

## Workflow follow-up

- Retire `packages/tokens/rust/ejm_tui.rs` and the design kit copy, then sync and archive this change.
