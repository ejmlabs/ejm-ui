# Proposal

## Why

Both tarball proofs crash on current Node 24 with `TypeError: object is not iterable`. npm 12, bundled with Node 24.22.1, prints `npm pack -w <pkg> --json` as an object keyed by package name where npm 11 printed an array, and both scripts destructure the array form. The proofs run before relying on any `package.json`, `files` or `exports` change, so they fail before checking anything.

## What Changes

- `scripts/pack-proof.mjs` and `scripts/pack-proof-publish.mjs` read the `npm pack -w <pkg> --json` result in either shape: the npm 11 array or the npm 12 object keyed by package name.
- No change to what the proofs check, to the packed tarballs, or to the consumer installs.

## Capabilities

### New Capabilities

- `pack-proofs`: The tarball proofs run to completion on the supported npm majors, so a pass or failure reflects the packages and not the npm version.

### Modified Capabilities

None.

## Impact

Touches only `scripts/pack-proof.mjs` and `scripts/pack-proof-publish.mjs`, plus a CHANGELOG line. No package, export, manifest or file list changes. Out of scope: the chess board change, other npm 12 differences outside `npm pack --json`, a shared helper module for the two scripts, and pinning an npm version in CI.
