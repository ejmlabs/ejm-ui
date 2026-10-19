# @ejm/demos

The simulated product screens for ejm-cli, ejm-ide and ejm-harness: scenario data, headless engines, static views, lazy interactive islands and the product hero. Strict TypeScript, React 19. Every screen is a simulation that runs in the visitor's browser, follows a script and sends nothing anywhere.

| Import | What it is |
| --- | --- |
| `@ejm/demos` | The engines (`createCliDemo`, `createIdeDemo`, `createHarnessDemo`), the manual and system clocks, the scenario data and its types. No React. |
| `@ejm/demos/views` | `CliView`, `IdeView`, `HarnessView`: one frame of each product inside the layout `ProductWindow`. |
| `@ejm/demos/hero` | `ProductHeroStage` with `CliHeroWindow`, `HarnessHeroWindow` and `IdeHeroWindow` (pay only for the windows you pass), and `ProductHero` (all three). |
| `@ejm/demos/islands/cli-lazy`, `/ide-lazy`, `/harness-lazy` | `LazyCliDemo`, `LazyIdeDemo`, `LazyHarnessDemo`: static view first, island on approach or use. Ship only that product's view. Use these. |
| `@ejm/demos/islands` | `LazyDemo product="..."`: the same for any product, but it imports all three views (about 5 KB gzip more than one). |
| `@ejm/demos/islands/cli`, `/ide`, `/harness` | The interactive islands, default exports, for `React.lazy`. |
| `@ejm/demos/styles.css` | `@source` lines so Tailwind scans the views, islands and hero (not the tests or the scenario data). Import it once from the site stylesheet, after `@ejm/ui/styles.css`. About 1.7 KB gzip of CSS. |
| `@ejm/demos/ide.css` | A stable IDE entry that imports `styles.css` for the current simulated views. Use it after `@ejm/ui/styles.css`; an existing import of `styles.css` also remains valid. |

## Static views

```tsx
import { CliView, IdeView, HarnessView } from '@ejm/demos/views';

<CliView elevation="raised" label="ejm-cli, a simulated terminal screen" />
<IdeView layout="auto" label="ejm-ide, a simulated screen" />
```

| Prop | Meaning |
| --- | --- |
| `label` | Gives the window an accessible name. Without it the window is decoration and hidden from assistive technology, as `ProductWindow` does. Pass it when the view is page content. |
| `elevation`, `labelSide` | Passed to `ProductWindow`. |
| `layout` (ide, harness) | `stack` for small windows such as a hero stage, `split` for tree, editor and chat (or governor, sessions, journal and code sample) side by side, `auto` (default) splits from the window's own width. |
| `compact` (cli) | Leaves out the status line and key hints, and fades the transcript where it is cut. The hero uses it. |
| `frame` | Another frame of the same shape. Defaults to the bundled one. |

The frames are one moment of each demo: ejm-cli proposes a patch and it is blocked because write access is off, ejm-ide has applied a change Edi proposed (the editor marks the changed lines), ejm-harness is replaying its journal after a crash. They are generated from the engines with a manual clock by `src/views/frames.test.ts` (`UPDATE_FRAMES=1 npx vitest run packages/demos/src/views/frames.test.ts` rewrites `views/frames/*.json`), and that test fails when `views/frames/*.json` stops matching the engines. A page that shows only the views therefore ships the data, not the engines or the scenario files. Code is highlighted with the docs tokenizer from `@ejm/ui` and colored with the `syn-*` window colors. A diff line starts with `+` or `-`, so it never relies on color.

## Interactive islands

```tsx
import { LazyCliDemo } from '@ejm/demos/islands/cli-lazy';   // or LazyIdeDemo from .../ide-lazy, LazyHarnessDemo from .../harness-lazy
<LazyCliDemo />                     // ships the cli static view and frame only

// one component for all three: simpler to write, but it carries all three views and frames
import { LazyDemo } from '@ejm/demos/islands';
<LazyDemo product="cli" />          // "cli" | "ide" | "harness"

// or load one yourself
const CliDemo = React.lazy(() => import('@ejm/demos/islands/cli'));
```

Each island takes the engine options (`clock`, `speed`, `reducedMotion`, `seed`) and a `scenario` to replace the bundled one. They are built on the engines with `useSyncExternalStore` and own what the engines do not model:

- Scroll-follow in the transcript, the chat and the journal (scrolling up stops it; End in the cli returns to the latest line).
- Truncation by CSS (`text-ellipsis`, `whitespace-pre`) for header, status, tool and diff lines, so nothing wraps into a mess at 320px.
- A spinner that rotates with `motion-safe` and holds still as a ring under reduced motion (an asterisk in plain mode).
- Focus: a skip link before the window, focus into an opened overlay or palette and back to where it came from on close, Escape closes an overlay first and then moves focus to the window so the next Shift+Tab leaves the demo.
- One polite `role="log"` that announces a sentence per finished step from `state.live`. Streamed characters are never announced.
- `IntersectionObserver` feeding `dispatch({ type: 'visible' })`: the demo runs only while it is in view. Where the observer is missing it runs.
- Pause, Resume and Reset in the window, the visible "Simulated" badge, and the scenario caption and note under it, always shown.
- ejm-cli: prompt chips, composer (Enter sends, Alt+Enter, Shift+Enter and Ctrl+J add a line, Up and Down recall, Ctrl+C stops, Ctrl+S opens sessions, PageUp and PageDown scroll), sessions and help overlays, Grant write and Plain switches, Stop, Sessions and Help buttons.
- ejm-ide: file list, tabs (arrow keys, Home, End, Delete), read-only editor, chips, message form with Send and Stop, Accept and Reject with the note that the real app reviews writes automatically, a Commands button for the palette (combobox with a listbox), New chat.
- ejm-harness: sliders for max concurrent and command slots (a committed change is journaled), Add session, Add 5, Crash worker (off while nothing runs), counts, sessions with `progressbar` roles, the journal, and Rust, TypeScript and Python tabs.

