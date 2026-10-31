---
name: ejm-ui-packages
description: Use before you add, move, rename or remove a file, export, deep import, dependency, files entry or package.json field in an @ejm/* package, add a workspace, or change a Vite plugin or bin. Covers public and private packages, the shared packing rules, pack proofs and the Vite presets.
---

# Packages and public exports

A package's `exports` field is its public API. Every consumer pins this repository, so a changed
export, file list or manifest is a contract change: prove it from tarballs and say who must move.

## The packages

| Package | Visibility | Holds |
| --- | --- | --- |
| `@ejm/tokens` | public | `theme.json`, generated themes, fonts, brand palette, icons |
| `@ejm/core` | public | Framework-neutral state, `contract.json` |
| `@ejm/ui` | public | Components, hooks, layouts, the one stylesheet, art, `theme-boot.js`, the `ejmUi()` preset, the design guard, the base tsconfig |
| `@ejm/ssg` | public | Prerender plugin, `hydrateSite`, `Link`, `ejm-ssg` |
| `@ejm/site` | private | The `ejmlabs()` preset, project registry, analytics, head, headers plugin, the built-page check |
| `@ejm/demos` | private | Simulated product screens and lazy islands |
| `@ejm/ink` | private | Ink terminal components |
| `@ejm/shots` | private | Product capture metadata and images |

"Public" means set up for npm, not published. See [publishing](../../../PUBLISHING.md).

## Rules for every package

- Anything not in a package's `exports` is private. Never document, test from outside, or tell a
  consumer to use a path that is not exported.
- Code that Node loads from a package (the Vite plugins `@ejm/ui/vite`, `@ejm/ssg/vite` and
  `@ejm/site/vite`, the design guard `@ejm/ui/design-guard`, and bins such as `ejm-ssg` and
  `ejm-site-headers`) ships as `.mjs` with `.d.mts` types. Everything Vite bundles ships as
  TypeScript source.
- `@ejm/ui` keeps `sideEffects: ["*.css"]` so the barrel tree-shakes to the deep-import cost
  (`check-treeshake.mjs`). `@ejm/site` and `@ejm/demos` never import the `@ejm/ui` barrel.
- A dependency on another `@ejm/*` package names the shared version exactly (`0.1.0` today), as
  `@ejm/ui`, `@ejm/site` and `@ejm/demos` do. Consumers list `@ejm/core` and `@ejm/tokens` too.
- One React: `react` and `react-dom` are peer dependencies of every package that renders React,
  never dependencies. `vite` is a peer dependency of every package that ships a Vite plugin
  (`@ejm/ui`, `@ejm/ssg`, `@ejm/site`). `tailwindcss`, `@tailwindcss/vite`, `@vitejs/plugin-react`
  and `postcss` are dependencies of `@ejm/ui`, because `ejmUi()` loads them for the consumer, who
  lists none of them.
- Never copy private sibling source into a package. Product behavior stays in its repository.
- When code moves, the old export path re-exports it until no consumer pin uses it.
- Every package keeps its `LICENSE` (the scoped ejm-ui license) and `THIRD_PARTY_NOTICES.md`,
  and its `repository` field names `ejmlabs/ejm-ui` with its directory.
- `@ejm/tokens` must not pack reserved brand artwork (logos, favicons, lockups, motifs, social
  cards, templates, project families). `npm run pack:check -w @ejm/tokens` fails if it does.

## The shared packing rules

The Repository standards check in `ejmlabs/.github` (`scripts/standards.py`) reads the manifest of
each public package (`@ejm/tokens`, `@ejm/core`, `@ejm/ui`, `@ejm/ssg`) and checks its shape, not a
hash of it:

- Every `files` entry, and the target of `main`, `browser`, `bin`, `man` and `directories`, stays
  inside the reviewed prefixes of that package. The lists are `UI_PACKING_PREFIXES` in the check.
  For `@ejm/ui` they are `src`, `public/theme-boot.js`, `THEME.md`, `COMPONENTS.md`, `LICENSE` and
  `THIRD_PARTY_NOTICES.md` (the check's list also holds one entry for a file `@ejm/ui` no longer
  has), so a new file for `@ejm/ui` lives under `src`. The base tsconfig is
  `src/consumer.tsconfig.json` for that reason.
- No lifecycle script (`prepare`, `prepack`, `postinstall` and the rest) and no
  `bundleDependencies` or `workspaces` field, because each changes what npm packs or runs.
- `publishConfig` is `access: public` with `provenance: true`, and the set of public packages is
  fixed at those four. Every other package stays private.
- `.github/workflows/publish.yml` is checked against a reviewed SHA-256.

So a routine change to `exports`, to files inside the reviewed prefixes or to dependencies needs no
shared PR. Land the new reviewed values in `ejmlabs/.github` first, then move the full commit pins
in `.github/workflows/pr.yml` and `release.yml` here in the same PR as the manifest change, only
when you pack a path outside the prefixes, add or remove a public package, or edit `publish.yml`.

- Never add a `prepare`, `prepack`, `postinstall` or other lifecycle script to a package. The
  check rejects it, and it would run code when npm packs or installs the package.
- Private packages keep `"private": true`. Only the four public packages carry `publishConfig`
  with `access: public` and `provenance: true`.

## The presets and the base config

These exports are the zero-config path for a consumer. Change them with care: every consumer's
build depends on them, and the pack proofs below exercise them.

- `@ejm/ui/vite` exports `ejmUi()`: Tailwind (`@tailwindcss/vite`), React, `resolve.dedupe` for
  `react` and `react-dom`, and the design guard.
- `@ejm/ui/design-guard` exports `siteDesignGuard` and `designGuardPlugin`, the guard that
  `ejmUi()` and `ejmSite()` run.
- `@ejm/ui/tsconfig.json` is the file `src/consumer.tsconfig.json`: strict options,
  `types: ["vite/client"]` and `paths` that give one copy of the React and Vite types for linked
  and installed packages.
- `@ejm/ui/styles.css` is the one stylesheet. `styles-site.css` and `styles-docs.css` stay as
  forwarders for pinned consumers.
- `@ejm/site/vite` exports `ejmlabs({ project, site, headers })`, which is `ejmUi()`, `ejmSite()`,
  `ejmSsg()` and the shared build options, beside `ejmSite()`.

## Proving a change

- Run `node scripts/pack-proof-publish.mjs` after changing the manifest, `files` or `exports` of
  a public package. It packs the four, installs only those tarballs into a throwaway consumer and
  builds an app with `ejmUi()` as its plugin list and `@ejm/ui/tsconfig.json` as its base config.
- Run `node scripts/pack-proof.mjs` after changing any `package.json`, `files`, `exports` or Vite
  plugin. It packs six packages, builds a copy of `examples/starter` from them with `ejmlabs()`
  and the base tsconfig, checks headers and types, and diffs the HTML against the workspace build.
- Both need the npm registry, so they are not part of `npm run check`. Pass `--dir` only with a
  folder outside the repo reserved for the tool; it deletes and recreates subfolders there.
- Update the owning guide in the same change: [THEME.md](../../../packages/ui/THEME.md) for
  stylesheet entries, [COMPONENTS.md](../../../packages/ui/COMPONENTS.md) for components and the
  deep import table, the package README for its other exports, and
  [the adoption guide](../../../ADOPTION.md) when the consumer recipe changes.

## Consumer impact

- Name the consumers that import a removed or renamed path (search the ejmlabs, ejm-cli, ejm-ide
  and ejm-harness repositories) and list the pin moves they need in the PR.
- Add a `CHANGELOG.md` line under the unreleased section. Mark a break with **Breaking** and say
  how to upgrade.
- Run the affected consumer checks in that consumer's repository after its pin moves, not here.
