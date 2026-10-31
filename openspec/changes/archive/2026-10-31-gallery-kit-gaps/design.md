## Context

After the systemic-kit change every public `@ejm/ui` component is closed, and the design guard rejects classes, styles,
opaque spreads and local CSS in every consumer except the gallery. The gallery agent listed four kit gaps, and a probe run
of the guard over `apps/gallery/src` with the exemption turned off reported these issues:

| File | Issue | Cause |
| --- | --- | --- |
| `routes/app-shell.tsx` | `className` on the nav links | `AppShell.nav` is free markup |
| `specimen.tsx` | `className`, a `data-*` spread | Theme pairs and panes are gallery layouts |
| `tokens.tsx` | `className`, `style` | Swatches, type scale and shadows drawn with utilities |
| `routes/hooks.tsx` | `className`, `style` | A resizable box and an `<svg class="art">` for `useDrawOn` |
| `island.tsx` | `className` | `fieldset` needs `min-w-0`, `legend` needs `sr-only` |
| `routes/app.tsx` | Opaque spreads | `<Dashboard {...dashboard} />` |
| `site.tsx` | Style import | `./styles.css?url` is not seen as a `.css` entry |
| `styles.css`, `styles-demos.css` | `@source` lines | Needed only while gallery files carry classes |

## Goals and non-goals

Goals: close each reported gap in the kit; remove the gallery exemption so every gallery file passes the consumer guard.

Non-goals: an icon set of the kit's own; a new color, radius, shadow or size; changes to `examples/starter`, the terminal
contract, `@ejm/ink` or `crates/ejm-tui`.

## Decisions

### 1. AppShell takes nav items

`AppShell.nav` becomes `readonly NavItem[]`, the type `Header` already uses. Each item renders through the private
`NavLink`, so the current page is marked the same way in every shell nav (weight 600 and a 2px underline, never color
alone), external items get `ExternalAnchor`, and the router link comes from `linkComponent`. The item is a compact control
from the recipe: `touch-target compact-target flex min-h-8 items-center rounded-control px-3 text-sm text-fg
hover:bg-tone`. `AppShell` always provides compact density, so the class is written compact, like its home link.

Rejected: keeping `ReactNode` beside items. A second way to build the same nav is the escape hatch the closed kit removes.
Groups (as in `DocsSidebar`) are left out until an application needs them.

### 2. Header uses a container query

`Header` puts `@container` on the `<header>` and switches with `@3xl:` (48rem, the same 768px as `md`). The inline list is
`hidden @3xl:flex`; `NavMenu` is `@3xl:hidden`. A full-bleed header has the width of the page (less a classic scroll bar),
so a site sees no change. A header inside a narrow column shows the Menu button. The container adds layout containment,
which makes the header the containing block for the menu overlay; it already is one, because it is sticky. The kit uses
the same pattern in `Dashboard`, `ChartFrame` and `ProductWindow`.

Rejected: `useContainerQuery`. It measures after hydration, so the server HTML and the first paint would show the wrong
form.

### 3. Icons: consumers pass lucide-react icons, the button sizes them

`Button size="icon"` sizes any `svg` child: `[&_svg]:size-5` comfortable, `[&_svg]:size-4` compact, the sizes
`ThemeToggle` uses, plus `[&_svg]:shrink-0`. lucide-react 1.x marks an icon `aria-hidden` when it has no accessible prop,
and the button carries the name through `aria-label`.

Rejected: re-exporting lucide-react from `@ejm/ui`. Every lucide icon accepts `className` and `style`, so the barrel would
fail `closed-api.test.ts` 1,600 times, and wrapping each one in a closed component is a layer with no current use. The
guard already rejects `className` and `style` on an icon in consumer source, and the button's CSS overrides the `size`
attribute, so the size stays the kit's.

### 4. Specimen blocks are docs parts

`packages/ui/src/docs/Specimen.tsx` exports:

- `Specimen({ label, theme?, children })`: a labelled group (`role="group"`, a meta label). With `theme` it sets
  `data-theme` and `data-band="paper"` with padding, as THEME.md describes for a side-by-side theme preview.
- `Compare({ children })`: two specimens side by side from 64rem, stacked below.
- `ThemePair({ children })`: the children in a light and a dark specimen, in a `Compare`.
- `TypeScale()`: the six type sizes and the figure style, one per hairline row, each in its own size.
- `Elevations()`: the three shadow levels on a window sample.

They are the gallery's markup moved without a visual change. `TypeScale` and `Elevations` read the sizes and levels from
the kit, so a new size or level shows up in the docs from one place. The shadow class map moves from `ProductWindow` to a
private `lib/elevation.ts` that both use. The hue swatches are replaced by `Legend`, which already draws each chart hue
with its marker and dash, the way the hues are used.

### 5. ControlGroup

`ControlGroup({ label, disabled?, children })` renders `<fieldset class="min-w-0">` with an `sr-only` legend. It adds no
space or frame, so a page inside it lays out as before. `disabled` disables every control inside while text and links
stay readable. It lives with `VisuallyHidden` and `FocusRegion` in `layout/SiteContent.tsx`.

### 6. Art draws when seen

`useDrawOn<T extends Element = SVGSVGElement>()` widens its element type. `Art` uses it on its wrapper when `drawOn` is
set, instead of its own effect that armed the class after hydration. The CSS (`draw-on` on any ancestor of the paths) is
unchanged. Hero art is in view at load, so it still draws at once. The hooks page shows `useDrawOn` through `Art`, the one
place a guarded consumer can reach it, since the `art` class is the kit's.

### 7. The guard reads `?url`

`checkStyleImport` strips a trailing `?url` before it checks that a relative style import is a `.css` file inside `src`.
The file itself is still checked as consumer CSS. `?inline` and `?raw` stay rejected.

### 8. The gallery under the guard

`libraryGallery` and the `gallery` path are removed from `design-guard.mjs`. The gallery's `styles.css` and
`styles-demos.css` keep only their imports. The dashboard demos pass named props through a local `SampleDashboard`. The
container query demo measures a plain `div` in the page column. A test in `packages/site/src/design.test.mjs` runs the
guard over `apps/gallery` and expects no issue.

## Risks and trade-offs

- A header that is narrower than 48rem at a desktop viewport now shows the Menu button. That is the requested behavior;
  every current consumer renders the header full width.
- `Art drawOn` below the fold now waits until it is seen. Under reduced motion or without scripts it is fully drawn, as
  before.
- Consumers that want an icon button add `lucide-react`. A different major than the kit's still works; the button sizes
  any `svg`.
