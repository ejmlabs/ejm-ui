# Components

Every component in `@ejm/ui`, the primitive under it (Radix or native) and why. `node packages/ui/scripts/check-components.mjs` fails when a component file is missing here, and when anything is named or classed card, panel or tile. The states each component renders are in `src/catalog/*.json`, merged into `src/catalog.json` by `node packages/ui/scripts/build-catalog.mjs`, which `scripts/parity.mjs` compares with `packages/core/contract.json`.

Rules every component follows: Tailwind utilities from `THEME.md` only, no literal colors, no new CSS files, `touch-target` (44px on coarse pointers) on every control, the global 2px focus ring, motion on transform and opacity only with the final state under reduced motion. Only menus, dialogs and toasts carry `shadow-float`. The gallery at `/components` shows each one in light and dark.

How to read the primitive column: **native** means a platform element does the job, **Radix** means a Radix primitive earns its weight (behavior that is hard to get right by hand), **core** means the framework-neutral model in `@ejm/core`.

## Controls and overlays (primitives workstream)

Source: `src/components/ui/`, copied-in shadcn/ui style on React 19 with `cn` and `class-variance-authority`. `components.json` records the shadcn setup (aliases, no CSS variables file: the theme is `styles.css`).

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| `Button` | `components/ui/button.tsx` | native `<button>`, Radix Slot for `asChild` | A button needs no library. Slot lets the same look wrap a router link. Variants primary (Sage, Ink text), secondary, ghost, link; sizes sm, md, lg; `arrow` slides 4px on hover. Pills stay on one line; the link variant wraps. Variant `danger` (red fill), size `icon` (square, needs an `aria-label`), `density="compact"` (see below). |
| `Input` | `components/ui/input.tsx` | native `<input>` | The platform gives labels, autofill, mobile keyboards and validation. `Input` only adds the control look. |
| `Textarea` | `components/ui/textarea.tsx` | native `<textarea>` | Same as Input. |
| `Select` | `components/ui/select.tsx` | native `<select>` | The native picker is better on phones, has full keyboard and typeahead support, and costs no JavaScript. Radix Select was rejected: it re-implements the same and adds about 10 KB gzip. |
| `Switch` | `components/ui/switch.tsx` | Radix Switch | A `role="switch"` button with form value, controlled and uncontrolled use. Native checkbox styling cannot do the thumb without extra markup. |
| `Checkbox` | `components/ui/checkbox.tsx` | Radix Checkbox | The indeterminate (mixed) state and a styled box. A native input cannot draw its own check without an image. |
| `Badge` | `components/ui/badge.tsx` | native `<span>` | Plain mono text with a slash or dot mark. Not a pill, not boxed. |
| `Separator` | `components/ui/separator.tsx` | native `<div>` | A hairline. `role="none"` when decorative. |
| `Tooltip` | `components/ui/tooltip.tsx` | Radix Tooltip | Hover and focus timing, Escape, collision handling and `aria-describedby`. Hard to hand-roll well. No shadow: it is a mark, not a surface. |
| `Tabs` | `components/ui/tabs.tsx` | core (`tabsReducer`) on native buttons | The same arrows, Home, End, wrap and roving tabindex as the Ink and Rust tabs. No Radix needed, so no extra weight. |
| `Dialog` | `components/ui/dialog.tsx` | native `<dialog>` | `showModal()` traps focus, makes the page inert, handles Escape and restores focus. The component adds the label, the backdrop click and an explicit focus return. Radix Dialog was rejected as the heavier path. |
| `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuLabel`, `MenuSeparator`, `MenuGroup` | `components/ui/menu.tsx` | Radix DropdownMenu | Roving focus, typeahead, Escape, focus return and collision-aware placement. A native popover has no menu keyboard model. |
| `Toast`, `ToastProvider` (with `useToast`) | `components/ui/toast.tsx` | Radix Toast | A polite live region per toast (`type="background"`), auto-dismiss that pauses on hover and focus, F8 to reach the stack, swipe to dismiss. |

## Contract primitives (primitives workstream)

