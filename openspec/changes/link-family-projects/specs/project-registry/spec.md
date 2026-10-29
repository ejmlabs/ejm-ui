## ADDED Requirements

### Requirement: Every site links the whole family

`otherSites(id)` SHALL return every published build identity and every linked family site except the current one, build identities first, each marked external.

#### Scenario: ejm-cli's footer

- **WHEN** a site calls `otherSites('cli')`
- **THEN** it gets ejmlabs, ejm-ide, ejm-harness, ejm-ui, ejm-calm and gerry, in that order
- **AND** `packages/site/src/projects.test.ts` fails if the order or the set changes

### Requirement: Linked sites have no build identity

A linked family site SHALL NOT appear in `PROJECTS`, the analytics host map or the shared head. gerry SHALL have no source link.

#### Scenario: gerry is linked but not measured

- **WHEN** a page on meetgerry.ai or calm.ejmlabs.com asks for its analytics token
- **THEN** `analyticsToken` returns undefined
- **AND** `LINKED_PROJECTS` lists gerry with an empty `repo`

### Requirement: A published site without a token loads no beacon

A discoverable project with an empty analytics token SHALL be left out of `ANALYTICS_SITES`.

#### Scenario: The ejm-ui gallery

- **WHEN** the gallery loads on ui.ejmlabs.com
- **THEN** no analytics beacon is added
- **AND** `ANALYTICS_SITES` still maps exactly the four measured hosts (`analytics.test.tsx`)
