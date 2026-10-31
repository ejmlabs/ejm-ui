# Theme contract

The public theme contract for `@ejm/ui/styles.css`, the one stylesheet. If a name is not in this file, it does not exist. Colors never appear as literals in components: they come from the semantic names below, which come from `packages/tokens/theme.json`.

## Use it

One stylesheet styles every component in `@ejm/ui`: layouts, shell, controls, docs parts, application parts and motion. A site or an app imports it once.

```css
/* src/styles.css */
@import "@ejm/ui/styles.css";
```

The stylesheet scans only the kit's own source. `base.css` imports Tailwind with `source(none)`, so automatic source detection is off and no folder of the consumer is scanned. `styles.css` adds an `@source` line for each component folder (`components`, `layout`, `shell`, `hooks`, `motion`, `docs`, `app` and `lib`) and for `control-recipes.mjs`, and leaves out tests. A consumer needs no `source(none)` on its import and no `@source` line of its own, and there is no partial to forget: a class the kit writes is always in the sheet.

Two scripts keep that true. `node packages/ui/scripts/check-sources.mjs` checks that every utility a component folder uses is generated, that the sheet scans nothing outside `src` and no test file, and that `styles-site.css` and `styles-docs.css` generate exactly what `styles.css` does. `node packages/ui/scripts/check-classes.mjs` checks that every class string the kit writes builds CSS at all, because Tailwind drops a class it cannot build without an error, so a typo or a removed token such as `bg-surface` would render unstyled. `check-sources.mjs` prints the size of the sheet: 16.0 KB gzip at this revision.

`@ejm/ui/styles-site.css` forwards to `styles.css`, and `@ejm/ui/styles-docs.css` is empty, because `styles.css` already covers the docs parts. Both stay for consumers pinned before the one-stylesheet change; replace their imports with `styles.css`.

Under `ejmUi()` and `ejmlabs()` the design guard rejects any class, style or CSS rule of the consumer's own, so a consumer's `src` holds only imports of public `@ejm/*` CSS (see [ADOPTION.md](../../ADOPTION.md)). The gallery in this repository is checked the same way: it has no exemption, and its own stylesheet is only public `@ejm` imports. Product demo styles come from the public `@ejm/demos/*.css` entries, imported after `@ejm/ui/styles.css`. A project that builds without the presets is outside the guard and adds its own `@source` lines for its own folders. `base.css` is private.

```html
<head>
  <meta name="color-scheme" content="light dark" />
  <script src="/theme-boot.js"></script>   <!-- synchronous, before any CSS paints; file: @ejm/ui/theme-boot.js -->
  <!-- preload the two fonts: render the props in `fontPreloads` from @ejm/ui as <link> tags -->
</head>
```

Serve `packages/ui/public/theme-boot.js` as `/theme-boot.js` (an external file, so `script-src 'self'` holds). `ejmSite()`, inside `ejmlabs()`, adds the script tag and writes the file; an app on `ejmUi()` alone serves it itself.

The Tailwind default palette, radius, shadow and font namespaces are reset. `bg-red-500`, `rounded-xl`, `shadow-md`, `font-serif` and `drop-shadow-*` do not exist, so a color or shape outside the system fails to compile.

## Themes

| Mechanism | Behavior |
| --- | --- |
| `<html data-theme="light\|dark">` | Sets the page theme. Light is the default. |
| No `data-theme` on the root | The system `prefers-color-scheme` decides, with no script. |
| `data-theme` on any element | Starts a new theme for that subtree (for a preview of both themes side by side: `ThemePair` from `@ejm/ui` does this for any content). The nearest one wins. |
| `?theme=dark\|light` in the URL | Test override. `theme-boot.js` applies it and never saves it. |
| `dark:` variant | `dark:` follows the same rules. The semantic colors already flip, so use `dark:` only for what a color token cannot say. |

`theme-boot.js` (414 bytes, no dependencies) runs before first paint and always sets `data-theme` on `<html>`. Order: `?theme=`, then the saved choice, then the system preference. The saved choice is the `ejm-theme` cookie on `ejmlabs.com` and its subdomains (exact host `ejmlabs.com` or a name ending in `.ejmlabs.com`), and `localStorage["ejm-theme"]` on any other host. It only reads. The theme hook (task 5.1) writes, and must use exactly the attributes in `THEME_COOKIE` from `@ejm/tokens`:

