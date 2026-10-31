# Tasks

## 1. Pack JSON parsing

- [x] 1.1 Read the `npm pack --json` result in either shape in `scripts/pack-proof.mjs` and `scripts/pack-proof-publish.mjs`; verify `node scripts/pack-proof.mjs` passes under the default npm 12 and again with npm 11 first on PATH, and that `node scripts/pack-proof-publish.mjs` passes under both.
- [x] 1.2 Add a CHANGELOG line for the fix; verify `node scripts/check.mjs` (em dash scan) passes.

## 2. Integration

- [x] 2.1 Run `npm run check` and confirm it passes.
