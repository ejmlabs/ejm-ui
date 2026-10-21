// The Vite plugin every ejmlabs site uses: `plugins: [react(), ejmSite({ project: 'ejmlabs' }), ejmSsg({ site: 'src/site.tsx' })]`.
// It adds the shared head tags to index.html and writes the shared files into the build: theme-boot.js, the favicon set,
// the manifest, the social card, the font notices and `_headers`. In dev it serves the same shared files.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { headersFile } from './headers.mjs';
import { FAVICONS, versionedFavicons } from './favicon.mjs';
import { PROJECTS, assetPaths } from './projects.mjs';
import { siteDesignGuard } from './design.mjs';

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
 * @param {{ project: import('./projects.d.mts').ProjectId | import('./projects.d.mts').Project, headers?: import('./headers.d.mts').HeadersOptions | false, enforceDesignKit?: boolean }} options
 *   `headers: false` skips `_headers` (a site that writes its own); an object is passed to `headersFile`.
 *   `enforceDesignKit: true` checks authored source for public shared composition. Existing consumers default to false.
 */
export function ejmSite({ project, headers = {}, enforceDesignKit = false }) {
  const p = typeof project === 'string' ? PROJECTS[project] : project;
  if (!p) throw new Error(`ejm-site: unknown project ${String(project)}`);
  const files = sharedFiles(p);
  const raw = Object.fromEntries(Object.entries(files).map(([name, path]) => [name, readFileSync(path)]));
  const favicon = versionedFavicons(raw);
  let ssr = false;
  let base = '/';
  let design;
  let designError;
  return {
    name: 'ejm-site',
    configResolved(c) {
      ssr = !!c.build.ssr;
      base = c.base;
      if (enforceDesignKit) design = siteDesignGuard(c.root ?? process.cwd());
    },
    buildStart() {
      for (const file of design?.validate().files ?? []) this.addWatchFile(file);
    },
    transform(_source, file) {
      if (design?.owns(file)) {
        design.invalidate(file);
        design.validate();
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler: html => (html.includes(MARKER) ? html.replace(MARKER, () => `${headTags(base, favicon.version).join('\n    ')}\n    ${MARKER}`) : html),
    },
    configureServer(server) {
      if (design) {
        design.validate();
        const validateDesign = () => {
          try {
            design.validate();
            designError = undefined;
          } catch (error) {
            designError = error;
            server.ws.send({ type: 'error', err: { message: error.message, stack: error.stack ?? '' } });
          }
        };
        const checkDesign = (_event, file) => {
          if (!design.owns(file)) return;
          design.invalidate(file);
          validateDesign();
        };
        server.watcher?.on('all', checkDesign);
        server.watcher?.on('ready', validateDesign);
        server.httpServer?.once('close', () => {
          server.watcher?.off('all', checkDesign);
          server.watcher?.off('ready', validateDesign);
        });
        server.middlewares.use((_req, res, next) => {
          if (!designError) return next();
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(designError.message);
        });
      }
      server.middlewares.use((req, res, next) => {
        const file = files[(req.url ?? '').split('?')[0].replace(/^\/+/, '')];
        if (!file) return next();
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.ico') ? 'image/x-icon' : file.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'application/manifest+json');
        res.end(favicon.sources[(req.url ?? '').split('?')[0].replace(/^\/+/, '')]);
      });
    },
    generateBundle() {
      if (ssr) return; // the server build for prerendering writes no site files
      for (const [fileName, source] of Object.entries(favicon.sources)) this.emitFile({ type: 'asset', fileName, source });
      if (headers !== false) this.emitFile({ type: 'asset', fileName: '_headers', source: headersFile(headers) });
    },
  };
}
