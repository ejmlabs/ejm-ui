# Terminal app guide

How every ejmlabs terminal app looks and behaves. It describes the `ejm-cli` screen, which is the reference, and applies to any ratatui or other TUI we build. Preview it in `index.html`.

Colors come from `rust/ejm_theme.rs`, generated from `theme.json`. Copy that file into a Rust app rather than keeping a palette of your own. The widgets in this guide are implemented in `rust/ejm_tui.rs`, which sits on top of it. See all of them rendered in `tui.html`.

## Principles

- **Text on the reader's terminal.** Never paint a background. The user chose their terminal colors; ours are text colors that stay readable on either. The only filled surface is a reversed highlight for the selected row.
- **Five text roles, no more.** Accent, dim, warning, error, success, plus plain text and bold. A new color needs a new role in `theme.json`, not a one-off in the app.
- **Color is never the only signal.** Every colored state also has a word or a glyph. The app is fully usable under `NO_COLOR`.
- **Calm.** No flashing, no constant motion. One spinner while work runs, and nothing when idle.
- **Plain words.** Sentence case, concrete nouns, no em dashes. An error says what happened and what to do next.

## Roles

| Role | Used for | Dark | Light |
| --- | --- | --- | --- |
| accent | App name, your own messages, headings, running status, selection | `B8C6AA` | `29443B` |
| dim | Secondary facts, tool output, code fences, hints, empty-state help | `849682` | `67796C` |
| warning | Granted write or shell access, notices | `D7B87C` | `8A5A12` |
| error | Failures, removed diff lines | `EEA0A0` | `A63A3A` |
| success | Completed steps, added diff lines | `93BA8B` | `2F6B3A` |
| plain | Assistant text, bold for the assistant's title | terminal default | terminal default |

`dim` is the quietest text role that reaches 4.5:1 on the ground color.

One extra role is used in exactly one place: diff hunk headers (`@@ -12,3 +12,3 @@`) use `special` (`B7A6E8` dark, `5B4A96` light) in truecolor. On 16 colors, `ejm_theme.rs` has no special color, so hunk headers are dim; under `NO_COLOR` they are plain.

## Choosing colors

Check in this order and stop at the first that applies:

1. `--no-color` flag or `NO_COLOR` set: no colors. Accent, warning and error become bold; dim and success become plain.
2. Truecolor (`COLORTERM` contains `truecolor` or `24bit`): `DARK` or `LIGHT` from `ejm_theme.rs`.
3. Otherwise: `BASIC_DARK` or `BASIC_LIGHT`, the named 16 color set.

Pick light or dark from the `--appearance` flag, then from `COLORFGBG` (background index 7 or 9 to 15 is light), and default to dark.

`Theme::detect(no_color, appearance, colorfgbg, colorterm)` in `ejm_tui.rs` implements exactly this order with explicit inputs, and `Theme::from_env` reads them from the environment.

## Screen anatomy

Top to bottom, as in `ejm-cli`:

| Region | Height | Content |
| --- | --- | --- |
| Header | 2 lines | Line 1: app name (accent, bold), provider, session title (dim). Line 2: grants, working directory, short session id. Grants turn warning when write or shell is on. |
| Transcript | fills | Blocks separated by one blank line, with a one-cell horizontal pad. Empty state: "What shall we build?" in accent, then three dim lines. |
| Status line | 1 line | Counts of agents, model requests and tools, then the run state. Accent while running, dim when idle. |
| Widgets | 0 to 4 lines | Extension output, dim. |
| Composer | 3 to 8 lines | A rounded box with a `›` prompt. Grows to six text lines, then scrolls. |
| Hints | 1 line | Key hints separated by `·`. Pairs that do not fit are dropped from the end, so list the most important first. |
| Overlay | centered | Sessions and pickers. Selected row reversed in accent. |

Below 20 columns or 8 lines, show only: "Enlarge the terminal to use the app."

## Transcript blocks

| Block | Title style | Body |
| --- | --- | --- |
| You | accent | plain |
| Assistant | bold | plain; `#` headings accent and bold |
| Tool | dim | dim |
| Notice | warning | plain |
| Error | error | error |

Fenced code is dim, with the fence lines dim too. In a diff, lines starting `+` are success and lines starting `-` are error. Leave `+++` and `---` header lines dim.

## Glyphs

