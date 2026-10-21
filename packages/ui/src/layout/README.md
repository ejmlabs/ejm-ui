# Layout

The containerless language as components. Group with display type, space, hairline rows and full-bleed bands. There is no card, panel or tile here, and only `ProductWindow` has a shadow (and `ProductShot` when you ask for `elevation`). Import from `@ejm/ui`. Colors and sizes come only from `packages/ui/THEME.md`.

| Component | Props | Use it for | Accessibility |
| --- | --- | --- | --- |
| `Band` | `tone` paper, mist, sage or ink (default paper); `as`; `column` (default true, wraps children in `Page`); `flush` (no vertical rhythm) | A full-bleed section with its own ground. Children read correctly on every band. Alternate tones by section, and let Sage lead (about 30 percent of a page). | Pass `aria-labelledby` to name a section. |
| `Page` | `variant` default or application; div props | The content column. The application variant adds 32px vertical padding below 640px, 48px from 640px, and shared content gaps. The default adds no vertical padding or layout. | None needed. |
| `SectionHead` | `kicker` ("01 / Projects"); `title`; `children` (supporting copy); `layout` split or stacked; `as` h1, h2 or h3; `size` display or title; `id` | The opening of a section. Split is the default marketing layout, with lead copy beside the heading from 48rem of its own width. Stacked keeps body-sized copy under the title with the shared field gap at every width. | Keep heading levels in order. Give the heading an `id` and point `aria-labelledby` at it. Do not wrap this header in another header. |
| `Rows` | `size` heading or title; `aria-label` | A hairline list that replaces cards. Rows go in columns from 42rem of the list's own width. The list reaches 1rem past the column so the tone and hairlines meet the gutter and text stays on the column edge. Use it inside `Page` or give the parent a gutter. | A `ul`. Give it a label. |
| `Row` | `title`; `description`; `meta` (mono); `href`; `external`; `download` (true or a file name); `state` default, selected, disabled or focused | One row. With `href` the whole row is the link through its title, so the link name is the title alone. Hover shifts the tone (an opacity layer) and slides the arrow (transform). `external` adds `rel="external"`, the diagonal arrow and "opens another site" for screen readers (so the link name is then "title, opens another site"). `download` passes through to the anchor. | `selected` sets `aria-current` and shows the selected glyph. `focused` shows the focused glyph and a ring (real focus uses `:focus-visible`). `disabled` renders no link and adds the contract word "(disabled)". Row targets are at least 44px on coarse pointers. |
| `ActionRows` and `ActionRow` | Native list and list-item attributes; row `title`, optional `description`, `meta`, `actions`, `children` | Compact records with separate buttons, links or forms. Long text and action groups wrap independently. | A real `ul` and `li`. Name the list and give each action a name that identifies its record. The row is never a stretched link. |
| `DocumentContent` | Native div attributes | Reading width, document headings, form rhythm, wrapped `pre` text and status/error presentation. | Compose semantic headings, sections, labels and shared controls. It adds no landmark or validation behavior. |
| `Facts` and `Fact` | `Fact label`, children | Mono labels, hairlines, values. Stacks below 28rem of its own width, so it never clips in a narrow column. | A `dl`. |
| `Stat` | `figure`; `label`; `state` default, loading, error or empty; `message` | A large figure with a mono label and a hairline above. No box. Loading, error and empty replace the figure with the contract word or your message. | Loading is a polite status. Error uses `Status`, so it has a glyph and a word. |
| `Text` | `variant` default, muted, strong or code; `as` | A run of text with a variant. | On Sage, muted is already Ink: use size and weight for hierarchy. |
| `Rule` | `label` | One hairline. With `label` the mono label sits on the line. | An `hr`, or a labelled separator. |
| `Status` | `status` ok, warn, error, info or pending; `label` | A glyph and a word together, from the contract. | Never color alone: both are always present. |
| `Hero` | `eyebrow`; `title` (h1); `children` (copy); `actions`; `aside`; `art` (inline svg markup); `drawOn`; `size` display or display-lg; `tone` | The type-led hero on the page ground. No panel. Headline across the full column, copy and actions to the left, `aside` (a `ProductStage`) to the right from 64rem and below the copy when narrow. Staged entrance with `--ejm-i` 0 to 4, so it ends 880ms after load: the eyebrow, headline and copy only slide (`animate-slide`, transform only), because the headline is the page's Largest Contentful Paint and a fade would delay it; the actions and then the aside fade and rise (`animate-enter`). Nothing is hidden without scripts and everything is final under reduced motion. | One h1. `art` is aria-hidden. |
| `Art` | `svg`; `drawOn`; `className` | Decorative symbol line art from `packages/ui/src/art/inline`. Import with `?raw`. The `draw-on` class is added after hydration only. | Always aria-hidden. |
| `ProductWindow` | `title`; `meta`; `elevation` rest, raised or float; `live`; `label`; `labelSide` | A floating product window with a title bar, three dots and a body. It keeps the page theme inside any band. Without `live` it shows the visible "Simulated screen" label (in the bar when narrow, in the footer when wide). The only layout part with a shadow. Compose its body from layout parts and only words that appear in the product README. | Hidden from assistive tech by default (decoration). Pass `label` for an interactive window and it becomes a named group. Pass `live` only for the demo islands. |
| `ProductStage` | children: one to three `ProductWindow` | Layers the windows with offset and overlap from 28rem of its own width, and tucks them into an overlapping stack below that. Window text scales with the stage and never drops under 13px. | The stage adds no semantics. |
| `ProductShot` | `shot` (from `getShot` in `@ejm/shots`); `alt` (required); `priority`; `frame`; `elevation`; `caption` (text, or `false`); `sizes` | A real capture of the real product: a figure with AVIF, WebP and PNG sources, explicit width and height, and a hairline caption naming the product, version or commit and capture date. Dark and light captures follow the page theme. Not labelled "Simulated": it is real. | Write `alt` to say what the shot shows. Lazy by default; `priority` is for the hero: eager, `fetchpriority="high"`, and the head needs `shotPreloadLinks(shot)`. `frame` draws the page's own terminal bar (dots and title) around terminal captures only and throws for a window capture. A real app window keeps its own edge, so there is no shadow unless you ask with `elevation` (rest, raised or float) for a frameless capture. |
| `Illustration` | `product`; `caption`; children (a React composition) | A drawn stand-in for a product screen where a real capture is impossible, for example the `IdeView` from `@ejm/demos`. Always shows the visible label "Illustration of <product>, not a screenshot" under it. | A figure named by that label. Never use it for a product that can be captured. `ProductShot` of a shot whose metadata says `kind: "illustration"` shows the same label and prefixes the alt text. |

