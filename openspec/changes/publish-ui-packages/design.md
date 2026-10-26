## Decisions

**Publish set.** tokens, core, ui and ssg share one version and pin each other exactly. ssg is in because `examples/starter` and `ADOPTION.md` use `ejm-ssg`; it depends only on `wouter`.

**Brand artwork.** `LICENSE` reserves the ejmlabs logos and artwork and the owner has not approved shipping them. The tokens `files` list keeps `assets/fonts`, `assets/brand` (palette and design tokens JSON) and `assets/icons`, and drops the rest. Nothing in the publish set imports a stripped file (checked by the publish proof, which installs the four tarballs alone). `@ejm/site` and `@ejm/demos` resolve lab artwork and stay private. The brand files stay in the repository and reach people through the brand kit.

**Proof.** `scripts/pack-proof-publish.mjs` packs the four packages, installs only those tarballs in a consumer with a small probe that imports the documented entry points of each, runs `tsc`, a Vite and Tailwind build of a page using `@ejm/ui` styles, and asserts the tokens tarball lists no stripped path. It reuses the helpers of `pack-proof.mjs` rather than copying them.

**Workflow.** `publish.yml` is `workflow_dispatch` only. Job `build` has `contents: read`, no secrets, runs `npm ci`, `npm run check` and the publish proof, and uploads the tarballs. Job `publish` needs `build`, has `id-token: write` and `contents: read`, downloads the tarballs, and runs `npm publish <tarball> --provenance --access public` with trusted publishing. It checks out no code and runs no project scripts. An `if` on the repository variable `NPM_SCOPE_CONFIRMED == 'true'` keeps it disabled until the owner confirms the scope. Actions are pinned to full SHAs.

## Risks

- The `@ejm` scope may not be owned. Nothing publishes until the owner confirms; a rename would touch every package name.
- Packages ship TypeScript source, so consumers need Vite on Node 22.12 or later. The install notes say so.