Use ASCII when the locale is not UTF-8 or the user passes `--plain`.

| Meaning | Unicode | ASCII |
| --- | --- | --- |
| Composer prompt | `›` | `>` |
| Running | `●` | `*` |
| Idle | `○` | `o` |
| Done | `✓` | `+` |
| Failed | `✗` | `x` |
| Warning | `!` | `!` |
| Tool call | `▸` | `>` |
| Scrolled up | `↑` | `^` |
| Separator | `·` | `-` |
| Ellipsis | `…` | `...` |
| Spinner | `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` | `\| / - \` |

Box borders are rounded (`╭ ╮ ╰ ╯ │ ─`), or `+ - |` in ASCII. Count widths with `unicode-width`, never with `len()`.

## States

| State | What shows |
| --- | --- |
| Running | `●` and the status word in accent. Spinner at 80 ms per frame, only while running. |
| Stopping | "Stopping…" in the status line. Input stays enabled. |
| Idle | Dim status line with "Ready". |
| Scrolled up | `↑ N lines above latest · End to follow` in the status line. |
| Failed request | Error block: what failed, then the next step. The session stays open. |
| Grants on | Header grants line in warning, spelled out: `grants: write, shell`. |
| Loading | `⠋ Loading sessions…` in bold accent, then a dim hint. Dotted rows in the final column widths for a table. With reduced motion the spinner is the static `●`. |
| Empty | A title, one dim sentence, and one `[key] action` line when there is something to do. Never a zero or a blank area. |
| Failed list, table or panel | `✗ What failed` in bold error, one plain sentence of what to do, and one `[key] action` line. |

### Same states as the application kit

The terminal and the application screens follow one set of states, one spacing rhythm and the same color roles. A screen in either place has the same parts in the same order.

| Application kit | Terminal helper |
| --- | --- |
| `ejm-ui-stat` tile | `stat_line` |
| `ejm-ui-hbar` row | `bar_line` |
| `ejm-ui-table` row | `table_row` |
| `ejm-ui-skel` bones | `loading_row`, `loading_state` |
| `ejm-ui-empty` with one button | `empty_state_action` |
| `ejm-ui-empty--error` with one button | `error_state_action` |
| `ejm-ui-banner` | `banner` |
| `ejm-ui-progress` | `progress_bar`, `progress_line` |
| `ejm-ui-status` dot and word | `status_line`, `step_line` |

Spacing language: a one-cell pad on both sides of every line; one blank line between regions; titles of states indented two cells, with their sentences flush under the pad; a glyph line hangs its text under the first word; columns are two spaces apart; every block that can be empty, loading or failed keeps the same height rhythm in each state. Under `NO_COLOR` the roles collapse to bold and plain, and each state is still named by a word (`Loading`, the title) or a glyph (`✗`, `x`).

## Keys

Hints use `Key action` pairs. Keep these bindings across apps so muscle memory carries over.

| Key | Action |
| --- | --- |
| Enter | Send, or queue while running |
| Alt+Enter | New line |
| Ctrl+K | Steer the running turn |
| Ctrl+S | Sessions |
| Ctrl+C | Stop the run; press again to quit |
| End | Follow the latest output |
| Esc | Close an overlay |

## Accessibility and motion

- Contrast is at least 4.5:1 on the ground color for every role in both themes. `scripts/build-ui.mjs` fails the build otherwise.
- Provide a plain mode with no cursor movement, spinners or box drawing, for pipes and screen readers. `ejm-cli` calls this `--plain` and `--json`.
- Restore the terminal on exit, error, panic and handled signals.
- Cap redraws. Redraw on input and on state change, not on a free-running timer when idle.

## Building blocks

Every widget a terminal app needs, with the helper in `rust/ejm_tui.rs` that draws it. Choose from this list; do not invent a new widget or a new color. All sizes are columns, counted with `unicode-width`. Every helper takes the width it may use and never draws past it. Every example below is the real output of the helper at the width shown. `tui.html` shows them in color.

Each entry says when to use it, the roles it uses, how it behaves when narrow, and what changes under `NO_COLOR` or `--plain`. Unless an entry says otherwise, `NO_COLOR` keeps the characters and removes the color: accent, warning and error become bold, and dim, success and special become plain. `--plain` and a non-UTF-8 locale switch to the ASCII glyphs and an ASCII border (`+ - |`).

### Header

```
 ejm-cli deepseek-chat  ·  Fix the flaky retry test
 grants: write + shell  ·  ~/code/harbor  ·  s_4f2a91
