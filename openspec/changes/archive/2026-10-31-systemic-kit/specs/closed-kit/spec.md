## ADDED Requirements

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
