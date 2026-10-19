import { Link, usePath } from '@ejm/ssg';
import { Analytics } from '@ejm/site/analytics';
import { otherSites, PROJECTS, sourceLinks } from '@ejm/site/projects';
import { SiteLayout, type FooterProps, type NavItem } from '@ejm/ui';
import type { ReactNode } from 'react';

const here = PROJECTS.ejmlabs;

const pages = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
];

const footer: FooterProps = {
  brand: (
    <>
      <p className="text-heading">{here.name}</p>
      <p className="mt-3 text-muted">{here.tagline}</p>
    </>
  ),
  columns: [
    { heading: 'Pages', links: pages },
    { heading: 'Sites', links: otherSites('ejmlabs') },
    { heading: 'Source', links: sourceLinks('ejmlabs') },
  ],
  privacy: 'Visits are counted with Cloudflare Web Analytics, which sets no cookies and is off when your browser sends Do Not Track or Global Privacy Control. The only cookie is your theme choice.',
  legal: `${here.name}`,
};

/** The page frame for every route: skip link, header with the theme toggle last, the page, the footer, and analytics. */
export function App({ children }: { children: ReactNode }) {
  const path = usePath();
  const nav: NavItem[] = pages.map(p => ({ ...p, current: p.href === '/' ? path === '/' : path.startsWith(p.href.replace(/\/$/, '')) }));
  return (
    <>
      <SiteLayout
        header={{ logo: <span className="text-heading tracking-tight">{here.name}</span>, homeLabel: `${here.name} home`, nav }}
        footer={footer}
        linkComponent={Link}
      >
        {children}
      </SiteLayout>
      <Analytics />
    </>
  );
}