```

- **When:** top of every full-screen app, always two lines.
- **Roles:** app name accent bold; provider plain; title, directory and id dim; the grants text warning when write or shell is on, else dim.
- **Width:** both lines are cut at the right edge with an ellipsis. Minimum 20 columns.
- **Helper:** `header_lines(&theme, glyphs, &Header { .. }, width)`.
- **Plain:** the grants text is spelled out, so warning is never the only signal.

### Transcript block

````
 you
 Why does retry_backoff fail on CI? It passes on my machine, so I think it
 depends on something in the environment.

 ejm-cli
 The test reads the wall clock. I will inject one.
 ```diff
 @@ -12,3 +12,3 @@
 -    let now = Instant::now();
 +    let now = clock.now();
 ```

 ▸ read_file src/retry.rs
 fn retry_backoff(attempts: u32) -> Duration {
     Duration::from_millis(100 << attempts)
 }
````

- **When:** every message, tool call, notice and error in the conversation.
- **Roles:** see the block table above. Fenced code and tool output dim; `#` headings accent bold; in a diff, hunk headers special, added success, removed error.
- **Width:** area width minus 2 for the one-cell pad. Prose wraps at spaces and keeps its indent. Code, diffs, tool output and titles break by column. One blank line ends each block.
- **Helper:** `transcript_block(&theme, BlockKind, title, body, width)`, with `wrap_text` and `wrap_chars` underneath.
- **Plain:** diff lines keep their `+` and `-`, so they read without color.

### Status line

```
 1 agents · models 1+0q · tools 1+0q · ● Streaming…
 1 agents · models 1+0q · tools 1+0q · ● Stopping…
 1 agents · models 1+0q · tools 1+0q · Ready
 1 agents · models 1+0q · tools 1+0q · ↑ 12 lines above latest · End to follow
```

- **When:** one line above the composer or the widgets, in any app with background work.
- **Roles:** accent while running or stopping, dim when idle or scrolled up.
- **Width:** counts drop from the right until the line fits; the run state never drops. Below that it is cut with an ellipsis. Minimum 20 columns.
- **Helper:** `status_line(&theme, glyphs, &counts, RunState, label, width)`.
- **Plain:** `*` replaces `●`; the status word stays.

### Composer

```
╭ message ─────────────────────────────────────────────────────────────────────╮
│ › Describe a task…                                                           │
╰──────────────────────────────────────────────────────────────────────────────╯
╭ message · Enter queues ──────────────────────────────────────────────────────╮
│ › Rename retry_backoff to backoff_delay,                                     │
│   then update the callers.                                                   │
╰──────────────────────────────────────────────────────────────────────────────╯
```

- **When:** the one place the user types. Three to eight lines tall: it grows to six text lines, then scrolls.
- **Roles:** border and prompt glyph accent; placeholder dim; typed text plain.
- **Width:** text width is the box width minus 6 (border, pad and the 2-cell prompt). Text breaks by column, not by word, so the cursor math stays exact. Place the terminal cursor yourself. Minimum 20 columns.
- **Helper:** `composer_block(&theme, glyphs, running)`, `composer_rows(&theme, glyphs, &rows, running)`, `composer_layout(text, cursor, width)` for wrapping and the cursor position.
- **Plain:** the ASCII border and `>` prompt. Do not draw the border at all in `--plain` pipe mode.

### Key hints

```
 Enter send · Ctrl+C stop/quit · Alt+Enter new line · Ctrl+K steer · Ctrl+S sessions
 Enter send · Ctrl+C stop/quit
 Enter send
```

- **When:** the last line of a full-screen app. Use the bindings in the Keys table.
- **Roles:** dim.
- **Width:** pairs are dropped from the end until the line fits, so order them by importance: send, stop and quit first. If even the first pair does not fit it is cut with an ellipsis.
- **Helper:** `hints(&theme, glyphs, &[("Enter", "send"), ..], width)`, or `hints_text` for the plain string.
- **Plain:** `-` replaces `·`.

### Overlay picker

