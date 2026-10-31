# Adopting ejm-ui

How a site or an app moves onto ejm-ui, and where each ejmlabs consumer stands today. Use `examples/starter` as the reference consumer and check each source revision before adopting it. Sibling links and local tarballs do not require registry publication. Creating a remote and publishing a package each need the owner's approval; deploys follow merged main.

## What you depend on

| Package | What it gives a consumer |
| --- | --- |
| `@ejm/tokens` | Palette, fonts, brand files (favicon set, logos, social card), generated Tailwind theme, Monaco and terminal themes. |
| `@ejm/ui` | Components, layouts, hooks, `styles.css` (the one stylesheet), `theme-boot.js`, the Vite preset `ejmUi()` (`@ejm/ui/vite`), the design guard and the base `tsconfig.json`. |
| `@ejm/core` | Framework-neutral logic that `@ejm/ui` uses. Installed with it. |
| `@ejm/ssg` | Prerender plugin, `hydrateSite`, `Link`, the `ejm-ssg` build and dev commands. Sites only. |
| `@ejm/site` | The site preset `ejmlabs()` (`@ejm/site/vite`), project registry, analytics, shared head, theme boot, headers (`ejm-site-headers`) and the built-page check. Sites only. |
| `@ejm/demos` | The simulated product screens (static views, lazy interactive demos, the product hero). Only a site that shows a product demo. |

`@ejm/ui` carries its own build tools: `tailwindcss`, `@tailwindcss/vite`, `@vitejs/plugin-react` and `postcss` are its dependencies, so a consumer lists none of them. `react`, `react-dom` and `vite` are its peers, so a consumer lists those.

The packages ship TypeScript source for what the consumer's Vite bundles (components, hooks, the `@ejm/ssg` client and server render code). What Node itself loads (`@ejm/ui/vite`, `@ejm/ui/design-guard`, `@ejm/ssg/vite`, `@ejm/site/vite`, the `ejm-ssg` and `ejm-site-headers` commands) is plain `.mjs` with `.d.mts` types, because Node refuses to strip types from TypeScript under `node_modules`. Use Node 22.12 or later.

## 1. Get the packages before a registry exists