These four are in `packages/core/contract.json` and exist on every target (web, Ink, Rust). Props and state names match the contract exactly.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| `Table` | `components/Table.tsx` | native `<table>` in a labelled, focusable scroll region | Real table semantics. States default, empty, loading, error; header and a hairline stay in every state. |
| `KeyHints` | `components/KeyHints.tsx` | native `<ul>` and `<kbd>` | One line of plain key and label pairs; what does not fit is clipped from the end. |
| `Prompt` | `components/Prompt.tsx` | native `<form>` and `<input>` | States idle, busy, error. Busy says "working" in a live region and ignores input. |
| `StateBlock`, `SkeletonBar` | `components/StateBlock.tsx` | native elements | States empty, loading, error: a word, one sentence, at most one action. Loading adds a skeleton that only fades. |

## Layout language (layout workstream)

Band, SectionHead, Rows, Row, Facts, Stat, Hero, ProductWindow, ProductShot, Illustration, Text, Rule, Status, Art. Add a row per component: name, file, primitive and why.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| Band | layout/Band.tsx | native `<section>` with `data-band` | A band is a data attribute and a utility, so tone needs no JavaScript. |
| Page | layout/Band.tsx | native `<div>` | The scaling content column; bands stay full-bleed around it. |
| SectionHead | layout/SectionHead.tsx | native heading and paragraph | Kicker, display heading and copy; the copy sits beside the heading by container query. |
| Rows | layout/Rows.tsx | native `<ul>` | Hairline list that replaces cards. |
| Row | layout/Rows.tsx | native `<li>` and `<a>` | The whole row is the link through its title; states per contract. |
| Facts | layout/Facts.tsx | native `<dl>` | Mono labels with hairlines; stacks by container width. |
| Fact | layout/Facts.tsx | native `<div>` with `<dt>` and `<dd>` | One label and value pair inside Facts. |
| Stat | layout/Stat.tsx | native `<p>` pair | Large numerals with a mono label and no box; states per contract. |
| Text | layout/Text.tsx | native span or element | Default, muted, strong and code variants per contract. |
| Rule | layout/Rule.tsx | native `<hr>` or labelled rule | A single hairline, never a frame. |
| Status | layout/Status.tsx | native `<span>` | Glyph and word, so status never relies on color. |
| Hero | layout/Hero.tsx | native `<section>` | Type-led opening on the page ground with an aside slot for windows. |
| Art | layout/Art.tsx | inline `<svg>` | Decorative symbol line art; draw-on is added after mount only. |
| ProductWindow | layout/ProductWindow.tsx | native `<figure>` | Floating window with elevation and the Simulated screen label unless live. |
| ProductStage | layout/ProductWindow.tsx | native `<div>` | Layers one to three windows; a tucked stack on narrow stages. |
| ProductShot | layout/ProductShot.tsx | native `<figure>` and `<picture>` | A real product capture: AVIF, WebP and PNG sources, explicit size, dark and light variants that follow the page theme, a hairline caption from the capture metadata. |
| Illustration | layout/Illustration.tsx | native `<figure>` | A drawn stand-in for a product screen (a React composition) with the always-visible label "Illustration of <product>, not a screenshot". Never a capture. |
| IllustrationLabel | layout/Illustration.tsx | native `<p>` | The one visible label "Illustration of <product>, not a screenshot", shared by Illustration and ProductShot. |

## Shell, hooks and layouts (shell workstream)

Header, Footer, ThemeToggle, ExternalLink, SiteLayout, DocsLayout, AppShell, SkipLink, Collapse, Reveal, Stagger. Add a row per component.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| SiteLayout | shell/SiteLayout.tsx | native landmarks | Skip link, header, `main#main` and footer for every site. |
| Header | shell/Header.tsx | native `<header>`, `<nav>` and `<details>` | Logo, nav and the theme toggle last; the phone menu is a disclosure. |
| Footer | shell/Footer.tsx | native `<footer>` | Ink band with link columns and the privacy note slot. |
| ThemeToggle | shell/ThemeToggle.tsx | native `<button>` | Far right of the header; its name states the action. |
| ExternalLink | shell/ExternalLink.tsx | native `<a>` | `rel="external noopener"` with an arrow and a screen reader note. |
| SkipLink | shell/SkipLink.tsx | native `<a>` | First focusable element; targets `#main`. |
| DocsLayout | shell/DocsLayout.tsx | native `<details>` collapses | Sidebar, 68ch reading column and contents; both side parts fold on narrow screens. |
| AppShell | shell/AppShell.tsx | native landmarks | Top bar, side nav and content for applications. |
| Collapse | shell/Collapse.tsx | native `<details>` | Shared disclosure behind the docs sidebars. |
| LinkProvider | shell/link.tsx | React context | Lets a site pass its router link, so the shell stays router-agnostic. |

