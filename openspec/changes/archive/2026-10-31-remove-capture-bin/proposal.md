# Proposal

## Why

`@ejm/shots` declares the bin `ejm-capture-terminal` pointing at
`packages/shots/src/capture.mjs`. That file is a library module: it exports
`captureShot` and its helpers, reads no arguments and has no `#!/usr/bin/env node`
line, so the bin cannot run. Nothing calls it; captures run through
`node scripts/capture-terminal.mjs`, and sibling repositories only list it in
lockfiles. Because it is a bin, every `npm ci` marks the file executable, which leaves
a mode change from 100644 to 100755 in `git status` after each install.

## What Changes

- `packages/shots/package.json` drops the `bin` field, and the lockfile drops the
  matching entry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The removed bin never ran, so no specified behavior changes; this change sets
`skip_specs`.

## Impact

- `@ejm/shots` (private) and the root lockfile only. `scripts/capture-terminal.mjs`
  and the `captureShot` import path are unchanged.

Out of scope:

- The gallery, the starter, `crates/ejm-tui`, and every other package.
- A command-line entry inside `@ejm/shots`; the documented entry point stays
  `node scripts/capture-terminal.mjs`.
