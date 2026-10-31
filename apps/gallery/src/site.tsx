import { defineSite } from '@ejm/ssg';
import { siteDefaults } from '@ejm/site/head';
import { App } from './frame';
import { docRoutes, pages } from './pages';
import NotFound from './routes/not-found';
import './styles.css';

const defaults = siteDefaults('ui');
const shotLinks = import.meta.env.SSR
  ? (await import('@ejm/ui/layout/ProductShot')).shotPreloadLinks((await import('@ejm/shots')).getShot('cli', 'tui-read-refused'))
  : [];

export default defineSite({
  ...defaults,
  head: { ...defaults.head, title: 'ejm-ui, the ejmlabs design system' },
  App,
  routes: [
    { path: '/', load: () => import('./island').then(m => m.island(() => import('./routes/home'), 'Build with ejm-ui.')) },
    // Large pages load after the small site entry. Server examples stay readable, with controls disabled until handlers are ready.
    ...[...pages, ...docRoutes].map(({ path, title, description, deferred, load }) => ({
      path,
      load: deferred ? () => import('./island').then(m => m.island(load, title)) : load,
      head: { title, description, links: path === '/product/' ? shotLinks : [] },
    })),
  ],
  notFound: { component: NotFound, head: { title: 'Page not found' } },
});