## Docs components (docs workstream)

CodeBlock, CodeTabs, Callout, ParamTable, Pager, SidebarFilter, Contents. Add a row per component.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| DocsSidebar | docs/DocsSidebar.tsx | native `<nav>` and lists | Grouped docs navigation with `aria-current`; hairlines only. |
| SidebarFilter | docs/SidebarFilter.tsx | native `<input>` | Filters entries and announces the result count. |
| Contents | docs/Contents.tsx | native `<nav>` and links | On this page; works with no script, scroll-aware with it. |
| Heading | docs/Heading.tsx | native heading with anchor | Heading with an id and a native `#` permalink. |
| CodeBlock | docs/CodeBlock.tsx | native `<pre>` and `<button>` | Language label, copy with a live confirmation, own scroll region. |
| CodeTabs | docs/CodeTabs.tsx | core tabs model | Arrow-key language tabs; all panels show stacked without script. |
| Callout | docs/Callout.tsx | native `<aside>` | Note, tip or warning with a text label first and a left rule, no box. |
| ParamTable | docs/ParamTable.tsx | native `<table>` | Mono names and tabular numerals, scrolling inside its own region. |
| Pager | docs/Pager.tsx | native `<nav>` and links | Previous and next links that name the adjacent pages. |
| DocHead | docs/model.tsx | native header | Page title and lead from the content model. |
| DocBody | docs/model.tsx | native article content | Renders a page's blocks from the content model. |

## App (app workstream)

All in `packages/ui/src/app`. Every part takes `state` default, empty, loading or error with one sentence and at most one action, built on `StateBlock`, `SkeletonBar` and `Table`.

| Component | File | Primitive | Why |
| --- | --- | --- | --- |
| `Dashboard` | `app/Dashboard.tsx` | `section`, `Stat`, `Table`, container queries | Figures, a chart, a hairline table and an activity feed with no boxes, one column on a phone and one editorial row on an ultrawide. Loading speaks once and holds placeholders `inert`. |
| `ChartLine`, `ChartArea` | `app/ChartLine.tsx` | inline SVG with `role="img"` | Dependency-free. Six hue roles plus marker shapes, dash patterns and end labels, so values never rely on color alone. |
| `ChartBar` | `app/ChartBar.tsx` | inline SVG with `role="img"` | Grouped bars with a fill pattern per series and value labels where they fit. |
| `ChartFrame` | `app/ChartFrame.tsx` | `div role="group"`, `figure`, native `details` | Shared heading, legend, "View as table" disclosure (always in the DOM) and states for the charts. |
| `Legend` | `app/Legend.tsx` | native `ul` | A text legend naming every series next to its marker and dash or pattern. |
| `XAxis`, `YAxis` | `app/axes.tsx` | SVG `g` and `text` | Hairline gridlines and tabular mono labels, thinned on narrow charts. |
| `Marker`, `BarPatterns` | `app/marks.tsx` | SVG shapes and `pattern` | The non-color encodings: six marker shapes and six bar fill patterns. |
| `ActivityList` | `app/ActivityList.tsx` | native `ul`, `time`, `Status` | Hairline rows with relative times and a status glyph and word. |

## Compact density (applications)

`Button`, `Switch`, `Tooltip`, `Badge`, `StateBlock` and `Table` take `density="compact"` (default `comfortable`, every default is unchanged). Compact is for dense application UI such as the IDE: the 5px `rounded-compact` radius and 13px type; a button is 32px tall on a fine pointer whatever its `size` (`icon` is 32px square); a switch has a 28 by 16px track with a 32px target; a tooltip sets 13px mono text; a badge is 12px; a state block uses less space; a table has tighter rows. On a coarse pointer (touch) a compact control is still 44px: `touch-target` makes it 44px on coarse pointers and `compact-target` makes it 32px on fine ones (measured in Chrome for a button, an icon button and a switch). `Table` also takes `truncate={false}` to show every character of a cell. `Button` gains `variant="danger"` and `size="icon"` in both densities.
