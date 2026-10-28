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
| `Callout` | note, tip, warning | Left rule, a kind or override label, wrapped text |
| `Markdown` | `default` (Rust only) | CommonMark as terminal text: headings, lists, emphasis, fences, diffs |
| `StateBlock` | empty, loading, error | Glyph and word, one sentence, at most one action |
| `Message` | user, assistant, notice, error | Gutter glyph (`›` `●` `!` `✗`), text under a hanging indent; assistant text as Markdown |
| `ToolCall` | queued, running, done, failed | State glyph, bold name, muted argument; output preview under `└`, `+N lines (key to expand)` |
| `CommandMenu` | default, empty | Usage and description in aligned columns, `›` on the selection, scrolls to keep it visible |

Each is a ratatui `Widget`. Components that wrap also have `height(width)` and `lines(width)`, so a layout can measure before it draws.

## Use

```toml
# crates/ejm-cli/Cargo.toml, with sibling checkouts
ejm-tui = { path = "../../../ejm-ui/crates/ejm-tui" }
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

## Markdown and code

`Markdown::new(&theme, source).lines(width)` renders CommonMark headings, lists, bold, italic, inline code, quotes, links, code fences and GFM pipe tables as terminal text. It also implements `Widget` and `height(width)`. Headings omit `#`. Fences show a language tag without ticks, then highlighted source. Pipe tables use the shared `Table` widget: a header, a hairline, then rows that never wrap. Trailing columns drop when the area is too narrow. Right-aligned columns stay right-aligned; center alignment renders as left. Cell emphasis flattens to plain text. The widget is registered for the `rust` target only; web and Ink can claim it later. The CLI still uses its local widget file until that migration lands.

`code_lines(&theme, CodeLanguage::from_tag("rust"), source_line, width)` highlights and column-wraps one source line without losing its continuation. Tags cover Rust, JavaScript/TypeScript, Python, JSON, shell, TOML/YAML and unified diffs; unknown tags stay plain. Highlighting is intentionally line-local and does not understand multiline comments or full language grammars. The 14 syntax styles come from generated tokens in truecolor and 256-color terminals, and collapse to plain and bold at 16 colors and under `NO_COLOR`.

Fenced code preserves blank lines, tabs become four spaces, and a fence still being streamed renders as code. Raw patches are recognized conservatively by a `diff --git` line or adjacent `---`/`+++` file headers with a hunk header. Diff file headers stay muted, added and removed lines retain their signs and success/error roles, and hunk headers use the existing information role. Bare lists are not treated as patches. Links retain their destination in text, without executing it; HTML is literal text, not markup. GFM tables are enabled. Task lists stay off.

Prose wrapping uses the existing `textwrap` dependency, with a byte-range mapping back to styled spans. Code wraps by terminal columns on grapheme boundaries. A zero-width area renders nothing; a grapheme wider than the entire area becomes `?` so a one-column view never hangs. ASCII mode changes UI glyphs, not user-authored Unicode text. The renderer allocates in proportion to its input and output; hosts remain responsible for bounding retained messages and view caches.

## Safe with untrusted text

Widgets strip control characters, including escape, before drawing. This is defense in depth, not an ANSI-sequence sanitizer: printable parts such as `[31m` can remain. Hosts must strip complete terminal escape sequences from untrusted content before parsing or rendering; ejm-cli already does this through `safe_text`. No markdown, link or HTML is executed. Widths are terminal columns counted with `unicode-width`; fitted text never splits a wide grapheme.

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

Product transcript state, command handling and terminal lifecycle stay in the host. Shared Markdown, diff presentation, conversation blocks, workspace layout and identity belong to this crate. Consumers adopt these APIs through their reviewed dependency pins. Boxed helpers such as a composer box or a picker popup are left out on purpose, and so are tabs, the progress bar and step lines. This crate replaces the hand-written terminal helper file that `@ejm/tokens` and the design kit used to ship. `packages/tokens/rust/TUI.md` is the terminal app guide built on these components.

## Conversation blocks

`Message`, `ToolCall` and `CommandMenu` are the blocks a terminal agent's transcript is made of. They are contract components with the same output in Ink (`@ejm/ink`), checked by the shared cases in `packages/core/terminal-fixtures.json`, so a Rust CLI and a JavaScript CLI show a conversation the same way. Assistant `Message`s draw their text with `Markdown` under the gutter; `Markdown` is Rust-only, so Ink assistant text uses Ink's own lighter Markdown. Hosts pass sanitized text; control characters are removed again before drawing. `ToolCall` takes the host's expand key and spinner frame, and never reflows tool output: long lines are cut with an ellipsis. `elapsed_text` and `compact_count` format the times and token counts hosts show beside them.

## Conversation workspace recipes

`WorkspaceLayout` allocates the header, transcript, workers, activity, resource
counts, notices, composer and controls. At supported sizes (at least 20 columns
and 8 rows), it preserves one transcript row, a draft row and the grants footer.
Notices are capped at four rows and the draft at six. Short windows hide the
worker strip before reducing the composer.

`SessionHeader` fits application identity and connection on one line and keeps
the directory on a second line. `ActivityLine` takes optional details and a
spinner frame and draws `⠋ Thinking… (step 2 · 14s · Esc to stop)` while active. Connection detail drops when space is tight;
the host must offer full inspection. `ActivityLine` separates current work from
`ResourceLine`, whose active and queued counts remain visible while idle.
Counts use `A+Qq` for active plus queued work. Narrow rows truncate with an
ellipsis; hosts must retain a full capacity view. Do not present unavailable
usage as zero.

`workspace_controls` keeps the effective grant mode first, warns for elevated
grants and drops trailing hints. Hosts order hints by task and keep their
bindings authoritative. `worker_line` uses the shared Row selection mark and
reserves space for state before fitting a long title. These are compositions
of existing primitives, with no per-host style or spacing options. Hosts supply
sanitized text and bounded state. All recipes use the current theme and glyphs,
including ASCII and NO_COLOR. No backend, timer or runtime dependency is added.
