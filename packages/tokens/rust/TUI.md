# Terminal app guide

How every ejmlabs terminal app looks and behaves. `ejm-cli` is the reference screen, and the same rules apply to any ratatui or Ink app we build.

Two sources define a terminal screen, and an app keeps no copy of either:

- **The contract**, `packages/core/contract.json` in ejm-ui. It names every component, its states, glyphs and default words. The web (`packages/ui`), Ink (`packages/ink`) and Rust (`crates/ejm-tui`) targets implement it, and `scripts/parity.mjs` fails when a target misses a state.
- **The theme**, `packages/tokens/theme.json`. The tokens build writes `rust/ejm_theme.rs` from it, and `crates/ejm-tui/src/theme.rs` is a copy of that file kept current by `scripts/sync-rust-theme.mjs`.

Rust apps depend on the `ejm-tui` crate (`crates/ejm-tui`). JavaScript CLIs use `@ejm/ink`. Both print the same lines for the same inputs: `packages/core/terminal-fixtures.json` holds both targets to one set of expected output. Run `cargo run --example showcase` in `crates/ejm-tui` to see every component and state.

## Principles

- **Containerless.** No boxes, frames, cards or tonal panels. Group with a blank row and a single hairline `Rule`. There is no composer box and no popup or overlay window.
- **Text on the reader's terminal.** Never paint a background. Our colors are text colors that stay readable on the reader's own ground. The selected row is marked by a glyph and bold text, not a filled bar.
- **Color is never the only signal.** Every state is named by a word, a glyph or both, so the app is fully usable under `NO_COLOR` and in plain ASCII.
- **Calm.** No flashing and no constant motion. One spinner while work runs, and nothing when idle.
- **Plain words.** Sentence case, concrete nouns, no em dashes. Empty, loading and error states have one plain sentence and at most one action.

## Roles

`Theme` exposes the text roles every component uses. A new color needs a new role in `theme.json`, not a one-off in the app.

| Role | Used for |
| --- | --- |
| `text` | Message text: the terminal's own foreground |
| `muted` | Secondary facts, tool arguments and output, hints, details, empty-state help |
| `strong` | Tool names, selected rows, emphasis (bold) |
| `code` | Code and identifiers, the quietest role |
| `accent` | Prompt, your own messages, headings, running work, key names, selection |
| `ok` | Completed calls, added diff lines |
| `warn` | Elevated grants, notices |
| `error` | Failures, removed diff lines |
| `info`, `pending` | The matching `Status` levels and queued work |
| `rule` | The hairline and the callout rule |

Contrast is at least 4.5:1 on the ground color for every role in both themes. The tokens build fails otherwise.

## Choosing colors

`Theme::from_env(no_color_flag, appearance, plain_flag)` checks in this order and stops at the first match:

1. `NO_COLOR` set to a non-empty value, the app's `--no-color` flag, or `TERM=dumb`: no colors. Strong text, accent, warning and error are bold, everything else is plain.
2. `COLORTERM` contains `truecolor` or `24bit`: the generated palette.
3. `TERM` contains `256color`: the same palette, mapped to the nearest 256-color index.
4. Otherwise: the named 16-color set from the generated theme.

Dark or light comes from the `--appearance` flag, then from `COLORFGBG`, and defaults to dark. `Theme::detect` takes the same inputs explicitly for tests.

## Glyphs

Glyphs are Unicode when the locale is UTF-8 and `--plain` is off, and ASCII otherwise. The full table is `glyphs` in the contract; the common ones:

| Meaning | Unicode | ASCII |
| --- | --- | --- |
| Prompt, selected row, your message | `›` | `>` |
| Assistant message, running tool | `●` | `*` |
| Queued tool, pending | `○` | `o` |
| Done, ok | `✓` | `+` |
| Failed, error | `✗` | `x` |
| Warning, notice | `!` | `!` |
| Focused row | `▸` | `*` |
| Output elbow | `└` | `` `- `` |
| Hairline | `─` | `-` |
| Separator | `·` | `-` |
| Ellipsis | `…` | `...` |
| Spinner | `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` | `\| / - \` |

Count widths with `unicode-width`, never with `len()`. Every component takes the width it may use, never draws past it, and cuts with an ellipsis without splitting a wide character.

## Components

Choose from the contract. Do not invent a new widget or a new color; extend the contract and every target together instead.

| Component | States | What it draws |
| --- | --- | --- |
| `Text` | default (variants default, muted, strong, code) | Wrapped text |
| `Rule` | default | One hairline, optionally led by a muted label |
| `Row` | default, selected, disabled, focused | `label  value  ....  meta`, with a mark column |
| `Status` | ok, warn, error, info, pending | Glyph and word: `✓ ok` |
| `Stat` | default, loading, error, empty | Figure over label |
| `Table` | default, empty, loading, error | Header, one hairline, rows. Numbers right aligned |
| `Prompt` | idle, busy, error | `›` and the typed value; spinner and `working`; message under the line |
| `KeyHints` | default | `Enter send · Ctrl+C stop`, dropped from the end |
| `Callout` | note, tip, warning | Left rule, a label, wrapped text |
| `StateBlock` | empty, loading, error | Glyph and word, one sentence, at most one action |
| `Message` | user, assistant, notice, error | Gutter glyph, text under a two-column hanging indent; assistant text as Markdown |
| `ToolCall` | queued, running, done, failed | State glyph, bold name, muted argument; output preview under `└` |
| `Markdown` | default (Rust only) | CommonMark as terminal text: headings, lists, emphasis, fenced code with syntax colors, diffs |
| `CommandMenu` | default, empty | Usage and description in aligned columns, `›` on the selection |

`ToolCall` shows four output lines (eight when failed), then `… +N lines (key to expand)` with the host's expand key. Output lines are cut, never reflowed. Assistant messages draw their text with `Markdown` under the gutter.

## Workspace

A conversation screen is built from `WorkspaceLayout` and the workspace recipes in the crate. They compose the components above and take no style or spacing options. Top to bottom:

| Region | Height | Content |
| --- | --- | --- |
| Header | 2 rows | `SessionHeader`: name and version with the connection on the right, then the directory, cut from the start |
| Transcript | fills, at least 1 row | `Message`, `ToolCall` and `Markdown` blocks separated by one blank row |
| Workers | 0 or 1 row | `worker_line` rows, hidden first on short windows |
| Activity | 0 or 1 row | `ActivityLine`: spinner, label and muted details while active |
| Resources | 1 row | `ResourceLine`: agents, models and tools as `active+queued`, shown while idle too |
| Notices | 0 to 4 rows | Host notices |
| Composer | 2 to 7 rows | One `Rule`, then a `Prompt` of one to six draft rows |
| Controls | 1 row | `workspace_controls`: effective grant mode first, then `KeyHints` |

The supported size is at least 20 columns and 8 rows. Below that, show one sentence asking the reader to enlarge the terminal.

The real output at 64 columns under `NO_COLOR`:

```text
  ejm-cli 0.1.0                         deepseek / deepseek-chat
  ~/src/ejm-cli

