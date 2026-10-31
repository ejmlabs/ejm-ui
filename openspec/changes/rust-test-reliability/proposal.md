# Proposal

## Why

Intermittent Rust test failures need structured evidence without retrying a failed gate into green.

## What Changes

- Run a bounded test-reliability workflow on main and daily.
- Keep the existing human-admitted PR gate unchanged.

## Capabilities

### New Capabilities

- `rust-test-reliability`: Detection of inconsistent ejm-tui Rust test outcomes.

### Modified Capabilities

None.

## Impact

The `crates/ejm-tui` test automation changes. Packages, gallery, starter and sibling repositories remain outside this change.
