// The Vite plugin every ejmlabs site uses: `plugins: [react(), ejmSite({ project: 'ejmlabs' }), ejmSsg({ site: 'src/site.tsx' })]`.
// It adds the shared head tags to index.html and writes the shared files into the build: theme-boot.js, the favicon set,
// the manifest, the social card and `_headers`. In dev it serves the same files.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { headersFile } from './headers.mjs';
import { PROJECTS, assetPaths } from './projects.mjs';

const require = createRequire(import.meta.url);
const tokensAssets = join(dirname(require.resolve('@ejm/tokens/theme.json')), 'assets');
const FAVICONS = ['favicon.ico', 'favicon.svg', 'favicon-16.png', 'favicon-32.png', 'favicon-48.png', 'apple-touch-icon.png', 'android-chrome-192.png', 'android-chrome-512.png', 'site.webmanifest'];

/** Colors of the two themes' ground, for the browser chrome (Paper and the dark ground from the theme). */
const MARKER = '<!--ejm-head-->';
const THEME_COLORS = { light: '#F6F5EF', dark: '#131614' };

/** Files served at the site root: published name to absolute path. */
export function sharedFiles(project) {
  const a = assetPaths(project, dir => existsSync(join(tokensAssets, dir)));
  return {
    'theme-boot.js': require.resolve('@ejm/ui/theme-boot.js'),
    ...Object.fromEntries(FAVICONS.map(f => [f, join(tokensAssets, a.favicon, f)])),
    'social-card.png': join(tokensAssets, a.socialCard),
  };
}

/** The tags added to index.html, right before the `<!--ejm-head-->` marker. The theme script is synchronous and external, so the policy keeps `script-src 'self'`. */
export function headTags(base = '/') {
  return [
    '<meta name="color-scheme" content="light dark">',
    `<meta name="theme-color" content="${THEME_COLORS.light}" media="(prefers-color-scheme: light)">`,
    `<meta name="theme-color" content="${THEME_COLORS.dark}" media="(prefers-color-scheme: dark)">`,
    `<script src="${base}theme-boot.js"></script>`,
    `<link rel="icon" href="${base}favicon.ico" sizes="48x48">`,
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png">`,
    `<link rel="manifest" href="${base}site.webmanifest">`,
  ];
}

/**
 * @param {{ project: import('./projects.d.mts').ProjectId | import('./projects.d.mts').Project, headers?: import('./headers.d.mts').HeadersOptions | false }} options
 *   `headers: false` skips `_headers` (a site that writes its own); an object is passed to `headersFile`.
 */
export function ejmSite({ project, headers = {} }) {
  const p = typeof project === 'string' ? PROJECTS[project] : project;
  if (!p) throw new Error(`ejm-site: unknown project ${String(project)}`);
  const files = sharedFiles(p);
  let ssr = false;
  let base = '/';
  return {
    name: 'ejm-site',
    configResolved(c) {
      ssr = !!c.build.ssr;
      base = c.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler: html => (html.includes(MARKER) ? html.replace(MARKER, () => `${headTags(base).join('\n    ')}\n    ${MARKER}`) : html),
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files[(req.url ?? '').split('?')[0].replace(/^\/+/, '')];
        if (!file) return next();
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.ico') ? 'image/x-icon' : 'application/manifest+json');
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      if (ssr) return; // the server build for prerendering writes no site files
      for (const [fileName, path] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source: readFileSync(path) });
      if (headers !== false) this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile(headers) });
    },
  };
}
