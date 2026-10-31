# zero-config-consumption Specification

## Purpose

Let a site or app consume the kit with one Vite plugin, one base tsconfig and one stylesheet import, linked or installed.

## Requirements

### Requirement: One Vite preset per kind of consumer

`@ejm/ui/vite` SHALL export `ejmUi()`, which adds Tailwind, React, a single React copy and the design guard.
`@ejm/site/vite` SHALL export `ejmlabs({ project })`, which adds `ejmUi()`, the shared site files and headers, the
prerenderer and the shared build options. A consumer SHALL NOT need `@tailwindcss/vite`, `@vitejs/plugin-react`,
`tailwindcss` or `resolve.dedupe` in its own configuration.

#### Scenario: The reference consumer

- **WHEN** `examples/starter` builds with `plugins: [ejmlabs({ project: 'ejmlabs' })]` as its whole plugin list
- **THEN** the build succeeds, and `node scripts/pack-proof.mjs` builds the same starter from tarballs

### Requirement: One base tsconfig

`@ejm/ui/tsconfig.json` SHALL let a consumer type check with one copy of the React types whether the packages are linked
from a sibling checkout or installed from tarballs.

#### Scenario: Linked packages

- **WHEN** a consumer links `@ejm/ui` with `file:` and its `tsconfig.json` extends `@ejm/ui/tsconfig.json`
- **THEN** `tsc` reports no duplicate React type errors

### Requirement: One stylesheet

`@ejm/ui/styles.css` SHALL style every `@ejm/ui` component and SHALL NOT scan consumer folders. `styles-site.css` and
`styles-docs.css` SHALL keep resolving.

#### Scenario: A docs component on a site

- **WHEN** a site imports only `@ejm/ui/styles.css` and renders `DocsLayout` and `CodeBlock`
- **THEN** their classes are in the built CSS, as `packages/ui/scripts/check-sources.mjs` checks
