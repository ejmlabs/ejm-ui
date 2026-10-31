# Components

Every component in `@ejm/ui`, the primitive under it (Radix or native) and why. `node packages/ui/scripts/check-components.mjs` fails when a component file is missing here, and when anything is named or classed card, panel or tile. The states each component renders are in `src/catalog/*.json`, merged into `src/catalog.json` by `node packages/ui/scripts/build-catalog.mjs`, which `scripts/parity.mjs` compares with `packages/core/contract.json`.

Rules every component follows: Tailwind utilities from `THEME.md` only, no literal colors, no new CSS files, the one control recipe (`THEME.md`, "The control system"), `touch-target` (44px on coarse pointers) on every control, the global 2px focus ring, motion on transform and opacity only with the final state under reduced motion, instant color changes. Only product windows, menus and overlays have shadows. The gallery documents these APIs at `/docs/components` and shows control examples in both themes at `/components`.

How to read the primitive column: **native** means a platform element does the job, **Radix** means a Radix primitive earns its weight (behavior that is hard to get right by hand), **core** means the framework-neutral model in `@ejm/core`.

## Closed components

No component exported from `@ejm/ui` accepts `className`, `style` or `dangerouslySetInnerHTML`. Props carry content, state, identity and accessible attributes (`aria-*`, `id`, `role`, native events and refs where the element needs them). The kit owns every class.

- Each component types its props with `Closed<P>` (`lib/closed.ts`: `Omit<P, 'className' | 'style' | 'dangerouslySetInnerHTML'>`) or lists its props without those keys. `Closed` is internal; it is not exported.
- `packages/ui/src/closed-api.test.ts` checks every capitalized export of the barrel and fails type checking, naming the component, when one accepts any of the three. `npm run typecheck` runs it.
- Inside the package a component never passes `className` or `style` to another public component. It renders the element itself or uses a private helper that is not exported (`ExternalAnchor`, `NavLink` and `NavMenu` in `shell/`).
- A consumer that needs a layout or a look that is not here adds a component or a recipe to ejm-ui. The design guard rejects a consumer's own `className`, `style` and local CSS at build time (see `ADOPTION.md`).
- The variants a component takes are closed too: `Button` sizes are `md` and `icon`; `Badge` tones are `neutral`, `ok`, `warn`, `error`, `info` and `pending`; `SkeletonBar` takes `width` (`full`, `4/5`, `3/5`, `2/3`) and `end`; `Reveal` and `Stagger` take `as` of `div`, `section`, `ul`, `ol` or `li`; a `Dashboard` delta takes a `status` from the `Status` words; `Text variant="code"` renders a plain `code` element.

## Density comes from the surface

Controls read their density from the surface they sit in. `AppShell` and `Page variant="application"` wrap their children in `DensityProvider density="compact"` (`lib/density.tsx`), so a `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`, `RadioGroup`, `Tabs`, `MenuItem`, `Disclosure`, `Tooltip`, `Badge`, `StateBlock`, `Table`, `Prompt` and the theme toggle are compact with no prop, and rows, facts, doc tables, activity rows and chart frames tighten too. `Header` and `SiteLayout` stay comfortable.

`DensityProvider` and `useDensity` are exported from `@ejm/ui` for a surface of your own. A `density="comfortable"` or `density="compact"` prop on a control still overrides the surface; leave it out unless one control must differ.

Compact means `text-sm`, `min-h-8` and, on a fine pointer, a 32px target. On a coarse pointer (touch) a compact control is still 44px: `touch-target` makes it 44px on coarse pointers and `compact-target` makes it 32px on fine ones. `components/density.test.tsx` checks the classes in jsdom; a new layout still needs its own browser check. Per component: a compact switch has a 28 by 16px track with a 32px target, a tooltip tightens its padding, a badge tightens its gap, a state block uses less space and a compact action, and `Table` has `py-2` rows. `Table` also takes `truncate={false}` to show every character of a cell.

## Deep imports that stay public

The `exports` of `packages/ui/package.json` are the only public paths. Everything else is private.

