## 1. Manifests and tokens

- [x] 1.1 Make tokens, core, ui and ssg publishable at 0.1.0 with publishConfig, repository, license, files
- [x] 1.2 Narrow the tokens `files` list and the brand-pack check to the rule above; update the tokens README (the existing LICENSE reservation already covers the rule)

## 2. Proof

- [x] 2.1 Add `scripts/pack-proof-publish.mjs` for the four packages; keep the six-package proof
- [x] 2.2 Run both proofs and `npm run check`

## 3. Workflow and docs

- [x] 3.1 Add `.github/workflows/publish.yml` (build job read-only, separate publish job, disabled by variable)
- [x] 3.2 Add PUBLISHING.md (RELEASING.md is a shared template and stays unchanged) and update CHANGELOG.md; draft 0.1.0 notes and install line

## 4. Artifacts

- [x] 4.1 `npm pack` the four packages with SHA256SUMS and list tarball files