```
ejm-theme=dark; Domain=.ejmlabs.com; Path=/; Max-Age=31536000; SameSite=Lax[; Secure on https]
```

Because the boot script always sets the attribute, the hook must also follow the system preference while the visitor has not chosen (listen to `matchMedia("(prefers-color-scheme: dark)")` and update `data-theme`). Without the script, the CSS alone follows the system.

## Bands

A band is a full-bleed section with its own ground. Put `data-band="paper|mist|sage|ink"` on the element, plus the `band` utility to paint it (a page uses `Section`, below, instead of writing this by hand). Every band sets the same variables for its whole subtree, so children only ever say `text-fg`, `text-muted`, `border-line` and the rest, and they are right on every ground.

```html
<section data-band="sage" class="band py-rhythm">
  <div class="page"> ... </div>
</section>
```

Bands may nest (the nearest wins), and `[data-band]` works on the same element as `[data-theme]`. The page itself is the Paper band.

### Automatic bands

`Section` (see `packages/ui/src/layout/README.md`) is how a page gets its bands, so a page never names Mist or Paper itself. A top-level `Section` renders `data-band="auto"`. Among the `data-band="auto"` children of one parent, the odd ones are Mist and the even ones Paper, in both themes: the tokens generator emits `[data-band="auto"]:nth-child(odd of [data-band="auto"])` beside the named bands in `packages/tokens/generated/tailwind.css`. `Hero` is a Paper band that is not `auto`, so the first section after it is Mist, then Paper, then Mist. `emphasis` renders `data-band="sage"` instead, which is not counted, so the alternation continues past it. A `Section` inside a `Section` has no band and keeps the ground of its parent. Keep the sections of one page as siblings, or they do not alternate.

`:nth-child(... of S)` needs Chrome 111, Firefox 113 or Safari 9. The generated sheet lists the automatic selectors beside `:root`, but the built CSS of `examples/starter` (minified with Lightning CSS) holds them as rules of their own, so a browser that cannot parse them ignores only those rules and a section keeps the page ground. That was read in the built file and not tested in an older browser.

| Band | Light theme | Dark theme | Use |
| --- | --- | --- | --- |
| `paper` | ground `F6F5EF`, text Ink | ground `131614`, text `E3E5DC` | The page. About half of a page with Mist. |
| `mist` | ground `E8EDE3`, text Ink | ground `1C211D`, text `E3E5DC` | The quiet alternate. |
| `sage` | ground `8A9A7B`, text Ink | the same: Sage stays Sage | The lead color, about 30 percent of a page. |
| `ink` | ground `202721`, text Paper | the same: Ink stays Ink | A dark moment in either theme. |

Paper and Mist together make about 60 percent of a page, Sage about 30, and Forest under 10. Forest never sets a large ground, which is why it is not a band.

Sage rules, forced by the numbers (Ink on Sage is 5.09:1, Forest on Sage is 3.52:1):

- All text on Sage is Ink. `text-muted` and `text-link` are also Ink there. Make hierarchy with size, weight and the mono face, not with a lighter color.
- Forest on Sage is for large type only: use `text-link-large` (display type, 24px and up).
- On Sage, `primary` is Ink (the button is an Ink pill with Paper text), and status colors are Ink. Status on Sage must carry a word or glyph, never color alone. The six hues are not defined for Sage, so charts do not sit on Sage.

### What a band sets

CSS variable, Tailwind color name and meaning. All are set by every band.

