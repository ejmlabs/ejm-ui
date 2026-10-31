## 1. Foundations

- [x] 1.1 Remove the native static profile, the web terminal views, `styles-app.css` and their exports, tests and docs rows
- [x] 1.2 Add `lib/closed.ts`, the density context in `lib/density.tsx` and the heading level context in `lib/heading.tsx`
- [x] 1.3 Make `styles.css` the one profile with `source(none)`; turn `styles-site.css` and `styles-docs.css` into forwarders; update `check-sources.mjs`
- [x] 1.4 Add `closed-api.test.ts` over the barrel; check with `npm run typecheck`

## 2. Components (one slice per folder)

- [x] 2.1 `components/ui` and `components`: closed props, one control recipe, density from context; `npx vitest run packages/ui/src/components`
- [x] 2.2 `layout`: closed props, `Section`, `Stat` on `display`, legacy props removed; tokens generator emits the automatic bands; `npm run check -w @ejm/tokens`
- [x] 2.3 `shell`, `motion`, `hooks`: closed props, nav and phone menu on the control recipe, `AppShell` provides compact density
- [x] 2.4 `docs` and `app`: closed props, literal sizes and the inline code chip removed, `Dashboard` uses `Stat` directly

## 3. Consumption

- [x] 3.1 `@ejm/ui/vite` with `ejmUi()` and the guard moved from `@ejm/site`
- [x] 3.2 `ejmlabs()` preset in `@ejm/site/vite` and the built-page check
- [x] 3.3 `@ejm/ui/tsconfig.json`, proven with a linked throwaway consumer
- [x] 3.4 The starter on the preset; `node scripts/pack-proof.mjs`

## 4. Gallery and docs

- [x] 4.1 Gallery routes on `Section` and the closed API, removed parts gone
- [x] 4.2 `THEME.md`, `COMPONENTS.md`, `ADOPTION.md`, folder and package guides, repository skills, `QUALITY.md`, `CHANGELOG.md`

## 5. Verify

- [x] 5.1 `npm run check`, `npm run build`, `npm run check:rust`, `node scripts/pack-proof.mjs`
- [x] 5.2 Screenshots of the gallery in light and dark at 390 and 1440 px, keyboard and reduced motion; `scripts/shoot.mjs`
- [x] 5.3 `npm run perf` against the baseline

## Verification record

Run on Linux in a cloud container, Node 22.23, Rust 1.99.1:

- The gate from `npm ci`: `npm run check` (103 test files, 1090 passed, 2 skipped), `npm run build`, `npm run check:rust`, `node scripts/pack-proof.mjs` (17 files identical to the workspace build).
- A linked (`file:`) throwaway consumer with only `ejmlabs()`, `extends: "@ejm/ui/tsconfig.json"` and one stylesheet import type checked and built; `node scripts/pack-proof-publish.mjs` passed.
- Gallery screenshots at 390 and 1440 px in light and dark; horizontal overflow checked at 13 widths from 320 to 5120 px on all 18 routes in both themes (none); `scripts/shoot.mjs` on the home page in both themes (clean); keyboard order and reduced motion on three routes.
- `npm run perf`: no route a second or more above its baseline.
- Not run: `static-touch` (removed with the static profile), demo and shot honesty checks (they need product checkouts), the consumer repositories' own builds at a new pin.
