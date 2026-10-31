// The Vite plugins every ejmlabs site uses. A site's whole plugin list is `[ejmlabs({ project: 'ejmlabs' })]`: the @ejm/ui preset
// (Tailwind, React, one React, the design guard), `ejmSite`, the `ejm-ssg` prerenderer and the shared build options.
// `ejmSite` adds the shared head tags to index.html and writes the shared files into the build: theme-boot.js, the favicon set,
// the manifest, the social card, the font notices and `_headers`. In dev it serves the same shared files. After `ejm-ssg` writes the
// pages it checks each one (see pages.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { ejmUi } from '@ejm/ui/vite';
import { ejmSsg } from '@ejm/ssg/vite';
import { headersFile } from './headers.mjs';
import { FAVICONS, versionedFavicons } from './favicon.mjs';
import { PROJECTS, assetPaths } from './projects.mjs';
import { designGuardPlugin } from './design.mjs';
import { checkPages } from './pages.mjs';

const require = createRequire(import.meta.url);
const tokensAssets = join(dirname(require.resolve('@ejm/tokens/theme.json')), 'assets');

/** Colors of the two themes' ground, for the browser chrome (Paper and the dark ground from the theme). */
const MARKER = '<!--ejm-head-->';
const THEME_COLORS = { light: '#F6F5EF', dark: '#131614' };

/** Files served at the site root: published name to absolute path. */
export function sharedFiles(project) {
  const a = assetPaths(project, dir => existsSync(join(tokensAssets, dir)));
  return {
    'theme-boot.js': require.resolve('@ejm/ui/theme-boot.js'),
    'Manrope-OFL.txt': require.resolve('@ejm/ui/fonts/Manrope-OFL.txt'),
    'IBMPlexMono-OFL.txt': require.resolve('@ejm/ui/fonts/IBMPlexMono-OFL.txt'),
    ...Object.fromEntries(FAVICONS.map(f => [f, join(tokensAssets, a.favicon, f)])),
    'social-card.png': join(tokensAssets, a.socialCard),
  };
}

/** The tags added to index.html, right before the `<!--ejm-head-->` marker. The theme script is synchronous and external, so the policy keeps `script-src 'self'`. */
export function headTags(base = '/', version) {
  const icon = name => `${base}${name}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
  return [
    '<meta name="color-scheme" content="light dark">',
    `<meta name="theme-color" content="${THEME_COLORS.light}" media="(prefers-color-scheme: light)">`,
    `<meta name="theme-color" content="${THEME_COLORS.dark}" media="(prefers-color-scheme: dark)">`,
    `<script src="${base}theme-boot.js"></script>`,
    `<link rel="icon" href="${icon('favicon.ico')}" sizes="16x16 32x32 48x48">`,
    `<link rel="icon" href="${icon('favicon.svg')}" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${icon('apple-touch-icon.png')}">`,
    `<link rel="manifest" href="${icon('site.webmanifest')}">`,
  ];
}

/**
 * Adds the shared assets and head, checks the finished pages, and runs the design guard (once, even when `ejmUi()` also runs it).
 * @param {import('./vite.d.mts').EjmSiteOptions} options
 *   `headers: false` skips `_headers` (a site that writes its own); an object is passed to `headersFile`.
 * @returns {import('vite').Plugin}
 */
export function ejmSite({ project, headers = {} }) {
  const p = typeof project === 'string' ? PROJECTS[project] : project;
  if (!p) throw new Error(`ejm-site: unknown project ${String(project)}`);
  const files = sharedFiles(p);
  const icons = versionedFavicons(Object.fromEntries(FAVICONS.map(name => [name, readFileSync(files[name])])));
  const source = name => icons.sources[name] ?? readFileSync(files[name]);
  const guard = designGuardPlugin();
  let ssr = false;
  let base = '/';
  return {
    name: 'ejm-site',
    enforce: 'pre',
    configResolved(c) {
      ssr = !!c.build.ssr;
      base = c.base;
      guard.configResolved(c);
    },
    buildStart() {
      guard.buildStart.call(this);
    },
    hotUpdate(update) {
      guard.hotUpdate(update);
    },
    transformIndexHtml: {
      order: 'post',
      handler: html => (html.includes(MARKER) ? html.replace(MARKER, () => `${headTags(base, icons.version).join('\n    ')}\n    ${MARKER}`) : html),
    },
    configureServer(server) {
      guard.configureServer(server);
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+/, '');
        const file = files[name];
        if (!file) return next();
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.ico') ? 'image/x-icon' : file.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/manifest+json');
        res.end(source(name));
      });
    },
    generateBundle() {
      if (ssr) return; // the server build for prerendering writes no site files
      for (const fileName of Object.keys(files)) this.emitFile({ type: 'asset', fileName, source: source(fileName) });
      if (headers !== false) this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile(headers) });
    },
    // ejm-ssg calls this once every page is written (see @ejm/ssg's `PagesApi`).
    api: { onPages: pages => checkPages(pages, { origin: p.url }) },
  };
}

/** The build options every site shares, unless the site sets them itself. */
const buildDefaults = {
  name: 'ejm-site:build',
  config: user => ({
    build: {
      ...(user.build?.target === undefined && { target: 'es2022' }),
      ...(user.build?.cssMinify === undefined && { cssMinify: 'lightningcss' }),
    },
  }),
};

/**
 * The whole Vite setup of an ejmlabs site: `plugins: [ejmlabs({ project: 'ejmlabs' })]`.
 * @param {import('./vite.d.mts').EjmlabsOptions} options
 * @returns {import('vite').PluginOption[]}
 */
export function ejmlabs({ project, site = 'src/site.tsx', headers }) {
  return [...ejmUi(), ejmSite({ project, headers }), ejmSsg({ site }), buildDefaults];
}
