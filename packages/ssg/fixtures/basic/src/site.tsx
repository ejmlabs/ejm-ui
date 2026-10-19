import { defineSite, Link } from '@ejm/ssg';
import type { ReactNode } from 'react';
import fixtureFont from './fonts/Fixture.woff2?url';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import './styles.css';

function App({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <nav aria-label="Main">
          <Link href="/">Home</Link> <Link href="/lazy/">Lazy</Link> <Link href="/lazy/#details">Details</Link> <Link href="/missing/">Missing</Link>{' '}
          <Link href="https://example.com/" id="out">Example</Link>
        </nav>
      </header>
      <main id="main">{children}</main>
    </>
  );
}

export default defineSite({
  App,
  origin: 'https://fixture.test',
  fonts: [fixtureFont],
  head: {
    titleTemplate: '%s | Fixture',
    description: 'A fixture site.',
    og: { siteName: 'Fixture' },
    links: [{ rel: 'preload', as: 'image', href: '/hero.png', fetchpriority: 'high' }],
  },
  routes: [
    { path: '/', component: Home, head: { title: 'Home', description: 'The home page.' } },
    {
      path: '/lazy/',
      load: () => import('./pages/Lazy'),
      head: {
        title: 'Lazy page',
        og: { image: '/og.png' },
        // The first repeats the site's link, so it must be written once. The second belongs to this route only.
        links: [{ rel: 'preload', as: 'image', href: '/hero.png', fetchpriority: 'high' }, { rel: 'preload', as: 'image', imagesrcset: '/lazy.avif 1x', type: 'image/avif', media: '(min-width: 40em)' }],
      },
    },
  ],
  notFound: { component: NotFound, head: { title: 'Not found' } },
});
