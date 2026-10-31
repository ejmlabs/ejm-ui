# Layout

The containerless language as components. Group with display type, space, hairline rows and full-bleed bands. There is no card, panel or tile here, and only `ProductWindow` has a shadow (and `ProductShot` when you ask for `elevation`). Import from `@ejm/ui`. Colors and sizes come only from `packages/ui/THEME.md`.

No component here takes `className`, `style` or raw HTML. The kit owns every class. `packages/ui/src/closed-api.test.ts` fails when an exported component accepts one.

## Build a page section with `Section`

`Section` is the way to build the parts of a page. You give it words; the structure is derived.

```tsx
<Hero title="Small experiments" />
<Section title="Projects" kicker="01 / Projects" intro={<p>What we build.</p>} actions={<Button asChild><a href="/projects/">All projects</a></Button>}>
  <Rows aria-label="Projects">...</Rows>
  <Section title="Terminal">
    <p>A subsection.</p>
  </Section>
</Section>
<Section title="Why" emphasis>...</Section>
```

| Prop | Use |
| --- | --- |
| `title` | The heading. Required. |
| `kicker` | Mono line above the title, for example "01 / Projects". |
| `intro` | Lead copy beside the title from 48rem of the section's own width, below it when narrow. The same recipe as the children of `SectionHead`. |
| `actions` | Buttons or links, after the intro. |
| `emphasis` | Takes the Sage ground instead of the alternating one. Ignored in a nested section. |
| `id` | Names the heading. A generated id is used when it is omitted, and the `section` always carries `aria-labelledby` pointing at it. |
| `children` | The body. |

What is derived, so you never choose it:

- **Level.** The title is an `h2` at the top of a page and one level deeper inside each `Section`, never past `h6`. `Hero` owns the one `h1`. A `SectionHead` placed in the body without `as` takes the same level.
- **Ground.** A top-level section is a full-bleed band with `data-band="auto"`. Among its `data-band="auto"` siblings the odd ones are Mist and the even ones Paper in both themes, so the first section after the Paper hero is Mist. `emphasis` makes it Sage. The selectors come from `packages/tokens` (`:nth-child(odd of [data-band="auto"])`); a browser without that selector leaves the page ground, which still reads.
- **Spacing.** The body starts `mt-16` below the opening and its direct children form a grid with `gap-16`. Bare paragraphs and lists placed directly in it keep the reading measure; a part with its own recipe, such as `Rows`, sizes itself.
- **Nesting.** A `Section` inside a `Section` is a subsection: no band, its title in heading type one level down, an optional kicker, and a body in `mt-6 grid gap-6`.

Keep the sections that make up one page as siblings, so they alternate. Heading levels and ids are never typed by hand.

## Lower-level parts

`Band`, `SectionHead` and `SectionBody` are the path kept for existing pages. New work uses `Section`.

| Component | Props | Use it for | Accessibility |
| --- | --- | --- | --- |
| `Band` | `tone` paper, mist, sage or ink (default paper); `as`; `column` (default true, wraps children in `Page`); `flush` (no vertical rhythm); native element attributes | A full-bleed section with its own ground. Children read correctly on every band. | Pass `aria-labelledby` to name a section. |
| `Page` | `variant` default or application; div attributes | The content column. The application variant adds 32px vertical padding below 640px, 48px from 640px, shared content gaps, and provides compact density to everything inside it. The default adds no vertical padding or layout. | None needed. |
| `SectionHead` | `kicker` ("01 / Projects"); `title`; `children` (supporting copy); `purpose` page, section or application; `as` h1 to h6; `id` | The opening of a section. The page purpose uses the display heading, section uses title type, and both place lead copy beside the heading from 48rem of their own width. Application stacks title and body-sized copy. The default purpose is section. Without `as` the heading takes the level of its context (h2 outside a `Section`). | Keep heading levels in order. Give the heading an `id` and point `aria-labelledby` at it. Do not wrap this header in another header. |

## Parts

