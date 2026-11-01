# Shell

Header, footer, layouts and the external link. No cards: the header, the nav and the footer are the page ground, a band, or hairlines. The only shadow is the open phone menu, which is an overlay.

Every component here is closed: no `className`, no `style`, no raw HTML. The kit owns every class, so a header, a footer and an app frame look the same on every site. Sites give content and state only.

| Export | Purpose |
| --- | --- |
| `SiteLayout` | Skip link, `Header`, `<main id="main" tabIndex={-1}>`, `Footer`. The footer sits at the bottom of short pages. |
| `Brand` | Decorative mark and optional name, intrinsic proportions, optional dark variant, and fixed navigation, project or footer placement. The surrounding link or heading supplies the accessible name. |
| `Header` | Sticky, on the page ground (an opaque `band`, so text never sits on page content while scrolling; `band` sets a matching ground when the page opens on Mist, Sage or Ink), no box or rule. Structured `identity` (required) at the left. Nav, then `ThemeToggle` last at the far right. Below 48rem of the header's own width (a container query, not the window) the nav is one native `<details>` menu. |
| `Footer` | Ink band with structured `identity`, link columns, a `privacy` slot, a `legal` line, and a safe-area bottom inset. |
| `ThemeToggle` | Sun and moon, named for its action. The ghost icon button of the control recipe: 44px, 32px on a compact surface, a pill. Uses `useTheme`. Takes no props. |
| `ExternalLink` | `rel="external noopener"`, an arrow, and ", opens another site" for screen readers. Always in the `link` style. The arrow stays on the line of the last word (a nowrap span around the last word, the arrow and the note, or a word joiner before the arrow when the label is not text), so it never wraps alone. |
| `SkipLink` | `<a href="#main" class="skip-link">`. Included by `SiteLayout` and `AppShell`. Its only prop is the label. |
| `DocsLayout` | Grid for a docs page: `sidebar`, `contents` and the article in a 68ch column. Put it inside `SiteLayout`. |
| `AppShell` | Top bar (`actions`, then the theme control), side `nav` and content, for applications. `nav` is a list of `NavItem` (`label`, `href`, `current?`, `external?`), not markup. A whole page frame with its own skip link and `main`. It makes every control inside compact (see Density). |
| `Collapse` | The shared disclosure behind the sidebars: one `<details>`, labelled on narrow screens, always visible from a breakpoint. It takes no class: `DocsLayout` and `AppShell` place and stick it through the cell around it. |
| `LinkProvider`, `useLinkComponent`, `LinkComponent`, `NavItem` | Router-agnostic links. |

`ExternalAnchor`, `NavLink` and `NavMenu` are private helpers in this folder. They are not exported from the barrel: `ExternalAnchor` is the external anchor that `ExternalLink` and `NavLink` share, `NavLink` is one nav item (external or routed, with `aria-current`) that `Header`, `NavMenu` and `AppShell` all render their items through, and `NavMenu` is the header narrow menu.

## Density

`AppShell` wraps everything it renders in `DensityProvider density="compact"` (`lib/density.tsx`). A `Button`, field, tab or menu item inside is compact with no prop: `text-sm` and 32px on a fine pointer, still 44px on touch. The theme toggle in the bar becomes the 32px icon button, and the home link takes the compact target. The bar keeps its 56px height. `Header` and `SiteLayout` stay comfortable.

## App side navigation

`AppShell` takes `nav` as items, the same `NavItem` that `Header` takes, and draws them itself:

```tsx
<AppShell
  brand={<Brand src={logo} width={605} height={256} />}
  nav={[
    { label: 'Files', href: '/files', current: true },
    { label: 'Search', href: '/search' },
    { label: 'Docs', href: 'https://example.com/docs', external: true },
  ]}
>
  ...
</AppShell>
```