| Path | What it is |
| --- | --- |
| `@ejm/ui` | The barrel: every component, hook and type in this file except the private helpers. It tree-shakes to the cost of the deep import (`check-treeshake.mjs`). |
| `@ejm/ui/{app,docs,hooks,layout,motion,shell}` | A folder's index. |
| `@ejm/ui/{app,docs,hooks,layout,motion,shell,components}/<File>` | One file, for example `@ejm/ui/layout/Section`, `@ejm/ui/layout/SiteContent`, `@ejm/ui/layout/Application`, `@ejm/ui/components/ui/button`, `@ejm/ui/components/ui/disclosure` and `@ejm/ui/docs/DocProse`. `@ejm/ui/shell/*` also resolves the private shell helpers, but they are not API. |
| `@ejm/ui/docs/highlight`, `/docs/highlight-all`, `/docs/hooks`, `/app/messages`, `/app/scale`, `/app/useBox`, `/motion/useReveal`, `/motion/useDrawOn` | Non-component modules with their own entry. |
| `@ejm/ui/lib/utils` | `cn`, the class merger. It is not in the root barrel. A consumer under the design guard cannot apply a class, so it has no use there. |
| `@ejm/ui/control-recipes` | `buttonVariants`, `fieldVariants`, `fieldClass` and the button class parts, without importing React. The kit's components are built from them. |
| `@ejm/ui/font-preloads`, `@ejm/ui/catalog.json`, `@ejm/ui/theme-boot.js`, `@ejm/ui/art/*`, `@ejm/ui/fonts/*` | Fonts, catalog, theme boot script and art files. |
| `@ejm/ui/styles.css`, `@ejm/ui/styles-site.css`, `@ejm/ui/styles-docs.css` | The one stylesheet, and the two forwarders kept for pinned consumers (`THEME.md`). |
| `@ejm/ui/vite`, `@ejm/ui/design-guard`, `@ejm/ui/tsconfig.json` | The preset `ejmUi()`, the design guard, and the base tsconfig (`ADOPTION.md`). |

## Controls and overlays (primitives workstream)

Source: `src/components/ui/`, copied-in shadcn/ui style on React 19 with `class-variance-authority`. `components.json` records the shadcn setup (aliases, no CSS variables file: the theme is `styles.css`).

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| `Button` | `components/ui/button.tsx` | native `<button>`, Radix Slot for `asChild` | A button needs no library. Slot lets the same look wrap a router link. Variants primary (Sage fill, Ink text), secondary (a hairline outline), ghost, link and danger (red fill); sizes `md` and `icon` (a square that needs an `aria-label`; it sizes its `svg` child to 20px, 16px compact, so pass a lucide-react icon with no size). `arrow` slides 4px on hover. Pills stay on one line; the link variant wraps. Density comes from the surface. |
| `Input` | `components/ui/input.tsx` | native `<input>` | The platform gives labels, autofill, mobile keyboards and validation. `Input` only adds the control look. |
| `Textarea` | `components/ui/textarea.tsx` | native `<textarea>` | Same as Input. |
| `Select` | `components/ui/select.tsx` | native `<select>` | The native picker is better on phones, has full keyboard and typeahead support, and costs no JavaScript. Radix Select was rejected: it re-implements the same and adds about 10 KB gzip. |
| `Switch` | `components/ui/switch.tsx` | Radix Switch | A `role="switch"` button with form value, controlled and uncontrolled use. Native checkbox styling cannot do the thumb without extra markup. |
| `Checkbox` | `components/ui/checkbox.tsx` | Radix Checkbox | The indeterminate (mixed) state and a styled box. |
| `Badge` | `components/ui/badge.tsx` | native `<span>` | Plain mono text with a slash or dot mark. Tones are the `Status` words plus `neutral`. Not a pill, not boxed. |
| `Separator` | `components/ui/separator.tsx` | native `<div>` | A hairline. `role="none"` when decorative. |
| `Tooltip` | `components/ui/tooltip.tsx` | Radix Tooltip | Hover and focus timing, Escape, collision handling and `aria-describedby`. Hard to hand-roll well. A small overlay: the control radius, a hairline and the raised shadow. |
| `Tabs` | `components/ui/tabs.tsx` | core (`tabsReducer`) on native buttons | The same arrows, Home, End, wrap and roving tabindex as the Ink and Rust tabs. No Radix needed, so no extra weight. |
| `Dialog` | `components/ui/dialog.tsx` | native `<dialog>` | `showModal()` traps focus, makes the page inert, handles Escape and restores focus. The component adds the label, the backdrop click and an explicit focus return. Radix Dialog was rejected as the heavier path. |
| `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuLabel`, `MenuSeparator`, `MenuGroup` | `components/ui/menu.tsx` | Radix DropdownMenu | Roving focus, typeahead, Escape, focus return and collision-aware placement. A native popover has no menu keyboard model. |
| `Toast`, `ToastProvider` (with `useToast`) | `components/ui/toast.tsx` | Radix Toast | A polite live region per toast (`type="background"`), auto-dismiss that pauses on hover and focus, F8 to reach the stack, swipe to dismiss. |
| `RadioGroup` | `components/ui/radio-group.tsx` | native fieldset and radio inputs | Form validation, submission and keyboard selection. The label is the whole touch target. |
| `Disclosure` | `components/ui/disclosure.tsx` | native `<details>` and `<summary>` | Collapsible at every width, with a hairline above and a `summary` prop for its label. The summary is a 44px row (32px compact). Closed content stays mounted, so forms keep input and widget state. No scripts. |

