# Docs parts

Everything a documentation page needs, exported from `@ejm/ui`. They sit inside `DocsLayout` (sidebar, 68ch reading column, contents), which comes from `packages/ui/src/shell`. All of them are containerless: hairlines, tone and type, no boxes. Code is the one object with a flat ground (`bg-ui-editor`), because the `syn-*` colors are gated at 4.5:1 on that ground.

Every part renders complete, usable HTML on the server. Script only adds to it. A shared `useHydrated()` is false on the server and during hydration, so the server HTML and the first client render match, and controls that need script appear after.

| Part | Without script | With script |
| --- | --- | --- |
| `DocsSidebar` | Every page link, grouped, current page has `aria-current="page"`. The filter is in the HTML but `hidden`. | The filter shows. Typing narrows the entries and says "N results" in a live region. Escape clears it. |
| `Contents` | Links to heading ids. They jump natively. | The heading being read gets `aria-current="true"`. Activating an entry focuses the heading, scrolls (smoothly unless reduced motion), updates the address and folds a phone disclosure. |
| `Heading` | An `h2` or `h3` with an `id` and a plain `#` link to itself. | Same. It takes focus from `Contents`. |
| `CodeBlock` | Highlighted code in a labelled, focusable scroll region. No copy button. | A Copy button. The label reads "Copied" and a `role="status"` region says "Copied to clipboard". If the clipboard is blocked the code is selected and the label reads "Copy failed". |
| `CodeTabs` | Every panel stacked, each under its own label. | The WAI-ARIA tabs pattern. Only the selected panel shows. A language chosen in one group selects it in every group that has it. |
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

`DocsSidebar` and `Pager` render their links with the site's link component (`LinkProvider`, which `SiteLayout` and `DocsLayout` set from `linkComponent`), so a docs page navigates without a reload on an ssg site; without a provider they are plain anchors.

## Markup and accessibility

- `DocsSidebar`: `nav` named "Documentation", a labelled `ul` per group, links with `aria-current="page"`. Entries are at least 44px high on touch screens. The filter input has a visually hidden label and a `role="status"` count that is empty until you type.
- `Contents`: `nav` named "On this page". A visible label shows from `xl`, where the layout stops folding it into a disclosure. The current entry is marked with `aria-current="true"` and a stronger rule and tone, never color alone.
- `CodeTabs`: `role="tablist"` with an `aria-label`, `role="tab"` buttons with `aria-selected` and `aria-controls`, `role="tabpanel"` with `aria-labelledby`. Roving tabindex: only the selected tab is in the tab order. Left and Right move and wrap, Home and End jump, and selection follows focus. The model is `createTabsState` and `tabsReducer` from `@ejm/core`.
- `CodeBlock`: a `figure` with a label row. The `pre` is `role="region"`, `tabindex="0"` and `aria-label="TypeScript code"`, so a keyboard user can scroll it on a narrow screen. Copy uses `createCopy` from `@ejm/core`. The text copied is `pre.textContent`, so spans never leak into the clipboard.
- `Callout`: `role="note"`, the word (Note, Tip, Warning, from the contract) first, a left rule colored by kind. On a Sage band every status color is Ink, and the word still reads.
- `ParamTable`: a native `table` with a `caption`, `th scope="col"` and `th scope="row"` (the mono name). Figures use `tabular-nums`.
- `Pager`: `nav` named "Previous and next pages", links with `rel="prev"` and `rel="next"` that show the title of the page they go to.

## Syntax colors

`tokenize(code, lang)` (from `@ejm/ui/docs`, or `@ejm/ui/docs/highlight-all`) splits code into runs with a role (keyword, string, comment, number, type, function, macro, property, constant). It runs on the server, so highlighted code needs no script, and joining the runs returns the input exactly. Roles map to `text-syn-*` window colors. Unknown languages show as plain text. The languages are TypeScript and JavaScript, CSS, HTML, JSON, Rust and shell, plus Python, PowerShell and TOML, which live in their own module (about 1 KB gzip) so a page that only needs the core set imports `tokenize` from `@ejm/ui/docs/highlight` and does not carry them (the product views of `@ejm/demos` do). It is a few regular expressions per language, not a parser: it is right for documentation snippets, not for arbitrary code.

## Content model

A documentation set is plain data (`DocSet`, `DocPage`, `DocSection`, `DocBlock` in `model.tsx`), no MDX and no build step. Blocks are `p`, `list`, `code`, `tabs`, `callout`, `params`, `h3` and `node` (any React). `DocHead` and `DocBody` render a page. `navGroups`, `pageContents` and `pagerFor` derive the sidebar, the contents list and the previous and next links from the same data, so they cannot disagree with the page. The gallery's own docs are the worked example: `apps/gallery/src/content`.

## Tests

`npx vitest run packages/ui/src/docs apps/gallery/src/content` covers: tokenizer round trip; copy text, announcement and failure; tabs roles, arrows, Home, End, wrapping, roving tabindex, no-script stacking and cross-group sync; filter results, announcement and Escape; contents scroll marking and focus on activation; callout words; table region; pager rel and names; and a server-render check of every docs page (links resolve, one h1, no skipped levels, every tab panel and the filter input in the HTML).

## Docs pages and the JavaScript budget

The docs parts plus a guide's text cost about 9 KB and up to 8 KB gzip, which a route cannot spare out of 95 KB. Keep the prose in the server HTML with `<Static>` from `@ejm/ssg`, and hydrate only what is interactive (the sidebar filter, copy buttons):

```tsx
<DocsLayout sidebar={<DocsSidebar groups={groups} current={path} />} contents={<Static render={server ? () => <Contents items={items} /> : undefined} />}>
  <Static render={server ? () => <Guide /> : undefined} />
  <Pager prev={prev} next={next} />
</DocsLayout>
// const server = import.meta.env.SSR || import.meta.env.DEV
```

Everything inside `Static` is plain HTML with no script (a `CodeBlock` there highlights on the server but has no copy button), and its links still navigate without a reload. A `Static` part is not hydrated, so `Contents` loses its scroll-spy `aria-current`; put it outside `Static` if you want that.
