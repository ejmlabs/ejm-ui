# ejm-ui

ejm-ui is the ejmlabs design system: tokens, theme, components, hooks, layouts and views for every ejmlabs site and app.

## Names

| Thing | Name |
| --- | --- |
| Repo | `ejm-ui` |
| Packages | `@ejm/tokens`, `@ejm/ui`, `@ejm/demos` |
| Apps | `@ejm/gallery` |
| Class and CSS variable prefix | Tailwind utilities only, theme variables `--ejm-*` |
| Siblings | `ejm-cli`, `ejm-ide`, `ejm-harness` at `../ejm-cli`, `../ejm-ide`, `../ejm-harness`, not part of this repo |

## Rules

- Brand fonts are Manrope and IBM Plex Mono only. The palette comes from `packages/tokens`. Never add a color outside it.
- No cards, panels, tiles or tonal boxes. Group with type, space, hairline rows and full-bleed bands.
- Only product windows, menus and overlays have a shadow.
- Motion is transform and opacity only and must show the final state under reduced motion.
- No em dashes in any file. Write plain, clear sentences.
- No outward actions without the owner's approval: creating a remote, pushing, publishing, deploying.
- One runtime: real React 19 and `react-dom`. Do not add Preact or any compat alias.

## Package reuse

Do not handroll functionality when a trusted, maintained package already meets the requirements. Check the standard library, platform APIs and existing dependencies first, then evaluate established packages. Keep custom code to product-specific behavior and thin adapters.

## Tests must earn their place

Every test must protect meaningful behavior, a contract or a concrete regression risk. Do not add tests that mirror implementation or retest a dependency.

## Campground rule

Leave the area you touch better than you found it, within the task's scope. Record larger follow-up work instead of starting an unrelated rewrite.