## Contract primitives (primitives workstream)

These four are in `packages/core/contract.json` and exist on every target (web, Ink, Rust). Props and state names match the contract exactly.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| `Table` | `components/Table.tsx` | native `<table>` in a labelled, focusable scroll region | Real table semantics. States default, empty, loading, error; header and a hairline stay in every state. |
| `KeyHints` | `components/KeyHints.tsx` | native `<ul>` and `<kbd>` | One line of plain key and label pairs; what does not fit is clipped from the end. |
| `Prompt` | `components/Prompt.tsx` | native `<form>` and `<input>` | States idle, busy, error. Busy says "working" in a live region and ignores input. |
| `StateBlock`, `SkeletonBar` | `components/StateBlock.tsx` | native elements | States empty, loading, error: a word, one sentence, at most one action. Loading adds a skeleton that only fades. `SkeletonBar` takes a `width` and `end`. |

## Layout language (layout workstream)

Page, Band, Section, SectionHead, Rows, Row, Facts, Stat, Hero, ProductWindow, ProductShot, Illustration, Text, Rule, Status, Art. Add a row per component: name, file, primitive and why. `Section` is the way to build the parts of a page; see `src/layout/README.md`.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| Band | layout/Band.tsx | native `<section>` with `data-band` | A band is a data attribute and a utility, so tone needs no JavaScript. The lower-level path; new pages use Section. |
| Page | layout/Band.tsx | native `<div>` | The scaling content column; bands stay full-bleed around it. `variant="application"` adds 32px phone / 48px desktop vertical padding and shared content gaps, and provides compact density; the default remains column-only. |
| Section | layout/Section.tsx | native `<section>`, heading and `data-band` | The way to build a page section. Title, kicker, intro, actions, emphasis and an optional id are the only inputs. The heading level comes from nesting (h2, and h3 in a nested section, never past h6), the ground from position (top-level sections alternate Mist and Paper, Sage with `emphasis`, no band when nested), the id from `useId`, and the spacing is fixed. |
| SectionHead | layout/SectionHead.tsx | native header, heading and support copy | Kicker, heading and copy. The page, section and application purposes select complete shared recipes. Without `as` the heading takes the level of its context. |
| Rows | layout/Rows.tsx | native `<ul>` | Hairline list that replaces cards. |
| Row | layout/Rows.tsx | native `<li>` and `<a>` | The whole row is the link through its title; states per contract. |
| Facts | layout/Facts.tsx | native `<dl>` | Mono labels with hairlines; stacks by container width. |
| Fact | layout/Facts.tsx | native `<div>` with `<dt>` and `<dd>` | One label and value pair inside Facts. |
| Stat | layout/Stat.tsx | native `<p>` pair | Large numerals in `display` type with a mono label and no box; states per contract. |
| Text | layout/Text.tsx | native span or element | Default, muted, strong and code variants per contract. `code` renders a plain `code` element in the base inline code style. |
| Rule | layout/Rule.tsx | native `<hr>` or labelled rule | A single hairline, never a frame. |
| Status | layout/Status.tsx | native `<span>` | Glyph and word, so status never relies on color. The one status vocabulary: ok, warn, error, info, pending. |
| Hero | layout/Hero.tsx | native `<section>` | Type-led opening on the page ground, with the page's one `h1` and an aside slot for windows. Takes content only. |
| Art | layout/Art.tsx | inline `<svg>` | Decorative symbol line art; draw-on is added after mount only. |
| ProductWindow | layout/ProductWindow.tsx | native `<figure>` | Floating window with elevation and the Simulated screen label unless live. |
| ProductStage | layout/ProductWindow.tsx | native `<div>` | Layers one to three windows; a tucked stack on narrow stages. |
| ProductShot | layout/ProductShot.tsx | native `<figure>` and `<picture>` | A real product capture: AVIF, WebP and PNG sources, explicit size, dark and light variants that follow the page theme, a hairline caption from the capture metadata. |
| Illustration | layout/Illustration.tsx | native `<figure>` | A drawn stand-in for a product screen (a React composition) with the always-visible label "Illustration of <product>, not a screenshot". Never a capture. |
| IllustrationLabel | layout/Illustration.tsx | native `<p>` | The one visible label "Illustration of <product>, not a screenshot", shared by Illustration and ProductShot. |