› Fix the flaky retry test.

● The test reads the wall clock, so I will inject one.

✓ read_file  src/retry.rs
  └ 1: use std::time::Instant;
    2:
    3: pub fn retry() {}
    4: }
    … +2 lines (Ctrl+O to expand)
⠹ run_tests  cargo test retry  running…

⠹ Running tests… (step 2 · 14s · Esc to stop)
2 agents · models 1+0q · tools 1+0q
────────────────────────────────────────────────────────────────
› ▌Describe a task
grants: write · Enter queue · Ctrl+K steer · Esc stop
```

- **Grants.** The controls row names the effective mode in words and turns it warning when write or shell access is on.
- **Counts.** Never show unavailable usage as zero. Narrow rows truncate, so the host keeps a full view of connection and capacity it can open on request.
- **Completion.** `CommandMenu` draws completion choices as plain rows by the draft, never in a popup.

## Keys

Hints use `Key action` pairs, most important first, because pairs that do not fit are dropped from the end. Keep these bindings across apps so muscle memory carries over. Hosts own their bindings; the crate only draws them.

| Key | Action |
| --- | --- |
| Enter | Send, or queue while running |
| Alt+Enter | New line |
| Esc | Stop the run |
| Ctrl+K | Steer the running turn |
| Ctrl+C | Clear the draft; press again to quit |
| Ctrl+S | Sessions |
| Ctrl+O | Show or hide tool details |
| `/` | Commands, shown in a `CommandMenu` |
| `?` | Shortcuts |

## Accessibility and motion

- Provide a plain mode with no cursor movement and no spinners, for pipes and screen readers. `ejm-cli` calls this `--plain` and `--json`.
- Under reduced motion the spinner is the static running mark (`Theme::spinner(elapsed_ms, true)`).
- Text from the network, tools or files may go straight into any component. Control characters, including escape, are removed before drawing.
- Restore the terminal on exit, error, panic and handled signals.
- Redraw on input and on state change, not on a free-running timer when idle.

## Using the crate

```toml
# Cargo.toml
ejm-tui = { path = "../ejm-ui/crates/ejm-tui" }
```

```rust
use ejm_tui::{Appearance, Theme};

// Once at startup. `--no-color` and `--plain` are the app's own flags.
let theme = Theme::from_env(no_color_flag, Appearance::Auto, plain_flag);
```

Each component is a ratatui `Widget`, and the ones that wrap have `height(width)` and `lines(width)` so a layout can measure before it draws. The crate depends on ratatui 0.30 with default features off, so it adds no terminal backend. See `crates/ejm-tui/README.md` for the full API.

An app that only needs the palette, without the components, can read `rust/ejm_theme.rs` from `@ejm/tokens`. Do not keep a palette of your own.

## Testing a screen

`cargo test` in `crates/ejm-tui` renders every component and state at 40, 80 and 200 columns and at every width from 0 to 60, checks that nothing paints outside its area, that `NO_COLOR` output has no color and still tells each state apart, and that the shared fixtures match. Check the rest by eye before shipping a screen:

- [ ] **Width.** Every row fits at 20 columns and at 200, with an ellipsis where it is cut.
- [ ] **Plain.** Under `NO_COLOR` and `--plain`, every state is still named by a word or a glyph.
- [ ] **States.** Every list, table and panel shows loading, empty and failed, each with one sentence and at most one action. No bare zero and no blank area.
- [ ] **No frames.** No box-drawing borders and no filled backgrounds.
- [ ] **Keys.** Hints list the most important pair first, and the bindings match the table above.
