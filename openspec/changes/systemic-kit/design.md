## Context

`@ejm/ui` already has fixed site recipes (`Hero`, `SectionHead`, `SiteContent`) and a build guard
(`packages/site/src/design.mjs`) that rejects consumer `className`, `style`, local CSS and spread props. The gaps are that
the components themselves stay open, consumers still choose structure by hand, controls drift from one another, the
stylesheet is split into partials that fail silently, and every consumer copies the same build glue. This design closes
those gaps inside the existing brand rules: Manrope and IBM Plex Mono, the token palette, no cards or panels, shadows only
on windows, menus and overlays, transform and opacity motion, real React 19.

## Goals and non-goals

Goals: one way to build each thing; structure derived, not chosen; every control from one recipe; a consumer config of one
plugin, one base tsconfig and one stylesheet import; failures at type check or build time, never silent.

Non-goals: a new palette or fonts; publishing; migrating ejm-ide or ejm-harness off the old copied kit; changing the
terminal contract, `crates/ejm-tui` or `@ejm/ink`; product content in `@ejm/site/projects` and `@ejm/demos`.

## Decisions

### 1. Closed props

`packages/ui/src/lib/closed.ts` exports `type Closed<P> = Omit<P, 'className' | 'style' | 'dangerouslySetInnerHTML'>`.
Every public component's props use it, or list their props without those keys. Inside `packages/ui`, a component never
passes `className` or `style` to another public component: it renders the element itself or uses a private helper that is
not exported from the package. `packages/ui/src/closed-api.test.ts` fails type checking when any capitalized export of the
`@ejm/ui` barrel accepts `className` or `style`.

Rejected: keeping `className` for "application adapters". It is the escape hatch that made drift possible, and the guard
already forbids it for every real consumer.

### 2. Derived structure

- `lib/heading.tsx` holds a heading level context. `Section` renders its title at the context level (default 2) and
  provides level + 1 to its children, capped at 6. `SectionHead` uses the context level when `as` is omitted. `Hero`
  always renders the `h1`.
- A top-level `Section` is a full-bleed band. Its ground alternates automatically: `data-band="auto"` takes Mist on odd
  and Paper on even positions among its `data-band="auto"` siblings (`:nth-child(odd of [data-band="auto"])`), so the
  first section after the Paper hero is Mist. `emphasis` gives Sage. The selectors are emitted by the tokens generator
  beside the named bands.
- A nested `Section` is a subsection: no band, its heading one level down in `text-heading`, fixed spacing.
- `Section` generates the heading id with `useId` unless `id` is given, and labels the region with it.
- The body is a grid with one fixed gap. Paragraphs and lists placed directly in it keep the reading measure.
- `lib/density.tsx` holds a density context. `AppShell` and `Page variant="application"` provide `compact`. Controls read
  the context; a `density` prop still overrides it for existing callers.

### 3. One control system (exact values)

