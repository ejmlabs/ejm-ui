# ejm-ui

The ejmlabs design system: tokens, a Tailwind theme, React components in the shadcn/ui style, hooks, layouts, views and a gallery site.

## Stack

- Strict TypeScript, Vite and real React 19 (one runtime for sites, the gallery and the IDE app)
- Tailwind CSS v4, with the theme generated from `theme.json`
- shadcn/ui components, copied in as source and edited here
- `wouter` for routing, and a small prerender package (`packages/ssg`) that renders every route to static HTML at build time

## Layout

| Path | What it holds |
| --- | --- |
| `packages/tokens` | `theme.json`, brand tokens, and the generators for CSS, Tailwind, Rust, Monaco and terminal themes |
| `packages/ui` | Components, hooks, layouts, views, styles and art |
| `packages/demos` | Scenario data and the lazy demo islands |
| `packages/core` | Shared state and interaction helpers |
| `packages/site` | Site components, navigation, headers and static assets |
| `packages/ssg` | Prerendering and server-only asset handling |
| `packages/shots` | Product capture metadata, exports and optimized images |
| `apps/gallery` | The gallery and docs site, built with the packages above |
| `scripts` | Repo checks |

## Development

```bash
npm ci --ignore-scripts
npm run dev        # gallery dev server
npm run build      # build every package and app
npm run check      # text checks, type check and tests
```

Node 22.12 or later. The repo uses npm workspaces.

The terminal fixture tests use the locked `node-pty` dependency. On Linux,
install Python and C/C++ build tools, then build that dependency after
`npm ci --ignore-scripts`:

```bash
npm rebuild node-pty --ignore-scripts=false
```

This command enables scripts only for the named rebuild. Other dependency
installs can keep scripts disabled. Chrome capture tests skip when Chrome is
unavailable; that skip does not verify image rendering.

## Design language

Containerless editorial. No cards, panels or tonal boxes: structure comes from display type, whitespace, hairline rows and full-bleed bands. Sage leads, Forest stays rare, brand fonts are Manrope and IBM Plex Mono only. See [QUALITY.md](QUALITY.md) for the quality bar.

## Source distribution

Products can consume these packages through sibling `file:` links. Keep this
repository beside the product repository and install this repository's root
lockfile before installing the product's dependencies. Check the consumer's
committed manifest and full source pin to establish which revision it uses:

```bash
npm ci --ignore-scripts
```

CI must fetch an owner-approved repository at a full commit SHA and keep the
whole committed tree, including required capture assets and package exports.
A consumer can declare that source in `.github/ui-source.json` once its
trusted preparation workflow supports the metadata. This repository does not
install that workflow. A Git tree hash or an uncommitted working directory
cannot serve as the dependency commit pin.

Creating a hosted repository, pushing source, publishing npm packages and
deploying the gallery each require the owner's approval. A source snapshot
does not establish a successful install, build, native check or publication.

## Licenses

Software and documentation use the MIT license. Brand materials retain their
owner's rights, and bundled fonts retain their SIL Open Font License notices.
See [License](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md). Each
owned npm package includes its own license and third-party notice files. The
font-bearing `@ejm/tokens` and `@ejm/ui` packages also include the original font
notices. All packages remain private; source distribution and offline packing
do not publish them to npm.

## Package documentation

See the [adoption guide](ADOPTION.md) for sibling source and tarball use,
[demo guide](packages/demos/README.md) for public demo entries, and
[tokens guide](packages/tokens/README.md) for asset provenance and rights.
Check the exact source and consumer revisions before relying on a build or
package result. The shared UI governance and release profile is a separate
prerequisite; this package metadata change does not install it.