## Rules of thumb

- A page has one display heading at the top and `SectionHead` for each section. Neighbouring sections change tone or layout.
- Do not put a `Row` list inside a bordered or filled box. If you want a box, you want a band.
- Use `Stat` for numbers that matter and `Facts` for specifications. Do not use either as a card grid.
- Product windows are objects, not groups: never wrap ordinary content in one.
- Use `ActionRows` for records with separate actions. Its `title` is visible
  content, not the native tooltip attribute. Put a real shared `Button` or a
  form in `actions`; do not copy a button class list into generated HTML.
- Use `DocumentContent` for native account, policy and setup pages instead of
  a separate typography system. It and `ActionRows` live in `src/static`.
  Import `@ejm/ui/styles-static.css` after `@ejm/ui/styles.css`. Use the root
  exports or public aliases `@ejm/ui/layout/DocumentContent` and
  `@ejm/ui/layout/ActionRows`. The `@ejm/ui/layout` barrel does not export these
  static parts.

## Application pages and forms

Use `Page variant="application"` for account, history, list and play pages.
It keeps the same column and gutters as `Page`, with 32px vertical padding
below 640px and 48px from 640px. Its direct children form a grid separated by
`gap-content`. `SectionHead layout="stacked"` keeps title, optional kicker and
body-sized support copy aligned, separated by `gap-field`. Heading level and
`size` remain independent of layout. Existing Page and SectionHead callers
keep their current defaults.

`gap-field` is two steps of the existing Tailwind spacing scale, normally 8px.
Use `grid gap-field` to group a label, control and help or error text.
`gap-content` is six steps, normally 24px. Use `grid gap-content` on native
forms and content groups. These aliases also support Tailwind's normal axis
and breakpoint variants, such as `gap-y-field` and `sm:gap-content`.

