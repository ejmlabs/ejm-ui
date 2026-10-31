# closed-kit Specification

## Purpose

Keep every ejmlabs surface on one design by letting public components take content, state and accessible attributes only, with every control drawn from one recipe.

## Requirements

### Requirement: Public components accept no visual overrides

No component exported from the `@ejm/ui` barrel SHALL accept `className`, `style` or `dangerouslySetInnerHTML`. Props
carry content, state, identity and accessible attributes only.

#### Scenario: A consumer passes a class

- **WHEN** code passes `className` or `style` to any public `@ejm/ui` component
- **THEN** `npm run typecheck` fails, and `packages/ui/src/closed-api.test.ts` names the component when one is opened

### Requirement: Controls share one recipe

Buttons, fields, selects, tabs, menu items, disclosure summaries, header nav items and the theme toggle SHALL share one
height (44 px, or 32 px compact on a fine pointer and still 44 px on a coarse pointer), one focus outline, one disabled
treatment and instant color changes. Overlays SHALL share one chrome.

#### Scenario: Compact controls side by side

- **WHEN** a compact Button, Input and Select render in one row on a fine pointer
- **THEN** each is 32 px tall, and the density test in `packages/ui/src/components/density.test.tsx` fails if one differs

### Requirement: Density follows the surface

Controls inside `AppShell` or `Page variant="application"` SHALL render compact without a `density` prop. A `density`
prop overrides the surface.

#### Scenario: A button in an application page

- **WHEN** a `Button` renders inside `Page variant="application"` with no `density` prop
- **THEN** it has the compact classes

### Requirement: AppShell takes nav items

`AppShell` SHALL take its side navigation as `readonly NavItem[]` and render each item as a compact control from the
control recipe, with the current item marked by `aria-current="page"`, weight 600 and an underline.

#### Scenario: The current item

- **WHEN** `AppShell` renders `nav={[{ label: 'Files', href: '#files', current: true }, { label: 'Search', href: '#search' }]}`
- **THEN** the nav holds two links, only `Files` has `aria-current="page"`, and `packages/ui/src/shell/shell.test.tsx`
  fails if the item classes leave the recipe

### Requirement: The header nav follows the header's width

`Header` SHALL switch between the inline nav list and the Menu button by the width of the header (a 48rem container
query), not by the viewport width, so a header in a narrow column shows the Menu button.

#### Scenario: A header in a narrow column

- **WHEN** a `Header` with nav items renders in a column narrower than 48rem on a desktop viewport
- **THEN** the Menu button is shown and the inline list is not, and `shell.test.tsx` fails if the switch goes back to a
  viewport breakpoint

### Requirement: Icon buttons size their icon

`Button size="icon"` SHALL size its `svg` child to 20 px, or 16 px when compact, whatever size the icon asks for.

#### Scenario: A lucide icon in an icon button

- **WHEN** `<Button size="icon" aria-label="Add"><Plus /></Button>` renders
- **THEN** the button carries the icon size classes for its density, and `button.test.tsx` fails if they are missing

### Requirement: The gallery passes the consumer guard

The design guard SHALL check `apps/gallery` like any other consumer, with no exemption.

#### Scenario: The gallery source

- **WHEN** `siteDesignGuard('apps/gallery').validate()` runs
- **THEN** it reports no issue, and `packages/site/src/design.test.mjs` fails if a gallery file adds a class, a style or
  local CSS
