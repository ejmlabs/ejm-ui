# @ejm/tokens

The single source for ejmlabs color and brand: `theme.json` (the ui theme and the web bands), the brand palette and the assets in `assets/` (each file listed with its sha256 in `assets/PROVENANCE.md`).

```bash
npm run build -w @ejm/tokens   # regenerate everything below from theme.json
npm run check -w @ejm/tokens   # contrast gates, and fail on any stale generated file
```

| Output | For |
| --- | --- |
| `generated/tailwind.css` | Tailwind v4 theme: brand colors, semantic colors, the four bands and the automatic band (`data-band="auto"`, Mist and Paper by position, used by `Section`), elevation. Imported by `@ejm/ui/styles.css`. |
| `generated/window.css` | The ui roles and syntax colors as web variables and Tailwind colors, for product windows and editors. |
| `generated/neutral.css` | The complete neutral scale for native product styles on the web, through the opt-in `@ejm/tokens/neutral.css` export. It follows the page theme and adds no utilities. |
| `generated/theme.css` | The ui roles as plain `--ejm-ui-*` variables, dark by default, for the IDE and other non-Tailwind apps. |
| `generated/monaco/*.json` | Monaco editor themes. |
| `generated/terminal/*` | Color schemes for iTerm, Warp, Alacritty, kitty, Ghostty and Windows Terminal. |
| `rust/ejm_theme.rs` | The ratatui palette. `crates/ejm-tui` copies it with `scripts/sync-rust-theme.mjs`. `rust/TUI.md`, the terminal app guide, sits beside it, hand written. |

Edit `theme.json`, run the build, commit the generated files. Names and behavior of the web theme are documented in `packages/ui/THEME.md`.

## What the npm tarball holds

The tarball holds the generated themes, `theme.json`, the Rust theme, the original TTF and WOFF2 fonts with their OFL notices (`assets/fonts`), the brand palette and token JSON (`assets/brand`) and the UI icons (`assets/icons`). It does not hold the ejmlabs logos, favicons, lockups, motifs, social cards, templates or project families: the owner reserves those (see `LICENSE`), and they stay in the repository and the brand kit. `npm run pack:check -w @ejm/tokens` fails if one is packed. Packages inside this repository still read the full `assets/` tree from the workspace.

Use the public `@ejm/tokens/assets/*` export for the packed folders. `rust/ejm_theme.rs` and `rust/TUI.md` are included separately from brand assets. Terminal components live in the `ejm-tui` crate, not in this package.

## Asset maintenance and rights

From the repository root, run `node scripts/assets.mjs --local` to verify retained files against [their provenance](assets/PROVENANCE.md). It checks local hashes and inventory without the old kit. The optional `--sync` import uses `EJM_DESIGN_KIT`, or the legacy `../ejmlabs/design-kit` directory. That legacy source is not a build dependency.

Legacy imports exclude retired social profile kits and ZIP archives. CLI, IDE and Harness retain the approved editable logo SVGs; other project editable sources stay in the kit. Editable lockups and templates already in provenance are retained and packaged. The table and import filter in `scripts/assets.mjs` define this inventory. Do not remove table rows without removing their files and checking affected consumers.

### Relay assets

Relay's 28 production assets are available through the existing
`@ejm/tokens/assets/projects/relay/*` export. They include marks, outlined logos,
square icons, browser icons, a manifest and social cards. The retained kit owns
the artwork source and local review materials. Its `editable/` sources,
`README.md`, `index.html` and `review.svg`/`review.png` are not imported here.

To refresh only Relay from a reviewed kit, run from this repository root:

```sh
EJM_DESIGN_KIT=/path/to/ejmlabs/design-kit node scripts/assets.mjs --sync --project relay
node scripts/assets.mjs --local
```

This targeted import updates only Relay files and their provenance rows. It
preserves all other rows and the complete moved-and-edited source record. It
fails before copying files if a required Relay source is missing. A plain
`--sync` still refreshes the full retained import set. Run the normal repository
gate before release. Importing artwork does not deploy a consumer or publish a
package.

Public consumer examples:

```js
import.meta.resolve('@ejm/tokens/assets/projects/relay/mark-ink.svg');
import.meta.resolve('@ejm/tokens/assets/projects/relay/favicon.svg');
```

### ejm-ui assets

ejm-ui's own family lives in `assets/projects/ui/`, in the same format as CLI,
IDE and Harness: marks, outlined and editable logos, square icons, browser icons,
a manifest and social cards. The mark is the approved u and block, selected on
29 October 2026: a 36-unit ribbon u on the 256 grid that starts as a tapered tip,
like the CLI, IDE, Harness and gerry marks, holding one rounded-square component.
It replaces the earlier grid-e mark. The ejmlabs symbol in `assets/logos/` stays
the company mark.

The files are generated, not imported. `scripts/ui-assets.mjs` holds the mark
path and calls `scripts/family-assets.mjs`, which outlines text from the fonts in
`assets/fonts/` with Python fontTools, renders rasters with sharp and the ICO with
Pillow, and rewrites the `generated:ui-assets` provenance rows. From the
repository root:

```sh
node scripts/ui-assets.mjs          # write the files and their provenance rows
node scripts/ui-assets.mjs --check  # fail if any file or row would change
```

### gerry assets

gerry, the commercial product, has the same family in `assets/projects/gerry/`.
The mark is the approved standing G, selected by the owner on 28 October 2026: a
ribbon G that starts as a tapered tip, like the CLI, IDE and Harness marks, with
a 36-unit crossbar. It replaces gerry's pixel mascot everywhere. gerry is not
built with `@ejm/site`, so it has no build identity in the project registry; the
files are here so ejmlabs sites and the gerry repository use one source.
`scripts/gerry-assets.mjs` holds the mark path and calls the same family
generator:

```sh
node scripts/gerry-assets.mjs          # write the files and their provenance rows
node scripts/gerry-assets.mjs --check  # fail if any file or row would change
```

The family sheets (`assets/projects/family-*.svg`) present the three tools, CLI,
IDE and Harness, so ejm-ui is not on them, like Relay and Chess.

### Rights

Brand materials retain their owner's rights. Manrope and IBM Plex Mono retain the SIL Open Font License notices in `assets/fonts/`. See the package [license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md) before copying assets or fonts.

## Public brand downloads

Studio assembles the brand downloads from the repository's `assets/` tree, not from the npm tarball. The tarball carries only the fonts, palette JSON and icons (see above). Public source access does not grant trademark rights; preserve the terms and original notices in LICENSE and THIRD_PARTY_NOTICES.md.

Run `npm run pack:check -w @ejm/tokens` to check the tarball against that rule. Active UI colors still come from `theme.json` and its generated files.
