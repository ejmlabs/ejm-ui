# ejm-tui

ejmlabs terminal components for [ratatui](https://ratatui.rs). The same primitives and states as the web and Ink targets of ejm-ui, taken from one contract (`packages/core/contract.json`) and one generated theme (`packages/tokens/theme.json`).

Everything is containerless. Groups are separated by space and a single hairline, never by box-drawing frames. Every state is named by a word, a glyph or both, so it reads under `NO_COLOR` and in plain ASCII.

## Components

| Component | States | What it draws |
| --- | --- | --- |
| `Text` | `default` (variants: default, muted, strong, code) | Wrapped text |
| `Rule` | `default` | One hairline, optionally led by a muted label |
| `Row` | default, selected, disabled, focused | `label  value  ....  meta`, with a mark column |
| `Status` | ok, warn, error, info, pending | Glyph and word: `✓ ok` |
| `Stat` | default, loading, error, empty | Figure over label (2 rows) |
| `Table` | default, empty, loading, error | Header, one hairline, rows. Numbers right aligned |
| `Prompt` | idle, busy, error | `›` and the typed value; spinner and `working`; message under the line |
| `KeyHints` | `default` | `Enter send · Ctrl+C stop`, dropped from the end |
| `Callout` | note, tip, warning | Left rule, a label, wrapped text |
| `StateBlock` | empty, loading, error | Glyph and word, one sentence, at most one action |

Each is a ratatui `Widget`. Components that wrap also have `height(width)` and `lines(width)`, so a layout can measure before it draws.

## Use

```toml
# ejm-cli/Cargo.toml
ejm-tui = { path = "../ejm-ui/crates/ejm-tui" }
```

```rust
use ejm_tui::{Appearance, Row, RowState, Theme};

// Once at startup. `--no-color` and `--plain` are your own flags.
let theme = Theme::from_env(no_color_flag, Appearance::Auto, plain_flag);

// Every frame.
frame.render_widget(Row::new(&theme, "main").value("3 ahead").state(RowState::Selected), area);
```

Run `cargo run --example showcase` to see every component and state in dark, light and `NO_COLOR`. `cargo run --example showcase -- 40 ascii` gives 40 columns with ASCII glyphs, and `-- 80 --ansi` prints real colors to a terminal.

The crate depends on `ratatui` 0.30 with default features off, so it adds no terminal backend. It tests on Rust 1.99.1, the toolchain of ejm-cli.

## Color and glyphs

`Theme::detect` and `Theme::from_env` choose in this order and stop at the first match:

1. `NO_COLOR` set to a non-empty value, your `--no-color` flag, or `TERM=dumb`: no colors. Strong text, accent, warning and error are bold, everything else is plain. No cell gets a foreground or background color.
2. `COLORTERM` contains `truecolor` or `24bit`: the generated palette.
3. `TERM` contains `256color`: the same palette, mapped to the nearest 256-color index.
4. Otherwise: the named 16-color set from the generated theme.

Dark or light comes from your `--appearance` flag, then from `COLORFGBG`, and defaults to dark. No widget paints a background, so the reader's terminal colors stay underneath.

Glyphs are Unicode when the locale is UTF-8 and `--plain` is off, and ASCII otherwise. `Theme::with_glyphs` forces a set.

Under `NO_COLOR` the states still differ:

```text
✓ ok          ! warn        ✗ error       i info        ○ pending
  label       › label       ▸ label       label (disabled)
… Loading     ✗ Failed      – No data
```

`Text` variants are the one exception. A terminal is monospace already, so `muted` and `code` differ only by color, and only `strong` (bold) survives `NO_COLOR`. Meaning never depends on a text variant.

## No frames

Do not draw boxes around groups. Use a blank row and a `Rule`. A `Callout` has a left rule and a label, and a `Table` has one hairline under its header; nothing closes the other sides. The old rounded `Block` helpers (composer box, picker box) are not part of this crate on purpose.

## Safe with untrusted text

Text from the network, tools or files can go straight into any widget. Control characters, including escape, are removed before drawing, so an escape sequence cannot reach the terminal. Widths are terminal columns counted with `unicode-width`; wide characters are never split, and a cut cell ends in an ellipsis.

## Theme

`src/theme.rs` is a copy of `packages/tokens/rust/ejm_theme.rs`, which the tokens generator writes from `theme.json`. Do not edit it. From the repo root:

```sh
node scripts/sync-rust-theme.mjs           # copy the generated theme into the crate
node scripts/sync-rust-theme.mjs --check   # fail when the copy is stale
```

## Catalog and parity

`catalog()` returns every component with its states, built from the state enums. `cargo test` writes it to `catalog.json` as `{ "Component": ["state", ...] }`, and `scripts/parity.mjs` compares that file with the contract. The tests also check the contract's states, glyphs, labels and default words against what the widgets print, so a change in `contract.json` fails here until the crate follows.

## Tests

```sh
cd crates/ejm-tui
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

The render tests draw every component and state into a ratatui `TestBackend` at 40, 80 and 200 columns, and into a padded buffer at every width from 0 to 60 to prove nothing paints outside its area. They check that `NO_COLOR` output has no color and that each state of a component looks different as plain text, that only theme colors are used, and that numeric columns line up on their right edge.

## Not in this crate

The app-specific helpers of the old `ejm_tui.rs` (header, transcript blocks, diff styling, composer box, picker popup, tabs, progress bar, step lines) are not ported. Some are boxed, and the rest belong to ejm-cli's screens. They stay in `packages/tokens/rust/ejm_tui.rs` until ejm-cli has moved to this crate; then that file should be deleted.
