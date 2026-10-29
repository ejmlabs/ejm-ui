## Context

`PROJECTS` holds build identities: sites built with `@ejm/site`, each with a head, icons and an analytics token. Discovery (`PROJECT_LIST`) feeds public lists, footers and the analytics host map. ejm-calm (a three.js scene with no analytics) and gerry (a commercial product with its own site and analytics) are not built with `@ejm/site`.

## Decisions

- **Linked sites are a separate list.** Adding calm and gerry to `PROJECTS` would give them build identities they do not use and put empty or foreign hosts in the analytics map. `LINKED_PROJECTS` carries only `id`, `name`, `url` and `repo`. `otherSites` appends it after discovery, so every footer lists the whole family in one order: ejmlabs, cli, ide, harness, ui, calm, gerry.
- **ui joins discovery without analytics.** The condition in the registry comment is met: the gallery is live at ui.ejmlabs.com (checked in a browser on 28 October 2026). The gallery states it has no analytics, so its token stays empty. `ANALYTICS_SITES` filters out empty tokens, which keeps the host map at the four measured sites.
- **One family generator.** The ui script's body moves unchanged into `writeFamily({ id, name, mark, tagline, kicker, host })`. `node scripts/ui-assets.mjs --check` passing on the moved code proves the ui output did not change. gerry is a second thin config.
- **Provenance rows stay in place.** Each generator used to delete its rows and insert them before a fixed marker, so the last generator run moved its rows and the other family's check failed. Rows that exist are now replaced where they are; a new family is inserted before the marker.
- **The gerry mark.** The approved standing G on the 256 grid: a tapered ribbon arc (radius 76, 36 units) and a 36-unit crossbar with round ends, both wound counterclockwise so the overlap fills under the nonzero rule. Ink spans 34 to 222 on both axes.

## Risks

- Consumers that pin this revision gain three footer links. That is the intent; each consumer's own tests that count footer links need updating when it bumps its pin.