Targets are 44px on coarse pointers, inputs are 16px there, and the layout reacts to the demo's own width (container queries), so it works from 320px to 5120px.

### Laziness

`LazyCliDemo` (and `LazyDemo`) serve the static view, which is also what renders without scripts, and loads the island when the demo is within `rootMargin` (default 600px) of the viewport or when the visitor points at, focuses, types in or presses "Try the live demo". The three `import()` calls are separate chunks. `node packages/demos/scripts/size-islands.mjs` (also `npm run size -w @ejm/demos`) builds each island and a tiny page with `<LazyDemo />`, and exits 1 when an island with everything it imports is over 40 KB gzip (React excluded), when island code is in the page's initial chunks, or when the island is not a separate chunk. It also measures the first load each entry adds to an empty React page, and fails when a one-product page carries another product's view or adds more than 14 KB gzip (that figure includes `cn` and `ProductWindow`, which a site ships anyway). Measured: `LazyCliDemo` +11.0 KB, `LazyIdeDemo` +12.6 KB, `LazyHarnessDemo` +12.4 KB, `LazyDemo` +17.1 KB (so one product saves 4.5 to 6 KB); `ProductHeroStage` with `CliHeroWindow` +9.7 KB, `ProductHero` +14.3 KB. Each product has its own frame file (`src/views/frames/<product>.json`) so a one-product page does not ship the other frames. Do not import from `islands/*.tsx` or `parts.tsx` in code that must stay in the initial bundle: `islands/btn.tsx` exists because a static import of `parts.tsx` pulled the whole shell into the entry.

## Product hero

```tsx
<ProductHero eyebrow="ejmlabs / one-person lab" title="Small experiments, useful things." actions={...}>
  <p>Copy.</p>
</ProductHero>
```

```tsx
// only the windows a page needs: one view, one frame
<ProductHeroStage title="Small experiments, useful things." windows={<CliHeroWindow />}>
  <p>Copy.</p>
</ProductHeroStage>
```

`ProductHeroStage` is the layout `Hero` with a `ProductStage` around the windows you give it; `ProductHero` is that with all three, which pulls in all three views. Product imagery is moving to real captures (`ProductShot`), so there are no more simulated-window options than these. `ProductHero` is the layout `Hero` with a `ProductStage` of the cli (rest), harness (raised) and ide (float) views, in that order so the front window is the one with the most to read and the governor numbers sit in the open. The windows are decoration. Entrance, no-JS and reduced-motion behavior are the `Hero`'s: copy first (sliding, never faded, so it is the LCP at first paint), then the windows, 880ms in all, transform and opacity only, everything in place without scripts.

## Honesty rules

1. Every window and island says it is simulated, and an island also states that nothing is sent anywhere. Neither can be hidden or shortened.
2. No claim of real output, no benchmarks, no customers. Every number that is not a count of what is on screen is labelled as a sample value.
3. Every command, flag, key and tool name shown appears in that product's README, or in a file named in `honesty-allow.json` with a reason. `node packages/demos/scripts/check-demos-honesty.mjs` checks this against `~/Desktop/ejm-cli`, `ejm-ide` and `ejm-harness` (or `--root DIR`) and fails on a name that is not documented, on an allow entry whose source does not contain the name, and on a stale entry. Never add an entry to make the gate pass: add it only when the name really is documented elsewhere.
4. The ejm-ide tool names are the plain ones in `ejm-ide/docs/agent-tools.md`: `search_code`, `read_file`, `write_file`. There is no documented palette shortcut, so the palette opens from a Commands button.
5. Where a demo needs a control the product lacks, the control says so: Grant write stands in for `--allow-write`, Accept and Reject exist to show both outcomes.
6. No network, no storage, no cookies and no analytics. `src/islands/no-network.test.ts` fails when a view, island or the hero uses a network, storage or cookie API, and the cli island test spies on `fetch`.

## Tests

Engines and scenarios: `src/*.test.ts`. Views, islands and hero: beside their files, with Testing Library, user-event, the manual clock and vitest-axe in both themes. jsdom has no `matchMedia` and cannot move a range input with a key, so `src/test-helpers.tsx` stubs the first and the harness test sends the change event directly.

## Package rights

This package includes its [license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
The software uses the MIT terms; supplied brand materials retain their owners'
rights. Dependencies keep their own notices. The package remains private and
can be consumed from an accepted source revision or an offline tarball.
