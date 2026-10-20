# @ejm/shots

Real product shots. Every line of text in these images was printed by the real `ejm-cli` or `ejm-harness`, run in a pseudo-terminal, or typed into it by the capture script. Nothing is drawn by hand. The only scripted content is the "model" in the shots with tool calls, listed below.

## How a shot is made

`node scripts/capture-terminal.mjs <product/name | product | all>` does this for each shot, once per theme:

1. Starts the program in a real pseudo-terminal ([node-pty](https://github.com/microsoft/node-pty)) at a fixed size, in a clean `HOME` and a fresh state directory.
2. Plays the scripted keystrokes with timing (typing a prompt, Enter) and waits for text on the screen, not for fixed delays.
3. Records every raw byte and feeds it to a terminal emulator ([xterm.js headless](https://www.npmjs.com/package/@xterm/headless)).
4. Draws the final screen from the emulator's cell grid as HTML in IBM Plex Mono with the product's own terminal colors (`packages/tokens/generated/terminal/ejmlabs-dark` and `-light`), and photographs it with headless Chrome at 2x. No window frame is drawn. The image is the terminal content with a 20 px margin on the terminal background. A shot with `crop: 'content'` stops at the last line of text.
5. Writes `assets/<product>/<name>.<theme>.png` and `assets/<product>/<name>.json`.

Each themed session gets a unique private directory under the system temporary directory. Its `acme-api` fixture, state, `HOME` and binary links all live there. The tool removes only that directory when the session ends or throws an error. It never clears a fixed `/tmp/acme-api` or `ejm-shots-work` path. Abrupt process termination can leave a directory behind; remove only the directory from that stopped invocation.

The renderer kills its own Chrome process and waits up to five seconds for its
`close` event before removing that browser's temporary profile. Node's removal
retries transient filesystem errors at most three times, with 100 ms increasing
delays. If closure cannot be confirmed, the profile stays in place and the capture
fails. A rendering or startup error remains the original error when cleanup
succeeds; if cleanup also fails, an `AggregateError` retains both failures. This
does not establish a published capture or release.

New metadata keeps each theme's exact command in `results.<theme>.command` and its recorded working directory in `results.<theme>.workingDirectory`. Directory metadata uses `<clean-export>/` for clean product exports and paths relative to the `ejm-ui` root for its sibling tree; other paths remain absolute. The existing top-level fields describe the last captured theme for compatibility. The workspace paths are evidence of that completed session and are removed after it ends.

The system temporary path can include a local username or a custom directory. Captures can show that path in both the image and JSON. Review new images and metadata for private paths before sharing them; the tool does not redact terminal text.

The output directory is separate from scratch space. The default is `packages/shots/assets`; `--out <folder>` chooses another root. Use an output root you own. A capture creates the product subfolder as needed and replaces the selected shot's PNGs and JSON at those known names. It preserves other files and does not remove the output directory. A failed capture can leave some new images beside older metadata, so treat a nonzero exit as incomplete and rerun the same shot after fixing the cause.

For light shots the program itself is told it runs in a light terminal (`EJM_CLI_APPEARANCE=light`, `COLORFGBG=0;15`), so ejm-cli draws its own light palette. The emulator then maps the colors through the light scheme.

## What is real and what is scripted

- The programs, their tools, their grants and their terminal output are real.
- Prompts are typed into the real TUI and shell by the capture script.
- The "model" in the shots with tool calls is a replay file of scripted responses (`fixtures/replay/*.json`). That is the documented offline way to exercise tool calls (`ejm-cli --replay-file`, and the `replay` provider in the SDK). No hosted model was called. The replay file holds only tool calls and no assistant prose, so the only text on screen that we wrote is the tool arguments the TUI echoes (`{"path":"package.json"}` and the `write_file` arguments) and the typed prompt. The read, the refusal (`tool is not granted by this host`) and the write (`Wrote src/log.mjs (46 bytes)`) come from the real tools.
- The `$ ` prompt is a plain `sh` prompt set by the script.
- The demo project the agents work in is `fixtures/acme-api`, copied to the session's unique temporary directory. The TUI and metadata show that actual workspace path; it changes between captures.
- `fixtures/harness/journal.mjs` is a small script of ours. It drives the real SDK and prints what the Rust worker returned: the event journal, the governor status and the harness status. It formats values and invents none.

## Verification

Each capture checks its own text and fails if a check fails. The result is in the metadata (`results.<theme>.verification`).

- `renderedTextEqualsEmulator`: the text of each row as Chrome laid it out equals the emulator's row text. Nothing was dropped or reordered by the renderer.
- `transcriptMatch: "exact"`: for programs that only print forward (a shell, `ejm-cli run`, node, python), the screen rows equal the PTY transcript lines with ANSI sequences removed.
- `transcriptMatch: "replayed"`: a TUI repaints single cells with cursor moves, so its stripped byte stream is not the screen. The screen must equal what a second, small interpreter (`replayCursorStream` in `src/verify.mjs`) rebuilds from the same bytes. It models text, CR, LF, cursor position and erase, and reports any other sequence, so a stream it cannot follow fails. This checks the emulator against a second reader. It does not check the program's intent.

`npm test` covers this on a shell script that prints colors (`fixtures/colors.sh`), without the products. Tests that need Chrome skip when it is missing.

## Reproduce

A shot is only ever captured from a clean build of a product's last commit, never from a working tree with uncommitted changes (the commit would not identify the code that ran). The capture tool refuses a product directory with uncommitted changes.

Prerequisites: Node 22.12 or later, the [locked dependency setup](../../README.md#development), Google Chrome (or `CHROME=/path/to/chrome`), the Rust toolchain the products pin (`cargo`, offline registry cache), and `python3` 3.11 or later for the Python shot. On Linux, complete the explicit `node-pty` rebuild from that setup. On macOS, node-pty 1.1.0 ships its `spawn-helper` without the execute bit, so `src/session.mjs` restores it before the first spawn. The sibling checkouts `../ejm-cli` and `../ejm-harness` are only read.

```sh
# 1. Export HEAD of both repos with `git archive` and build the release binaries from the exports.
node packages/shots/scripts/clean-build.mjs                  # export folder: $EJM_SHOTS_EXPORT, else <tmp>/ejm-shots-export
# 2. Capture every shot, dark and light, from those builds.
node scripts/capture-terminal.mjs all
node scripts/capture-terminal.mjs --list
node scripts/capture-terminal.mjs cli/tui-read-refused --theme dark --out /tmp/shots
# 3. Regenerate the web formats and check the shots.
node packages/shots/scripts/optimize.mjs
node scripts/check-shots.mjs
```

What `clean-build.mjs` does, so it can be done by hand:

```sh
EXPORT=${EJM_SHOTS_EXPORT:-$TMPDIR/ejm-shots-export}
mkdir -p $EXPORT/ejm-cli $EXPORT/ejm-harness
git -C ../ejm-cli archive HEAD | tar -x -C $EXPORT/ejm-cli
git -C ../ejm-harness archive HEAD | tar -x -C $EXPORT/ejm-harness
# ejm-cli depends on the harness through the path `../ejm-harness/crates/...`; the two exports sit side by side so it resolves.
(cd $EXPORT/ejm-cli && CARGO_TARGET_DIR=$EXPORT/target-cli cargo build --release --offline --locked -p ejm-cli)
(cd $EXPORT/ejm-harness && CARGO_TARGET_DIR=$EXPORT/target-harness cargo build --release --offline --locked -p ejm-harness-worker)
```

- Each export also gets `.ejm-export.json` (repo, commit, method, build note). `src/meta.mjs` reads it, so the metadata records `gitCommit` as the exported commit, `workingTreeChanges` as 0, and `build` as "Built from a clean `git archive` export of <hash>".
- The binaries are `target-cli/release/ejm-cli` and `target-harness/release/ejm-harness-worker`, outside the exports like any `CARGO_TARGET_DIR`. Their path in the metadata starts with `<clean-export>/`, so no home directory leaks. Override with `EJM_CLI_BINARY` and `EJM_HARNESS_BINARY`.
- ejm-cli has no committed pin of the harness revision (`.github/harness-revision` was untracked when this was set up), so the harness HEAD is used for the cli build. The cli's harness crates were byte identical between that file's revision `4a751c6` and the harness HEAD `a96c992` (`git diff` over `crates`, `sdk`, `examples`, `Cargo.toml` and `Cargo.lock` was empty). The cli JSON records the harness commit in `build`.
- The harness SDKs come from the export too: `sdk/typescript/dist` is a committed file (not rebuilt), the Python SDK is put on `PYTHONPATH` from `sdk/python`, and the SDKs find the worker through the `PATH` entry the tool prepares (`ejm-harness-worker` is a symlink to the clean binary).
- `clean-build.mjs` clones the repo's own `target/release` into an empty target directory first (`cp -cR`, an APFS copy-on-write clone) to skip a cold build; cargo still rebuilds every crate whose path changed. `--no-seed` turns that off. If a build fails, nothing falls back to the working tree: fix the cause or stop.
- Other folders: `--dest dir` or `EJM_SHOTS_EXPORT=dir` for the export, `EJM_CLI_REPO` and `EJM_HARNESS_REPO` for the repos, `EJM_CLI_DIR` and `EJM_HARNESS_DIR` for the exports used by the capture tool.

The tool stops if a product binary changes while it is capturing, so one shot always shows one build.

## Shots

Sizes are columns x rows. PNGs are 2x. The table describes the retained captures, whose demo workspace was `/tmp/acme-api`. New captures use a unique temporary workspace and record its actual path. The JSON next to each image is the source of truth: product, exact command, working directory, terminal size, product version, git commit, number of uncommitted changes in the product tree (always 0), how it was built, binary path, modified time and sha256, capture date, tool version, `how`, and per theme the environment, sizes, verification and the plain-text transcript of the final screen.

| Shot | Size | Command | What it shows |
| --- | --- | --- | --- |
| `cli/tui-read-refused` (hero) | 100x30 | `ejm-cli --replay-file read-then-write.json --cwd /tmp/acme-api` | A prompt sent in the TUI. `read_file` runs. `write_file` is refused with "tool is not granted by this host". Header with grants, status line, composer. |
| `cli/tui-write-granted` | 100x30 | `ejm-cli --replay-file read-then-write-granted.json --allow-write --cwd /tmp/acme-api` | The same prompt with the write grant: the header reads `grants: read + write` and `write_file` creates `src/log.mjs`. |
| `cli/tui-replay` | 80x24 | `ejm-cli --replay --cwd /tmp/acme-api` | The documented offline demo, a prompt typed and sent. |
| `cli/run-hello` | 80x24, cropped | `ejm-cli --replay run "Hello"` | The documented one-shot command and its output. |
| `harness/journal` (hero) | 100x30, cropped | `node journal.mjs` in `fixtures/harness` | The durable event journal of one run (13 events, the tool calls, the refused write), then governor and harness status. |
| `harness/sdk-typescript` | 80x24, cropped | `node examples/sdk_typescript.mjs` | The README example. |
| `harness/sdk-python` | 80x24, cropped | `python3 examples/sdk_async.py` | The Python example. |

Captured from clean `git archive` exports and release builds of ejm-cli 0.1.0 (commit `07a6e1ab`, binary sha256 `2240ee09...`) and ejm-harness 0.1.0 (worker, commit `a96c9928`, binary sha256 `52fac1e9...`). Each JSON records `gitCommit`, `workingTreeChanges: 0`, `build`, and the binary's modified time and full sha256.

## Limits

- The governor snapshot in `harness/journal` is taken after the run, so it is idle and shows zeros. A mid-run snapshot needs a tool that stays busy while the script samples it, and none of the documented examples does.
- The harness worker has no `--version`. The version is the SDK package version.
- One final screen per shot. Intermediate frames are not rendered.
- PNGs come straight from Chrome. No lossless optimizer was installed, and re-deflating at level 9 made them larger. Smaller formats belong to the image pipeline.
- The emulator counts wide (CJK) characters as two cells, and the second reader in `verify.mjs` counts every character as one. A TUI that prints wide text would fail the `replayed` check instead of passing wrongly.

## Use a capture on a site

Use a product entry such as `@ejm/shots/ide`, `@ejm/shots/cli` or
`@ejm/shots/harness` for a single-product site. Each imports only that product's
index and images. The root `@ejm/shots` entry includes every product for the
gallery. Vite emits the image files separately, including small files; they
never become data URLs inside the page's JavaScript.

```tsx
import { getShot } from '@ejm/shots/ide';
import { ProductShot, shotPreloadLinks } from '@ejm/ui/layout/ProductShot';

const shot = getShot('ide', 'workspace-launch');
// Use shotPreloadLinks(shot) in the route head for a priority capture.
<ProductShot shot={shot} alt="The native IDE at launch with editor and project tree." priority />;
```

The IDE capture is dark only. Both page themes show that recorded native
window. Terminal captures have light and dark variants. Captions name the
version, commit and capture date. A successful local build does not publish
these changes.