Before building or using linked packages, run `npm ci --ignore-scripts` inside `ejm-ui` to install its committed lockfile. Linked packages resolve their own dependencies from there, and the linked build tools and React types come from that install. Keep dependency lifecycle scripts disabled for this setup. Linux terminal fixture tests and capture need a separate, explicit `node-pty` rebuild; see [Development](README.md#development). The site build does not need that native rebuild.

### A. Link from a sibling checkout

Keep `ejm-ui` next to the product repo (`../ejm-ui`) and point at the package folders. In the consumer `package.json`:

```json
{
  "dependencies": {
    "@ejm/core": "file:../ejm-ui/packages/core",
    "@ejm/site": "file:../ejm-ui/packages/site",
    "@ejm/ssg": "file:../ejm-ui/packages/ssg",
    "@ejm/tokens": "file:../ejm-ui/packages/tokens",
    "@ejm/ui": "file:../ejm-ui/packages/ui",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "vite": "^8.3.4"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "typescript": "^5.9.0"
  }
}
```

`npm install` makes symlinks, so an edit in `ejm-ui` shows up at once, and the Node type-stripping limit does not apply (the real path is outside `node_modules`). Add `"@ejm/demos": "file:../ejm-ui/packages/demos"` for a site with a product demo. An app without `@ejm/site` and `@ejm/ssg` leaves those two out.

Listing `@ejm/core` and `@ejm/tokens` yourself matters: `@ejm/ui` depends on them at exactly `0.1.0`, and with no registry npm can only satisfy that from your own entries. Keep `@types/react` and `@types/react-dom` at the versions ejm-ui uses (`^19.3.0` today).

Linking used to need two pieces of glue in every consumer, and the kit now carries both:

- **One React at build time.** `ejmUi()` sets `resolve.dedupe` for `react` and `react-dom`, so the linked packages and the app load one copy. Do not add your own.
- **One copy of the React types.** `@ejm/ui/tsconfig.json` (the file is `packages/ui/src/consumer.tsconfig.json`) holds the strict compiler options, `types: ["vite/client"]` and `paths` for `react`, `react-dom` and `vite` with two candidates each: the `node_modules` of the checkout the package really lives in (the ejm-ui checkout when linked), then the consumer's own `node_modules` (when installed from a tarball). Without it `tsc` fails inside `@ejm/ui` with "Two different types with this name exist, but they are unrelated". Extend it and write no `paths` of your own.

### B. Tarballs with `npm pack`

From `ejm-ui`:

```sh
mkdir -p ../tarballs
for p in tokens core ui ssg site demos; do npm pack -w packages/$p --pack-destination ../tarballs; done
```

Route B for a lab site that uses `@ejm/site` or `@ejm/demos` also needs the brand artwork the public `@ejm/tokens` tarball leaves out: after installing, copy `packages/tokens/assets` over `node_modules/@ejm/tokens/assets` (as `scripts/pack-proof.mjs` does). A site that uses only the four public packages needs no copy; lab sites normally use route A.

In the consumer, use `"@ejm/core": "file:../tarballs/ejm-core-0.1.0.tgz"` and the same for the others (leave out `demos` if the site has no product demo), with the same React and tooling dependencies as above. To update, repack, delete `node_modules/@ejm` and `package-lock.json`, and install again (npm will not refresh a tarball of the same version otherwise). Commit the lockfile.

Use `node scripts/pack-proof-publish.mjs` to prove the four public packages (`@ejm/tokens`, `@ejm/core`, `@ejm/ui`, `@ejm/ssg`) from their tarballs alone: it installs only those, type checks a probe of the documented entry points, builds an app with `ejmUi()` as its whole plugin list, and checks that the design guard stops a build that adds a `className`. Use `node scripts/pack-proof.mjs` to check the tarball route end to end for the lab's own sites: it packs the six packages, installs only the tarballs into a throwaway copy of `examples/starter` outside this repo (React, Vite and TypeScript come from the registry as the consumer's own dependencies), writes the recipe below (`ejmlabs()` as the whole plugin list, `extends: "@ejm/ui/tsconfig.json"`, one `@import "@ejm/ui/styles.css"`), runs `ejm-ssg build`, `ejm-site-headers dist/_headers --check` and a typecheck, and diffs the HTML against the workspace build. **Both need network access to the npm registry, so they are not part of `npm run check`.** Run them after changing a `package.json`, a `files` or `exports` field, or one of the Vite plugins. Without `--dir`, the script creates a new temporary folder. To choose a folder, pass `--dir <folder>` outside the repo and reserve it for this tool: the script recursively deletes and recreates its subfolders. It leaves the output folder in place for inspection. Results apply to the source and environment checked.

What the tarballs hold (the `files` field of each package; compressed sizes from `npm pack --dry-run` on 31 October 2026):

| Package | Tarball | Contents |
| --- | --- | --- |
| `@ejm/tokens` | about 0.31 MB | `theme.json`, `src`, `generated`, `rust`, and under `assets` only `fonts/` (with OFL notices), `brand/` (palette and token JSON) and `icons/`. Logos, favicons, lockups, motifs, social cards, templates and project families stay in this repo; the owner reserves them. |
| `@ejm/core` | about 11 KB | `src` and `contract.json`, no tests. |
| `@ejm/ui` | about 220 KB | `src` without tests, `public/theme-boot.js`, `THEME.md`, `COMPONENTS.md`. |
| `@ejm/ssg` | about 19 KB | `bin`, `src` without tests and perf tests, README. No fixtures. |
| `@ejm/site` | about 23 KB | `bin`, `src` without tests, README. |
| `@ejm/demos` | about 92 KB | `src` without tests, README, fixtures. |

