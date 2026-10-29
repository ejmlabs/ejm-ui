# Proposal

## Why

Each ejmlabs CLI drew its own transcript. ejm-cli carried a private copy of the old kit helpers plus its own message, tool call, Markdown and command menu code, so improvements in one CLI never reached another, and none reached a JavaScript CLI. The contract already gives web, Ink and Rust one set of primitives; the blocks a terminal agent needs were missing from it.

## What Changes

- Add `Message`, `ToolCall` and `CommandMenu` to `packages/core/contract.json` for the `ink` and `rust` targets, with glyphs (`message`, `toolCall`, `elbow`) and default words.
- Implement them in `crates/ejm-tui` and `packages/ink` with the same line format, and cover them in both targets' render and state tests and the parity gate.
- Extend `ActivityLine` with details and a spinner frame, and export `elapsed_text` and `compact_count`.

## Capabilities

### New Capabilities

- `terminal-conversation-blocks`: shared transcript blocks for terminal agents.

### Modified Capabilities

None.

## Impact

Adds contract entries, Rust and Ink components, tests and docs. `ActivityLine` struct literals need `..ActivityLine::default()`. ejm-cli moves onto `ejm-tui` in its own change. The web target does not claim the new components. Once ejm-cli has moved, the hand-written `packages/tokens/rust/ejm_tui.rs` is deleted and `rust/TUI.md` is rewritten to point at the crate and the contract. The design kit's copy is retired in its own repo.
