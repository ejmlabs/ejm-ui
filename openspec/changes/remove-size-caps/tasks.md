## 1. Remove the caps

- [x] 1.1 Remove `scripts/size.mjs`, `scripts/ssg-budget.mjs`, `packages/ssg/src/budget.mjs`, `budget.d.mts`, the `./budget` export and the `budget` CLI command
- [x] 1.2 Remove the `budget` option from `defineSite`, the build gate in the Vite plugin and `budget` from `.ejm-ssg/build.json`
- [x] 1.3 Remove the `budget` scripts of the gallery and the starter, the `size` script and `size-islands.mjs` of `@ejm/demos`
- [x] 1.4 Remove the static CSS and font caps in `build-static.mjs` and the AVIF limit in `optimize.mjs`
- [x] 1.5 Remove tests that only assert a byte limit and the budget gate tests
- [x] 1.6 Update pack-proof, docs, the gallery checks page and `openspec/config.yaml` to match

## 2. Measure load time

- [x] 2.1 Add `lighthouse` and `chrome-launcher` as dev dependencies
- [x] 2.2 Rewrite `scripts/perf.mjs`: serve dist, run Lighthouse per route, median FCP, compare with `scripts/perf-baseline.json`, `--update`
- [x] 2.3 Test the comparison and the route discovery, and run it once against the gallery
- [x] 2.4 Record the baseline numbers
- [x] 2.5 Document the command in `QUALITY.md`, `ADOPTION.md` and `scripts/PERF.md`; note the break in `CHANGELOG.md`

## 3. Verify

- [x] 3.1 `npm run check`, `npm run build`, `openspec validate remove-size-caps --strict`, gitleaks
- [x] 3.2 Code and security pass over the diff

## 4. Review fixes

- [x] 4.1 Use Lighthouse's desktop profile as the normal connection and re-record the baseline
- [x] 4.2 Remove the remaining byte-limit sentences in the demos README and the native HTML guide
- [x] 4.3 Merge a partial `--update` into the baseline, exit 2 on a missing baseline file, use `picomatch` for ignore globs
- [x] 4.4 Move the shared workflow pins to the `.github` revision that dropped `scripts/size.mjs` and `npm run size -w @ejm/demos` from the ejm-ui gate, and remove the retired review-context snapshot

## 5. Follow-up (not in this change)

- [ ] 5.1 Rebuild the island lazy-chunk and one-product-page guarantees as a small test