## Opinionated site composition

Consumers supply content, routes, artwork data and accessible state. These components own their full visual recipes and accept no `className` or `style`. Add missing layouts here before using them in a site.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| SectionBody | layout/SiteContent.tsx | native elements | Section content spacing, for pages built from Band and SectionHead. Section provides its own. |
| Columns | layout/SiteContent.tsx | native elements | One explanatory and one supporting column. |
| MetricGrid | layout/SiteContent.tsx | native elements | Comparable figures in one responsive grid. |
| ContentFlow | layout/SiteContent.tsx | native elements | Readable content and status rhythm. |
| ContentGroup | layout/SiteContent.tsx | native elements | A heading, copy and related action. |
| ReadingColumn | layout/SiteContent.tsx | native elements | Bounded source example width. |
| Actions | layout/SiteContent.tsx | native elements | Wrapping standalone actions. |
| Note | layout/SiteContent.tsx | native elements | A nearby qualification. |
| ContentHeading | layout/SiteContent.tsx | native elements | A secondary heading with semantic level. |
| InlineLink | layout/InlineLink.tsx | native elements | Shared route and external link treatment. |
| InlineCode | layout/SiteContent.tsx | native elements | Short code inside prose, a plain `code` element in the base style. |
| CommandLines | layout/SiteContent.tsx | native elements | Plain source commands without a client highlighter. |
| VisuallyHidden | layout/SiteContent.tsx | native elements | Accessible names without visual text. |
| FileDetail | layout/SiteContent.tsx | native elements | Wrapping release metadata. |
| FocusRegion | layout/SiteContent.tsx | native elements | A programmatic focus target with the global focus rule. |
| ControlGroup | layout/SiteContent.tsx | native `<fieldset>` with an `sr-only` legend | A named group of controls with no frame or space of its own. `disabled` disables every control inside while text and links stay readable; the gallery holds a deferred page's examples with it until its code is ready. |
| AssetGrid | layout/SiteContent.tsx | native elements | Uniform responsive artwork grid. |
| BrandAsset | layout/SiteContent.tsx | native elements | Fixed-height artwork preview and caption. |
| PaletteSwatch | layout/SiteContent.tsx | native elements | Approved token color sample. |

## Shell, hooks and layouts (shell workstream)