| Variable | Tailwind name | Meaning | Paper light | Sage | Ink |
| --- | --- | --- | --- | --- | --- |
| `--ejm-ground` | `bg-ground` | The band background | Paper | Sage | Ink |
| `--ejm-fg` | `text-fg` | Body and heading text | Ink | Ink | Paper |
| `--ejm-muted` | `text-muted` | Secondary text, 4.5:1 | Ink 72% | Ink | `A8B4A2` |
| `--ejm-line` | `border-line`, `divide-line` | Hairline rules. Visible, not a control edge (1.4:1 minimum) | Ink 22% | Ink 32% | `465349` |
| `--ejm-tone` | `bg-tone` | Hover and selected row fill, a step off the ground. Not a box | Mist | Paper 18% | `262C27` |
| `--ejm-field` | `bg-field` | Input background | White | Paper | `131614` |
| `--ejm-link` | `text-link` | Link and accent text, 4.5:1 | Forest | Ink | `B8C6AA` |
| `--ejm-link-large` | `text-link-large` | Accent for large type only, 3:1 | Forest | Forest | `B8C6AA` |
| `--ejm-control` | `border-control` | Control borders (inputs, outline buttons), 3:1 | `7D877F` | Ink | `6A7C6C` |
| `--ejm-focus` | `ring-focus`, `outline-focus` | Focus ring, 3:1 | Forest | Ink | Sage |
| `--ejm-primary` | `bg-primary` | Primary button fill | Sage | Ink | Sage |
| `--ejm-on-primary` | `text-on-primary` | Text on `primary`, 4.5:1 | Ink | Paper | Ink |
| `--ejm-primary-hover` | `bg-primary-hover` | Primary hover fill | Forest | Forest | Sage 70% |
| `--ejm-on-primary-hover` | `text-on-primary-hover` | Text on the hover fill | Paper | Paper | Ink |
| `--ejm-code` | `bg-code` | Code block ground | Forest | Ink | `131614` |
| `--ejm-on-code` | `text-on-code` | Code block text | Paper | Paper | `E3E5DC` |
| `--ejm-success` `--ejm-warn` `--ejm-danger` `--ejm-info` | `text-success` `text-warn` `text-danger` `text-info` | Status text, 4.5:1 on ground and tone. Also usable as `bg-*` fills | greens, ambers, reds, blues | all Ink | light-on-dark set |
| `--ejm-on-danger` | `text-on-danger` | Text on a `bg-danger` fill, and on the danger Button's hover fill (`bg-danger/85`, the danger fill at 85 percent over the ground), 4.5:1 | Paper | Paper | Ink |
| `--ejm-hue-1` to `--ejm-hue-6` | `hue-1` to `hue-6` | The six chart hue roles, 3:1 on the ground. Not defined for Sage | blue, violet, green, amber, rose, cyan | n/a | light-on-dark set |
| `--ejm-scheme` | none | `light` or `dark`; sets `color-scheme` so form controls and scrollbars match | light | light | dark |

Full values for every band and theme are in `packages/tokens/generated/tailwind.css`. Every pair above is gated by `node packages/tokens/scripts/contrast.mjs --verbose` (262 pairs; run as part of `npm run check`). The only pairs below their usual level, by design: `primary` against the ground is 2.75:1 on Paper and 2.53:1 on Mist, so a Sage button is identified by its label (5.09:1), not its edge; use `border-control` for any control that needs a visible boundary. The danger pair is held at 4.5:1 on the Button's hover fill too, which is why `danger` in the light Paper and Mist bands is `9B3838` (Ink mixed 8 percent into the ui theme's red, `A63A3A`); at `A63A3A` the hover left Paper at 4.41:1.

### Variants and utilities for bands

- `band-paper:`, `band-mist:`, `band-sage:`, `band-ink:` apply inside that band (`band-sage:text-link-large`). They match the named `data-band` values only, so `band-paper:` and `band-mist:` do not match an automatic section (`data-band="auto"`). `band-sage:` and `band-ink:` still match an `emphasis` section. No component in the kit uses these variants: the semantic colors are right on every ground.
- `band` paints `background: var(--ejm-ground); color: var(--ejm-fg)`.
- `scheme-page` makes an object (a product window, a code well) keep the page theme even inside a Sage or Ink band.

## Colors, all of them

