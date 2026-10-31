# Docs parts

Everything a documentation page needs, exported from `@ejm/ui/docs`. They sit inside `DocsLayout` (sidebar, 68ch reading column, contents), which comes from `packages/ui/src/shell`. All of them are containerless: hairlines, tone and type, no boxes. Code is the one object with a flat ground (`bg-ui-editor`), because the `syn-*` colors are gated at 4.5:1 on that ground.

No part accepts `className` or `style`: the kit owns every class, and `closed-api.test.ts` fails when an export does. The parts follow the one control system. Color changes are instant, focus is the global outline (inside the row where a scroller clips it), type is `text-base`, `text-sm` or `text-meta`, and inline `code` keeps the base style (mono, a step smaller, no fill).

Every part renders complete, usable HTML on the server. Script only adds to it. A shared `useHydrated()` is false on the server and during hydration, so the server HTML and the first client render match, and controls that need script appear after.

| Part | Without script | With script |
| --- | --- | --- |
| `DocsSidebar` | Every page link, grouped, current page has `aria-current="page"`. The filter is in the HTML but `hidden`. | The filter shows. Typing narrows the entries and says "N results" in a live region. Escape clears it. |
| `Contents` | Links to heading ids. They jump natively. | The heading being read gets `aria-current="true"`. Activating an entry first folds a phone disclosure, then focuses and scrolls to the heading (smoothly unless reduced motion) and updates the address. |
| `Heading` | An `h2` or `h3` with an `id` and a plain `#` link to itself. | Same. It takes focus from `Contents`. |
| `CodeBlock` | Highlighted code in a labelled, focusable scroll region. No copy button. | A Copy button. The label reads "Copied" and a `role="status"` region says "Copied to clipboard". If the clipboard is blocked the code is selected and the label reads "Copy failed". |
| `CodeTabs` | Every panel stacked, each under its own label. | The WAI-ARIA tabs pattern, drawn like `Tabs`: 44px triggers (32px on a compact surface), tone on hover, the current tab 600 weight and underlined. Only the selected panel shows. A language chosen in one group selects it in every group that has it. |
| `Callout` | Same. | Same. |
| `ParamTable` | Same. A labelled, focusable region that scrolls inside itself. | Same. |
| `Pager` | Same. | Same. |

## API

```tsx
<DocsSidebar groups={[{ title: 'Start', items: [{ label: 'Getting started', href: '/docs' }] }]} current="/docs" filter />
<Contents items={[{ id: 'install', label: 'Install', level: 2 }]} />
<Heading id="install">Install</Heading>             // level 2; level={3} for a subsection
<CodeBlock lang="ts" code="const a = 1;" />          // lang: ts tsx js jsx css html json rust sh python (py) powershell (ps1, pwsh) toml; label, copyable, quietLabel
<CodeTabs label="Language" tabs={[{ label: 'CSS', lang: 'css', code: '...' }, { label: 'Rust', lang: 'rust', code: '...' }]} />
<Callout kind="warning">Back up the file first.</Callout>      // note | tip | warning
<ParamTable caption="Button props" rows={[{ name: 'size', type: "'sm' | 'md'", default: "'md'", description: '...' }]} labels={{ name: 'Prop' }} />
<Pager prev={{ href: '/docs', title: 'Getting started' }} next={{ href: '/docs/theming', title: 'Theming' }} />
<SidebarFilter value={q} onChange={setQ} status="2 results" />   // the filter box alone, for your own list
```

`ParamTable` leaves out the Type and Default columns when no row uses them, and `labels` renames the headings when the table is not about props. `name` is a `ReactNode`, so a name can be a link (give such a row a `key`). For a table of prose, add `columns` (`{ key, label, mono? }`, between Default and the description) and put each row's content in `cells`:

