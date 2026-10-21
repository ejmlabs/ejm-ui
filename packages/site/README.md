# @ejm/site

What every ejmlabs site shares beyond the look: the project registry, Cloudflare Web Analytics, the shared head with the theme boot script, and the security headers. It sits next to `@ejm/ui` (components) and `@ejm/ssg` (prerender), and `examples/starter` shows all three together.

| Entry | What it is |
| --- | --- |
| `@ejm/site` | Re-exports `Analytics`, the analytics helpers, `siteDefaults`, `siteFonts` and the registry. |
| `@ejm/site/projects` | Build identities and public discovery: `PROJECTS`, `PROJECT_LIST`, `otherSites(id)`, `sourceLinks(id)`, `assetPaths`. |
| `@ejm/site/analytics` | The `Analytics` component and `analyticsToken`, `loadAnalytics`, `optedOut`. |
| `@ejm/site/head` | `siteDefaults(id)` for `defineSite`, and `siteFonts()`. |
| `@ejm/site/headers` | `headersFile`, `csp`, `directives`: the policy as a typed generator. |
| `@ejm/site/vite` | The `ejmSite({ project })` Vite plugin. |
| `ejm-site-headers` | CLI that writes or checks a `_headers` file. |

`projects`, `headers` and `vite` are plain `.mjs` files with `.d.mts` types, so Node can load them from `node_modules` (Node refuses to strip types from TypeScript there). `analytics` and `head` are TypeScript source that Vite compiles, like the other `@ejm` packages.

## Use it

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { ejmSite } from '@ejm/site/vite';
import { ejmSsg } from '@ejm/ssg/vite';

export default defineConfig({
  plugins: [tailwindcss(), react(), ejmSite({ project: 'cli' }), ejmSsg({ site: 'src/site.tsx' })],
});
```

```tsx
// src/site.tsx
export default defineSite({ ...siteDefaults('cli'), App, routes: [/* ... */], notFound: { component: NotFound } });

// in App
<SiteLayout header={{ ..., nav }} footer={{ columns: [{ heading: 'Sites', links: otherSites('cli') }] }} linkComponent={Link}>{children}</SiteLayout>
<Analytics />
```

## projects

`PROJECTS` contains build identities, including unreleased projects. Each entry has `id`, `name` (`ejm-cli`), `host`, `url`, `tagline`, `repo`, `analyticsToken` and `assetDir`. Optional `guides` entries contain a `label` and an intended canonical `href`; these URLs are metadata, not proof of publication. `repo` and `analyticsToken` are empty strings when no repository or analytics token is configured. `sourceLinks(id)` returns the repo link, or an empty list when the remote is unconfigured.

`PROJECT_LIST` includes only discoverable projects. `discoverable` defaults to true for existing identities; an explicit false keeps a project out of that list, the analytics host map, `otherSites(id)`, gallery project rows, and starter links. `otherSites(id)` returns the other discoverable projects as `{ label, href, external: true }`, ready for `@ejm/ui` navigation and footer links (`rel="external noopener"`). The four existing identities and their navigation are unchanged.

The `chess` identity is available to `siteDefaults('chess')` and `ejmSite({ project: 'chess' })` for local and protected preview builds. It remains `discoverable: false`. Its player guide is intended for `/help/` and its developer guide for `/docs/developer-guide/` on `chess.ejmlabs.com`. No product remote or analytics token is configured. Builds use the owned chess asset family, including a distinct manifest and versioned favicons. The artwork does not establish public availability. See the token package guide for generation and provenance. Before enabling discovery, publish and verify the canonical product and guide destinations, review its source and asset facts, then change the registry through the approved owner release process and rebuild affected consumers. An unrelated rebuild must not expose an unreleased project.

Brand files: ejmlabs uses the root sets of `@ejm/tokens/assets` (`favicon/`, `logos/`, `social/`). cli, ide and harness each have their own family in `@ejm/tokens/assets/projects/<id>/` (marks, logos, icons, the favicon set, `apple-touch-icon.png`, `android-chrome-*`, `site.webmanifest`, `social-card`), copied from `design-kit/projects/` with sha256 in `assets/PROVENANCE.md`. `assetPaths(project, exists)` points at that folder when it exists and falls back to the ejmlabs files otherwise; `ejmSite` serves the project's favicon set, manifest and social card at the site root.

## analytics

`Analytics` renders nothing. After hydration it adds `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"..."}'>` when all of these hold: the host is `ejmlabs.com` or one of the three subdomains, `navigator.doNotTrack` and `window.doNotTrack` are not `"1"`, and `navigator.globalPrivacyControl` is not `true`. It never runs on `localhost`, previews or `workers.dev`, sets no cookies, and runs once. Nothing is sent from the server render, so the prerendered HTML never contains the beacon. The beacon follows client route changes by itself.

