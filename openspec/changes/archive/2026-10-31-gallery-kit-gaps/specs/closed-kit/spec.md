## ADDED Requirements

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