| Component | Props | Use it for | Accessibility |
| --- | --- | --- | --- |
| `Rows` | `size` heading or title; `aria-label` | A hairline list that replaces cards. Rows go in columns from 42rem of the list's own width. The list reaches 1rem past the column so the tone and hairlines meet the gutter and text stays on the column edge, on the same x as the section heading. Use it inside `Page` or give the parent a gutter. | A `ul`. Give it a label. |
| `Row` | `title`; `description`; `meta` (mono); `href`; `external`; `download` (true or a file name); `state` default, selected, disabled or focused | One row, `py-4` (`py-2` in a compact surface). With `href` the whole row is the link through its title, so the link name is the title alone. Hover shifts the tone (an opacity layer behind the row, so the text never moves) and slides the arrow (transform). `external` adds `rel="external"`, the diagonal arrow and "opens another site" for screen readers (so the link name is then "title, opens another site"). `download` passes through to the anchor. | `selected` sets `aria-current` and shows the selected glyph. `focused` shows the focused glyph and a ring (real focus uses `:focus-visible`). `disabled` renders no link and adds the contract word "(disabled)". Row targets are at least 44px on coarse pointers. |
| `Facts` and `Fact` | `Fact label`, children | Mono labels, values and hairlines, `py-4` per row (`py-2` in a compact surface). Stacks below 28rem of its own width, so it never clips in a narrow column. | A `dl`. |
| `Stat` | `figure`; `label`; `state` default, loading, error or empty; `message`; `size` stat (default) or title | A large figure in display type with a mono label and a hairline above. No box. `stat` is the display size and `title` the smaller one for dense compositions. Loading, error and empty replace the figure with the contract word or your message. | Loading is a polite status. Error shows the error glyph and a word. |
| `Text` | `variant` default, muted, strong or code; `as`; native element attributes | A run of text with a variant. `code` renders a `code` element with the base inline code style: mono, a step smaller, no fill. | On Sage, muted is already Ink: use size and weight for hierarchy. |
| `Prose` | `as` div or article; native element attributes | Plain reading content in the shared rhythm: measure, paragraph gap, lists and links. Inline code takes the base style. | Compose semantic headings. |
| `Rule` | `label` | One hairline. With `label` the mono label sits on the line. | An `hr`, or a labelled separator. |
| `Status` | `status` ok, warn, error, info or pending; `label` | A glyph and a word together, from the contract. | Never color alone: both are always present. |
| `Hero` | `eyebrow`; `title` (h1); `children` (copy); `actions`; `aside`; `art` (inline svg markup); `drawOn`; `titleId`; `footnote` | The type-led hero on the page ground. It renders its own Paper band and column. No panel. Headline across the full column, copy and actions to the left, `aside` to the right from 64rem and below the copy when narrow. Use a real `ProductShot` or a clearly labelled component example in this slot. Staged entrance with `--ejm-i` 0 to 4, so it ends 880ms after load: the eyebrow, headline and copy only slide (`animate-slide`, transform only), because the headline is the page's Largest Contentful Paint and a fade would delay it; the actions and then the aside fade and rise (`animate-enter`). Nothing is hidden without scripts and everything is final under reduced motion. | One h1. `titleId` names the region. `footnote` follows the actions. The entrance is part of the shared recipe and cannot be disabled by a site. Keep the Hero outside a server-only Static boundary. `art` is aria-hidden. |
| `Art` | `svg`; `drawOn` | Decorative symbol line art from `packages/ui/src/art/inline`. Import with `?raw`. With `drawOn` the lines draw on once when the art scrolls into view (`useDrawOn`), so art in view at load draws at once. The `draw-on` class is added after hydration only. | Always aria-hidden. |
| `ProductWindow` | `title`; `meta`; `elevation` rest, raised or float; `live`; `label`; `labelSide` | A floating product window with a title bar, three dots and a body. It keeps the page theme inside any band. Without `live` it shows the visible "Simulated screen" label (in the bar when narrow, in the footer when wide). The only layout part with a shadow. Compose its body from layout parts and only words that appear in the product README. | Hidden from assistive tech by default (decoration). Pass `label` for an interactive window and it becomes a named group. Pass `live` only for the demo islands. |
| `ProductStage` | children: one to three `ProductWindow` | Layers the windows with offset and overlap from 28rem of its own width, and tucks them into an overlapping stack below that. Window text scales with the stage and never drops under 13px. | The stage adds no semantics. |
| `ProductShot` | `shot` (from `getShot` in `@ejm/shots`); `alt` (required); `priority`; `frame`; `elevation`; `caption` (text, or `false`); `sizes` | A real capture of the real product: a figure with AVIF, WebP and PNG sources, explicit width and height, and a hairline caption naming the product, version or commit and capture date. Dark and light captures follow the page theme. Not labelled "Simulated": it is real. | Write `alt` to say what the shot shows. Lazy by default; `priority` is for the hero: eager, `fetchpriority="high"`, and the head needs `shotPreloadLinks(shot)`. `frame` draws the page's own terminal bar (dots and title) around terminal captures only and throws for a window capture. A real app window keeps its own edge, so there is no shadow unless you ask with `elevation` (rest, raised or float) for a frameless capture. |
| `Illustration` | `product`; `caption`; children (a React composition) | A drawn stand-in for a product screen where a real capture is impossible, for example the `IdeView` from `@ejm/demos`. Always shows the visible label "Illustration of <product>, not a screenshot" under it. | A figure named by that label. Never use it for a product that can be captured. `ProductShot` of a shot whose metadata says `kind: "illustration"` shows the same label and prefixes the alt text. |