- Brand, fixed, always emitted as variables: `sage` `forest` `ink` `paper` `mist` `white` (`bg-sage`, `text-forest`, `border-ink`, and opacity such as `bg-sage/40`). Use brand colors for art and one-off marks; use the semantic names for anything that changes with theme or band.
- Semantic: the table above.
- No shadcn color aliases. Components use the semantic names above; there is no `card`, `popover` or `background` color, and `bg-muted` does not exist (`muted` is a text color: use `bg-tone`).
- Product windows and editors on the web, from the ui theme, following the page theme and never the band: `ui-ground` `ui-panel` `ui-editor` `ui-raised` `ui-overlay` `ui-hover` `ui-line` `ui-line-strong` `ui-text` `ui-text-strong` `ui-text-muted` `ui-text-subtle` `ui-primary` `ui-on-primary` `ui-focus` `ui-accent` `ui-accent-strong` `ui-tint-1` to `ui-tint-3` `ui-error` `ui-warning` `ui-success` `ui-special` `ui-info` `ui-control-border` `ui-board-light` `ui-board-dark` `ui-board-on-light` `ui-board-on-dark` `ui-board-mark` `ui-diff-add` `ui-diff-del` `ui-diff-add-bg` `ui-diff-del-bg` `ui-selection` `ui-dim`, `ui-hue-1` to `ui-hue-6`, and syntax `syn-comment` `syn-keyword` `syn-string` `syn-number` `syn-type` `syn-type-parameter` `syn-function` `syn-macro` `syn-parameter` `syn-property` `syn-constant` `syn-namespace` `syn-identifier` `syn-delimiter`. Plain variables are `--ejm-ui-*` and `--ejm-ui-syn-*`.
- The chessboard uses `ui-board-light` and `ui-board-dark` for its squares, `ui-board-on-light` and `ui-board-on-dark` for its coordinate labels, and `ui-board-mark` for move markers and the keyboard focus frame. `board-on-light` is the label color on the light square and `board-on-dark` is the label color on the dark square. Both themes set both in `theme.json`, so each label is gated against its own square. In the light theme the squares are Mist and Sage, the marks and the labels on the Mist square are Forest, and the labels on the Sage square are Ink. In the dark theme the squares are two mid greens, so the board does not glare on a dark page; the marks are white, the labels on the lighter square are `131614` and the labels on the darker square are Paper. The pieces are fixed art, so the gate holds black (every outline and black piece) at 3:1 on both squares, the mark at 3:1 on both squares, each label color at 4.5:1 on its own square (`labels`, because the coordinates are small text), and the squares at 1.4:1 from each other, in both themes.
- Native product styles can load the complete `--ejm-ui-n0` to `--ejm-ui-n15` scale through `@ejm/tokens/neutral.css`. It follows the page theme. The public `@ejm/demos/ide-preview.css` profile includes it.

Use `text-*` and `bg-*` freely; there is no card color. Tags are plain mono text, not filled chips.

## Type

Fonts: Manrope (variable, weights 200 to 800) as `font-sans`, IBM Plex Mono Medium (500 only) as `font-mono`. Nothing else loads. `font-synthesis: none`, `font-display: swap`, and metric-matched fallbacks (`Manrope Fallback`, `IBM Plex Mono Fallback`, with the `size-adjust` values from the old kit) so the swap moves nothing.

| Utility | Range at the base scale (320 to 1919px) | Line height | Tracking | Weight |
| --- | --- | --- | --- | --- |
| `text-display` | 36px to 96px | 1.0 | -0.04em | 600 |
| `text-title` | 28px to 56px | 1.06 | -0.035em | 600 |
| `text-heading` | 20px to 32px | 1.2 | -0.02em | 600 |
| `text-lead` | 19px to 26px | 1.5 | 0 | 400 |
| `text-body` | 16px to 20px (18.4px at 1440px, 20px from 2000px) | 1.6 | 0 | 400 |
| `text-meta` | 13px to 14.4px, IBM Plex Mono | 1.5 | +0.02em | 500 |

From 1920px the three largest sizes (`display`, `title`, `heading`) multiply their maximum by `--ejm-scale` (1.125 at 1920, 1.25 at 2560, 1.375 at 3200, 1.5 from 4400). So `display` tops out at 108px at 1920, 120px at 2560, 132px at 3200 and 144px at 4400 and above. Body, lead and meta never scale past their caps. The root font size is never scaled, so `rem` and the Tailwind spacing scale mean the same thing on every screen.

