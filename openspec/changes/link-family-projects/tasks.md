## 1. Registry

- [x] 1.1 Add `LINKED_PROJECTS` (ejm-calm, gerry) with types and the package export
- [x] 1.2 Return build identities, then linked sites, from `otherSites`
- [x] 1.3 Move `ui` into discovery and leave tokenless hosts out of `ANALYTICS_SITES`
- [x] 1.4 Update the `ejmlabs` tagline
- [x] 1.5 Update the registry, analytics and starter tests for the new family list

## 2. Brand families

- [x] 2.1 Move the ui generator body into `scripts/family-assets.mjs` and confirm `ui-assets.mjs --check` passes unchanged
- [x] 2.2 Replace provenance rows in place so generators can run in any order
- [x] 2.3 Add `scripts/gerry-assets.mjs` and generate `assets/projects/gerry/`
- [x] 2.4 Register the directory in `scripts/assets.mjs`

## 3. Gallery and docs

- [x] 3.1 Footer from `otherSites('ui')`, "In use." without the gallery, layout example copy
- [x] 3.2 Tokens README, PROVENANCE header, ADOPTION and CHANGELOG

## 4. Verify

- [x] 4.1 `npm run check`, `npm run build`, both family checks in either order