```
 Why does retry_backoff fail on CI?
 The test reads the wall clock. I will inject one.
         ╭ sessions · ↑/↓ choose · Enter open · Esc close ────────────╮
         │  a1b2c3d4  [running]  Fix the flaky retry test             │
         │  9f3e07b2  [idle]  Add pagination to the list API          │
         │  5c1d88e0  [interrupted]  Migrate config to TOML           │
         │  0b77a4c9  [idle]  Explain the build graph                 │
         ╰────────────────────────────────────────────────────────────╯
```

The second row is the selected one: reversed accent across the full width.

- **When:** choose one item from a list without leaving the screen: sessions, models, files. Esc closes it and nothing else on screen changes.
- **Roles:** border and title plain; rows plain with a dim detail; the selected row reversed accent.
- **Width:** centered, at most the size you ask for, always leaving a one-cell margin. Rows are cut with an ellipsis. Minimum 20 columns by 8 lines like the rest of the app.
- **Helper:** `popup(area, w, h)` for the rectangle, `titled_block` for the box, `list_row` for each row. Clear the area first.
- **Plain:** reversed video still marks the selected row. Put the keys in the title so they stay visible.

### List

```
 a1b2c3d4  [running]  Fix the flaky retry test
 9f3e07b2  [idle]  Add pagination to the list API
 5c1d88e0  [interrupted]  Migrate config to TOML
```

The first row is selected.

- **When:** a short list in the body of a screen, with one selected row.
- **Roles:** label plain, detail dim, selected row reversed accent.
- **Width:** each row is cut with an ellipsis at the width; the selected row is padded to fill it.
- **Helper:** `list_row(&theme, glyphs, label, detail, selected, width)`.
- **Plain:** as for the picker.

### Table

```
 tool                calls         ms
 read_file              42      1,204
 search                 17        388
 run_shell               3     12,950
 write_file_with…        8         96
```

- **When:** rows with the same columns: tool timings, files, results.
- **Roles:** header row dim; body rows plain.
- **Width:** give each column a fixed width. Two spaces between columns. Text is cut with an ellipsis; numbers are right aligned and never cut, so size number columns for the largest value. Drop columns, rightmost first, below 40 columns.
- **Helper:** `table_row(glyphs, &[(text, width, Align)], style)`.
- **Plain:** no change.

### Progress

```
 Installing  [----------------------------------------]   0%
 Installing  [====================>-------------------]  50%
 Installing  [========================================] 100%

 ✓ Resolved 12 packages
 ✓ Fetched 12 packages
 ⠹ Linking binaries
 ○ Run post-install checks
 ✗ Verify signatures: key not found
```

- **When:** work with a known size. For unknown size use a spinner and a step list, not a bar.
- **Roles:** label dim; bar accent, success at 100%; steps: done success, running accent, pending dim, failed error.
- **Width:** the bar is always ASCII and exactly the width you give it. From 9 columns it has brackets and a percent. From 3 to 8 columns brackets only (`[=>-]`). Below 3 bare cells. It shows 100% only when done is at least total.
- **Helper:** `progress_bar(done, total, width)`, `progress_line(&theme, glyphs, label, done, total, width)`, `step_line(&theme, glyphs, StepState, text, spinner_frame, width)`.
- **Plain:** the bar needs no change. Glyphs become `+ x o` and the spinner frame becomes `*`.

### Spinner

```
 ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏
 ⠴ Running tests
 ● Running tests    (reduced motion)
 | / - \
```

- **When:** while something runs and you cannot say how far along it is. One spinner at a time. Nothing when idle.
- **Roles:** accent.
- **Width:** one cell. Frame changes every 80 ms, from the elapsed time, so it needs no state of its own. Redraw only while running.
- **Helper:** `spinner_frame(glyphs, elapsed_ms, reduced_motion)`.
- **Plain:** with reduced motion, `NO_COLOR` or `--plain`, show the static running glyph (`●`, or `*` in ASCII).

### Banner

```
! shell access is on for this session
✗ Provider request failed: 401 Unauthorized. Check EJM_CLI_API_KEY, then press
  Enter to retry.
```

- **When:** a one-sentence notice (warning) or failure (error) that is not part of the conversation. Say what happened and, for an error, what to do.
- **Roles:** notice warning with `!`; error error with the failed glyph.
- **Width:** wraps at spaces with the text hanging under the first word. Minimum 20 columns.
- **Helper:** `banner(&theme, glyphs, BannerKind, text, width)`.
- **Plain:** the glyph is the signal: `!` and `x`.

### Key-value