`analyticsToken(env)` and `loadAnalytics(env, doc)` take a fake `{ location, navigator, window }`, which is how the tests cover every host and every opt-out signal. To add a site, add it to the registry with its Cloudflare site token (tokens are public).

## headers

`ejmSite()` writes `_headers` into the build. `ejm-site-headers [file] [--check] [--no-analytics] [--list]` does the same from the command line, and `--check` exits 1 when the file differs from what this version writes (use it in CI for a site that commits its own `_headers`). The policy, ported from the old `design-kit/web/_headers`:

- `Content-Security-Policy`: `default-src 'self'`; `script-src 'self' https://static.cloudflareinsights.com` (no inline script: `theme-boot.js` is an external file); `connect-src 'self' https://cloudflareinsights.com`; fonts and images from `'self'` (images also `data:`); `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`.
- Styles: `style-src 'self'` plus `style-src-attr 'unsafe-inline'`. The old kit allowed `'unsafe-inline'` for all styles. Components set CSS variables through `style` attributes (the entrance stagger index), so attributes stay allowed, and `<style>` elements do not.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `Cache-Control: public, max-age=31536000, immutable` on `/assets/*` (Vite's hashed files). Pages and unhashed files (`theme-boot.js`, the manifest) keep Cloudflare's default `public, max-age=0, must-revalidate`. Cache-Control is not set on `/*` because Cloudflare joins a header set by two rules with a comma.

`ejmSite({ project, headers })` takes `headers: false` to skip the file, or `{ analytics: false, extra: { 'img-src': ['https://img.example'] } }` to change the policy.

## head

`siteDefaults(id, { description?, titleTemplate?, image? })` returns `{ origin, head, fonts }` for `defineSite`: the origin from the registry, `%s | ejm-cli` as the title template, the tagline as the description, Open Graph (`siteName`, `image: /social-card.png`, `type`), `twitter:card` and the image size, and the two font preloads (`siteFonts()` is `fontPreloads` from `@ejm/ui/font-preloads` as URLs; nothing in this package imports the `@ejm/ui` barrel, so `siteDefaults` adds no component to a page). `ssg` adds the canonical URL and `og:url` per route.

`ejmSite()` adds the static tags `ssg` cannot carry to `index.html`, right before `<!--ejm-head-->`: `color-scheme` (`light dark`), `theme-color` for both schemes, the synchronous external `<script src="/theme-boot.js">`, the icon links and the manifest. It also writes `theme-boot.js` (from `@ejm/ui`), the favicon set, `site.webmanifest` and `social-card.png` (from `@ejm/tokens`) into the build, and serves them in `ejm-ssg dev`. `index.html` keeps the charset and the viewport (`viewport-fit=cover`, needed for safe-area insets) and the two ssg markers. Do not keep your own copies of these files in `public/`.

The plugin also distributes the original font notices from the public `@ejm/ui/fonts/Manrope-OFL.txt` and `@ejm/ui/fonts/IBMPlexMono-OFL.txt` exports. Every build includes their exact bytes at `/Manrope-OFL.txt` and `/IBMPlexMono-OFL.txt`, alongside the bundled font assets. Development serves the same paths as `text/plain; charset=utf-8`. Their stable names stay outside `/assets/*` and keep the default revalidation policy described above. Keep both notices with any deployed site that distributes these fonts.

Icon and manifest head URLs carry one content revision for the complete favicon family. The manifest uses that same revision for its local icon references. Development and builds serve the same manifest bytes. Original root paths and font notices stay available. `headTags(base, version?)` keeps unversioned URLs when called without a revision.

## Optional design ownership check

Set `ejmSite({ project, enforceDesignKit: true })` for a site that must compose
only public shared visuals. The option defaults to false, so existing sites
retain their current build behavior and public size/layout APIs.

The opt-in check parses every authored script and stylesheet under `src`,
including unused files. Vite supplies the script parser and PostCSS supplies
the CSS parser. It rejects local CSS rules, private or remote style imports,
inline styles, visual classes, raw markup, style elements, stylesheet links
and opaque JSX spreads. Public CSS imports remain allowed. The public Static
`className="contents"` wrapper and documented docs navigation helper remain
structural exceptions. Example strings and comments are data, not source.

Opted-in sites use `SectionHead purpose` and fixed application recipes instead
of presentation props such as size/layout. Add a missing pattern in ejm-ui and
consume its public export. The check runs during both builds and development,
reports the source location and blocks new unused CSS until it is corrected.
It is a source ownership check, not a sandbox or a browser layout proof. Shared
library gallery examples remain free to demonstrate lower-level APIs.
