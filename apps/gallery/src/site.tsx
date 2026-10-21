import { defineSite } from '@ejm/ssg';
import { siteDefaults } from '@ejm/site/head';
import { App } from './frame';
import { docRoutes, pages } from './pages';
import NotFound from './routes/not-found';
import baseStyles from './styles.css?url';
import docsStyles from './styles-docs.css?url';
import appStyles from './styles-app.css?url';
import demoStyles from './styles-demos.css?url';

const styleLinks = (path: string) => [{ rel: 'stylesheet', href: path.startsWith('/docs/') ? docsStyles : path === '/app/' || path === '/app-shell/' ? appStyles : path === '/demos/' ? demoStyles : baseStyles }];

const description = 'ejm-ui is the ejmlabs design system: tokens, a Tailwind theme, components, hooks, layouts and views for every ejmlabs site and app.';
const defaults = siteDefaults('ejmlabs', { titleTemplate: '%s | ejm-ui', description });

export default defineSite({
  ...defaults,
  // The gallery is not in the project registry yet, so it names its own head; the origin is where it is planned to be served.
  origin: 'https://ui.ejmlabs.com',
  head: { ...defaults.head, title: 'ejm-ui, the ejmlabs design system', og: { ...defaults.head.og, siteName: 'ejm-ui' } },
  App,
  routes: [
    { path: '/', head: { links: styleLinks('/') }, load: () => import('./island').then(m => m.island(() => import('./routes/home'), 'One system for every ejmlabs surface.')) },
    // A deferred page loads through island.tsx: its chunk is not preloaded and loads on the first interaction, so a visit that only reads never fetches it.
    ...[...pages, ...docRoutes].map(({ path, title, description, deferred, load }) => ({
      path,
      load: deferred ? () => import('./island').then(m => m.island(load, title)) : load,
      head: { title, description, links: styleLinks(path) },
    })),
  ],
  notFound: { component: NotFound, head: { title: 'Page not found', links: styleLinks('/404') } },
});