```
Session     s_4f2a91c0
Provider    deepseek-chat
Directory   ~/code/harbor
Grants      write + shell
```

- **When:** details of one thing: session info, settings, help text.
- **Roles:** key dim, value plain.
- **Width:** key column fixed; the value is cut with an ellipsis.
- **Helper:** `kv_line(&theme, glyphs, key, value, key_width, width)`.
- **Plain:** no change.

### Tabs

```
  Sessions   Models   Tools   Logs 
  ^^^^^^^^^^ active tab, reversed
```

- **When:** a few sibling views, three to six, switched with Left and Right.
- **Roles:** active tab reversed accent; others dim.
- **Width:** cut at the right edge with an ellipsis; keep labels one word.
- **Helper:** `tabs_line(&theme, glyphs, &labels, active, width)`.
- **Plain:** reversed video marks the active tab, so it needs no color.

### Diff

```
 diff --git a/src/retry.rs b/src/retry.rs
 --- a/src/retry.rs
 +++ b/src/retry.rs
 @@ -12,4 +12,4 @@ fn retry_backoff
  fn retry_backoff(clock: &Clock) {
 -    let now = Instant::now();
 +    let now = clock.now();
      sleep(delay(now));
  }
```

- **When:** showing a change. Use the same colors in transcript blocks and in a dedicated diff view.
- **Roles:** file headers dim; hunk header special; `+` success; `-` error; context plain.
- **Width:** break by column with `wrap_chars`; continuation lines keep the color of their line.
- **Helper:** `diff_line(&theme, text)`, `diff_style(&theme, text)`.
- **Plain:** `+` and `-` carry the meaning, as in any patch file.

### Prompt and confirm

```
 › Allow shell access for this session? [y/N]
 › Overwrite src/retry.rs? [Y/n]

 › Model  deepseek-chat
 › Model  deepseek-reasoner
```

In the first model line the answer is empty and the dim hint shows; in the second the user has typed.

- **When:** a one-line question outside the conversation: first-run settings, a destructive action. The capital letter is the default that Enter accepts. Make the destructive choice the default no.
- **Roles:** prompt glyph accent; question and typed answer plain; choices and hints dim.
- **Width:** cut with an ellipsis. Questions should fit in 60 columns.
- **Helper:** `confirm_line(&theme, glyphs, question, default_yes, width)`, `prompt_line(&theme, glyphs, label, input, hint, width)`.
- **Plain:** `>` replaces `›`.

### Empty state

```

   What shall we build?

 Ask about this repository, investigate a bug, or describe a change.

 Read tools are ready. Write and shell access require explicit flags.

 Use /help for commands. Sessions are saved locally.

```

- **When:** a screen or list with nothing in it yet. Say what the app is for and the first thing to do, in three lines or fewer.
- **Roles:** title accent bold; help dim.
- **Width:** help wraps at spaces.
- **Helper:** `empty_state(&theme, title, &help, width)`.
- **Plain:** the title stays bold.

With an action. One sentence says what is missing, one line offers the way out. Use this whenever the user can do something about it:

```

   No sessions yet

 Sessions you start are listed here.

 [Enter] New session
```

At 30 columns:

```

   No sessions yet

 Sessions you start are
 listed here.

 [Enter] New session
```

- **Action helper:** `empty_state_action(&theme, glyphs, title, &help, key, label, width)`, and `action_line(&theme, glyphs, key, label, width)` for the line alone. The key is bold accent, so it survives `NO_COLOR`. Offer at most one action. When there is none to offer, use `empty_state`.
- **Never** show a zero, an empty box or a blank area instead of this.

### Error state

```
 Provider request failed: 401
 Unauthorized
 Check EJM_CLI_API_KEY, then
 press Enter to retry.
```

(shown at 30 columns)

- **When:** a failed operation inside the transcript or a view. First sentence says what failed, second says what to do next. The session stays open.
- **Roles:** error for both sentences.
- **Width:** wraps at spaces.
- **Helper:** `error_state(&theme, what, next, width)`. For an error with a glyph on its own line, use a banner.
- **Plain:** bold from the error role; the words carry the meaning.

With an action. The glyph and the words say what failed, the next sentence says what to do, and one line offers the retry. The text hangs under the first word:

```

   ✗ Could not load sessions
     The service did not answer. Your work is safe.

     [R] Try again
```

At 30 columns:

```

   ✗ Could not load sessions
     The service did not
     answer. Your work is
     safe.

     [R] Try again
```

Under `--plain` or `NO_COLOR` the `x` and the words carry it:

```

   x Could not load sessions
     The service did not answer. Your work is safe.

     [R] Try again
```

- **Action helper:** `error_state_action(&theme, glyphs, what, next, key, label, width)`. It starts with the fail glyph, so the state reads without color. Prefer it for any failed list, table or panel; `error_state` stays for a plain two-sentence error inside the transcript.

### Loading state

```

   ⠸ Loading sessions…

 Esc cancels. Nothing is lost if you wait.


 session                   model                   tokens
 ......                    ......                  ......
 ......                    ......                  ......
 ......                    ......                  ......
```

At 40 columns, with reduced motion (the static running glyph):

```

   ● Loading sessions…
```

Under `--plain` or `NO_COLOR`, ASCII glyph, bold only:

```

   * Loading sessions...
```

- **When:** a list, table, panel or screen is waiting for data. It keeps the final layout: the same rows and columns, so nothing jumps when the data arrives. Use a spinner and a sentence when the length is unknown, and the progress bar when it is known.
- **Roles:** the spinner and `Loading <what>…` bold accent; the hint dim; the dotted rows dim.
- **Width:** the title is cut with an ellipsis, the hint wraps at spaces. Spacing is the same as the empty state, a blank line above and below the title. Dotted rows use the column widths of the table they stand in for.
- **Helper:** `loading_state(&theme, glyphs, what, hint, spinner, width)`, `loading_row(&theme, &[(width, Align)])`. Pass `spinner_frame(glyphs, elapsed_ms, reduced_motion)` as `spinner`.
- **Plain:** the word "Loading" is always there, the dots are ASCII, and the spinner is the static `*` with reduced motion, `NO_COLOR` or `--plain`.

### Stat and bar lines

```
 Sessions            128       +12 vs last week
 Tokens              2.3M      +41% vs last week
 Cost                $11.97    estimated, not billed
 Failed tool calls   -         No data yet

 deepseek-chat       [=================================================]   128
 deepseek-reasoner   [===============>---------------------------------]    41
 local-qwen          [=======>-----------------------------------------]    19
 provider-b-large    [==>----------------------------------------------]     6
```

At 40 columns:

```
 Sessions    128     +12 vs last week
 Tokens      2.3M    +41% vs last week
 deepseek-…  [=================]   128
 local-qwen  [==>--------------]    19
```

- **When:** a summary number (stat) or a ranked share (bar) on a dashboard screen. They are the terminal form of the application kit's stat tile and horizontal bar. Figures here are sample data.
- **Roles:** stat label dim, value bold, change success, error or dim by `Tone`; bar label plain, bar accent, value bold.
- **Width:** label and value columns are fixed and padded; the line is cut with an ellipsis. The bar fills the spare width and is always ASCII (`=`, `>`, `-`), exactly as the progress bar. The change carries its sign in the text ("+12", "-2"), and the bar always has its number beside it, so neither depends on color.
- **Helper:** `stat_line(&theme, glyphs, label, value, delta, Tone, label_width, value_width, width)`, `bar_line(&theme, glyphs, label, label_width, fraction, value, value_width, width)`. An empty `value` shows a dim dash, never zero; put the reason in `delta`.
- **Plain:** no change beyond the roles: bold stays bold, the signs and numbers are text.

### Too small

```
Enlarge the terminal
to use ejm-cli.
```

- **When:** below 20 columns or 8 lines. Draw only this and nothing else.
- **Helper:** `too_small(area)`, `too_small_lines(app, width)`.

## Screen recipes

Each recipe is the widgets for one kind of screen, top to bottom. Heights are in lines. Anything that is not on a recipe is probably not needed.

### Chat agent screen

1. Header, 2 lines.
2. Transcript, fills the rest. Transcript blocks separated by one blank line; the empty state until the first message. Tool calls use a dim block.
3. Status line, 1 line.
4. Widgets, 0 to 4 lines of dim extension output.
5. Composer, 3 to 8 lines.
6. Key hints, 1 line: Enter send, Ctrl+C stop/quit, Alt+Enter new line, Ctrl+K steer, Ctrl+S sessions.
7. Overlay picker on Ctrl+S, drawn last.
8. Banner for a notice, or error state in the transcript, when something fails. Below 20 by 8, show too small only.

