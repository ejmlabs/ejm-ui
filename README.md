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

## Commands

```bash
npm install
npm run dev        # gallery dev server
npm run build      # build every package and app
npm run check      # text checks, type check and tests
```

Node 22.12 or later. The repo uses npm workspaces.

## Design language

Containerless editorial. No cards, panels or tonal boxes: structure comes from display type, whitespace, hairline rows and full-bleed bands. Sage leads, Forest stays rare, brand fonts are Manrope and IBM Plex Mono only. See [QUALITY.md](QUALITY.md) for the quality bar.

## Source distribution

CLI, IDE and harness consume these packages through sibling `file:` links.
Keep this repository beside the product repository and install the root
lockfile before installing the product's dependencies:

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
See [License](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
