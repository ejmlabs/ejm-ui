# @ejm/tokens

The single source for ejmlabs color and brand: `theme.json` (the ui theme and the web bands), the brand palette and the assets in `assets/` (each file listed with its sha256 in `assets/PROVENANCE.md`).

```bash
npm run build -w @ejm/tokens   # regenerate everything below from theme.json
npm run check -w @ejm/tokens   # contrast gates, and fail on any stale generated file
```

| Output | For |
| --- | --- |
| `generated/tailwind.css` | Tailwind v4 theme: brand colors, semantic colors, the four bands, elevation. Imported by `@ejm/ui/styles.css`. |
| `generated/window.css` | The ui roles and syntax colors as web variables and Tailwind colors, for product windows and editors. |
| `generated/theme.css` | The ui roles as plain `--ejm-ui-*` variables, dark by default, for the IDE and other non-Tailwind apps. |
| `generated/monaco/*.json` | Monaco editor themes. |
| `generated/terminal/*` | Color schemes for iTerm, Warp, Alacritty, kitty, Ghostty and Windows Terminal. |
| `rust/ejm_theme.rs` | The ratatui palette. `rust/ejm_tui.rs` and `rust/TUI.md` sit beside it, hand written. |

Edit `theme.json`, run the build, commit the generated files. Names and behavior of the web theme are documented in `packages/ui/THEME.md`.

## What the npm tarball holds

The repo keeps the brand assets used by its packages. Provenance lists 244 retained imports: 242 files under `assets/`, plus `rust/ejm_tui.rs` and `rust/TUI.md`. This count describes the committed source, not the npm tarball.

`npm pack` (the `files` field in `package.json`) leaves out ZIP archives, `templates/`, every `editable/` source, the TTF font sources (the WOFF2 files stay), and the large PNG renders of motifs and per-project logos, marks and icons. The SVGs, favicon set, apple-touch icon, android icons and social cards stay. Per-project brand families are in `assets/projects/<id>/` (cli, ide, harness; ejmlabs uses the root sets). A consumer who needs a retained file excluded from the tarball reads it from this repo, subject to its license.

## Asset maintenance and rights

From the repository root, run `node scripts/assets.mjs --local` to verify retained files against [their provenance](assets/PROVENANCE.md). It checks local hashes and inventory without the old kit. The optional `--sync` import uses `EJM_DESIGN_KIT`, or the legacy `../ejmlabs/design-kit` directory. That legacy source is not a build dependency.

Legacy imports exclude retired social profile kits, per-project `editable/` sources and ZIP archives. The repo keeps editable lockups and templates, listed in provenance and excluded from the tarball. The table and the import filter in `scripts/assets.mjs` define the retained inventory. Do not remove table rows without removing their files and checking affected consumers.

Brand materials retain their owner's rights. Manrope and IBM Plex Mono retain the SIL Open Font License notices in `assets/fonts/`. See the package [license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md) before copying assets or fonts.