```tsx
<ParamTable caption="Gates" labels={{ name: 'Gate', description: 'Fails on' }} columns={[{ key: 'command', label: 'Command', mono: true }]}
  rows={[{ key: 'contrast', name: <a href="/docs/contrast">Contrast</a>, cells: { command: 'node scripts/contrast.mjs' }, description: 'Text under 4.5:1.' }]} />
```

`DocsSidebar` and `Pager` render their links with the site's link component (`LinkProvider`, set by `SiteLayout` from `linkComponent`), so a docs page navigates without a reload on an ssg site; without a provider they are plain anchors.

## Specimens

Blocks for a documentation page that has to show the system itself. They are closed like every part (no `className` or `style`), take children or token names, and write every class inside the kit, so a docs page needs no layout or color of its own and passes the design guard. The gallery's `/components/`, `/app/`, `/shell/`, `/tokens/` and `/hooks/` pages are built from them.

| Part | What it shows |
| --- | --- |
| `ThemePair` | Its children once under the light theme and once under the dark theme, each in a labelled group on the Paper ground (`data-theme` and `data-band="paper"`), side by side from 56rem of the pair's own width and stacked below. State and ids are per pane. |
| `DensityPair` | Its children once on a comfortable surface and once on a compact one (`DensityProvider`), side by side the same way, labelled "Comfortable, for sites" and "Compact, for applications". |
| `ColorSwatches` | `label` and `colors`, a list of token names (`SwatchColor`: `hue-1` to `hue-6`, the brand colors and the status colors). Each is a swatch with its name in mono under it. Pass `HUES` from `@ejm/tokens` for the chart roles. Not for Sage, where the hues are not defined. |
| `TypeScaleSample` | The six sizes (`display`, `title`, `heading`, `lead`, `body`, `meta`) and tabular figures, one hairline row each with the token name above the sample. |
| `ElevationSample` | `shadow-rest`, `shadow-raised` and `shadow-float`, each on an unfilled window-shaped outline (`rounded-window`), because only windows, menus and overlays carry a shadow and a filled box would be a card. |
| `RadiusSample` | `rounded-control`, `rounded-pill` and `rounded-window` as outlines. A radius is an edge, so there is no fill. |
| `ResizableSample` | A hairline region the reader can drag wider or narrower. It takes the `ref` that `useContainerQuery` returns. |
| `DrawOnSample` | A three-path line drawing with `pathLength="1"` paths. It takes the `ref` that `useDrawOn` returns. |

```tsx
import { HUES } from '@ejm/tokens';
import { ColorSwatches, ThemePair, TypeScaleSample } from '@ejm/ui';

<ThemePair><ControlSet /></ThemePair>
<ColorSwatches label="Six hue roles" colors={HUES} />
<TypeScaleSample />
```

## Markup and accessibility

- `DocsSidebar`: `nav` named "Documentation", a labelled `ul` per group, links with `aria-current="page"`. Entries are 32px tall with a mouse and 44px on touch screens. The filter is an `Input` (44px) with a visually hidden label and a `role="status"` count that is empty until you type.
- `Contents`: `nav` named "On this page". A visible label shows from `xl`, where the layout stops folding it into a disclosure. The current entry is marked with `aria-current="true"` and a stronger rule and tone, never color alone.
- `DocsSidebar` and `Contents` share one link look (`nav-link.ts`): a hairline down the left edge, `hover:bg-tone`, and for the current entry the strong rule, the tone and the strong text.
- `CodeTabs`: `role="tablist"` with an `aria-label`, `role="tab"` buttons with `aria-selected` and `aria-controls`, `role="tabpanel"` with `aria-labelledby`. Roving tabindex: only the selected tab is in the tab order. Left and Right move and wrap, Home and End jump, and selection follows focus. The model is `createTabsState` and `tabsReducer` from `@ejm/core`.
- `CodeBlock`: a `figure` with a label row. Inside `CodeTabs` or `CodeTabsFrame` it drops its own margins (and, under the tab list, its top hairline): the frame sets `CodeGroupContext`, so no figure needs spacing of its own. The `pre` is `role="region"`, `tabindex="0"` and `aria-label="TypeScript code"`, so a keyboard user can scroll it on a narrow screen. Copy uses `createCopy` from `@ejm/core`. The text copied is `pre.textContent`, so spans never leak into the clipboard.
- `Callout`: `role="note"`, the word (Note, Tip, Warning, from the contract) first in the meta face, a left rule colored by kind. On a Sage band every status color is Ink, and the word still reads.
- `ParamTable` and `DocTable`: a native `table` with a `caption`, `th scope="col"` and `th scope="row"` (the mono name in `ParamTable`). Rows are hairlines with `py-4` cells, or `py-2` when the surface is compact (`AppShell`, `Page variant="application"`). Figures use `tabular-nums`.
- `Pager`: `nav` named "Previous and next pages", links with `rel="prev"` and `rel="next"` that show the title of the page they go to.