Header, Footer, ThemeToggle, ExternalLink, SiteLayout, DocsLayout, AppShell, SkipLink, Collapse, Reveal, Stagger. Add a row per component. `ExternalAnchor`, `NavLink` and `NavMenu` are private helpers in `shell/`: they are not exported from the barrel and are not API.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| SiteLayout | shell/SiteLayout.tsx | native landmarks | Skip link, header, `main#main` and footer for every site. |
| Brand | shell/Brand.tsx | decorative mark and optional name | Supplied light and dark image URLs and intrinsic dimensions; placement owns the display size. The footer uses `darkSrc` (or `src` when there is none) on its permanent Ink ground. |
| Header | shell/Header.tsx | native `<header>`, `<nav>` and `<details>`, a CSS container query | The required `identity` (name and optional mark) at the left, nav, and the theme control last; `themeControl` replaces or suppresses the default. Below 48rem of its own width the nav is the phone menu, a disclosure, so a header in a narrow column shows the menu too. |
| Footer | shell/Footer.tsx | native `<footer>` | Ink band with an `identity`, link columns, the privacy note slot and a legal line. |
| ThemeToggle | shell/ThemeToggle.tsx | native `<button>` | Far right of the header; its name states the action. It takes no props and is the ghost icon button of the control recipe. |
| ExternalLink | shell/ExternalLink.tsx | native `<a>` | `rel="external noopener"` with an arrow and a screen reader note. |
| ExternalAnchor | shell/ExternalAnchor.tsx | native `<a>` | Private. The external anchor that ExternalLink and NavLink share: the `rel`, the arrow and the screen reader note. |
| NavLink | shell/NavLink.tsx | native `<a>` or the site's link component | Private. One nav item, external or routed, with `aria-current` and the current-page mark (weight 600 and a 2px underline). |
| NavMenu | shell/NavMenu.tsx | native `<details>` | Private. The header menu below 768px, an overlay under the bar. Escape and an outside press close it. |
| SkipLink | shell/SkipLink.tsx | native `<a>` | First focusable element; targets `#main`. |
| DocsLayout | shell/DocsLayout.tsx | native `<details>` collapses | Sidebar, 68ch reading column and contents; both side parts fold on narrow screens. |
| AppShell | shell/AppShell.tsx | native landmarks | Top bar, side nav and content for applications, with compact density for everything inside. `nav` is a list of items (`label`, `href`, `current`, `external`), each a compact control from the recipe with the current page marked by weight and an underline. `themeControl` replaces or suppresses the default. |
| Collapse | shell/Collapse.tsx | native `<details>` | Shared disclosure behind the docs sidebars. |
| LinkProvider | shell/link.tsx | React context | Lets a site pass its router link, so the shell stays router-agnostic. |
| DensityProvider | lib/density.tsx | React context | Sets the density of a surface. AppShell and `Page variant="application"` provide `compact`; controls read it with `useDensity`. Exported from `@ejm/ui`. |
| NextHeadingLevel | lib/heading.tsx | React context | Internal. Gives the children of a Section the next heading level, never past h6. Section and SectionHead read the level; it is not exported. |

`Reveal` and `Stagger` (`motion/`) wrap content in a `div`, `section`, `ul`, `ol` or `li` and take only their effect props, an `id` and ARIA attributes. See `src/motion/README.md`.

## Docs components (docs workstream)

CodeBlock, CodeTabs, Callout, ParamTable, Pager, SidebarFilter, Contents, and the specimens a docs page shows the kit with. Add a row per component.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| DocsSidebar | docs/DocsSidebar.tsx | native `<nav>` and lists | Grouped docs navigation with `aria-current`; hairlines only. |
| SidebarFilter | docs/SidebarFilter.tsx | native `<input>` | Filters entries and announces the result count. |
| Contents | docs/Contents.tsx | native `<nav>` and links | On this page; works with no script, scroll-aware with it. |
| Heading | docs/Heading.tsx | native heading with anchor | Heading with an id and a native `#` permalink. |
| CodeBlockFrame | docs/CodeBlockFrame.tsx | copy and feedback | Live code figure that accepts pre-rendered source. |
| CodeSource | docs/CodeBlockFrame.tsx | source region | Labelled, keyboard-scrollable plain or highlighted code. |
| CodeHighlight | docs/CodeHighlight.tsx | syntax source | Highlighted source without its figure or copy control. |
| CodeTabsFrame | docs/CodeTabsFrame.tsx | tabs and keyboard controls | Shared tabs interaction around supplied content. |
| CodeBlock | docs/CodeBlock.tsx | native `<pre>` and `<button>` | Language label, copy with a live confirmation, own scroll region. |
| CodeTabs | docs/CodeTabs.tsx | core tabs model | Arrow-key language tabs; all panels show stacked without script. |
| Callout | docs/Callout.tsx | native `<aside>` | Note, tip or warning with a text label first and a left rule, no box. |
| ParamTable | docs/ParamTable.tsx | native `<table>` | Mono names and tabular numerals, scrolling inside its own region. |
| Pager | docs/Pager.tsx | native `<nav>` and links | Previous and next links that name the adjacent pages. |
| Specimen | docs/Specimen.tsx | native `role="group"` named by its label | One labelled example. With `theme` it starts that theme on the Paper ground (`data-theme` on any element), so a docs page shows a part in a given theme without a theme prop on the part. |
| Compare | docs/Specimen.tsx | native grid | Two specimens side by side from 64rem, stacked below: comfortable beside compact, say. |
| ThemePair | docs/Specimen.tsx | two Specimens in a Compare | The same children in a light and a dark specimen. Each copy has its own state and ids. |
| TypeScale | docs/Specimen.tsx | native paragraphs in hairline rows | The six type sizes, each in its own size, from the kit's own list. |
| Elevations | docs/Elevations.tsx | window samples | The three shadow levels on window samples, the only object that carries them. |
| DocHead | docs/model.tsx | native header | Page title and lead from the content model. |
| DocsPage | docs/DocsPage.tsx | live docs shell | Sidebar, contents, reading surface, code controls and pager around optional static prose. Code renders as plain source when no server highlighting callback is supplied, including inside a static boundary. |
| Prose | docs/Prose.tsx | reading surface | Shared body type for docs content. Inline code takes the base style. |
| DocTable | docs/DocTable.tsx | native table | Captioned, locally scrolling table that preserves every column. |
| DocProse | docs/DocProse.tsx | compiled prose | Renders a serialized prose run with the shared docs parts. |
| DocCodeBlock | docs/DocCodeBlock.tsx | compiled code | Live code and tabs without the prose renderer. |
| DocDataBlock | docs/DocDataBlock.tsx | compiled block | Renders serialized blocks, including nested code. |
| DocBlocks | docs/model.tsx | content blocks | Renders blocks from the React content model. |
| DocBody | docs/model.tsx | native article content | Renders a page's blocks from the content model. |

