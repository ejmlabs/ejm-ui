# Changelog

Versions follow [Semantic Versioning](https://semver.org/). A dated source
entry does not establish a published release; see [RELEASING.md](RELEASING.md).

## [Unreleased]

- Make the kit systemic, so building blocks produce one cohesive design however they are combined and the library enforces it. Public components are closed, a new `Section` derives the structure of a page, every control comes from one recipe, one stylesheet covers every component, and a consumer's build setup shrinks to `ejmUi()` or `ejmlabs()`, a base tsconfig and one import. This source change does not publish a package, deploy a consumer or move any consumer's pin. Several removals are **Breaking**; the upgrade steps follow, then the consumer pin moves.

  **Closed components. Breaking.** No public `@ejm/ui` component accepts `className`, `style` or `dangerouslySetInnerHTML`; `packages/ui/src/closed-api.test.ts` fails type checking, naming the component, when one does. The design guard already rejected them in consumers. If a look is missing, add a component or a recipe to ejm-ui. Variants are closed too:
  - `Hero`: `size`, `tone` and `className` are removed. Delete them. The hero is always the Paper band with the page's one `h1`.
  - `SectionHead`: `size` and `className` are removed. Use `purpose` (`page`, `section` or `application`). `as` now accepts `h1` to `h6`, and without it the heading takes the level of its context.
  - `Header`: `logo` is removed and `identity` (`{ name, artwork? }`) is required. `Footer`: `brand` is removed. Use `identity`. `ThemeToggle` takes no props.
  - `Button`: sizes `sm` and `lg` are removed. The sizes are `md` and `icon`.
  - `Badge`: tones `default`, `strong`, `success` and `danger` are removed. The tones are `neutral` (the default, in the foreground color; `default` was muted), `ok`, `warn`, `error`, `info` and `pending`. Map `default` and `strong` to `neutral`, `success` to `ok` and `danger` to `error`.
  - `SkeletonBar`: `className` is removed. Pass `width` (`full`, `4/5`, `3/5` or `2/3`) and `end`.
  - `Reveal` and `Stagger`: `as` is `div`, `section`, `ul`, `ol` or `li`, and the other props are the effect props, `id`, `children` and ARIA attributes. To animate a heading, put it inside a `Reveal`.
  - `Dashboard`: `delta.tone` is removed. Pass `delta.status`, one of the `Status` words (`good` becomes `ok`, `bad` becomes `error`, and `neutral` is left out).
  - `Disclosure` (the root export) is now `@ejm/ui/components/ui/disclosure`: pass `summary` instead of `label` and drop `presentation`, `summaryClassName` and `contentClassName`. Use `Menu` where you used the menu presentation.
  - `Text variant="code"` renders a plain `code` element in the base inline code style: mono at 0.9em, no fill. `cn` is no longer exported from the root of `@ejm/ui` (`@ejm/ui/lib/utils` still exports it).

  **Derived structure.** `Section` takes a `title`, `kicker`, `intro`, `actions`, `emphasis` and an optional `id`, and derives the rest: the heading level (`h2`, then `h3` in a nested section), the ground (top-level sections alternate Mist and Paper after the hero through `data-band="auto"`, Sage with `emphasis`, no band when nested), the id (`useId`) and the spacing. Keep the sections of a page as siblings. `band-paper:` and `band-mist:` do not match an automatic section. Density now comes from the surface: `AppShell` and `Page variant="application"` make every control compact, `DensityProvider` and `useDensity` are exported, and the `density` prop remains as an override.

  **One control system.** Every control is 44px, or 32px compact on a fine pointer (still 44px on touch). Buttons and the theme toggle are pills, fields, menu items, nav items and tabs use the control radius, overlays share one chrome (window radius, hairline, float shadow), secondary buttons are hairline outlines, color changes are instant, only transform and opacity animate, and there is one focus outline. Rows are `py-4` (`py-2` compact) with hairlines, `Status` words are the one vocabulary, and inline `code` is styled once in the base styles. **Breaking** for code outside the design guard that writes the removed names: the type sizes `text-display-lg` and `text-stat` are gone (`Stat` uses `display`), and so are the radii `rounded-compact` and `rounded-sm`, `rounded-md` and `rounded-lg`.

  **One stylesheet. Breaking.** `@ejm/ui/styles.css` styles every component, and `base.css` imports Tailwind with `source(none)`, so no consumer folder is scanned. `@ejm/ui/styles-app.css`, `styles-static.css`, `styles-terminal.css` and `static.css` are removed. `styles-site.css` forwards to `styles.css` and `styles-docs.css` is empty; both stay for pinned consumers. Replace every import with `@import "@ejm/ui/styles.css";`, and drop `source(none)` and any `@source` line.

  **Smaller surface. Breaking.** The native static profile is removed: `NativeCheckbox`, `ActionRows`, `DocumentContent`, the static `Disclosure` (with the deep paths `@ejm/ui/components/NativeCheckbox`, `@ejm/ui/layout/ActionRows`, `@ejm/ui/layout/DocumentContent` and `@ejm/ui/shell/Disclosure`), `build-static.mjs`, `@ejm/site/native` and `native-html.md`. The web `Terminal*` views and `@ejm/ui/components/TerminalWorkspace` are removed too. A review of the seven ejmlabs repositories found no consumer of either. The terminal contract, `crates/ejm-tui` and `@ejm/ink` are unchanged.

  **Zero-config consumption.** `@ejm/ui/vite` exports `ejmUi()` (Tailwind, React, one copy of React, the design guard). `@ejm/site/vite` exports `ejmlabs({ project, site, headers })`, which adds `ejmSite()`, `ejmSsg()` and the shared build options (`target: 'es2022'`, `cssMinify: 'lightningcss'`, unless set). `@ejm/ui/tsconfig.json` holds the strict options, `types: ["vite/client"]` and the paths that give linked and installed packages one copy of the React and Vite types. The design guard moves to `@ejm/ui/design-guard`. `@ejm/ui` now depends on `@tailwindcss/vite`, `@vitejs/plugin-react`, `tailwindcss` and `postcss`; `react`, `react-dom` and `vite` are its peers, and `tailwindcss` is no longer a peer. A consumer no longer needs `@tailwindcss/vite`, `@vitejs/plugin-react`, `tailwindcss`, `resolve.dedupe`, tsconfig `paths`, `vite-env.d.ts` or build options of its own.

  **Built-page invariants.** `ejmSsg` calls `api.onPages(pages)` on every plugin that has it once the HTML is written, and `ejmSite` fails the build with `[ejm-site:pages] <file>: <rule>` unless every page has exactly one `h1`, no skipped heading level, the skip link to `#main` as its first focusable element, `main#main`, and `rel` containing `external` on every link to another host.

  **Checks.** New: `packages/ui/scripts/check-classes.mjs` (every class the kit writes must build CSS, because Tailwind drops an unknown class such as `bg-surface` without an error), `packages/ui/src/closed-api.test.ts`, and a rewritten `check-sources.mjs` for the one stylesheet.

  **Upgrade steps.** Move the pin, run `npm install`, `npm run typecheck` (removed and closed props fail here) and the site build (the design guard and the page check fail here), and fix what they name. Then delete the glue the preset replaces: `resolve.dedupe`, tsconfig `paths`, `src/vite-env.d.ts`, the `build` options, `source(none)`, the `styles-docs.css` import and the `@tailwindcss/vite`, `@vitejs/plugin-react` and `tailwindcss` dependencies; extend `@ejm/ui/tsconfig.json`; use `ejmlabs()` or `ejmUi()`. [ADOPTION.md](ADOPTION.md) has the recipe.

  **Consumer pin moves.** Each moves its pin in its own repository, and none has been built against this change. studio (`ejmlabs/ejmlabs`, pinned at `a5551a0`): use `ejmlabs({ project: 'ejmlabs' })`, delete `resolve.dedupe`, the `build` options, the tsconfig `paths`, `vite-env.d.ts`, `@tailwindcss/vite`, `@vitejs/plugin-react` and `tailwindcss`, import only `@ejm/ui/styles.css` (and its demo styles) without `source(none)`, and delete the `budget` option that the size-cap removal already dropped. ejm-cli (`site/`, pinned at `f2029e5`): the same with `ejmlabs({ project: 'cli' })` beside its `docsPlugin`, plus the `styles-docs.css` import and the `ejm-ssg budget` script. ejm-chess (no pin): record one, delete `budget` and the `ejm-ssg budget` scripts, use `ejmlabs({ project: 'chess', headers })`, delete the same glue, and pass no `className` to `Chessboard` (now in ejm-ui with `useSearch`, both closed like every other export). ejm-ide and ejm-harness still use the copied design kit and are not affected until they adopt `@ejm/*`.

- Add the public `@ejm/ui/components/Chessboard` leaf. It renders a labelled loading square on the server and loads the maintained cm-chessboard renderer after mount. The host supplies FEN, orientation, accepted moves and optional legal destinations; the kit holds no chess rules, and a move is a proposal until the host returns a new FEN. It stays out of the `@ejm/ui` barrel, so its renderer and CSS reach only pages that import it. `@ejm/ui` gains the dependency `cm-chessboard` 8.15.4 (MIT); its piece sprite is CC BY-SA 3.0, recorded in `THIRD_PARTY_NOTICES.md`.

- Add `useSearch` to `@ejm/ssg`. It returns the query string, empty while prerendering and hydrating, and follows back, forward and router pushes but not `replaceState`, so a page can rewrite its own query without remounting.

- Add the `ui-board-light`, `ui-board-dark` and `ui-board-mark` roles in both themes, which the Chessboard draws its squares, markers and keyboard focus frame with. A new contrast gate holds black pieces and marks at 3:1 on both squares, and the squares 1.4:1 apart, in both themes.

- Centre the `GameWorkspace` board column and size it to the viewport so both player strips fit, with the details to its right from 64rem. `MovePairs` follows the latest move unless the reader scrolled up, and its move numbers no longer wrap from move 10. `BoardPlaceholder` used `bg-surface`, which is not a theme color, so it painted nothing; it now uses `tone`, like the Chessboard loading square. Props are unchanged.

- Replace the ejm-ui mark with the u and block: a ribbon u that starts as a tapered tip, holding one rounded-square component. `scripts/ui-assets.mjs` regenerates the whole family in `@ejm/tokens/assets/projects/ui/` (marks, logos, icons, favicons, manifest and social card), so the gallery picks it up on its next build. Sites that keep their own copy of the ui mark need to refresh it.

- List every family site from every site. `otherSites` now returns the published build identities, then the new `LINKED_PROJECTS` (ejm-calm and gerry, which are not built with `@ejm/site` and get no analytics or shared head). The ejm-ui gallery is published at ui.ejmlabs.com, so `ui` joins discovery; it has no analytics token, and `ANALYTICS_SITES` leaves out tokenless hosts. Consumers that pin a newer ejm-ui gain ejm-ui, ejm-calm and gerry in their footers. The `ejmlabs` tagline and the gallery's layout example describe open source projects and commercial products.

- Add the gerry brand family in `@ejm/tokens/assets/projects/gerry/`, generated by `scripts/gerry-assets.mjs` from the approved standing-G mark. The generator body moves to `scripts/family-assets.mjs`, shared with `scripts/ui-assets.mjs`, whose output is unchanged. Regenerating one family no longer reorders another family's provenance rows.

- Add the terminal conversation blocks `Message`, `ToolCall` and `CommandMenu` to the component contract, with Rust (`ejm-tui`) and Ink (`@ejm/ink`) implementations that print the same lines, plus the `message`, `toolCall` and `elbow` glyphs. Assistant messages use the shared `Markdown` renderer in Rust. `ActivityLine` gains step, elapsed time and stop key details and a spinner frame, and `ejm-tui` exports `elapsed_text`, `compact_count` and `ansi256`, which replaces the LGPL-3.0 `ansi_colours` dependency; `unicode-truncate` follows ratatui's 2.x series. **Breaking** for code that builds `ActivityLine` with a struct literal: add `..ActivityLine::default()`. ejm-cli is the first consumer.

- Remove the hand-written terminal helper `@ejm/tokens/rust/ejm_tui.rs`. **Breaking** for apps that copied it: depend on the `ejm-tui` crate instead. `rust/TUI.md` is rewritten around the crate and the component contract, and is no longer imported from the design kit. `rust/ejm_theme.rs` is unchanged.

- Prepare the first npm publication: `@ejm/tokens`, `@ejm/core`, `@ejm/ui` and `@ejm/ssg` lose `private` and gain public publish config with provenance, a publish-set tarball proof (`scripts/pack-proof-publish.mjs`) and a publish workflow that stays disabled until the owner confirms the `@ejm` scope. The `@ejm/tokens` tarball now carries fonts, palette JSON and icons only; reserved brand artwork stays in the repository.

- Remove every size cap. `ejm-ssg budget`, the `@ejm/ssg/budget` export, the `budget` option of `defineSite`, the build-time budget check, `scripts/size.mjs`, `npm run size` in `@ejm/demos` and the static CSS and font limits are gone. **Breaking** for sites that call `ejm-ssg budget`, import `@ejm/ssg/budget` or set `budget` in `defineSite`: delete those lines. Load time is the only performance bar. `npm run perf` now runs Lighthouse per route and fails when first contentful paint is a second or more above the recorded baseline in `scripts/perf-baseline.json`.

- Add the ejm-ui mark: the grid-e brand family in `@ejm/tokens/assets/projects/ui/`, generated by `scripts/ui-assets.mjs`, a `ui` build identity outside discovery, and the gallery header, footer, favicons, manifest and social card on its own mark.

- Hide the worker strip before reducing draft space in short terminal windows.

- Add shared terminal workspace layout, identity, activity, resource counts, worker rows and contextual controls.
- Add shared terminal Markdown, GFM tables and code rendering, with theme syntax roles and bounded text fitting.

- Keep brand names on one line and reserve their width in project rows.

- Update gallery setup for public source, locked installs and the required node-pty rebuild with Linux build prerequisites.

- Correct gallery verification instructions to use the existing viewport capture tool and distinguish manual layout review from automated checks.

- Preserve 44 px touch targets for static small and compact buttons, and retain query and fragment state in route recovery links.

- Recheck dev source on HTML document requests to catch missed watcher events
  and allow recovery. Isolate the native watcher fixture from absent env files
  and confirm a real change before testing additions, within the same deadlines.
- Include product-window and stage utilities in the public site CSS profile,
  so demo styles need no private source scan in consuming sites.
- Include retained brand download inputs in the tokens tarball, with approved editable project logos and family artwork, provenance and a package file-list check.

- Preserve literal entity examples in Markdown code spans, including headings
  and table labels. Synchronize the dev watcher test with initial discovery.
- Check native file notifications and request recovery within the existing
  watcher test deadline, with received events and errors in failure output.
- Add the shared minimal-copy rule to the public quality bar, preserving clear
  labels, consent, accessibility and recovery instructions.
- Keep reused route stylesheets in cascade order, include the gallery's static
  product-window styles, and use the public site CSS profile in the packed starter.
- Keep plain code in prerendered documentation when a static boundary has no
  highlighting callback, and retain product-view CSS on the gallery product route.
- Add native passive CLI, IDE and Harness previews through additive `*-preview`
  entries, with complete static excerpts, finite offline playback and retained
  capture receipts. Load native IDE colors through an opt-in generated neutral
  scale. Keep all interactive and
  caller-owned recording APIs.
  Reuse the loaded player for bundled data and omit unused private terminal
  modes, retaining recorded output and the public plain-mode contract.
  Update the gallery's component example, design guides and deployment recipe
  for `ui.ejmlabs.com`; this source change does not publish the site.

- Add mandatory public site design checks, a native HTML profile, compiled docs,
  structured branding and fixed site/application composition. Keep published
  terminal/static components and legacy non-site shell props. Add the hidden
  Chess build identity and its brand family without adding it to discovery.
  Split gallery styles by route to keep the existing CSS budget. Reduce shared
  runtime transfer while retaining the maintained router and class merger,
  React 19, SSR paths, base routes, history and native cross-document fragments.
  Native modulepreload has no polyfill: older browsers still fetch imported
  modules but lose preload acceleration. No site is published by this change.

- Add public `Terminal*` view components, `NativeCheckbox`, `Disclosure`,
  `ActionRows`, `ActionRow` and `DocumentContent` for native pages and terminal
  interfaces. Allow `Header` and `AppShell` to replace or suppress the theme
  control. The views use the shared theme and platform form behavior; products
  keep their own authentication, connection and command handling. Static
  styles are opt-in through `@ejm/ui/styles-static.css`. Terminal styles use
  `@ejm/ui/styles-terminal.css`. Both entries follow `@ejm/ui/styles.css`.
  The terminal import stays `@ejm/ui/components/TerminalWorkspace`.
  `NativeCheckbox` uses `@ejm/ui/components/NativeCheckbox`. The other static
  parts keep their shell and layout deep paths. This source
  change does not publish packages, deploy a consumer or establish browser
  acceptance.
- Add Relay's production brand assets through the existing public tokens asset
  export. A targeted legacy import preserves other assets and provenance while
  excluding Relay's editable sources and local review boards. This source
  change does not publish a package or deploy a consumer.
- Keep optimizer integration fixtures small and isolate destructive staleness
  checks. Bound real encoding setup and tests without changing encoder settings
  or the normal test timeout.
- Wait for screenshot Chrome to close before removing its temporary profile,
  with bounded shutdown and removal retries. Preserve rendering failures when
  cleanup succeeds and retain both errors when cleanup also fails.
- Preserve paused playback, progress and the loaded recording when a parent
  rerenders either recorded showcase with equivalent options. `LazyIsland`
  accepts a React element with props as well as an existing component type.
- Exclude the gallery's unused CSS `filter` utility. Layouts and CSS budgets
  are unchanged.

- Add `LazyCliShowcase` and `LazyHarnessShowcase` with explicit product-owned
  recording data, passive playback controls and lazy timelines. Keep existing
  interactive exports unchanged. The adapters reuse the shared clock, lifecycle
  and product views; no reference capture,
  package dependency, published release or deployed consumer is implied.

- Allow up to 60 seconds for the performance check's Chrome startup and report
  bounded browser error output. Page budgets and the browser sandbox are unchanged.
- Remove the remaining 38 retired social profile kit renders and duplicate font
  files from source. Active fonts and their original notices remain.
- Keep 244 imported files in provenance and exclude retired social profile kits
  from future legacy imports. Package export declarations and packaged runtime
  files are unchanged.

## [0.1.0] - 2026-10-19

Source baseline for the shared UI packages. This entry is not a published
release, registry package or deployed gallery.

- Record one version for the root, eight owned npm packages and `ejm-tui`.
  Applications, examples and nested fixtures remain consumer metadata.
- Include scoped package licenses, third-party notices, original font
  notices and the public `@ejm/demos/ide.css` compatibility entry.
- Include both original font notices at stable root paths in sites built by
  `@ejm/site`, including consumers installed from local tarballs.
- Keep gallery CSS within its existing budget by omitting the unused viewport
  `container` utility. Page layouts and container queries remain available.
- Retain 282 imported files in provenance: 280 assets and two Rust files.
  Retired kit handoff files, X-kit source trees, per-project editable sources
  and ZIP archives are excluded. Some templates, lockups and rendered X-kit
  material remain in this source baseline.
- Isolate new product captures in temporary workspaces and remove them after
  use. Existing captures keep their recorded product revisions and evidence.
- Add shared community guidance, maintainer ownership, issue and PR templates,
  and bounded dependency update configuration.
- Pin the PR and draft-release callers to a retained, reviewed shared
  implementation. Initial installation still needs a fresh admitted PR to
  establish hosted acceptance.

Checks and publication remain separate evidence. Follow the development guide
for owner checks and each consumer's guide for compatibility checks. Native
installers, package publication and deployment need their own release gates.