## Syntax colors

`tokenize(code, lang)` (from `@ejm/ui/docs`, or `@ejm/ui/docs/highlight-all`) splits code into runs with a role (keyword, string, comment, number, type, function, macro, property, constant). It runs on the server, so highlighted code needs no script, and joining the runs returns the input exactly. Roles map to `text-syn-*` window colors. Unknown languages show as plain text. The languages are TypeScript and JavaScript, CSS, HTML, JSON, Rust and shell, plus Python, PowerShell and TOML, which live in their own module (about 1 KB gzip) so a page that only needs the core set imports `tokenize` from `@ejm/ui/docs/highlight` and does not carry them (the product views of `@ejm/demos` do). It is a few regular expressions per language, not a parser: it is right for documentation snippets, not for arbitrary code.

## Content model

A documentation set is plain data (`DocSet`, `DocPage`, `DocSection`, `DocBlock` in `model.tsx`), no MDX and no build step. Blocks are `p`, `list`, `code`, `tabs`, `callout`, `params`, `table`, `h3` and `node` (any React). `DocHead` and `DocBody` render a page. `navGroups`, `pageContents` and `pagerFor` derive the sidebar, the contents list and the previous and next links from the same data, so they cannot disagree with the page. The gallery's own docs are the worked example: `apps/gallery/src/content`.

## Tests

`npx vitest run packages/ui/src/docs apps/gallery/src/content` covers: tokenizer round trip; copy text, announcement and failure; tabs roles, arrows, Home, End, wrapping, roving tabindex, no-script stacking and cross-group sync; filter results, announcement and Escape; contents scroll marking and focus on activation; callout words; table region; pager rel and names; the one-system checks in `system.test.tsx` (no retired utilities, a stray `className` ignored, one link look for the sidebar and contents, row padding by density); and a server-render check of every docs page (links resolve, one h1, no skipped levels, every tab panel and the filter input in the HTML).

## Compiled guides

Product sites compile their Markdown with the Node-only `@ejm/site/docs` entry.
It returns `SerializedDocPage`, a JSON model with nested lists, arbitrary tables,
callouts, code labels and language tabs. `splitDoc` turns it into `FullDocPage`
and `ClientDocPage`: prose stays in the server HTML, while code and navigation
remain live. This keeps the guide text out of the JavaScript.
The compiler never enters a browser bundle.

`DocsPage` owns the reading frame. It uses the same `DocsLayout`, `DocsSidebar`,
`Contents`, `DocHead`, `Prose`, code controls and `Pager` as manually
authored guides. `DocCodeBlock` renders compiled code and tabs without importing
the prose mapper or syntax tokenizer. It loads the tab frame on demand in the
browser, so a page with only plain code blocks does not request tab controls.
The server awaits that same frame before rendering, keeping every panel in the
initial HTML. A local Suspense boundary retains those panels while the browser
loads their controls during hydration. No consumer option or new renderer is
needed. `DocProse` and `DocDataBlock` render serialized blocks through the same shared
code, callout, heading and table parts. `DocTable` preserves every Markdown column, with
a caption and a focusable scroll region. `DocBlocks` renders React-authored
blocks; `DocBody` now uses it with the same `Prose` reading surface. `CodeSource` is the
labelled preformatted region shared by plain and highlighted code.