## App (app workstream)

All in `packages/ui/src/app`. Every part takes `state` default, empty, loading or error with one sentence and at most one action, built on `StateBlock`, `SkeletonBar` and `Table`.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| `Dashboard` | `app/Dashboard.tsx` | `section`, `Stat`, `Table`, container queries | Figures, a chart, a hairline table and an activity feed with no boxes, one column on a phone and one editorial row on an ultrawide. A figure's delta is words and a glyph, colored by a `status` from the `Status` words. Loading speaks once and holds placeholders `inert`. |
| `ChartLine`, `ChartArea` | `app/ChartLine.tsx` | inline SVG with `role="img"` | Dependency-free. Six hue roles plus marker shapes, dash patterns and end labels, so values never rely on color alone. |
| `ChartBar` | `app/ChartBar.tsx` | inline SVG with `role="img"` | Grouped bars with a fill pattern per series and value labels where they fit. |
| `ChartFrame` | `app/ChartFrame.tsx` | `div role="group"`, `figure`, native `details` | Shared heading, legend, "View as table" disclosure (always in the DOM) and states for the charts. |
| `Legend` | `app/Legend.tsx` | native `ul` | A text legend naming every series next to its marker and dash or pattern. |
| `XAxis`, `YAxis` | `app/axes.tsx` | SVG `g` and `text` | Hairline gridlines and tabular mono labels, thinned on narrow charts. |
| `Marker`, `BarPatterns` | `app/marks.tsx` | SVG shapes and `pattern` | The non-color encodings: six marker shapes and six bar fill patterns. |
| `ActivityList` | `app/ActivityList.tsx` | native `ul`, `time`, `Status` | Hairline rows with relative times and a status glyph and word. |

## Application leaves

These exports supply their complete visual treatment. Applications pass content, state and semantic attributes only.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| GameClock | components/GameClock.tsx | native span | Supplied time and state, no timer or ticking live region. |
| Chessboard | components/Chessboard.tsx | React lazy boundary | Public leaf-only board surface. SSR shows a labelled loading square; the maintained renderer loads after mount. Hosts supply FEN, orientation, accepted moves and optional legal destinations. No chess rules, product records, server or engine code enters the kit. |
| ChessboardSurface (internal) | components/chessboard/ChessboardSurface.tsx | maintained cm-chessboard SVG | Owns pointer and keyboard interaction, promotion, marker layers, orientation serialization, reduced motion and cleanup. It is an internal renderer; consumers use the public Chessboard leaf. |
| RadioGroup | components/ui/radio-group.tsx | native fieldset and radio inputs | Form validation, submission and keyboard selection. |
| Disclosure (deep controls import) | components/ui/disclosure.tsx | native details and summary | Preserves mounted children while closed. |
| Prose | layout/Prose.tsx | native article or div | Shared reading typography without a highlighter. |

