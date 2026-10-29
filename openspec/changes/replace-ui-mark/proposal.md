## Why

The owner asked for a new ejm-ui logo. The grid-e mark (the ejmlabs e squared onto the grid) read as a second company symbol rather than a project. Three concepts were drawn on the family grid; the owner chose to ship the u and block.

## What Changes

- `scripts/ui-assets.mjs`: the mark becomes the u and block, a 36-unit ribbon u on the 256 grid that starts as a tapered tip, like the cli, ide, harness and gerry marks, and holds one rounded-square component. Every shape winds the same way, so the u's overlap with its round end cap stays filled.
- `@ejm/tokens`: the ui family in `assets/projects/ui/` is regenerated from the new mark (marks, outlined and editable logos, icons, favicons, manifest, social card) with its provenance rows.
- Docs: the tokens README and `CHANGELOG.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `brand-families`: the ui family is generated from the u-and-block mark.

## Impact

- Package: `@ejm/tokens` (assets only; paths and file names are unchanged). The gallery uses the new mark on its next build and deploy.
- Consumers that copy the ui mark (ejmlabs.com keeps local copies) refresh them in their own repositories.
- Out of scope: the family sheets (they present the three tools), the gerry family, other generators.