| Property | Value |
| --- | --- |
| Height | `min-h-11` (44 px). Compact: `min-h-8` with `compact-target` on a fine pointer; `touch-target` keeps 44 px on a coarse pointer. Applies to Button, Input, Select, Tabs triggers, menu items, Disclosure summary, header nav items, the theme toggle and checkbox, radio and switch rows. Textarea keeps `min-h-28`. |
| Radius | Buttons and the theme toggle `rounded-pill`. Fields, checkboxes, menu items, nav items and tabs `rounded-control`. Overlays `rounded-window`. Radios `rounded-full`. `rounded-compact` and the `rounded-sm|md|lg` aliases are removed. |
| Type | Controls `text-base` (16 px), compact `text-sm` (14 px), weight 600 for buttons and the current tab, 400 otherwise. Labels and metadata `text-meta`. No other sizes and no literal pixel sizes in components. |
| Button variants | `primary` Sage fill, Forest on hover. `secondary` transparent with `border border-control`, `bg-tone` on hover. `ghost` transparent, `bg-tone` on hover. `link` underlined text. `danger` danger fill. Sizes `md` and `icon` only (`icon` is 44 px square, 32 px compact). |
| Hover | Filled controls darken to their hover token. Every other interactive surface (ghost and secondary buttons, nav items, menu items, rows, tabs) uses `hover:bg-tone`. Links thicken their underline to 2 px. |
| Pressed | Buttons `motion-safe:active:scale-[0.97]`. Nothing else scales. |
| Transitions | Color changes are instant. Only `transform` and `opacity` transition, with `duration-fast` and `ease-standard`. No `transition-colors` or `transition-all`. |
| Focus | The global `:focus-visible` outline (2 px `--ejm-focus`, 2 px offset). Components add nothing, except `focus-visible:outline-offset-[-2px]` where an ancestor clips the outline (menu items, tabs inside a scroller, table cells). |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none`, and the same for `aria-disabled`. |
| Overlays | Dialog, Menu, Select popups, Toast and the header phone menu: `rounded-window border border-line bg-ground text-fg shadow-float`, entering with `animate-fade`. Tooltip: `rounded-control border border-line bg-ground text-sm shadow-raised`. |
| Rows | List rows, fact rows, table rows and activity rows: `py-4`, compact `py-2`, separated by the `hairline` and `hairline-t` utilities only. Row text starts on the column edge. |
| Measure | Text and forms use `max-w-measure` (68ch). |
| Inline code | The base style for `code` outside `pre` (mono, 0.9em, no fill). Components do not restyle it. |
| Status words | `Status` (`ok`, `warn`, `error`, `info`, `pending`) is the one vocabulary. `Badge` takes the same names plus `neutral`. |

Type sizes are `display`, `title`, `heading`, `lead`, `body` and `meta`, plus `text-sm` and `text-base` for controls and
dense tables. `display-lg` and `stat` are removed; `Stat` uses `display`.

### 4. One stylesheet

`base.css` imports Tailwind with `source(none)`, so no consumer folder is ever scanned. `styles.css` adds `@source` for
every component folder (`components`, `layout`, `shell`, `hooks`, `motion`, `docs`, `app`, `lib`) and
`control-recipes.mjs`. `styles-site.css` becomes `@import "./styles.css";` and `styles-docs.css` a comment, kept for
pinned consumers. The full sheet is about 5 KB gzip larger than the site profile; load time is the only bar.

Rejected: shipping precompiled CSS. Demo profiles add `@source` lines that must compile in the same pass, or utilities
from two sheets override each other's variants. Compiling in the consumer's build through the preset keeps one ordered
sheet.

### 5. Presets

- `@ejm/ui/vite` exports `ejmUi()`: `@tailwindcss/vite`, `@vitejs/plugin-react`, `resolve.dedupe` for `react` and
  `react-dom`, and the design guard for the app's `src` (moved from `@ejm/site`, which re-exports it). These become
  dependencies of `@ejm/ui`; `react`, `react-dom` and `vite` stay peers.
- `@ejm/site/vite` exports `ejmlabs({ project, site = 'src/site.tsx', headers })`, which returns `ejmUi()`, `ejmSite()`,
  `ejmSsg()` and the shared build options (`target: 'es2022'`, `cssMinify: 'lightningcss'`) unless the site sets them.
  `ejmSite` and `ejmSsg` stay exported.
- `@ejm/ui/tsconfig.json` (file `src/consumer.tsconfig.json`, inside the reviewed `src` prefix) holds the strict
  compiler options and `paths` for `react`, `react-dom` and their subpaths with two candidates each, the linked
  checkout's `node_modules` and the installed package's, so one copy of the React types is used either way.

### 6. Built-page invariants

`ejmSite` checks every prerendered HTML file after `ejm-ssg` writes it, with `parse5` (already a dependency): one `h1`, no
heading level skipped going down, the first focusable element is the skip link to `#main`, `main#main` exists, and every
link to another host has `rel` containing `external`. A violation fails the build with the file and the rule. The gallery
and the starter pass it.

### 7. Removals

| Removed | Why | Consumers |
| --- | --- | --- |
| `src/static/*`, `styles-static.css`, `src/static.css`, `public/static.css`, `build-static.mjs`, `static-touch.test.mjs`, `@ejm/site/native`, `native-html.md` | A second implementation of controls with product recipes and no consumer | none in the seven repositories |
| `src/terminal/*`, `styles-terminal.css`, `./components/TerminalWorkspace` | Product chat and pairing views with no web consumer; the contract and the Ink and Rust targets stay | none |
| `styles-app.css` | Covered by `styles.css` | none |
| `display-lg`, `stat` sizes, `rounded-compact`, `rounded-sm|md|lg` | Off-scale or unused | none outside the kit |
| The shadcn color aliases, once no kit file uses them | Components use the semantic names | none outside the kit |
| `cn` in the root barrel | Nothing outside the kit can use a class | none |

Deep import paths that consumers use keep resolving (`@ejm/ui/components/ui/*`, `@ejm/ui/layout/*`,
`@ejm/ui/shell/*`, `@ejm/ui/docs/*`, `styles-site.css`, `styles-docs.css`).

## Conventions for the implementation

- Folder ownership: each slice edits only its own folder. A change needed in another folder is reported, not made.
- File names follow the folder (`components/ui/kebab-case.tsx`, `PascalCase.tsx` elsewhere). Tests sit beside the source
  with the same stem.
- No literal colors, no Tailwind palette names, no arbitrary pixel sizes for type, no new tokens.
- Every visible change works in both themes, on every band, with the keyboard, under reduced motion and without scripts.
- No em dashes anywhere.

## Risks

- A consumer moving its pin may hit a removed legacy prop. The guard already rejected each one in sites; the changelog
  lists them.
- Automatic grounds depend on `:nth-child(of S)` (Chrome 111, Safari 9, Firefox 113). Without it a section keeps the
  page ground, which still reads.
- The preset adds build tools to `@ejm/ui`'s dependencies. They were already required of every consumer.
