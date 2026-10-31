# ejm-ui

## Overview

The ejmlabs design system: tokens, a Tailwind theme, React components in the shadcn/ui style, hooks, layouts, views and a gallery site.

Products consume public `@ejm/*` exports. Product behavior and guides stay in
their owning repositories.

## Status

`0.1.0` is the source baseline in [VERSION](VERSION) and
[CHANGELOG.md](CHANGELOG.md). Only `@ejm/tokens`, `@ejm/core`, `@ejm/ui` and `@ejm/ssg` are set up for npm and none is published yet; the other npm packages stay private,
and `ejm-tui` is not published to crates.io. A dated changelog entry or local
tarball does not mean a release was published. Check
[GitHub releases](https://github.com/ejmlabs/ejm-ui/releases) for published
source releases.

The [shared standards](https://github.com/ejmlabs/.github) define human
admission, review and source releases. Follow
[Contributing](CONTRIBUTING.md#human-admission-and-review) for the current
review commands and required checks. The gallery deploys from merged main;
package registry publication needs separate approval.

## Requirements

- Node.js 24 and npm for the shared check recipe. The Vite tools require at
  least Node.js 22.12.
- Rust 1.99.1 with Clippy and rustfmt for `crates/ejm-tui`.
- On Linux, Python and C/C++ build tools to compile the locked `node-pty`
  dependency before tests.
- Google Chrome, or `CHROME=/path/to/chrome`, for browser and capture checks.
  Tests that skip without Chrome do not verify rendering.

## Quick start

From this repository's root:

```sh
npm ci --ignore-scripts
npm run dev
```

The dev command serves the gallery. Run `npm run build` to build the workspace.
These commands do not deploy it.

## Usage

Products can consume these packages through sibling `file:` links. Keep this
repository beside the product repository and install this repository's root
lockfile before installing the product's dependencies. Check the consumer's
committed manifest and full source pin to establish which revision it uses.

CI must fetch an owner-approved repository at a full commit SHA and keep the
whole committed tree, including required capture assets and package exports.
A consumer can declare that source in `.github/ui-source.json` once its
trusted preparation workflow supports the metadata. UI does not need a
self-reference or private harness token. A Git tree hash or an uncommitted
working directory cannot serve as the dependency commit pin.

A source snapshot does not prove a successful install, build, check or hosted
review.

A site's whole build setup is one plugin in `vite.config.ts`, a base `tsconfig.json` and one stylesheet import:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { ejmlabs } from '@ejm/site/vite';

export default defineConfig({ plugins: [ejmlabs({ project: 'cli' })] });
```

`ejmlabs()` is Tailwind, React, one copy of React, the design guard, the shared head and headers, the prerenderer and the build options. An app that is not a prerendered site uses `ejmUi()` from `@ejm/ui/vite` instead. `tsconfig.json` is `{ "extends": "@ejm/ui/tsconfig.json", "include": ["src", "vite.config.ts"] }` and the one stylesheet import is `@import "@ejm/ui/styles.css";`. The build fails on a consumer `className`, `style` or local CSS, and on a built page without one `h1`, with a skipped heading level, without the skip link first, without `main#main` or with an unmarked link to another host. Public `@ejm/ui` components accept no `className` or `style`. Read the [adoption guide](ADOPTION.md) for the recipe, the checks and the state of each consumer. Products retain their authentication, transport, validation and command logic. These source APIs do not establish a deployed consumer or a published package.

## Development

Read [AGENTS.md](AGENTS.md) before changing the owner or its public contracts.
The repo uses npm workspaces. Feature and bugfix changes follow the OpenSpec
workflow in `openspec/`: explore, propose, apply, sync specs, then archive.

### Stack

- Strict TypeScript, Vite and real React 19 (one runtime for sites, the gallery and the IDE app)
- Tailwind CSS v4, with the theme generated from `theme.json`
- shadcn/ui components, copied in as source and edited here
- `wouter` for routing, and a small prerender package (`packages/ssg`) that renders every route to static HTML at build time

### Layout

| Path | What it holds |
| --- | --- |
| `packages/tokens` | `theme.json`, brand tokens, and the generators for CSS, Tailwind, Rust, Monaco and terminal themes |
| `packages/ui` | Components, hooks, layouts, the one stylesheet, art, the Vite preset `ejmUi()`, the design guard and the base tsconfig |
| `packages/demos` | Scenario data and the lazy demo islands |
| `packages/core` | Shared state and interaction helpers |
| `packages/ink` | Ink terminal components |
| `crates/ejm-tui` | Ratatui terminal components |
| `packages/site` | The site preset `ejmlabs()`, project registry, analytics, headers and the built-page check |
| `packages/ssg` | Prerendering and server-only asset handling |
| `packages/shots` | Product capture metadata, exports and optimized images |
| `apps/gallery` | The gallery and docs site, built with the packages above |
| `examples/starter` | Reference site consumer |
| `scripts` | Repo checks |

### Checks

The shared UI Quality recipe runs in this order and stops on failure:

```sh
export npm_config_ignore_scripts=true
export CARGO_BUILD_JOBS=2
npm ci --ignore-scripts
npm rebuild node-pty --ignore-scripts=false
npm run check
npm run build
npm run check:rust
node scripts/pack-proof.mjs
```

The named `node-pty` rebuild is the sole dependency lifecycle exception. It
must run without repository, model or release credentials. Other installs,
including the pack proof's temporary consumer install, keep lifecycle scripts
disabled. The pack proof uses the npm registry and checks six tarball-based
interfaces. It does not publish packages.

`npm run check` covers text, retained assets, generated themes, parity,
workspace checks (including `check-classes.mjs`, which fails on a class the kit
writes that builds no CSS), types (including the closed-props test, which fails
when a public component accepts `className` or `style`) and tests. A site build
also runs the design guard and the built-page check. Load time is the only
performance bar, measured by `npm run perf`; see [QUALITY.md](QUALITY.md).
Browser acceptance, actual product captures and demo honesty checks need their
documented tools and immutable product inputs. A passing owner check does not
prove those separate checks or deployment.

Before changing an export, manifest or package file list, run the pack proof
and affected consumer checks. Keep each public guide with its owner and
update it with the change. Do not copy private sibling source into a package.

### Design language

Containerless editorial. No cards, panels or tonal boxes: structure comes from display type, whitespace, hairline rows and full-bleed bands. Sage leads, Forest stays rare, brand fonts are Manrope and IBM Plex Mono only. See [QUALITY.md](QUALITY.md) for the quality bar.

## Documentation

See the [adoption guide](ADOPTION.md) for sibling source and tarball use,
[demo guide](packages/demos/README.md) for public demo entries, and
[tokens guide](packages/tokens/README.md) for asset provenance and rights.
Check the exact source and consumer revisions before relying on a build or
package result.

- [UI theme and public styles](packages/ui/THEME.md)
- [Site tools](packages/site/README.md) and [prerendering](packages/ssg/README.md)
- [Product captures](packages/shots/README.md) and
  [Rust terminal components](crates/ejm-tui/README.md)
- [Quality bar](QUALITY.md) and [browser performance checks](scripts/PERF.md)
- [Source releases and version changes](RELEASING.md)
- [Publishing the npm packages](PUBLISHING.md)

These files are source documentation. Verify a gallery publication before
claiming that the live site contains an update.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). A human maintainer must admit each
current PR commit before checks or two serial `gpt-6.1-sol` medium reviews
run. Approval is a separate decision; explicit maintainer self approval is
allowed. New commits need fresh decisions. The guide defines revocation,
retry rules and all five required statuses.

## Security

Use [SECURITY.md](SECURITY.md) to report vulnerabilities privately. Do not put
credentials, private paths or personal data in public issues, capture
metadata or logs. Review source history and retained GitHub output before
changing visibility. Passing checks do not prove the absence of a flaw.

## Support

Read [SUPPORT.md](SUPPORT.md). Include the source commit or version, operating
system and minimal reproduction when reporting a bug.

## License

Software and documentation use the MIT license. Brand materials retain their
owner's rights, and bundled fonts retain their SIL Open Font License notices.
See [License](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md). Each
owned npm package includes its own license and third-party notice files. The
font-bearing `@ejm/tokens` and `@ejm/ui` packages also include the original font
notices. All packages remain private; source distribution and offline packing
do not publish them to npm.
