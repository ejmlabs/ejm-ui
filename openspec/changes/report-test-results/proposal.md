# Proposal

## Why

The shared CI gate needs test-level outcomes to identify inconsistent tests across runs.

## What Changes

- Allow CI to request a Vitest JSON report while preserving the normal reporter and test exit status.

## Capabilities

### New Capabilities

- `test-results`: Machine-readable outcomes for the existing Vitest suite.

### Modified Capabilities

None.

## Impact

The root Vitest configuration covers package and gallery tests. The starter, Rust crate, public interfaces, and sibling projects are unchanged.