`Chessboard` is deliberately absent from the `@ejm/ui` barrel so its renderer and CSS cannot enter an unrelated consumer through a barrel import. Use the public leaf in a lazy boundary. `GameClock` is a small static display and is also available from the barrel.

```tsx
import { lazy, Suspense } from 'react';
import { GameClock } from '@ejm/ui/components/GameClock';

const Chessboard = lazy(() => import('@ejm/ui/components/Chessboard').then(module => ({ default: module.Chessboard })));
<Suspense fallback={null}>
  <Chessboard fen={fen} color="w" enabled={false} readOnly onMove={() => {}} />
</Suspense>
<GameClock value="5:03" label="White has 5 minutes and 3 seconds" running />
```

`Chessboard` accepts `fen`, `color: 'w' | 'b'`, `enabled`, `readOnly`, `showLegalMoves`, `getLegalMoves(square)`, `lastMove`, `premove`, `onMove` and `aria-label`. Like every public component it takes no `className` or `style`. It imports no chess rules. Optional destination rows are `{ square, capture? }`; the host computes them from its authoritative position. Hints default off and the host decides which modes permit them. Accepted positions come back through `fen`; a move callback is a proposal. The maintained board and its separately licensed piece assets keep their notices and source files. This package's board tests protect disposal, current callbacks and presentation behavior; a host must still test its move authority and legality adapter.

## Application pages and composition

Application page layout is opt-in and independent of the density of its surface. Use `Page variant="application"` with `SectionHead purpose="application"`. Native forms and content groups use the fixed public recipes below from `@ejm/ui/layout/Application` (also exported from `@ejm/ui`). The consumer keeps semantics, values, validation and events. The shared owner fixes spacing, widths and responsive geometry. `GameWorkspace`, `PlayerStrip`, `MovePairs` and `MoveHistory` apply the same boundary to board composition and move selection. See `src/layout/README.md` for the complete pattern.

All exports below accept content, refs, native events and semantic attributes without visual overrides. Form and game modules remain separate so account routes do not load replay UI.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| AppFlow, AppGroup | layout/Application.tsx | semantic content tags | Shared application rhythm and safe wrapping. |
| AppActions | layout/Application.tsx | semantic action or navigation region | Wrapping actions without consumer spacing choices. |
| AppHeading | layout/Application.tsx | native h2, h3 or h4 | Fixed type with heading levels and programmatic focus. |
| AppField, AppFieldset, AppForm | layout/Application.tsx | native form elements | Labels, legends, validation and submit handlers stay native. |
| AppSection | layout/Application.tsx | native section | Fixed reading measure for account and information pages. |
| AppPre | layout/Application.tsx | native pre | Wrapped source and records without document overflow. |
| GameWorkspace | layout/ApplicationGame.tsx | section and aside | Board and related state share fixed desktop and phone geometry. |
| PlayerStrip | layout/ApplicationGame.tsx | native content row | Player details align with the supplied clock. |
| BoardPlaceholder | layout/ApplicationGame.tsx | square loading region | Stable space while the lazy board loads. |
| MovePairs | layout/ApplicationGame.tsx | native ordered list | Accepted moves remain readable in a bounded region. |
| MoveHistory | layout/ApplicationGame.tsx | ordered list and shared Buttons | Current replay step, selection callback and list-only scrolling. |

Notes that apply across the shell and the forms:

- `Header` and `AppShell` take `themeControl?: ReactNode`. Omitted or `undefined` keeps `ThemeToggle`; `null` suppresses it. A replacement can be a shared `Button` whose behavior an external consumer script attaches. The default `ThemeToggle` still needs hydration to change the theme.
- `Disclosure` takes a `summary` and standard details props such as `open`, `name` and `onToggle`. Keep links and buttons in its content, outside the summary. It has ordinary disclosure keyboard behavior. Use `Menu` when you need arrow keys, typeahead, Escape, focus return or collision handling. `Collapse` remains the breakpoint-based sidebar component.
- Terminal components are not in this package. They live in `crates/ejm-tui` and `@ejm/ink`, on `packages/core/contract.json`.
