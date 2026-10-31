## 1. Shell and button

- [x] 1.1 `AppShell.nav` takes `readonly NavItem[]` and renders compact recipe items through `NavLink`; `npx vitest run packages/ui/src/shell`
- [x] 1.2 `Header` is a size container and switches its nav at `@3xl`; `NavMenu` hides at `@3xl`; `npx vitest run packages/ui/src/shell`
- [x] 1.3 `Button size="icon"` sizes its `svg` child per density; `npx vitest run packages/ui/src/components/ui/button.test.tsx`

## 2. Specimens and helpers

- [x] 2.1 `docs/Specimen.tsx` with `Specimen`, `Compare`, `ThemePair`, `TypeScale`, `Elevations`; shadow map in `lib/elevation.ts`; tests
- [x] 2.2 `ControlGroup` in `layout/SiteContent.tsx`; test
- [x] 2.3 `useDrawOn` accepts any element; `Art drawOn` uses it; tests
- [x] 2.4 The guard accepts a local `.css?url` import; test in `packages/site/src/design.test.mjs`
- [x] 2.5 Catalog rows and `node packages/ui/scripts/build-catalog.mjs`; `node packages/ui/scripts/check-components.mjs`, `check-classes.mjs`, `check-sources.mjs`

## 3. Gallery

- [x] 3.1 Routes and helpers on the kit only: app-shell, shell, components, app, hooks, tokens, island; remove `specimen.tsx`; add `lucide-react`
- [x] 3.2 `styles.css` and `styles-demos.css` keep only imports; remove `libraryGallery`; guard test over `apps/gallery`
- [x] 3.3 `npm run build -w @ejm/gallery`

## 4. Guides

- [x] 4.1 `THEME.md`, `COMPONENTS.md`, `ADOPTION.md`, shell and docs READMEs, the ejm-ui-design skill, `CHANGELOG.md`

## 5. Verify

- [x] 5.1 `npm run check`, `npm run build`, `npm run check:rust`, `node scripts/pack-proof.mjs`
- [x] 5.2 Gallery screenshots in light and dark at 390 and 1440 px on the changed routes; the narrow header preview; keyboard on the app shell nav
- [x] 5.3 `npm run perf` against the baseline

## Verification record

Run on Linux in a cloud container (Node 22.23, npm 10.9, Rust 1.99.1), on this branch stacked on PR #59's head `0f88f2f`:

- The gate from `npm ci --ignore-scripts`: `npm rebuild node-pty`, `npm run check` (107 test files, 1118 passed, 2 skipped), `npm run build`, `npm run check:rust`, `node scripts/pack-proof.mjs` (17 files identical to the workspace build). All passed.
- Before the change, a probe run of the guard over `apps/gallery/src` without the exemption reported 41 issues in nine files. After it, `siteDesignGuard('apps/gallery').validate()` reports none over 35 files, and `design.test.mjs` asserts it.
- Gallery screenshots of `/shell/`, `/app-shell/`, `/components/`, `/tokens/`, `/hooks/` and `/app/` at 390 and 1440 px in light and dark: no horizontal overflow and no console errors on any of the 24.
- In Chromium: the full-width header previews show the inline nav and the half-width ones show the Menu button at 1440 px; the narrow menu opens with Enter and closes with Escape, focus back on its button; the app shell nav follows the top bar in Tab order with the 2px focus outline, its items are 32 px with a mouse and 44 px on a touch phone, and it folds into the "Navigation" disclosure at 390 px; `Art drawOn` on `/hooks/` adds `draw-on` only after it scrolls into view.
- `npm run perf`: every route within 100 ms of its baseline (one run each).
- Not run: `scripts/shoot.mjs`, `node scripts/pack-proof-publish.mjs`, demo and shot honesty checks (they need product checkouts) and the consumer repositories' own builds at a new pin.
