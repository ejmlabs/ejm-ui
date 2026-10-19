# Changelog

Versions follow [Semantic Versioning](https://semver.org/). A dated source
entry does not establish a published release; see [RELEASING.md](RELEASING.md).

## [Unreleased]

No changes recorded after the source baseline.

## [0.1.0] - 2026-10-19

Source baseline for the shared UI packages. This entry is not a published
release, registry package or deployed gallery.

- Record one version for the root, eight owned npm packages and `ejm-tui`.
  Applications, examples and nested fixtures remain consumer metadata.
- Include scoped package licenses, third-party notices, original font
  notices and the public `@ejm/demos/ide.css` compatibility entry.
- Include both original font notices at stable root paths in sites built by
  `@ejm/site`, including consumers installed from local tarballs.
- Keep gallery CSS within its existing budget by omitting the unused viewport
  `container` utility. Page layouts and container queries remain available.
- Retain 282 imported files in provenance: 280 assets and two Rust files.
  Retired kit handoff files, X-kit source trees, per-project editable sources
  and ZIP archives are excluded. Some templates, lockups and rendered X-kit
  material remain in this source baseline.
- Isolate new product captures in temporary workspaces and remove them after
  use. Existing captures keep their recorded product revisions and evidence.
- Add shared community guidance, maintainer ownership, issue and PR templates,
  and bounded dependency update configuration.

Checks and publication remain separate evidence. Follow the development guide
for owner checks and each consumer's guide for compatibility checks. Native
installers, package publication and deployment need their own release gates.
