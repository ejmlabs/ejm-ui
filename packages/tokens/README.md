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

The repo keeps the full asset set. `npm pack` (the `files` field in `package.json`) leaves out what a site never serves: the X kit and its `.zip`, `templates/`, every `editable/` source, the TTF font sources (the WOFF2 files stay), the PNG renders of the large motifs and of the per-project logos, marks and icons (the SVGs stay; the favicon set, apple-touch icon, android icons and social cards stay as PNG because sites serve them). That takes the tarball from 7.9 MB to about 1.7 MB. Per-project brand families are in `assets/projects/<id>/` (cli, ide, harness; ejmlabs uses the root sets). A consumer who needs an excluded file reads it from this repo.
