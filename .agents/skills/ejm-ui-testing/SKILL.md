---
name: ejm-ui-testing
description: Use when you add, change or run tests or checks in ejm-ui (Vitest, node scripts, cargo test, contrast, parity, catalogs, shoot.mjs, perf baselines, pack proofs) or run the gate, and when you report what a run proved.
---

# Tests and the gate in ejm-ui

The gate is the shared UI Quality recipe below, the same commands CI runs after `/ready`. Run
focused checks while you edit; a skipped check is unverified.

## The gate

Run in this order from the repository root and stop at the first failure:

```sh
export npm_config_ignore_scripts=true
export CARGO_BUILD_JOBS=2
npm ci --ignore-scripts
npm rebuild node-pty --ignore-scripts=false
npm run check
npm run build
npm run check:rust
node scripts/pack-proof.mjs
```

- `npm run check` runs, in order: `scripts/check.mjs` (em dashes in tracked text),
  `scripts/assets.mjs --local` (brand files against `PROVENANCE.md`), `sync-rust-theme.mjs
  --check`, `parity.mjs --strict`, each workspace's `check` (tokens: generated files and
  contrast; ui: static profile, art, containerless, components, tree shaking, sources, merge
  config, catalog), `npm run typecheck` and `npm test` (Vitest).
- `npm run check:rust` runs `cargo test`, `cargo clippy --all-targets -- -D warnings` and
  `cargo fmt --check` in `crates/ejm-tui`.
- `node scripts/pack-proof.mjs` needs the npm registry. Without network it has not run.

## Setup

- Node.js 24 and npm. Install with `npm ci --ignore-scripts`. The named `node-pty` rebuild is the
  only lifecycle exception and runs with no repository, model or release credentials in the
  environment. On Linux it needs Python and C/C++ build tools.
- Rust 1.99.1 with Clippy and rustfmt. Keep `CARGO_BUILD_JOBS=2`.
- Google Chrome, or `CHROME=/path/to/chrome`, for `static-touch.test.mjs`, the ssg perf test,
  `shoot.mjs` and `npm run perf`. Without it those tests skip: report them as not run, with the
  skip count. `check-balance.test.mjs` skips without Pillow or uv.

## Focused checks

- One test file: `npx vitest run packages/ui/src/layout/SiteContent.test.tsx`. Vitest collects
  `packages/**/*.test.{ts,tsx,mjs}` and `apps/**/*.test.{ts,tsx}` in jsdom; put a test beside
  its source with the same stem.
- Tokens: `npm run check -w @ejm/tokens`, or `node packages/tokens/scripts/contrast.mjs
  --verbose` for every pair.
- Components and styles: `npm run check -w @ejm/ui`.
- Contract and catalogs: `node scripts/parity.mjs --strict`. `cargo test` rewrites
  `crates/ejm-tui/catalog.json` and `npm run catalog -w @ejm/ink` rewrites the Ink catalog;
  commit them. `packages/core/terminal-fixtures.json` holds the cases Rust and Ink must print the
  same way.
- Types: `npm run typecheck`. Rust: `npm run check:rust`.

## Visible changes

- `npm run build`, serve `apps/gallery/dist` on loopback (`npm run preview -w @ejm/gallery`),
  then `node scripts/shoot.mjs http://127.0.0.1:PORT/ROUTE` with `--theme light` and
  `--theme dark`. It exits 1 on horizontal overflow from 320px to 5120px or a tap target under
  44px. Keep screenshots outside the repository.
- `npm run perf` after a build. A route fails when its first contentful paint is 1000 ms or more
  above `scripts/perf-baseline.json`. Reruns vary by about 100 ms.
- Record a new baseline with `npm run perf -- --update` only for an intended change or a new
  machine class, and commit it with that change. Never re-record to make a change pass. See
  [the load-time guide](../../../scripts/PERF.md).

## Checks outside the gate

These need product checkouts or captures and are not in `npm run check`. Run them when their
inputs change and report them on their own.

- Demo honesty: `npm run honesty -w @ejm/demos -- --root DIR`, with sibling ejm-cli, ejm-ide and
  ejm-harness checkouts in `DIR`. Every command a demo shows must appear in that product's
  README.
- Shot honesty: `node scripts/check-shots.mjs --repos DIR` checks capture metadata and flags
  shots older than the product source they show.
- Captures: `npm run capture -w @ejm/shots` drives the real product through `node-pty`. See
  [the shots guide](../../../packages/shots/README.md).

## What a run proves

- A green `npm run check` proves text, generated files, contrast, parity, types and unit tests
  on one platform. It does not prove browser rendering, load time, tarball installs, captures or
  a deploy.
- The pack proofs prove the tarball route for the source checked, not a published package.
- Report each command, where it ran, and its result. Say which gate steps you did not run.