The deep imports that resolve and type check for an outside consumer are the `exports` of `packages/ui/package.json`; [COMPONENTS.md](packages/ui/COMPONENTS.md#deep-imports-that-stay-public) lists them. Anything not in the `exports` is private.

## 2. Set up a site

A site is four files of configuration, then its own routes. These are the same files as `examples/starter`.

`package.json`: the dependencies above, with these scripts:

```json
{ "scripts": { "dev": "ejm-ssg dev", "build": "ejm-ssg build", "typecheck": "tsc -p tsconfig.json --pretty false" } }
```

`vite.config.ts`: the whole plugin list is one call.

```ts
import { defineConfig } from 'vite';
import { ejmlabs } from '@ejm/site/vite';

export default defineConfig({ plugins: [ejmlabs({ project: 'cli' })] });
```

`ejmlabs({ project, site = 'src/site.tsx', headers })` returns `ejmUi()` (Tailwind, React, one React, the design guard), `ejmSite()` (shared head, files and headers, and the built-page check), `ejmSsg()` (the prerenderer) and the shared build options (`build.target: 'es2022'` and `build.cssMinify: 'lightningcss'`, unless the site sets them). Keep any other plugin of your own in the same list. `ejmSite` and `ejmSsg` stay exported for a site that wants to place them itself.

`tsconfig.json`:

```json
{ "extends": "@ejm/ui/tsconfig.json", "include": ["src", "vite.config.ts"] }
```

`src/styles.css`:

```css
@import "@ejm/ui/styles.css";
```

A product demo site adds the demo stylesheets after it, for example `@import "@ejm/demos/cli.css";`. No `source(none)`, no `@source` line, no Tailwind or React plugin, no `resolve.dedupe`, no `paths` and no `vite-env.d.ts`: the preset and the base config carry them.

The rest of the starter is the site itself:

```
index.html            the two ssg markers, charset, viewport with viewport-fit=cover
.gitignore            node_modules, dist, .ejm-ssg
src/main.tsx          void hydrateSite(site)
src/site.tsx          defineSite({ ...siteDefaults('cli'), App, routes, notFound })
src/shell.tsx         App: SiteLayout (Header, Footer, linkComponent={Link}) and <Analytics />
```

Notes that cost time when missed:

- **Import deep or by name.** `@ejm/ui` has `sideEffects: ["*.css"]`, so `import { Section } from '@ejm/ui'` tree-shakes to the same bytes as `@ejm/ui/layout/Section` (`packages/ui/scripts/check-treeshake.mjs` checks it). A bare `@ejm/ui` in a module that runs in the first load is still worth avoiding when you only need one thing (`@ejm/ui/font-preloads`). `@ejm/site` and `@ejm/demos` never import the barrel.
- **Vite config import order.** The ejm-ide site reported TypeScript 6.0.3 crashing with "parameter should have errors" when the `@ejm/*` imports in `vite.config.ts` came before the `vite` import. A throwaway consumer with that project's `tsconfig` options typechecked cleanly on 6.0.3 and 5.9, so this looks specific to that project's file set. If it happens, put the `vite` import first.
- **Routes** are written the way Cloudflare serves them: `/about/` with the slash, so there is no redirect. One `h1` per route, and `head: { title, description }` on each.
- **Links.** Internal links use `Link` from `@ejm/ssg` (give it to `SiteLayout` as `linkComponent`). A link to another host needs `rel="external"` or the build fails (see section 4). Other sites use `otherSites('cli')` from `@ejm/site/projects` in the nav or footer, which renders `ExternalLink`, or `<Row external>`: both set `rel="external"`. It lists the published build identities, then the linked family sites in `LINKED_PROJECTS` (ejm-calm and gerry), so a site does not keep its own list of them.
- **Header.** `Header` requires `identity` (a name and an optional mark), puts the nav and then the theme control last in the tools group, at the far right. `themeControl` omitted or `undefined` keeps `ThemeToggle`; `null` suppresses it. A replacement stays in that final slot.
- **Heavy features are lazy.** A route with a demo or code highlighting uses `load: () => import('./pages/Demo')`, so the first load only carries what the page shows.
- **A product demo.** Add `@ejm/demos` and `@import "@ejm/demos/styles.css"` (or its `@ejm/demos/ide.css` entry for the current IDE views) after the `@ejm/ui` import, and import the entry for the product you show, so you do not ship the views of the other two: `LazyCliDemo` from `@ejm/demos/islands/cli-lazy` (also `ide-lazy`, `harness-lazy`), or `ProductHeroStage` with `CliHeroWindow` from `@ejm/demos/hero`. `LazyDemo` and `ProductHero` take any product but carry all three views (about 5 KB gzip more). Details and measured sizes: `packages/demos/README.md`.
- **Prose that needs no script.** A docs page keeps its text in the HTML with `<Static>` from `@ejm/ssg` (see `packages/ssg/README.md`), which keeps the guide text out of the JavaScript.
- **Static pages that are not routes** (copied brand assets) are measured as routes by the load-time check. Skip them with `ignore: ['brand/assets/**']` in `defineSite`, or `node scripts/perf.mjs <dist> --ignore <glob>`. They are not checked by the page rules of section 4.

### Theme boot, head, analytics, headers (all from `@ejm/site`)

`ejmlabs({ project: 'cli' })` does the head and the files, `siteDefaults('cli')` does the route head, and `<Analytics />` goes once in `App`. After a build, `dist` holds `theme-boot.js` (an external file, so the policy keeps `script-src 'self'`), the favicon set, `site.webmanifest`, `social-card.png` and `_headers`. Details and every option are in `packages/site/README.md`. The shared rules to keep:

- The theme choice is the `ejm-theme` cookie on `.ejmlabs.com`, so a visitor who picks dark on one site sees dark on the others on first paint. `?theme=dark` is a test override that is never saved.
- Analytics is Cloudflare Web Analytics only, off on localhost and previews, off for Do Not Track and Global Privacy Control, no cookies. Say so in the footer `privacy` slot, as the starter does.
- The headers are the one shared policy. A site must not hand-edit `_headers` or keep its own copy in `public/`. To extend the policy (an image host), pass `headers: { extra: { 'img-src': [...] } }` to `ejmlabs()`.
- `ejm-site-headers dist/_headers --check` verifies a built or committed file against the policy.

## 3. Set up an app

An app that is not a prerendered site (no `@ejm/ssg`, no `@ejm/site`) uses the `@ejm/ui` preset alone. Depend on `@ejm/tokens`, `@ejm/ui` and `@ejm/core` (and `react`, `react-dom` and `vite`, with `typescript` and the React types in `devDependencies`), then:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { ejmUi } from '@ejm/ui/vite';

export default defineConfig({ plugins: [ejmUi()] });
```

`ejmUi()` is Tailwind, React, one copy of React and the design guard. The `tsconfig.json` and `src/styles.css` are the two files in section 2. An app has no shared head, so it does two things a site gets from `ejmSite()`: copy `@ejm/ui/theme-boot.js` to `public/` and load it synchronously in `index.html` before the stylesheet, so the first frame has `data-theme`, and keep `script-src 'self'` in its own policy for the same reason (the boot script is a file). Use `AppShell`, `ThemeToggle`, the `components/ui` primitives and the hooks directly. Colors come only from the semantic names in `packages/ui/THEME.md`.

`AppShell` takes its side navigation as items, `nav={[{ label, href, current?, external? }]}`, and draws them as compact control-recipe links through its `linkComponent`. It takes no nav markup. See `packages/ui/src/shell/README.md`.

An icon-only control is `<Button size="icon" aria-label="Add">` with one icon child. The kit ships no icon set: use a `lucide-react` icon, which `@ejm/ui` already depends on, and add `lucide-react` (`^1.59.0` at this revision) to your own `dependencies` so the import resolves from your `package.json`. The button sizes the icon, so pass no `size` or class.

```tsx
import { Plus } from 'lucide-react';
import { Button } from '@ejm/ui';

<Button size="icon" variant="secondary" aria-label="Add a project"><Plus aria-hidden /></Button>
```

## 4. What the build enforces

Three checks stop a consumer that drifts from the kit. None is optional.

- **Types.** No public `@ejm/ui` component accepts `className`, `style` or `dangerouslySetInnerHTML`, so `tsc` fails on one. `packages/ui/src/closed-api.test.ts` keeps it that way inside the kit. Variants are closed too: a `Button` is `md` or `icon`, a `Badge` takes a `Status` word or `neutral`.
- **The design guard** (`@ejm/ui/design-guard`, run by `ejmUi()` and so by `ejmlabs()`; a config with both checks once). It reads every file under the consumer's `src` before bundling, and again in dev on file events and on HTML document requests. It rejects `className`, `class`, `style` and `dangerouslySetInnerHTML` on any element, opaque JSX spreads, `<style>` elements, stylesheet links, local CSS rules and private style imports, and the removed props of `Hero`, `SectionHead`, `Header` and `Footer`. A stylesheet may only import public `@ejm/ui`, `@ejm/tokens` and `@ejm/demos` CSS. The one exception is `<Static className="contents">` from `@ejm/ssg`. Errors read `[ejm-site:design] src/file.tsx:line:column message`. It checks the consumer's own `src`, not the packages, and is an ownership check, not a security sandbox. Every root is checked alike: this repository's own gallery (`apps/gallery`) passes it too, with no exemption. Details: `packages/site/README.md`, "Design ownership".
- **Page invariants** (`ejmSite()`, so sites). After `ejm-ssg` writes the HTML, every page must have exactly one `h1`, no skipped heading level going down (starting at `h1`), the skip link to `#main` as its first focusable element, `main#main`, and `rel` containing `external` on every link to another host. Errors read `[ejm-site:pages] about/index.html: exactly one h1 is required, found 2` and fail the build. The 404 page is checked too. An app on `ejmUi()` alone has no prerendered pages and no page check.

A consumer that needs a layout, a size or a look the kit lacks does not add a class. It adds a component or a recipe to ejm-ui, with a semantic name, and takes it at its next pin move. A documentation page that shows a theme, a density or a token uses the specimen blocks of `@ejm/ui` (`ThemePair`, `DensityPair`, `ColorSwatches`, `TypeScaleSample`, `ElevationSample`, `RadiusSample`; `packages/ui/src/docs/README.md`) rather than a layout of its own.

## 5. Build pages with `Section`

Compose a page from `Hero` and `Section`. A `Section` takes its words (title, kicker, intro, actions) and derives the rest: the heading level (`h2`, and `h3` in a nested section), the ground (top-level sections alternate Mist and Paper after the hero, Sage with `emphasis`), the id and the spacing. Keep the sections of a page as siblings so they alternate.

```tsx
import { Button, Hero, Row, Rows, Section } from '@ejm/ui';

export default function Home() {
  return (
    <>
      <Hero eyebrow="ejmlabs / starter" title="Small experiments">Tools we build in the open.</Hero>
      <Section title="Projects" kicker="01 / Projects" intro={<p>What we build.</p>} actions={<Button asChild><a href="/projects/">All projects</a></Button>}>
        <Rows aria-label="Projects">
          <Row title="ejm-cli" description="A terminal agent." href="/cli/" />
        </Rows>
        <Section title="Terminal"><p>A subsection, with no band of its own.</p></Section>
      </Section>
      <Section title="Why" emphasis><p>The Sage band.</p></Section>
    </>
  );
}
```

`Hero` renders the page's one `h1`. A control placed in an application surface (`AppShell`, `Page variant="application"`) is compact without a prop. `packages/ui/src/layout/README.md` has the full API. `examples/starter` shows the configuration, the shell and pages built from `Hero` and `Section`. The lower-level `Band`, `SectionHead` and `SectionBody` path remains supported for existing pages.

## 6. Upgrading an older pin

At the new pin, run `npm install`, `npm run typecheck` (a removed or closed prop fails here), then the site build (the design guard and the page check fail here), fix what they name, and then delete the glue below. The CHANGELOG entry for this change lists every removed prop and size with its replacement.

Removed paths and what replaces them:

| Removed | Use |
| --- | --- |
| `@ejm/ui/styles-site.css` with `source(none)`, and `@ejm/ui/styles-docs.css` | `@import "@ejm/ui/styles.css";`. The two old entries still resolve (the first forwards, the second is empty), so a pinned consumer builds before it edits. |
| `@ejm/ui/styles-app.css`, `styles-static.css`, `styles-terminal.css`, `@ejm/ui/static.css` | `styles.css` covers every component. The others are gone. |
| The native static profile (`NativeCheckbox`, `ActionRows`, `DocumentContent`, the static `Disclosure`), their deep paths (`@ejm/ui/components/NativeCheckbox`, `@ejm/ui/layout/ActionRows`, `@ejm/ui/layout/DocumentContent`, `@ejm/ui/shell/Disclosure`), `@ejm/site/native` and its guide | Nothing in the seven ejmlabs repositories used them. Build the page from kit components. `Disclosure` is now `@ejm/ui/components/ui/disclosure` (or the barrel) and takes a `summary`. |
| The web `Terminal*` views and `@ejm/ui/components/TerminalWorkspace` | Gone. The terminal contract, `crates/ejm-tui` and `@ejm/ink` are unchanged. |
| `@tailwindcss/vite`, `@vitejs/plugin-react` and `tailwindcss` in the consumer, `resolve.dedupe`, tsconfig `paths`, `vite-env.d.ts`, `build.target` and `build.cssMinify` | `ejmlabs()` or `ejmUi()`, and `"extends": "@ejm/ui/tsconfig.json"`. |

## 7. Where each consumer stands

State read from the sibling checkouts of ejmlabs, ejm-cli and ejm-chess on 31 October 2026. The state of ejm-ide and ejm-harness is from the review of this change and the files named below. No consumer has been built against this revision. Each moves its pin in its own repository and runs its own checks.

| Consumer | Consumes ejm-ui through | Pin | State |
| --- | --- | --- | --- |
| studio (`ejmlabs/ejmlabs`, `site/`) | sibling `file:` links | `a5551a0` in `.github/ui-source.json` | A site on `ejmSite` and `ejmSsg`. Carries its own Tailwind and React plugins, `resolve.dedupe`, build options and tsconfig `paths`. Sets the removed `budget` option in `defineSite`. |
| ejm-cli (`site/`) | sibling `file:` links | `f2029e5` in `.github/ui-source.json` | A site on `ejmSite` and `ejmSsg`, with its own `docsPlugin`, the same glue as studio, `styles-docs.css` and an `ejm-ssg budget` script (both removed earlier with the size caps). |
| ejm-chess | sibling `file:` links | none | Imports `@ejm/ui/components/Chessboard` and `useSearch` from `@ejm/ssg`, which ejm-ui added after its last review; its next pin move picks them up. Sets the removed `budget` option and has `ejm-ssg budget` scripts. Neither import exists in this revision of ejm-ui, so a build against it fails there. |
| ejm-ide app and website | none | `.github/ui-source.json` records `d4f7b06` | Neither depends on `@ejm/*`. The website copies the old design kit with `sync-design-kit.sh`, and the app has its own styles. |
| ejm-harness site | none | none | Copies the old design kit with `scripts/sync-design-kit.sh`. No `@ejm/*` dependency. |
| ejm-calm, gerry | none | none | Their own design systems. They are only linked from the project registry (`LINKED_PROJECTS`). |

At its next pin move each linked consumer does the following, then builds, type checks and runs its own checks:

- **studio.** Replace the plugin list with `ejmlabs({ project: 'ejmlabs' })`. Delete `resolve.dedupe`, the `build` options, the tsconfig `paths`, `src/vite-env.d.ts`, and `@tailwindcss/vite`, `@vitejs/plugin-react` and `tailwindcss` from `devDependencies`. Extend `@ejm/ui/tsconfig.json`. Make `src/styles.css` `@import "@ejm/ui/styles.css";` (no `source(none)`) and keep its demo stylesheet imports. Delete `budget` from `defineSite`. Fix what the guard and the page check name.
- **ejm-cli.** The same steps with `ejmlabs({ project: 'cli' })`, keeping `docsPlugin(...)` in the plugin list. Also delete the `styles-docs.css` import and the `budget` script.
- **ejm-chess.** Record a pin in `.github/ui-source.json`, as studio and ejm-cli do. Delete `budget` from `defineSite` and the `ejm-ssg budget` scripts. Replace the plugin list with `ejmlabs({ project: 'chess', headers: chessHeaders })` and delete the same glue as studio. `Chessboard` and `useSearch` now exist in ejm-ui; pass `Chessboard` no `className`.

## 8. Deploy configuration (Cloudflare Workers static assets)

`wrangler.jsonc` next to `package.json`. The account and the routes are the ones the sites already use; change `name` and the pattern per site:

```jsonc
{
  "name": "ejmlabs-cli",
  "account_id": "478a0db3a110d8503c16abbc1db27af4",
  "compatibility_date": "2026-10-18",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"
  },
  "routes": [{ "pattern": "cli.ejmlabs.com", "custom_domain": true }]
}
```

`not_found_handling: "404-page"` serves the nearest `404.html`, which `ejm-ssg` writes at `dist/404.html` with `noindex`. `_headers` in `dist` is read by the asset server. A push to main deploys staging, then production, through the site's `.github/workflows/deploy.yml`; see [CI deploys](.agents/skills/ejmlabs-cloudflare/references/ci-deploys.md). Do not run `wrangler deploy` by hand.

## 9. Per-site checklist

For every site: delete the `sync-design-kit.sh` script and the copied `design-kit/` folder, the `<link>` and `<script>` tags that pointed at it and `analytics.js`; move static files that are not part of the design system (`robots.txt`, `sitemap.xml`, `license.txt`, product images) into `public/`; list the routes; check the links; run the starter's checks against the new site (the page check of section 4 covers the skip link, one `h1` per route and marked external links; also check the toggle last in the header tools, no inline script and `_headers` current).

| Site | Registry id | Route list to build | Notes |
| --- | --- | --- | --- |
| ejmlabs.com | `ejmlabs` | `/`; include any routes the home page links to | Keep studio content in the studio repository and compose it with shared components. |
| cli | `cli` | the pages in `ejm-cli/site/dist` today | Product windows and demos load with `load: () => import(...)`, from `@ejm/demos`. |
| ide | `ide` | `/`, `/docs/`, `/docs/user-guide/`, `/docs/developer-guide/` | Docs use `DocsLayout`. Keep `public/` files (`editor.webp`, `license.txt`, `notices.txt`, `robots.txt`, `sitemap.xml`). The `/api/` and `/downloads/` dev proxy moves into `server.proxy` in `vite.config.ts`. `website/scripts/check-docs.mjs` stays. |
| harness | `harness` | the pages in `ejm-harness/site/public` today | Same shape as cli. |

Sites have no size budget. Use the maintained library that does the job. Load time is the one bar: after `npm run build`, run `node scripts/perf.mjs <dist> --baseline perf-baseline.json --update` from a checkout of `ejm-ui` once to record first contentful paint per route, commit the file in the product repository, then run the same command without `--update` on later builds. It fails when a route is a second or more slower than its baseline. See `QUALITY.md` and `scripts/PERF.md`.

Adopt and verify each consumer in its own repository.

## 10. The IDE app (not a prerendered site)

The Tauri app in `ejm-ide` is a single Vite and React 19 package. It does not depend on `@ejm/*` today and does not use the preset, so it has not adopted the design system. Adopting it would take the steps below, and the second is the large one. This work has not been done or estimated.

1. Depend on `@ejm/tokens`, `@ejm/ui` and `@ejm/core`, put `ejmUi()` in its `vite.config.ts` as the plugin list (it is not a prerendered site, so not `ejmlabs()`), extend `@ejm/ui/tsconfig.json`, and make its entry stylesheet `@import "@ejm/ui/styles.css";`. Remove the app's copied theme CSS.
2. Move every screen onto kit components. `ejmUi()` runs the design guard on the app's `src`, and the guard rejects `className`, `style`, `dangerouslySetInnerHTML` and local CSS on every element, native ones included. So the app's own panes, file tree and editor chrome can no longer be styled in the app: each one becomes a kit component, or a new kit component or recipe is added to ejm-ui first. Colors come only from the semantic names in `packages/ui/THEME.md`. The editor keeps Monaco, loaded with the generated themes from `@ejm/tokens/generated/monaco`; the editor font stays a choice of the app, and the interface fonts are Manrope and IBM Plex Mono from `@ejm/ui`.
3. Copy `@ejm/ui/theme-boot.js` to the app's `public/` and load it synchronously in `index.html` before the stylesheet (the Tauri webview is not an ejmlabs host, so the choice is kept in `localStorage["ejm-theme"]`, which `useTheme` and the boot script already handle).
4. Build the frame from `AppShell`, which makes every control inside compact, with `ThemeToggle`, the `components/ui` primitives and the hooks.
5. The app's own `Content-Security-Policy` (in `tauri.conf.json`) keeps `script-src 'self'`: the boot script is a file.

The IDE's marketing site (`ide/website`) is a normal site (section 9).

## 11. Keeping product repos in step

- Linked (route A): nothing to copy. Pull `ejm-ui`, run `npm ci --ignore-scripts` there if its dependencies changed, then rebuild the product. There is no sync script to run and no copy to keep.
- Tarballs (route B): run the `npm pack` loop above, delete `node_modules/@ejm` and the lockfile in the product, install, rebuild, and commit the lockfile. Do it when `ejm-ui` changes something the product needs, not on a schedule.
- All packages currently declare `0.1.0` and remain private. Pin source by its full commit, and regenerate the consumer lockfile when that source changes. Standard source releases need the shared UI version validator and release workflow before a version tag can serve as a release reference. A future registry publication requires the owner's approval and a versioned package release.
- After any update, the product's own check must pass: its load-time check (`node scripts/perf.mjs <dist> --baseline perf-baseline.json`), its route list and the shared rules in section 9. Brand files come from `@ejm/tokens` only, so never edit a copy of them in a product repo.

## Package notices and the IDE stylesheet entry

Every owned npm package carries `LICENSE` and `THIRD_PARTY_NOTICES.md` in its
package output. `@ejm/tokens` keeps its original OFL notices in `assets/fonts/`;
`@ejm/ui` carries the same original notices beside its subsets in `src/fonts/`.
Preserve these files when assembling source or tarball distributions. Software
uses the MIT terms, brand materials retain their owners' rights, and fonts keep
their own license.

`@ejm/demos/ide.css` is a narrow compatibility entry owned by `ejm-ui`. Studio
and IDE source consumers already name that public path. It imports the existing
shared demo stylesheet for the current simulated IDE views. The upstream target
is the same public path. Replace this forwarding file when an accepted UI
change supplies a distinct IDE stylesheet together with its matching view
markup and visual checks. Check package resolution, the target file, and the
matching consumer build whenever that contract changes. This entry does not
bring other local view or stylesheet changes into the source snapshot.