Each item is a link in the control recipe, compact because the shell is: `min-h-8` with `compact-target` (32px with a mouse, 44px on touch), `rounded-control`, `text-sm`, a `hover:bg-tone` fill, instant. The current item has `aria-current="page"` and is also weight 600 with a 2px underline, so it is never color alone. Internal items render through the `linkComponent` (the shell's own, or the surrounding `LinkProvider`), and `external` items through the plain external anchor with `rel="external noopener"`. The list is one `nav` named by `navLabel` (default "Navigation"). From 768px it is a sticky column beside the content, and below that it folds into a labelled disclosure above it. A product cannot put markup or a class in the nav: a missing pattern is added here.

## Links without a router

Internal links use a `LinkComponent` (default: a plain `<a>`). Layouts take `linkComponent` and provide it to everything below, so `Header`, `Footer` and anything calling `useLinkComponent()` agree.

```tsx
const RouterLink: LinkComponent = ({ href, ...rest }) => <Link to={href} {...rest} />;
<SiteLayout header={...} footer={...} linkComponent={RouterLink}>...</SiteLayout>
```

External items (`external: true`) always render as a plain external anchor.

## Theme control slot

`Header` and `AppShell` accept `themeControl?: ReactNode`. Omit it or pass
`undefined` to keep `ThemeToggle`. Pass `null` to suppress the control. A native
page can supply a shared `Button` and attach its handler from an external
consumer script. The default toggle still needs hydration to change the theme.

## Hover and current page

One recipe for every control in the shell, and one for every link, both instant (color never transitions):

- Padded controls fill with `bg-tone` on hover: header nav items and the menu button (44px, `rounded-control`), the home link, the phone menu rows (48px) and the theme toggle.
- Links that sit on a column edge, with no box to fill, turn `text-link`: the footer links and the `Collapse` button. Links in running text use the `link` style, which thickens its underline to 2px.
- The current page is `aria-current="page"` and is also shown with weight 600 and a 2px underline, in the header, the phone menu and the footer, so it is never color alone.

## Disclosures at every width

`Disclosure` is not part of the shell. It is a component (`@ejm/ui`, from `components/ui/disclosure`), a native `<details>` that is collapsible at every width. `Collapse` is the breakpoint-based sidebar disclosure and stays here. Neither connects a product session or changes an account.

## Narrow screens, with no script

- `Header` follows its own width, not the window's. The header is a Tailwind `@container`, and the nav list shows from `@3xl` (48rem of the header) while the Menu shows below it. On a page this is the same 768px as before, and a header in a narrow preview or a half-width pane folds like one on a phone, so a docs page can show it beside another in both themes (`ThemePair`). The same rule keeps one of the list and the Menu out of the accessibility tree at any width.
- `Header`: the Menu is a native `<details>`. Closed, it takes no space. Open, the list is an overlay under the bar, so nothing moves: `rounded-window`, a `border-line` hairline border, `bg-ground`, `shadow-float`, inset to the page gutter rather than edge to edge, entering with `animate-fade` (opacity only). Rows are separated by hairlines and each is a 48px target. A small effect adds Escape (focus returns to the button), a press outside, and closing after a link is chosen.
- `Header` at large text: narrower than 20rem of its own width (a 320px phone at normal text is exactly 20rem, so this is larger text or a narrow pane) the bar wraps instead of scrolling the page sideways. The brand is on the first line, its mark stacked over its name when the two do not fit side by side (the name still never breaks), and the Menu and the theme toggle sit at the end of the next line. The bar is at least `--ejm-header-h` tall and grows when it wraps. The open Menu stops at the bottom of the viewport measured from the header as it is, so every link stays reachable from the keyboard. Nothing changes at normal text size. `AppShell`'s top bar does the same: at least 56px tall, wrapping below 20rem of its own width, with its actions and theme toggle at the end.
- `DocsLayout` and `AppShell` render the sidebar once, in a `<details>` that is closed on narrow screens in the server HTML. From the breakpoint up (1024px sidebar, 1280px contents, 768px app nav) the button is hidden and `::details-content` is forced visible, so there is no duplicate markup and no script. Browsers without `::details-content` keep the button (it is hidden only where the browser supports that pseudo-element, through `supports-[selector(::details-content)]`) and get a small effect that opens the details on wide screens, so the content is reachable with or without script.
- Source order in `DocsLayout` is sidebar, contents, article, which is also the phone order.

## Accessibility notes

- Landmarks: `header` (banner) with one `nav` named "Main" (the list from 48rem of the header's width, the Menu disclosure below, never both in the accessibility tree), `main#main` with `tabindex="-1"`, `footer` (contentinfo) with one `nav` named "Footer" whose column headings name the groups, and the docs navs "Documentation", "On this page" and "Previous and next pages". Every name is unique, which `shell.test.tsx` checks with axe on a whole docs page. A router can move focus to `main` after navigation. Each page has one `h1`.
- `aria-current="page"` marks the current link, with a bold underline as well, so it is not color alone.
- The toggle's name changes with its state ("Switch to dark theme"), and a polite status region says the result. It does not use `aria-pressed`, so name and state never disagree.
- Targets are 44px: the toggle, nav items, the Menu button and the home link by height, the footer links through `touch-target` on coarse pointers. Rows inside the phone menu clip their focus outline, so they draw it inside the row. Contrast was checked by script in both themes for header, footer, nav and app shell.
- Native `<details>` is used instead of a Radix collapsible: it works without script and needs no state.

## Shared identity

`Brand placement="project"` inherits its heading type from `Rows` or `SectionHead` and keeps the shared project mark size. The containing heading controls the name size.

`Header` and `Footer` accept `identity={{ name, artwork, description }}`. `name` is plain text. `artwork` is optional and contains `src`, optional `darkSrc`, and intrinsic `width` and `height`. Supply the standalone mark when also showing a name. The footer uses `darkSrc` on its permanent Ink ground in either page theme. Both shell components own brand spacing, scale and type. `Header` requires `identity`; there is no `logo`, `brand` or `className`.

Brand names stay on one line, including names with hyphens. In `Rows`, the title column reserves the intrinsic name width so the description cannot overlap it.
