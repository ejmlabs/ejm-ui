import { defineSite } from '@ejm/ssg';
import { siteDefaults } from '@ejm/site/head';
import { App } from './frame';
import { docRoutes, pages } from './pages';
import NotFound from './routes/not-found';
import './styles.css';

const description = 'ejm-ui is the ejmlabs design system: tokens, a Tailwind theme, components, hooks, layouts and views for every ejmlabs site and app.';
const defaults = siteDefaults('ejmlabs', { titleTemplate: '%s | ejm-ui', description });

export default defineSite({
  ...defaults,
  // The gallery is not in the project registry yet, so it names its own head; the origin is where it is planned to be served.
  origin: 'https://ui.ejmlabs.com',
  head: { ...defaults.head, title: 'ejm-ui, the ejmlabs design system', og: { ...defaults.head.og, siteName: 'ejm-ui' } },
  App,
  routes: [
    { path: '/', load: () => import('./island').then(m => m.island(() => import('./routes/home'), 'One system for every ejmlabs surface.')) },
    // A deferred page loads through island.tsx: its chunk is not preloaded and loads on the first interaction, so a visit that only reads never fetches it.
    ...[...pages, ...docRoutes].map(({ path, title, description, deferred, load }) => ({
      path,
      load: deferred ? () => import('./island').then(m => m.island(load, title)) : load,
      head: { title, description },
    })),
  ],
  notFound: { component: NotFound, head: { title: 'Page not found' } },
});
