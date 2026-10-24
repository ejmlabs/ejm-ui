import { Link, usePath } from '@ejm/ssg';
import { otherSites, sourceLinks } from '@ejm/site/projects';
import { SiteLayout, type FooterProps, type NavItem } from '@ejm/ui';
import markInk from '@ejm/tokens/assets/projects/ui/mark-ink.svg?url';
import markPaper from '@ejm/tokens/assets/projects/ui/mark-paper.svg?url';
import type { ReactNode } from 'react';
import { pages } from './pages';

const item = (p: (typeof pages)[number]): NavItem => ({ label: p.label, href: p.path });
const normal = (p: string) => p.replace(/\/$/, '') || '/';

const footer: FooterProps = {
  identity: {
    name: 'ejm-ui',
    artwork: { src: markInk, darkSrc: markPaper, width: 256, height: 256 },
  },
  columns: [
    { heading: 'Foundations', links: pages.filter(p => p.group === 'Foundations').map(item) },
    { heading: 'Kits', links: pages.filter(p => p.group === 'Kits').map(item) },
    { heading: 'ejmlabs', links: [...otherSites('ejmlabs'), ...sourceLinks('ejmlabs')] },
  ],
  privacy: 'This site keeps one cookie, your theme choice. It has no analytics and sends nothing about your visit.',
  legal: 'ejm-ui by ejmlabs.',
};

/** The frame for every route: skip link, header with the theme toggle last, the page in main, the footer. App shells bring their own frame. */
export function App({ children }: { children: ReactNode }) {
  const path = usePath();
  const bare = pages.some(p => p.bare && normal(p.path) === path);
  if (bare) return <>{children}</>;
  const nav = pages.filter(p => p.nav).map(p => ({ ...item(p), current: path === normal(p.path) || path.startsWith(normal(p.path) + '/') }));
  return (
    <SiteLayout
      header={{ identity: { name: 'ejm-ui', artwork: { src: markInk, darkSrc: markPaper, width: 256, height: 256 } }, homeLabel: 'ejm-ui home', nav }}
      footer={footer}
      linkComponent={Link}
    >
      {children}
    </SiteLayout>
  );
}
