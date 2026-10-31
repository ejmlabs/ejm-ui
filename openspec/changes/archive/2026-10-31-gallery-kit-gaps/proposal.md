## Why

The systemic-kit change (PR #59) closed every public `@ejm/ui` component to `className` and `style` and rebuilt the
gallery on `Hero` and `Section`. The gallery agent then reported four places where the kit still had no closed answer,
each worked around with local markup in `apps/gallery/src`:

1. `AppShell` takes its side navigation as free markup, so `routes/app-shell.tsx` writes a raw `<a>` class string.
2. `Header` switches its nav to the phone menu at the `md` viewport width, so a narrow preview cannot show the menu.
3. `Button size="icon"` does not size an icon, so the gallery defines a local `PlusIcon` with its own size class.
4. `specimen.tsx` holds the gallery's own specimen layouts (theme pairs, density comparison), and `tokens.tsx` draws
   swatches, the type scale and the shadows with raw utilities.

The gallery is also the one consumer the design guard skips (`libraryGallery` in `packages/ui/src/design-guard.mjs`).
A probe run of the guard over `apps/gallery/src` without the exemption reported 41 issues in nine files. Until those are
gone the gallery cannot prove that a site builds from the kit alone.

## What Changes

- **`AppShell` nav items.** `nav` takes `readonly NavItem[]` (`label`, `href`, `current`, `external`) and renders the
  compact side list from the control recipe. **Breaking** for a caller that passed markup; no ejmlabs repository uses
  `AppShell` (searched ejmlabs, ejm-cli, ejm-ide, ejm-harness, ejm-calm and ejm-chess).
- **`Header` follows its own width.** The header is a size container, and its nav switches between the inline list and
  the Menu button at a 48rem container width instead of the `md` viewport width. A full-width header behaves as before.
- **Icons in icon buttons.** `Button size="icon"` sizes its `svg` child (20 px, 16 px compact, as `ThemeToggle`). The
  kit does not re-export an icon set: consumers pass `lucide-react` icons, the set the kit itself uses.
- **Specimen blocks.** `@ejm/ui` exports `Specimen`, `Compare`, `ThemePair`, `TypeScale` and `Elevations` as docs parts.
  The gallery's `specimen.tsx` is removed; the hue swatches use `Legend`.
- **`ControlGroup`.** A named group of controls with no frame of its own, which `disabled` turns off as a whole. The
  gallery's deferred pages use it instead of a classed `fieldset`.
- **`Art drawOn` draws when seen.** `Art` draws its lines on once when it scrolls into view, through `useDrawOn`, which
  now accepts any element. Art at the top of a page still draws at load.
- **The guard reads `?url` style imports.** `import sheet from './styles.css?url'` is a local CSS entry like
  `import './styles.css'`, so the guard accepts it.
- **The gallery is guarded.** `libraryGallery` is removed, the gallery's own `@source` lines go, and every gallery file
  passes the same guard as any consumer.

## Capabilities

### New Capabilities

- `docs-specimens`: closed blocks that show a kit part under a condition (a theme, a density) and the theme scales.

### Modified Capabilities

- `closed-kit`: AppShell nav items, the header's container width, icon sizing in icon buttons, and the gallery under the
  design guard.

## Impact

- Touches `packages/ui` (shell, button recipe, docs, layout, motion, design guard), `packages/site` (guard tests),
  `apps/gallery` and the guides. `examples/starter`, `crates/ejm-tui`, `@ejm/ink`, `@ejm/core`, `@ejm/demos` and the
  tokens are out of scope.
- Consumers pick it up by moving their pin. `AppShell` has no consumer; the header change shows the same nav at full
  width. Consumers that want icon buttons add `lucide-react` at the kit's range.
- Stacked on PR #59, which has not merged yet.
