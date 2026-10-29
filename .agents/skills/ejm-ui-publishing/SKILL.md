---
name: ejm-ui-publishing
description: Use before you change VERSION, a dated CHANGELOG.md section, publishConfig, publish.yml or release.yml, or prepare a source release or an npm publish of @ejm/tokens, @ejm/core, @ejm/ui or @ejm/ssg. Publishing and releases need the owner's explicit request.
---

# Versions, releases and npm publishing

Agents prepare a release PR. A human maintainer runs the release and publish workflows, and only
when the owner asks for that release. [The status](../../../README.md#status) says what is
published.

## Approval

- Never run **Draft release** or **Publish npm packages**, push a tag, run `npm publish`, or
  set the `NPM_SCOPE_CONFIRMED` variable. Those are the owner's steps, taken on an explicit
  request each time.
- A merged release PR, a local tarball or a pack proof is not a published package. Never say a
  version is on npm until the registry shows it.
- `ejm-tui` is not published to crates.io (`publish = false`). Keep it that way.

## Version changes

All owned versions move together in one reviewed PR. The Repository standards check rejects a
mismatch. Change, to the same version:

- `VERSION`.
- `version` in the root `package.json` and in each `packages/*`, `apps/*` and `examples/*`
  `package.json`.
- The root and every `packages/*` entry in `package-lock.json`. Let npm rewrite the lockfile;
  never edit it by hand.
- Every `@ejm/*` dependency in those manifests, such as `@ejm/ui` on `@ejm/core` and the
  gallery on all six.
- `package.version` in `crates/ejm-tui/Cargo.toml` and the `ejm-tui` entry in its `Cargo.lock`.
- A dated `## [VERSION] - YYYY-MM-DD` section in `CHANGELOG.md`, made from the unreleased
  section, with upgrade notes for every **Breaking** line.

Follow [the release steps](../../../RELEASING.md) and the shared `ejmlabs-workflow` releases
reference for SemVer, the draft release and immutable tags.

## npm publishing

Read [the publishing guide](../../../PUBLISHING.md) before touching the publish set.

- Only `@ejm/tokens`, `@ejm/core`, `@ejm/ui` and `@ejm/ssg` publish, together, at the version in
  `VERSION`. Every other package stays `"private": true`.
- The **Publish npm packages** workflow runs from `main` after the draft release is reviewed. Its
  build job checks, packs and proves the four tarballs with read-only access and no secrets; the
  publish job runs no project code and publishes those exact tarballs with provenance, in the
  order tokens, core, ui, ssg.
- `publish.yml` is fixed by a hash in the shared Repository standards check. A change to it, or
  to a public package's packing fields, needs a new reviewed `ejmlabs/.github` revision first. See
  `ejm-ui-packages`.
- Before a release PR that changes the publish set, run `node scripts/pack-proof-publish.mjs`
  and `npm run pack:check -w @ejm/tokens`, and report both.
- A published version can never be replaced. If a publish stops partway, fix it with a new
  version; never retry the same version.

## Release PR checklist

- The version changes above, all in one commit.
- The gate from `ejm-ui-testing`, with the commands, platform and results in the PR.
- Upgrade notes for breaking changes and the platforms each claim covers.
- In the report, give the owner the full merge commit SHA and the version without a `v`, for
  **Draft release** and then **Publish npm packages**. Do not run either.