Six sizes are the whole scale: `display`, `title`, `heading`, `lead`, `body` and `meta`. Controls and dense tables add `text-base` (16px) and, in the compact density, `text-sm` (14px); the kit uses no other named size. The one exception is `ProductWindow`, which sets the text size of the simulated product screen it frames (13px at least) from the width of its stage. `Stat` uses `display`. Tailwind's own `text-xs` to `text-9xl` still compile, but the kit uses none of them. `h1` to `h6` get `text-wrap: balance`, and `p`, `li`, `dd`, `blockquote` get `text-wrap: pretty`. `tabular-nums` (a built-in utility) gives tabular figures in Manrope and is what stats, versions and table cells use. Reading width: `max-w-measure` (68ch).

Font files: `packages/ui/src/fonts/manrope-latin.woff2` (22,856 bytes) and `ibm-plex-mono-500-latin.woff2` (11,680 bytes), 34,536 bytes together, down from 93,968 for the full WOFF2s (the TTFs stay in `@ejm/tokens` as the source). Latin, Latin-1, general punctuation, currency and a few symbols; the mono also has arrows, box drawing, block elements and the check mark. Both `@font-face` rules carry the same `unicode-range`. Rebuild with `node packages/ui/scripts/build-fonts.mjs` (runs `pyftsubset`, or `uv run --with fonttools --with brotli pyftsubset` when it is not installed). Preload both with `fontPreloads` from `@ejm/ui`.

## Page column, gutters and rhythm

`page` is the content column. Bands stay full bleed; the column inside them steps up with the screen. `--ejm-page-max` is the column's outer width including its gutters.

| From width | Gutter | `--ejm-page-max` | `--ejm-scale` |
| --- | --- | --- | --- |
| 320px | 16px | 1200px | 1 |
| 420px | 24px | 1200px | 1 |
| 760px | 48px | 1200px | 1 |
| 1600px | 64px | 1360px | 1 |
| 1920px | 72px | 1520px | 1.125 |
| 2560px | 80px | 1840px | 1.25 |
| 3200px | 88px | 2240px | 1.375 |
| 4400px | 96px | 2800px | 1.5 |

The gutter is never smaller than `env(safe-area-inset-left/right)`. Pages need `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` for that to work.

| Name | Use |
| --- | --- |
| `page` | `max-inline-size: var(--ejm-page-max); margin-inline: auto; padding-inline: gutter`, width 100%. |
| `page-inset` | Padding only, for a full-bleed element (a sticky header) whose content must line up with the `page` column. |
| `py-rhythm`, `pt-rhythm`, `gap-rhythm`, ... | The vertical rhythm of a band, 72px to 160px, times `--ejm-scale`. `*-rhythm-sm` is 40 percent of it. |
| `gap-field`, `gap-x-field`, `gap-y-field` | Label, control and help groups: `calc(var(--spacing) * 2)`, normally 8px. Derived from the existing Tailwind spacing scale. |
| `gap-content`, `gap-x-content`, `gap-y-content` | Application content and form groups: `calc(var(--spacing) * 6)`, normally 24px. Derived from the same scale. |
| `px-gutter`, `p-gutter`, ... | The current gutter. |
| `max-w-page`, `max-w-measure` | Column width and 68ch reading width. |
| Breakpoints | Tailwind defaults, plus `xs` 420px, `3xl` 1920px, `4xl` 2560px, `5xl` 3200px, `6xl` 4400px (the same steps as the table). |
| Container queries | Tailwind's own `@container` and `@xs` to `@7xl` (the `--container-*` sizes), for a part that must follow the room it has rather than the window: `Header` (nav list from `@3xl`, 48rem, otherwise the menu), `Dashboard`, the charts, `ProductStage` and the specimen pairs. A part inside a narrow preview then behaves as it does on a phone. |

`--ejm-header-h` (default 4.5rem) feeds the page `scroll-padding-top`, so anchors and focused headings land below a sticky header. A sticky header component sets it.

`Page variant="application"` combines the column with the shared application rhythm and makes every control inside it compact (see Density below). `SectionHead purpose="application"` stacks a title heading and body-sized copy. Page openings use `purpose="page"`; ordinary sections use the default `purpose="section"`. A consumer cannot pick a different heading size or alter the recipe with classes.

