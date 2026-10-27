## Why

The repo caps bundle bytes: per-route gzip budgets (JS 95, CSS 14, fonts 70, HTML 30 KB), an island budget, a static CSS cap, an image cap and a theme boot cap. The owner's order is to remove them. A capable library such as three.js is worth its weight, and nobody cares how many bytes a page ships unless it adds seconds. Always use a trusted, well-maintained package instead of hand-rolling code to fit a byte limit. Load time is the only performance bar.

## What Changes

- **BREAKING** Remove the `ejm-ssg budget` command, the `@ejm/ssg/budget` export and the `budget` option of `defineSite`.
- Remove the build-time budget gate in the `@ejm/ssg` Vite plugin. The build no longer fails on size.
- Remove `scripts/size.mjs`, `scripts/ssg-budget.mjs`, `packages/demos/scripts/size-islands.mjs` and the `budget` and `size` npm scripts in the gallery, the starter and `@ejm/demos`.
- Remove the static CSS and font caps in `build-static.mjs`, the AVIF size limit of the shots optimizer and the byte-limit tests (theme boot size, empty site JavaScript size, gallery budget test).
- Replace the hand-rolled DevTools script in `scripts/perf.mjs` with a Lighthouse run. It reports first contentful paint per route on Lighthouse's desktop profile (a normal connection: 10 Mbps, 40 ms round trip) and flags a route whose median is a whole second or more slower than a recorded baseline.
- Remove the budget tables and rules from `QUALITY.md`, `ADOPTION.md`, `README.md`, the gallery checks page and the package docs. Document the one load-time command instead.
- Record the change in `CHANGELOG.md`.

## Capabilities

### New Capabilities

- `load-time-check`: the single measured performance bar for built sites.
- `ssg-site`: what `@ejm/ssg` offers for site configuration and its CLI, now without size budgets.

### Modified Capabilities

None. There are no main specs yet.

## Impact

- Packages: `@ejm/ssg` (CLI, config type, Vite plugin, exports), `@ejm/ui` (static build, theme boot test), `@ejm/shots` (image optimizer), `@ejm/demos` (island size script), `@ejm/gallery` and `@ejm/starter` (scripts, docs content, tests).
- Dev dependency: `lighthouse` and `chrome-launcher` at the repo root.
- Out of scope: other repositories, the release branch, the tree-shaking regression check (it compares barrel and deep imports, it is not a cap), hosting header limits and playback bounds.
