# Third-party notices

## Brand materials

The ejmlabs name, logos, supplied brand artwork, design assets, templates, and
visual identity retain their owners' rights. The root [license](LICENSE) does
not grant trademark rights or relicense those materials. Retained asset origins
and hashes are recorded in [provenance](packages/tokens/assets/PROVENANCE.md).

## Fonts

Manrope and IBM Plex Mono use the SIL Open Font License 1.1. Preserve their
copyright and license notices when distributing fonts, including the WOFF2
files used by the UI:

- [Manrope notice](packages/tokens/assets/fonts/Manrope-OFL.txt)
- [IBM Plex Mono notice](packages/tokens/assets/fonts/IBMPlexMono-OFL.txt)

## Dependencies

Other dependencies retain their own licenses and notices. The root lockfile
records selected npm versions; the terminal crate has its own Cargo lockfile.
Preserve the applicable notices when redistributing dependencies or bundles.

## Package distributions

Each owned `packages/*` npm package includes a scoped `LICENSE` and
`THIRD_PARTY_NOTICES.md`. The `@ejm/tokens` asset package and `@ejm/ui` font
subsets include the original Manrope and IBM Plex Mono OFL notices. Keep the
notices with the fonts and reserved brand materials when redistributing an
allowed package or bundle.
