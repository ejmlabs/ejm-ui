# docs-specimens Specification

## Purpose

Let a docs page show a kit part under a condition (a theme, a density) and the theme's own scales with closed kit blocks, so
the gallery needs no markup of its own.

## Requirements

### Requirement: Specimens show a part under a condition

`@ejm/ui` SHALL export `Specimen` (a labelled example, optionally in a given theme), `Compare` (two specimens side by side
from 64rem) and `ThemePair` (the same children in a light and a dark specimen), with no visual props.

#### Scenario: A theme pair

- **WHEN** `<ThemePair><Button>Save</Button></ThemePair>` renders
- **THEN** there are two groups named "light theme" and "dark theme", each with `data-theme` set to its theme and its own
  copy of the button, and `packages/ui/src/docs/Specimen.test.tsx` fails if either is missing

### Requirement: The theme scales are kit blocks

`@ejm/ui` SHALL export `TypeScale` and `Elevations`, which draw the type sizes and the shadow levels from the kit's own
lists.

#### Scenario: The type scale

- **WHEN** `TypeScale` renders
- **THEN** it shows one row for each of the six type sizes, and `Specimen.test.tsx` fails if a size is missing

### Requirement: A named group of controls without a frame

`@ejm/ui` SHALL export `ControlGroup`, a fieldset with a legend for assistive technology only and no space or frame of its
own. `disabled` SHALL disable every control inside it.

#### Scenario: Controls held until a page is ready

- **WHEN** `<ControlGroup label="Page examples" disabled><Button>Save</Button></ControlGroup>` renders
- **THEN** the button is disabled, the group is named "Page examples", and `layout.test.tsx` fails if either is not so
