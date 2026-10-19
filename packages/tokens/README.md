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

The repo keeps the brand assets used by its packages and retained X-kit renders and fonts during cleanup. `npm pack` (the `files` field in `package.json`) leaves out the retained X-kit assets, ZIP archives, `templates/`, every `editable/` source, the TTF font sources (the WOFF2 files stay), and the large PNG renders of motifs and per-project logos, marks and icons. The SVGs, favicon set, apple-touch icon, android icons and social cards stay. Per-project brand families are in `assets/projects/<id>/` (cli, ide, harness; ejmlabs uses the root sets). A consumer who needs a retained file excluded from the tarball reads it from this repo.

## Asset maintenance and rights

From the repository root, run `node scripts/assets.mjs --local` to verify retained assets against [their provenance](assets/PROVENANCE.md). The optional `--sync` import uses `EJM_DESIGN_KIT`, or the legacy `../ejmlabs/design-kit` directory. It skips retired kit handoff files, editable kit sources, and ZIP archives. Rendered X-kit assets and font copies remain hashed in provenance until removal and stay excluded from the tarball. That legacy source is not a build dependency.

Brand materials retain their owner's rights. Manrope and IBM Plex Mono retain the SIL Open Font License notices in `assets/fonts/`. See the root [license](../../LICENSE) and [third-party notices](../../THIRD_PARTY_NOTICES.md) before copying assets or fonts.