## Rules of thumb

- A page has one `Hero` (or `SectionHead purpose="page"`) at the top and a `Section` for each part. The shared components own heading level, size, ground and spacing.
- Do not put a `Row` list inside a bordered or filled box. If you want a box, you want a band.
- Use `Stat` for numbers that matter and `Facts` for specifications. Do not use either as a card grid.
- Product windows are objects, not groups: never wrap ordinary content in one.
- Inline code is plain `code`: the base style gives it the mono face and no fill. Do not add a chip.

## Application pages and forms

Use `Page variant="application"` for account, history, list and play pages.
It keeps the same column and gutters as `Page`, with 32px vertical padding
below 640px and 48px from 640px. Its direct children form a grid separated by
`gap-content`, and every control inside it takes the compact density. `SectionHead purpose="application"` keeps title, optional kicker and
body-sized support copy aligned, separated by `gap-field`. The page enters once
with the shared transform-only slide, and stays still under reduced motion. Without `as`
a heading takes the level of its context.

Import the fixed application recipes from `@ejm/ui/layout/Application`.
They accept content, IDs, events, refs and accessible state. They do not accept
`className`, `style`, raw HTML or consumer spacing and width settings.

| Export | Use |
| --- | --- |
| `AppFlow`, `AppGroup` | Full-width application content or a related group, with fixed shared spacing. `as` changes semantics only. |
| `AppActions` | Wrapping actions, optionally a named navigation region. |
| `AppHeading` | Secondary heading with an independent h2, h3 or h4 level, ref and focus attributes. |
| `AppField`, `AppFieldset`, `AppForm` | Existing native labels, legends, validation and form handlers in the shared field rhythm. Forms have one reading width. |
| `AppSection` | Account and information sections at the shared reading measure. |
| `AppPre` | Wrapped source or records, including long unbroken values. |
| `GameWorkspace` | A centred board column with related state beside it from 64rem and below it before that. `board`, `children` and optional `after` describe content slots. |
| `PlayerStrip`, `BoardPlaceholder` | Player and clock alignment, and a square board loading region in the `tone` fill, the same as the Chessboard loading state. |
| `MovePairs`, `MoveHistory` | Accepted move pairs or selectable replay moves in a bounded scroll region. `MovePairs` follows the latest move unless the reader scrolled up. |

`GameWorkspace` centres the board column on the page and sizes it to the
viewport. From 40rem its height leaves room for a player strip above and below
the board and, below 64rem, for about two lines of the details that follow. It
never exceeds the shared 42rem maximum. From 64rem the details column sits to
the right of the board. On a phone the board keeps the full width and the
details follow it. Compose the board slot as a `PlayerStrip`, the board and a
`PlayerStrip` in an `AppGroup`. A short landscape viewport keeps a playable
minimum of 20rem and may scroll.

`MovePairs` scrolls only its own list to the newest move when a move is added.
If the reader scrolls the list up it keeps that position, and scrolling back to
the end resumes following.

`MoveHistory` takes `items`, `selectedId` and `onSelect`. Items contain `id`,
`number`, `color` and `san`. It marks the selected step and keeps it visible by
scrolling its own list. The host retains game navigation, chess rules, move
validation, clocks and network state. These recipes add no timers, game engine
or transport.

Application recipes are included in `@ejm/ui/styles.css`, the one stylesheet.
Rebuild a consumer after changing the shared owner.