### Log viewer

1. Header, 2 lines: app name and the source being viewed; then filters in effect.
2. Tabs, 1 line: All, Warnings, Errors.
3. Table rows, fill the rest: time, level, message. Level uses the roles (warning, error, dim). The message column gets all spare width and is cut with an ellipsis.
4. Prompt line, 1 line, only while the user types a search: `/ text`.
5. Status line, 1 line: line count and `↑ N lines above latest · End to follow` when scrolled, `● Following` when live.
6. Key hints, 1 line: Up/Down scroll, End follow, / search, Tab switch, Esc quit.
7. Empty state when nothing matches: "No lines match" and how to clear the filter.

### Picker

1. Titled block, centered, sized to the content. The title carries the keys.
2. Prompt line inside the box for a filter, when the list is longer than a screen.
3. List rows, one per item, one selected.
4. Empty state inside the box when the filter matches nothing.
5. Key hints go in the title, not below, so the picker needs no other chrome.

### Progress job

1. Header, 1 or 2 lines: the job name.
2. Progress line for the whole job, when its size is known.
3. Step lines, one per step: done, running with the spinner, pending, failed.
4. Banner for a warning that does not stop the job.
5. Status line: elapsed time and counts, accent while running.
6. Key hints, 1 line: Ctrl+C cancel.
7. On finish: key-value lines with the result (files changed, time taken) and, if it failed, an error state with the next step. Exit with a non-zero code on failure.

### Settings prompt

1. Header, 1 line: what is being configured.
2. Key-value lines with the current values, when changing existing settings.
3. Prompt lines, one question at a time, with the default as the dim hint. Answered questions stay above, plain.
4. Confirm line for anything with a side effect, default no.
5. Banner notice when a change needs a restart.
6. Key hints, 1 line: Enter accept, Esc cancel.
7. In `--plain` mode or when stdin is not a terminal, skip the screen: read flags and print plain lines.

### Dashboard screen

1. Header line: the name in bold accent, then the period and "sample data" in dim, separated by `·`.
2. Stat lines, three or four, with the changes in one column.
3. A dim section label, then bar lines for the ranked shares.
4. A table with a dim header row, numbers right aligned.
5. One step line while a refresh runs.
6. Key hints, 1 line: refresh first, then navigation, then quit.
7. Every block has its states: loading with `loading_state` or `loading_row`, empty with `empty_state_action`, failed with `error_state_action`.

```
 Usage  ·  last 7 days  ·  sample data

 Sessions            128       +12 vs last week
 Tokens              2.3M      +41% vs last week
 Cost                $11.97    estimated, not billed

 Sessions by model
 deepseek-chat       [=================================================]   128
 deepseek-reasoner   [===============>---------------------------------]    41
 local-qwen          [=======>-----------------------------------------]    19

 session                         model                   tokens  state
 Fix the flaky retry test        deepseek-chat          418,200  done
 Add pagination to the API       deepseek-reasoner      866,200  running
 Rotate provider keys            provider-b-large        48,900  failed

 ⠸ Refreshing usage

 R refresh · Tab next table · Esc quit
```

Under `NO_COLOR` and `--plain`:

```
 Usage  -  last 7 days  -  sample data

 Sessions            128       +12 vs last week
 Tokens              2.3M      +41% vs last week
 Cost                $11.97    estimated, not billed

 Sessions by model
 deepseek-chat       [=================================================]   128
 deepseek-reasoner   [===============>---------------------------------]    41
 local-qwen          [=======>-----------------------------------------]    19

 session                         model                   tokens  state
 Fix the flaky retry test        deepseek-chat          418,200  done
 Add pagination to the API       deepseek-reasoner      866,200  running
 Rotate provider keys            provider-b-large        48,900  failed

 * Refreshing usage

 R refresh - Tab next table - Esc quit
```

## Testing a TUI

Run through this list before shipping a screen. `rust/ejm_tui.rs` has unit tests for the width, fallback and state rules (run them with `cargo test` in a crate that includes the module, see below); the rest you check by eye.

