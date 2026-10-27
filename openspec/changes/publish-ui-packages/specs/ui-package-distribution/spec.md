## ADDED Requirements

### Requirement: Public packages are an explicit list
Only `@ejm/tokens`, `@ejm/core`, `@ejm/ui` and `@ejm/ssg` SHALL be publishable. Every other workspace package SHALL keep `private: true`. The four SHALL share one version and pin each other exactly.

#### Scenario: Publish set
- **WHEN** the package manifests are read
- **THEN** exactly those four lack `private`, each has `publishConfig` with public access and provenance, a `repository`, a `license` and a `files` list

#### Scenario: Pin check
- **WHEN** a published package depends on another published package
- **THEN** it names the exact version

### Requirement: Brand artwork stays out of the tokens tarball
`@ejm/tokens` SHALL NOT pack logos, favicons, lockups, motifs, social cards, templates or project families. It SHALL pack fonts with their OFL notices, the brand palette and token JSON, icons, generated themes, the Rust theme, `LICENSE` and `THIRD_PARTY_NOTICES.md`.

#### Scenario: Tarball contents
- **WHEN** `@ejm/tokens` is packed
- **THEN** `npm run pack:check -w @ejm/tokens` passes and the file list holds no stripped path

### Requirement: Publish set works from tarballs alone
The publish set SHALL install and work in a project outside the repository using only its own tarballs and registry dependencies.

#### Scenario: Packed consumer
- **WHEN** `node scripts/pack-proof-publish.mjs` runs
- **THEN** the typecheck and build of the consumer pass with no workspace link and no private package

### Requirement: Credential-safe publication
The publish workflow SHALL build and prove with read-only contents and no secrets, publish in a separate job that runs no project code, use trusted publishing with provenance, store no token in a file, and stay disabled until the owner confirms the scope.

#### Scenario: Scope not confirmed
- **WHEN** the workflow is dispatched and the confirmation variable is not `true`
- **THEN** the publish job is skipped