Pages are built from `Hero` and `Section`, structured shell identity, and the recipes in `@ejm/ui/layout/SiteContent`. `Section` derives its heading level, its ground, its id and its spacing, so a page chooses none of them. The design guard (`@ejm/ui/design-guard`, run by `ejmUi()` and `ejmlabs()`) checks that a consumer's source contains no local styling, and `ejmSite()` checks every built page. Change typography, spacing, branding or motion in ejm-ui, then rebuild the consumers. Product data, words, routes and accessible state remain in the consumer. See the layout README for the public composition API. The lower-level utility recipes in this document describe shared implementation, not consumer escape hatches.

## Elevation and radius

- `shadow-rest`, `shadow-raised`, `shadow-float`: soft layered shadows, deeper in dark with a faint top edge of light. **Reserved for product windows, menus and overlays.** Nothing else has a shadow. Variables: `--ejm-shadow-rest|raised|float`.
- Three radii, and nothing else: `rounded-control` (6px) for fields, checkboxes, menu items, nav items, tabs and the tooltip; `rounded-pill` (999px) for buttons, switches and the theme toggle; `rounded-window` (16px) for product windows, menus and overlays only. `rounded-full` and `rounded-none` are Tailwind's own and stay (radio buttons use `rounded-full`). The other Tailwind radius names do not compile. There is no card or panel radius.

## Motion

Transform and opacity only (draw-on uses stroke offset, as specified). Every animation utility is wrapped in `prefers-reduced-motion: no-preference`, so under reduced motion nothing moves and every element is in its final state. Durations also collapse to 1ms under reduced motion.

The shared theme control uses the native View Transitions API for a 320ms crossfade after an explicit click or key press. The preference still saves if a transition is skipped or cannot start; browsers without the API and visitors who prefer reduced motion switch immediately. Initial theme selection and system-theme updates do not start a transition. The shared SSG stylesheet supplies the crossfade timing. Color changes are instant: hover, pressed and state colors never transition, and the kit uses no `transition-colors` or `transition-all`. Only `transform` and `opacity` transition, with `duration-fast` and `ease-standard`. The open narrow menu fades in with `animate-fade`. Keep first-paint text and product captures visible; use a transform-only entrance for large hero text.