A build script writes separate `client` and `full` JSON files. A route can then
keep the full data and prose renderer on the server:

```tsx
import { Static } from '@ejm/ssg';
import { DocsPage, docNavigation, type ClientDocPage, type FullDocPage, type DocsPageProps, type DocProseRun } from '@ejm/ui/docs';
import clientData from './generated/guide.json';
import pages from './generated/docs-nav.json';

const client = clientData as ClientDocPage;
const server = import.meta.env.SSR || import.meta.env.DEV;
let renderProse: DocsPageProps['renderProse'];
let renderCode: DocsPageProps['renderCode'];
if (server) {
  const [{ default: fullData }, { DocProse }, { CodeHighlight }] = await Promise.all([
    import('./generated/guide-full.json'),
    import('@ejm/ui/docs/DocProse'),
    import('@ejm/ui/docs/CodeHighlight'),
  ]);
  const full = fullData as FullDocPage;
  renderCode = (block) => <CodeHighlight code={block.code} lang={block.lang} label={block.label} />;
  renderProse = (section: number, item: number) => (
    <DocProse section={full.sections[section]!}
      blocks={(full.sections[section]!.items[item] as DocProseRun).blocks}
      first={item === 0} />
  );
}

export function Guide() {
  return <DocsPage page={client} {...docNavigation(pages, '/docs/guide/')}
    staticBoundary={Static} renderProse={renderProse} renderCode={renderCode} />;
}
```

`pages` is consumer-owned data with `{ href, title, group, label? }` entries in
reading order. `docNavigation` derives sidebar groups, the current href and the
previous/next links. It keeps the supplied paths intact, including trailing
slashes, and rejects a current page absent from the list. `DocsPage` also takes
`filter` and `sidebarLabel`. It inherits the surrounding internal-link adapter.

The build-only `splitDoc(...).requiresRich` flag tells a generated route whether
code appears inside a list or callout. For those routes, import the public rich
renderer and pass it to the frame on both server and client:

```tsx
import { DocDataBlock } from '@ejm/ui/docs/DocDataBlock';

const renderBlock: DocsPageProps['renderBlock'] = (block, renderCode) => (
  <DocDataBlock block={block} renderCode={renderCode} />
);
// Pass renderBlock to DocsPage along with the other props above.
```

Generate that import only when `requiresRich` is true. The default frame handles
code and tabs itself, so simple guides do not download the prose renderer.
Missing `renderBlock` for a rich block raises a clear error instead of hiding
content. Keep nested prose live with its controls.

`staticBoundary` accepts a component with `{ render?: () => ReactNode }`, such
as `@ejm/ssg`'s `Static`. It wraps prose runs and highlighted source only. Code figures, copy controls
and tabs remain live. `CodeBlockFrame` and `CodeTabsFrame` share the same
interaction as `CodeBlock` and `CodeTabs`, while `CodeHighlight` keeps the
tokenizer on the server when used through `renderCode`. Omit `staticBoundary` to
render prose normally from `renderProse`, for example in a preview. Keep `renderProse` and
full data absent from a production browser build. Never put the whole page,
sidebar, contents or controls inside `Static`: those parts need hydration for
filtering, scroll tracking, copy feedback and keyboard tabs.

Without scripts, the server output still contains every guide paragraph and
code tab, plus native links and disclosures. Copy buttons appear after
hydration and use the existing shared copy lifecycle. Static prose links follow
the `Static` boundary's router behavior. With the current SSG implementation,
client navigation into a page with static prose may reload to fetch its HTML.