## Site composition contract

Public sites use the shared `@ejm/site/vite` build plugin. It rejects local CSS, inline styles and visual class names. `Static className="contents"` is the single structural wrapper exception. Keep code highlighting and prose server-only where possible, and leave copy buttons and playback controls outside those static boundaries.

`Hero`, `Section`, `SectionHead`, `Brand`, `Header` and `Footer` use fixed recipes. None takes a visual prop. `Header` and `Footer` take a structured `identity`: a name, optional standalone artwork and optional description. `Brand` uses navigation, project or footer placement. Its placement selects its type, artwork height and theme behavior. Artwork dimensions describe the file's intrinsic proportions.

Import the following fixed recipes from `@ejm/ui/layout/SiteContent`:

| Export | Use |
| --- | --- |
| `SectionBody` | Space after a section opening, for pages built from `Band` and `SectionHead`. `Section` provides its own body. |
| `Columns` | `primary` explanatory content and `secondary` supporting rows or facts. The shared split is five and seven columns. |
| `MetricGrid` | Comparable `Stat` figures in one responsive grid. |
| `ContentFlow`, `ContentGroup` | Readable content rhythm, or a heading with its related copy and action. |
| `ReadingColumn` | Bound the width of source examples. |
| `Actions` | A wrapping row of standalone shared buttons. |
| `Note` | A nearby qualification in shared metadata type. |
| `ContentHeading` | Secondary heading. `as` changes its semantic level only. |
| `InlineLink`, `InlineCode` | Links and code inside sentences. Links use the public routing context. Code is the base inline style. |
| `CommandLines` | A `commands` array rendered as plain source without a client highlighter. |
| `FileDetail`, `VisuallyHidden`, `FocusRegion` | Wrapping release metadata, accessible labels and programmatic focus targets. |
| `ControlGroup` | A named group of controls with no frame or space of its own (`label`, `disabled`). `disabled` disables every control inside while text and links stay readable. |
| `AssetGrid`, `BrandAsset`, `PaletteSwatch` | Approved artwork previews and token color samples. |

Content groups accept IDs, roles, live-region attributes and other semantic HTML attributes. They reject visual style props. Form values, validation, navigation targets, release state and product data stay in the consuming site.

When a needed pattern is missing, add it to ejm-ui with a semantic name and a complete recipe. Do not add a spacing number, arbitrary class or local exception to the site. Change a shared recipe once, rebuild each consumer, and verify its output before publishing. Installed sites receive shared changes on their next build, not as a remote theme update.

`Page variant="application"` and `SectionHead purpose="application"` supply the shared application opening. A public site never bypasses its design gate.

## Product shots

Product imagery is a real capture, not a drawn window. `packages/shots` holds the captures (`assets/<product>/<name>.<theme>.png` and `<name>.json`) and turns them into AVIF, WebP and PNG files (`node packages/shots/scripts/optimize.mjs`, checked with `--check`). A page uses them like this:

```tsx
import { getShot } from '@ejm/shots';
import { ProductShot, shotPreloadLinks } from '@ejm/ui';

const hero = getShot('cli', 'tui-read-refused');
<ProductShot shot={hero} alt="The ejm-cli terminal after a read, with a blocked write refused" priority frame />
// in the route head: { head: { title: '...', links: shotPreloadLinks(hero) } } puts the <link rel="preload" as="image"> tags in the prerendered HTML (RouteHead.links of @ejm/ssg; the same link on the site and the route is written once)
```

- A shot is either a `screenshot` (default) or an `illustration` (metadata `kind`). An illustration records no command, version, commit or transcript, and is always shown with its label. `node scripts/check-shots.mjs` rejects a shot that breaks these rules, a stale shot (warning, error with `--strict`), and a drawn `ProductWindow` or `ProductStage` used as product imagery.
- Theme: both variants are separate `<picture>`s and CSS shows the one that matches `data-theme` (or the system preference when none is set). Only the visible one downloads: the hidden one is lazy and `display: none`. For `priority` the first picture picks its variant with `<source media>` so the common visitor (theme follows the system) fetches one image, found by the preload hint; a visitor whose chosen theme differs from the system also fetches the matching variant once.
- The smaller of AVIF and WebP is listed first. Terminal text is smaller (and exact) as lossless WebP, a window capture usually as AVIF.