| Token | Value |
| --- | --- |
| `duration-fast`, `duration-base`, `duration-slow` | 120ms, 200ms, 320ms (`--ejm-duration-fast|base|slow`) |
| `--ejm-duration-entrance` | 640ms, the hero and page entrance |
| `--ejm-duration-draw` | 700ms |
| `--ejm-stagger` | 60ms per step |
| `ease-standard` | `cubic-bezier(0.2, 0.7, 0.3, 1)`, state changes |
| `ease-enter` | `cubic-bezier(0, 0, 0.2, 1)`, things arriving |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)`, things leaving |
| `ease-emphasis` | `cubic-bezier(0.16, 1, 0.3, 1)`, the one hero entrance and draw-on |

Animation utilities, played once on mount with `animation-fill-mode: backwards`:

- `animate-fade`, `animate-reveal` (320ms, rises 16px), `animate-enter` (640ms, rises 12px, `ease-emphasis`), and `animate-slide`, the same 640ms rise with no fade. Use `animate-slide` on text that can be the Largest Contentful Paint (the `Hero` headline and lead): an element that starts at opacity 0 is not painted yet, so LCP waits for the whole fade (measured on `examples/starter`: LCP 1488 ms with the fade, 704 ms with the slide, FCP 703 ms).
- Stagger: `style={{ '--ejm-i': n }}` on the Nth child. The index stops at 8, so a staged entrance is at most 8 x 60 + 640 = 1120ms, under the 1.2s limit. `--ejm-delay` adds a fixed wait. Reveal offsets can be changed per element with `--ejm-reveal-x`, `--ejm-reveal-y` and `--ejm-reveal-scale`.
- `draw-on` on an inline `<svg class="art">`: each `<path pathLength="1">` draws on once, in order (700ms plus 40ms per path, at most 11 steps). Without the class, or under reduced motion, the art is fully drawn. Add the class from script (in view), so without scripts the final state shows at once.

**Scroll reveal contract for the hooks (tasks 5.1 and 5.2).** The `useReveal` hook sets `data-reveal` and nothing else is hidden by CSS:

| Attribute | Meaning |
| --- | --- |
| `data-reveal="pending"` | Hidden (opacity 0, offset). Set by the hook only on elements below the fold, before first paint, while it is running. |
| `data-reveal="in"` | Plays `ejm-reveal` once and ends in the natural state. Set when the element enters the viewport; the hook then stops observing. |
| `data-reveal-from="up\|fade\|scale\|left"` | Direction. Default is up. |
| `--ejm-i`, `--ejm-delay` | Stagger and delay, as above. |

Under reduced motion, with scripts off, and in print, `pending` hides nothing. The hook must also set `in` on a timer if the observer never fires, so content can never stay hidden.

## Focus, touch and rules

- `:focus-visible` gets a 2px `--ejm-focus` outline with 2px offset, globally. `focus-ring` does the same for a custom control that removes it. `ring-focus` is the focus color for a `ring-*` utility.
- `touch-target`: at least 44 by 44px on coarse pointers. Use it on block, flex or inline-flex controls; inline links in running text are exempt. An action row (`Actions`, `AppActions` and the `actions` of `Hero` and `Section`) gives a bare link in it this target too.
- `compact-target`: at least 32 by 32px on fine pointers, for the compact density. Use it with `touch-target` (the two media queries never apply together).
- `sr-inline`: screen reader text that stays in the flow (inside links and table cells), where `sr-only` could sit outside a scroll region.
- `animate-slide`: the `animate-enter` rise without the fade, for text that can be the LCP.
- `hairline` (1px line on the bottom edge), `hairline-t` (top edge). `border` utilities default to the line color.
- `link` (color, underline, 2px on hover) for classed anchors. Bare `<a>` elements with no class already get it.
- `skip-link`: first focusable element on every page, `<a href="#main" class="skip-link">`. Visible on focus.
- `duration-*`, `ease-*`, `shadow-*`, `rounded-*` as above. `sr-only` is Tailwind's own.

## The control system

Every control comes from one recipe (`packages/ui/src/control-recipes.mjs` for buttons and fields, and the same values in every other control), so controls placed side by side agree. The values:

| Property | Value |
| --- | --- |
| Height | `min-h-11` (44px). Compact: `min-h-8` with `compact-target` (32px on a fine pointer), and `touch-target` keeps 44px on a coarse pointer. This covers Button, Input, Select, Tabs triggers, menu items, Disclosure summaries, header nav items, the `AppShell` side nav items, the theme toggle, and checkbox, radio and switch rows. Textarea keeps `min-h-28`. |
| Radius | Buttons, switches and the theme toggle `rounded-pill`. Fields, checkboxes, menu items, nav items, tabs and the tooltip `rounded-control`. Dialog, menu, toast and the header phone menu `rounded-window`. Radio buttons `rounded-full`. |
| Type | `text-base` (16px), `text-sm` (14px) when compact. Weight 600 for buttons and the current tab, 400 otherwise. Labels and metadata use `text-meta`. |
| Button variants | `primary`: Sage fill, Forest on hover. `secondary`: transparent with `border border-control`, `bg-tone` on hover (a hairline outline, never a fill). `ghost`: transparent, `bg-tone` on hover. `link`: underlined text. `danger`: the danger fill. Sizes `md` and `icon` only (`icon` is a 44px square, 32px compact, and sizes the icon inside it: 20px, 16px compact). |
| Icons | The kit ships no icon set. An icon button (`Button size="icon"`) takes a `lucide-react` icon as its child and an `aria-label`; a consumer adds `lucide-react` to its own dependencies. See `COMPONENTS.md`, "Icons in icon buttons". |
| Hover | A filled control changes to its hover token. Every other interactive surface (ghost and secondary buttons, nav items, menu items, rows, tabs) fills with `hover:bg-tone`. Links thicken their underline to 2px. All instant. |
| Pressed | Buttons sink to `scale-[0.97]` under `motion-safe`. Nothing else scales. |
| Focus | The global `:focus-visible` outline: 2px `--ejm-focus`, 2px offset. Components add nothing, except `focus-visible:outline-offset-[-2px]` where an ancestor clips the outline (menu items, tabs in a scroller, the phone menu rows). |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none`, and the same for `aria-disabled`. |
| Overlay | Dialog, menu, toast and the header phone menu: `rounded-window border border-line bg-ground text-fg shadow-float`, entering with `animate-fade`. The tooltip is the small one: `rounded-control border border-line bg-ground text-sm shadow-raised`. |
| Rows | List rows, fact rows, table rows and activity rows: `py-4`, compact `py-2`, separated by `hairline` and `hairline-t` only. Row text starts on the column edge. |
| Reading width | Text and forms use `max-w-measure` (68ch). |
| Status words | `Status` (`ok`, `warn`, `error`, `info`, `pending`) is the one vocabulary. `Badge` takes the same names plus `neutral`, and a dashboard delta takes them as `status`. |