- [ ] **80 by 24.** Nothing wraps unexpectedly, nothing is cut that should not be, every region is where the screen anatomy says.
- [ ] **20 by 8.** The smallest supported size shows the app. At 19 by 8 or 20 by 7 only the too-small text shows.
- [ ] **`NO_COLOR=1`.** No color anywhere. Warnings, errors and the selected row are still clear from bold, glyphs and reversed video.
- [ ] **States.** Every list, table and panel shows loading, empty and failed. Each has a sentence, at most one `[key] action`, and no zero or blank area. Under `NO_COLOR` each is still named by a word or a glyph.
- [ ] **Light and dark.** Run in a light terminal and a dark one, with `COLORFGBG` set and with `--appearance`. Every role is readable on both.
- [ ] **16 colors.** Unset `COLORTERM` and check the named-color fallback.
- [ ] **Non-UTF-8 locale.** `LC_ALL=C` shows only ASCII: no box drawing, no `›`, `●`, `✓`, `⠋`, or `…`. `--plain` does the same.
- [ ] **Resize.** Drag the window from 120 columns to 20 and back while running. No panic, no leftover characters, the cursor stays in the composer.
- [ ] **Narrow wrap.** At 30 columns, long messages, errors and banners wrap at spaces, a long word breaks by column, wide characters are never split.
- [ ] **Wide characters.** Paste CJK text and an emoji into the composer. The border stays aligned and the cursor sits after the last character.
- [ ] **Motion.** The spinner moves only while running. With reduced motion it is the static glyph. Nothing redraws on a timer when idle.
- [ ] **Exit.** Quit with Ctrl+C, an error and a panic. The terminal returns to normal each time.
- [ ] **Pipes.** Output piped to a file has no escape sequences and no box drawing.

## Using ejm_tui.rs

Copy `rust/ejm_theme.rs` and `rust/ejm_tui.rs` into your crate as sibling modules, with `ratatui` 0.30 and `unicode-width` 0.2 as dependencies.

```rust
mod ejm_theme;
mod ejm_tui;
use ejm_tui::*;

let theme = Theme::from_env(args.no_color, Appearance::Auto);
let glyphs = glyphs_from_env(args.plain);
let hints_line = hints(&theme, glyphs, &[("Enter", "send"), ("Ctrl+C", "stop/quit")], area.width as usize);
```

To run the helper tests, make a throwaway crate with the two files as modules and run `cargo test`:

```toml
# Cargo.toml
[dependencies]
ratatui = { version = "0.30", default-features = false, features = ["crossterm_0_29", "layout-cache"] }
crossterm = "0.29"
unicode-width = "0.2"
```

```rust
// src/lib.rs
pub mod ejm_theme;
pub mod ejm_tui;
```

The tests cover color selection, glyph fallback, wrapping, every state helper, and one test that renders every state under `NO_COLOR` in Unicode and ASCII and checks that no color is set and the state is named by a word or glyph.

Strip terminal control sequences from any text that came from the network, a tool or a file before you hand it to a helper. `ejm-cli` does this with `vte` in `safe_text`.

`Theme` has one style per role (`accent`, `dim`, `warning`, `error`, `success`, `plain`, `bold`, `selected`, plus `special` for hunk headers). Use these styles in your own widgets rather than building new `Style` values.

## Adopting the theme in ejm-cli

Replace the `LIGHT`, `DARK` and fallback constants in `render.rs` with `ejm_theme::{DARK, LIGHT, BASIC_DARK, BASIC_LIGHT}`. The kit values differ slightly from the current ones:

| Role | Dark now | Dark kit | Light now | Light kit |
| --- | --- | --- | --- | --- |
| accent | `B7C6A8` | `B8C6AA` | `29443B` | `29443B` |
| dim | `8A9A7B` | `849682` | `5B6856` | `67796C` |
| warning | `E0B565` | `D7B87C` | `8A5A12` | `8A5A12` |
| error | `E5826F` | `EEA0A0` | `A33A2E` | `A63A3A` |
| success | `A8C99A` | `93BA8B` | `2F6B3A` | `2F6B3A` |

The kit values match the desktop IDE, so a session looks the same in both.

Two more differences when moving `ejm-cli` onto `ejm_tui.rs`: the composer gains the `›` prompt this guide describes, and the hint order puts Ctrl+C second, so it is the last pair to be dropped on a narrow terminal.

## Terminal emulators

`terminal/` holds the same palette as a color scheme for iTerm, Warp, Alacritty, kitty, Ghostty and Windows Terminal, in dark and light. Install one so our apps and the user's shell share colors.
