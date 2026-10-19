import { defineSite } from '@ejm/ssg';
import { siteDefaults } from '@ejm/site/head';
import About from './pages/About';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import { App } from './shell';
import './styles.css';

export default defineSite({
  ...siteDefaults('ejmlabs', { description: 'A small site built on ejm-ui: tokens, components, prerendering and the shared site behavior.' }),
  App,
  routes: [
    { path: '/', component: Home, head: { title: 'Home' } },
    { path: '/about/', component: About, head: { title: 'About', description: 'What this starter includes and how to build on it.' } },
  ],
  notFound: { component: NotFound, head: { title: 'Page not found' } },
});