### Density

A control is `comfortable` (the table above) unless its surface says otherwise. `AppShell` and `Page variant="application"` provide `compact` to everything inside them through `DensityProvider` (`lib/density.tsx`), and every control reads it, so an application page needs no prop. `DensityProvider` and `useDensity` are exported from `@ejm/ui`. A `density` prop on a control still overrides the surface. On a coarse pointer a compact control is still 44px.

### Inline code

`code` outside `pre` has one style, in `base.css`: the mono face at 0.9em, no fill and no border. No component restyles it, and `Text variant="code"` and `InlineCode` render a plain `code` element. A fenced block (`CodeBlock`) is the one flat ground, `bg-ui-editor`.

## Base styles

`html`: ground background, no font synthesis, text-size-adjust 100%, smooth scrolling (not under reduced motion), `scroll-padding-top` for a sticky header and the notch. `body`: ground and fg, `text-body` size, 1.6 line height, antialiased. `::selection`: fg on ground, inverted. `*`: border color is `line`. `code` outside `pre`: the mono face at 0.9em, no fill. `:focus-visible` as above. Forced colors keep the system focus color.

## Symbol art

Generated art lives in `packages/ui/src/art`. The inline files (`art/inline/*.svg`) use `class="art"`: lines take `--ejm-link`, `.art-accent` paths take `--ejm-primary`, `.art-fill` paths fill with `--ejm-primary`, so they read on every band. The standalone `*-light.svg` and `*-dark.svg` files use brand hex values and are for `<img>` and backgrounds on Paper, Mist or Sage (light) and Ink or a dark page (dark). Art is decorative: `aria-hidden` or `alt=""`.

## Specimens for documentation pages

A documentation page of any ejmlabs design or product shows the system with blocks of the kit, not with classes of its own. `@ejm/ui` (folder `docs`) has them, closed like every export: `ThemePair` (children under light and dark, side by side from 56rem of its own width), `DensityPair` (children comfortable and compact), `ColorSwatches` (token names, such as `HUES` from `@ejm/tokens`), `TypeScaleSample` (the six sizes and tabular figures), `ElevationSample` (the three shadows, on window-shaped outlines), `RadiusSample` (the three radii as outlines), and the demo targets `ResizableSample` and `DrawOnSample`, which take a `ref` for a hook. Each sample is fed from token names and writes its classes inside the kit, so a changed token changes every page that shows it. The gallery's `/tokens/` page is built from them.

## Do not

- No cards, panels, tiles or tonal boxes. Group with `hairline` rows, space and bands.
- No shadow outside product windows, menus and overlays; no radius except on controls and windows.
- No literal colors and no Tailwind palette names. No second font.
- No animation on anything but transform and opacity (plus the draw-on stroke offset), and always with a final state that needs no script. No transition on a color.
- No `className`, `style` or raw HTML on a public component: the kit owns every class, and `packages/ui/src/closed-api.test.ts` fails when an export accepts one.

## Measured

`node packages/ui/scripts/check-sources.mjs` builds the one stylesheet with every class the kit uses and prints its gzip size: 16.0 KB at this revision (read in this session). It holds Tailwind's reset, the band and theme variables, the window colors, the five `@font-face` rules and the utilities of every component folder. Bytes are not a bar: load time is (see `QUALITY.md`).
