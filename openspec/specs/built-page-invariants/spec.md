# built-page-invariants Specification

## Purpose

Fail a site build when a prerendered page breaks the shared structural rules, so no consumer has to test them itself.

## Requirements

### Requirement: Every prerendered page meets the structural rules

A site build with `ejmSite` SHALL fail when a prerendered HTML page lacks exactly one `h1`, skips a heading level going
down, does not start its focus order with the skip link to `#main`, lacks `main#main`, or links to another host without
`rel` containing `external`. The error SHALL name the file and the rule.

#### Scenario: Two h1 elements

- **WHEN** a route renders two `h1` elements and the site builds
- **THEN** the build fails naming that route's HTML file and the one-`h1` rule, as `packages/site/src/pages.test.mjs`
  checks

#### Scenario: The gallery and the starter

- **WHEN** `npm run build` builds the gallery and the starter
- **THEN** both pass the page rules