```tsx
import { Button, Input, Page, SectionHead, Text } from '@ejm/ui';

<Page variant="application">
  <SectionHead as="h1" size="title" layout="stacked" title="Your account">
    <p>Manage the name other players see.</p>
  </SectionHead>
  <form className="grid gap-content max-w-xl">
    <div className="grid gap-field">
      <label htmlFor="username">Username</label>
      <Input id="username" name="username" required aria-describedby="username-help" />
      <Text as="p" variant="muted" id="username-help">Shown on your public profile.</Text>
    </div>
    <div><Button type="submit">Save account</Button></div>
  </form>
</Page>
```

Keep labels, input IDs, validation, form submission and conditional content in
the consumer. Omit groups when they have no content; an empty group still
occupies a grid gap. Use inline links inside sentences and Buttons for
standalone actions. Form width, board width and column arrangements remain
product choices. Control `density` is separate from page layout and keeps its
existing touch targets. Caller `className` values can override the shared
spacing through `cn`, for example `gap-4 py-4 sm:py-6` on Page.

## Fixed application recipes

Import `@ejm/ui/layout/Application` when a product should supply content and
behavior while the kit owns every visual choice. These recipes accept native
semantic attributes, refs and handlers. Their props exclude `className`,
`style` and raw markup. Existing lower-level layout APIs remain compatible.

| Export | Contract |
| --- | --- |
| `AppFlow`, `AppGroup`, `AppActions` | Content separated by 32px, related content separated by 16px, and wrapping action groups separated by 12px. The optional `as` selects a semantic element. |
| `AppHeading`, `AppPre` | Heading levels h2 to h4 with shared heading type, and wrapped monospace records. |
| `AppField`, `AppFieldset`, `AppForm` | Native fields at 8px gaps, fieldsets at 16px gaps and forms at 24px gaps with a fixed reading width. Labels, legends, validation, disabled state and submission remain native. |
| `AppSection` | A section with a fixed reading width and 32px content gaps. |
| `GameWorkspace` | A `board` slot followed by details children, with optional `after` content. It uses one column on phones and board/details columns from 64rem. The host owns keyboard game navigation. |
| `PlayerStrip`, `BoardPlaceholder` | Player and clock alignment, and a square loading region. |
| `MovePairs`, `MoveHistory` | Accepted move pairs or selectable SAN moves within a bounded scroll region. `MoveHistory` takes `items`, `selectedId` and `onSelect`; it scrolls only its own list. |

Use `SectionHead purpose="application"` for the complete application opening.
It selects title type and stacked body copy. `purpose="page"` selects display
type; `purpose="section"` selects title type with the existing split layout.
Heading level stays independent. Omitting purpose preserves the previous
display/split default, and existing explicit size/layout overrides still work.
Sites that opt into `enforceDesignKit` use purpose instead of visual overrides.

```tsx
import { AppActions, AppField, AppForm } from '@ejm/ui/layout/Application';

<Page variant="application">
  <SectionHead purpose="application" as="h1" title="Your account" />
  <AppForm onSubmit={save}>
    <AppField>
      <label htmlFor="player">Username</label>
      <Input id="player" name="player" required />
    </AppField>
    <AppActions><Button type="submit">Save</Button></AppActions>
  </AppForm>
</Page>
```

All recipes use the default `@ejm/ui/styles.css` entry. They add no rule engine,
observer or product transport. Check the complete product composition in a
browser; shared component tests do not establish a product release.

## Static prose

Import `Prose` from `@ejm/ui/layout/Prose` for a help or policy page whose
content already uses semantic HTML. It supplies the same reading measure and
type scale as the docs parts without requiring the docs navigation or code
highlighter. Use `DocHead` and `DocBody` when a structured documentation set
needs derived contents and previous/next navigation.

```tsx
<Page className="py-rhythm">
  <SectionHead as="h1" size="title" title="How to play" />
  <Prose className="mt-8">
    <p>Choose a time control, then invite a friend.</p>
    <h2>Reconnect</h2>
    <p>Return to the same game link in the same browser.</p>
  </Prose>
</Page>
```

On prerendered sites, wrap noninteractive prose in the public `Static` export
from `@ejm/ssg` with an SSR/dev guarded render function. The server keeps the
full article and links in HTML while the browser skips its text and rendering
code. Native links remain usable without script. Do not place forms or other
interactive components inside a `Static` part.

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
