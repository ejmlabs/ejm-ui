# section-composition Specification

## Purpose

Let a page be built from sections that derive their heading level, ground, ids and spacing, so a consumer never chooses structure by hand.

## Requirements

### Requirement: Sections derive their heading level

`Section` SHALL render its title at the heading level of its context, starting at `h2`, and give its children the next
level, never above `h6`. `SectionHead` without `as` SHALL use the same level.

#### Scenario: Nested sections

- **WHEN** a `Section` contains a `Section`
- **THEN** the outer title is an `h2` and the inner title an `h3`, as `packages/ui/src/layout/Section.test.tsx` checks

### Requirement: Sections derive their ground

A top-level `Section` SHALL be a full-bleed band whose ground alternates Mist and Paper among its sibling sections,
starting with Mist, unless `emphasis` makes it Sage. A nested `Section` SHALL have no band.

#### Scenario: Three sections after a hero

- **WHEN** a page renders a `Hero` and three `Section`s
- **THEN** the sections read Mist, Paper, Mist in both themes, and the generated band selectors in
  `packages/tokens/generated/tailwind.css` are checked by `npm run check -w @ejm/tokens`

### Requirement: Sections name themselves

A `Section` SHALL label its region with its heading, using a generated id unless one is given, and SHALL space its
heading and body with one fixed rhythm.

#### Scenario: No id given

- **WHEN** a `Section` renders without `id`
- **THEN** its `section` element has `aria-labelledby` pointing at its heading's generated id
