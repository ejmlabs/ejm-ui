## Why

The first public release plan (D6 option A) makes the ejm-ui design system installable from the public npm registry. Today every workspace package is `private`, `@ejm/tokens` ships reserved brand artwork in its tarball, and the only tarball proof installs six packages including the lab-bound `site` and `demos`.

## What Changes

- Publish set: `@ejm/tokens`, `@ejm/core`, `@ejm/ui` and `@ejm/ssg`, all at 0.1.0. `@ejm/ssg` is included because the starter and the documented Vite setup depend on it. `@ejm/site`, `@ejm/demos`, `@ejm/ink`, `@ejm/shots`, the gallery, the starter and `crates/ejm-tui` stay private.
- Remove `private` from the four packages and add `publishConfig` (public access, provenance), `repository`, `license` and `files`. Internal dependencies keep exact pins.
- `@ejm/tokens` stops packing reserved brand artwork (logos, favicons, lockups, motifs, social cards, templates, project families). It keeps fonts with their OFL notices, the brand palette and token JSON, icons, generated themes and the Rust theme. The brand-pack check now asserts that rule.
- Add a packed-consumer proof for the publish set alone, next to the existing six-package proof.
- Add a publish workflow: build and proof with contents read and no secrets, then a separate job that publishes the proven tarballs with npm trusted publishing and runs no project code. It is disabled until the owner confirms the `@ejm` scope.
- Draft 0.1.0 release notes and the install line. Issue forms and the private advisory link already exist; nothing is added there.

Out of scope: publishing, tagging, pushing, switching consumers from `file:` links to a version range, the download page (in the site repository).

## Capabilities

### New Capabilities
- `ui-package-distribution`: which packages are public, how they are verified and published, and what the tokens tarball may carry.

### Modified Capabilities
None.

## Impact

`packages/{tokens,core,ui,ssg}/package.json`, `packages/tokens/scripts/check-brand-pack.mjs`, `scripts/pack-proof.mjs` (copies the full tokens assets back for the lab-site proof), a new `scripts/pack-proof-publish.mjs`, `.github/workflows/publish.yml`, `PUBLISHING.md` (RELEASING.md stays identical to the shared template), `CHANGELOG.md`.
