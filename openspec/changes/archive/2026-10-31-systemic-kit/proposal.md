## Why

The owner wants building blocks that produce one cohesive, modern, minimal design however they are combined, with the
library enforcing it, so nobody has to tell a consumer or an agent how to style anything.

Two reviews of the kit and its seven consumer repositories found the opposite in places:

- 62 public components accept `className` and `style`. Only a consumer-side lint stops them, and only for sites built
  with `ejmSite`.
- Consumers choose heading levels (`as="h1"` 22 times), band tones by hand (paper 20, mist 16, sage 15, ink 3), section
  spacing (`SectionBody`) and ids.
- Controls disagree: heights of 32, 36, 40, 44, 48 and 56 px, a 5 px and a 6 px control radius, three overlay chromes,
  instant and 200 ms hover changes, and a menu focus state under 3:1.
- Seven stylesheet entries form a silent-failure matrix: a missing partial drops classes without an error.
- Every linked consumer copies the same Vite `dedupe`, React type `paths` and build options, and lists the Tailwind and
  React plugins itself.
- The native static profile, its `@ejm/site/native` check and the web terminal views have no consumer in any ejmlabs
  repository but carry product recipes (pairing, fingerprint, composer).

## What Changes

- **Closed components.** No public component accepts `className`, `style` or `dangerouslySetInnerHTML`. A type test over
  the `@ejm/ui` barrel fails when one does. Legacy visual props (`Hero.size`, `Hero.tone`, `SectionHead.size`,
  `Header.logo`, `Footer.brand`, Button `size` `sm` and `lg`) are removed.
- **Derived composition.** A new `Section` block derives its heading level from nesting, its ground by alternating Mist
  and Paper after the hero (Sage when `emphasis`), its ids and its spacing. `SectionHead` reads the same heading level
  when `as` is omitted. Density comes from context: `Page variant="application"` and `AppShell` make their controls
  compact; the `density` prop stays as an override.
- **One control system.** Every control is 44 px, or 32 px compact on a fine pointer. Fields and menu items use the
  control radius, buttons the pill. One overlay chrome (window radius, hairline, float shadow). Color changes are
  instant; only transform and opacity animate. One focus outline.
- **One stylesheet.** `@ejm/ui/styles.css` covers every component and turns off automatic source detection.
  `styles-site.css` and `styles-docs.css` stay as forwarders. `styles-app.css`, `styles-static.css`,
  `styles-terminal.css` and `static.css` are removed.
- **Zero-config consumption.** `@ejm/ui/vite` exports `ejmUi()` (Tailwind, React, one React copy, the design guard).
  `@ejm/site/vite` exports `ejmlabs({ project })`, the whole site preset. `@ejm/ui/tsconfig.json` is a base config that
  resolves one copy of the React types for linked and installed packages.
- **Built-page invariants.** A site build fails unless every prerendered page has one `h1`, no skipped heading level,
  the skip link first, `main#main` and `rel="external"` on links to other hosts.
- **Smaller surface.** Remove the native static profile (`src/static`, `static.css`, `build-static.mjs`,
  `@ejm/site/native`, `native-html.md`), the web terminal views (`src/terminal`, `@ejm/ui/components/TerminalWorkspace`)
  and the `display-lg` and `stat` type sizes. The terminal contract and its Ink and Rust targets are unchanged.
- **Docs that match.** Rewrite `ADOPTION.md` around the preset and the real state of each consumer, update
  `THEME.md`, `COMPONENTS.md`, the layout, shell and package guides, the repository skills and `CHANGELOG.md`.

## Capabilities

### New Capabilities

- `closed-kit`: public components accept content, state and accessible attributes only.
- `section-composition`: sections derive heading level, ground, ids and spacing.
- `zero-config-consumption`: one Vite preset, one base tsconfig and one stylesheet.
- `built-page-invariants`: the site build checks every prerendered page.

### Modified Capabilities

None. The two main specs (`capture-source-selection`, `terminal-conversation-blocks`) are unaffected.

## Impact

- Packages: `@ejm/ui` (components, styles, exports, dependencies), `@ejm/site` (preset, guard, page check, removed
  `native` export), `@ejm/tokens` (band generator, shadcn aliases), `@ejm/demos` (closed props it passes), the gallery
  and the starter.
- Consumers: studio (`ejmlabs/ejmlabs/site`), `ejm-cli/site` and `ejm-chess` keep building at the new pin. They already
  pass no `className` or `style` (the guard rejects them) and none imports a removed path. They can then drop their
  Vite, tsconfig and Tailwind glue. Each moves its pin in its own repository.
- Out of scope: product behavior in ejm-cli, ejm-ide and ejm-harness; migrating the IDE app, IDE website and harness
  site off the old copied kit; publishing packages; `crates/ejm-tui` and `@ejm/ink`.
