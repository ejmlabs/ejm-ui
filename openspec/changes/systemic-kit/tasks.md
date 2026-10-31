## 1. Foundations

- [ ] 1.1 Remove the native static profile, the web terminal views, `styles-app.css` and their exports, tests and docs rows
- [ ] 1.2 Add `lib/closed.ts`, the density context in `lib/density.tsx` and the heading level context in `lib/heading.tsx`
- [ ] 1.3 Make `styles.css` the one profile with `source(none)`; turn `styles-site.css` and `styles-docs.css` into forwarders; update `check-sources.mjs`
- [ ] 1.4 Add `closed-api.test.ts` over the barrel; check with `npm run typecheck`

## 2. Components (one slice per folder)

- [ ] 2.1 `components/ui` and `components`: closed props, one control recipe, density from context; `npx vitest run packages/ui/src/components`
- [ ] 2.2 `layout`: closed props, `Section`, `Stat` on `display`, legacy props removed; tokens generator emits the automatic bands; `npm run check -w @ejm/tokens`
- [ ] 2.3 `shell`, `motion`, `hooks`: closed props, nav and phone menu on the control recipe, `AppShell` provides compact density
- [ ] 2.4 `docs` and `app`: closed props, literal sizes and the inline code chip removed, `Dashboard` uses `Stat` directly

## 3. Consumption

- [ ] 3.1 `@ejm/ui/vite` with `ejmUi()` and the guard moved from `@ejm/site`
- [ ] 3.2 `ejmlabs()` preset in `@ejm/site/vite` and the built-page check
- [ ] 3.3 `@ejm/ui/tsconfig.json`, proven with a linked throwaway consumer
- [ ] 3.4 The starter on the preset; `node scripts/pack-proof.mjs`

## 4. Gallery and docs

- [ ] 4.1 Gallery routes on `Section` and the closed API, removed parts gone
- [ ] 4.2 `THEME.md`, `COMPONENTS.md`, `ADOPTION.md`, folder and package guides, repository skills, `QUALITY.md`, `CHANGELOG.md`

## 5. Verify

- [ ] 5.1 `npm run check`, `npm run build`, `npm run check:rust`, `node scripts/pack-proof.mjs`
- [ ] 5.2 Screenshots of the gallery in light and dark at 390 and 1440 px, keyboard and reduced motion; `scripts/shoot.mjs`
- [ ] 5.3 `npm run perf` against the baseline
