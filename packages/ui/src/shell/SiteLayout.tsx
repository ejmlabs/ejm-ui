import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Footer, type FooterProps } from './Footer';
import { Header, type HeaderProps } from './Header';
import { LinkProvider, useLinkComponent, type LinkComponent } from './link';
import { SkipLink } from './SkipLink';

export interface SiteLayoutProps {
  header: HeaderProps;
  footer?: FooterProps;
  /** Router adapter for internal links, for example `({ href, ...p }) => <Link to={href} {...p} />`. Default: plain anchors. */
  linkComponent?: LinkComponent;
  className?: string;
  children: ReactNode;
}

/**
 * The page frame for a site: skip link, Header, <main id="main"> and Footer. The page body is rendered inside main, so each
 * route supplies Bands and one h1. main takes programmatic focus (tabIndex -1) so a router can move focus there after a
 * navigation. The footer stays at the bottom of short pages. Nothing here depends on scripts.
 */
export function SiteLayout({ header, footer, linkComponent, className, children }: SiteLayoutProps) {
  const ambient = useLinkComponent();
  return (
    <LinkProvider value={linkComponent ?? ambient}>
      <div className="flex min-h-svh flex-col">
        <SkipLink />
        <Header {...header} />
        <main id="main" tabIndex={-1} className={cn('flex-1 focus:outline-none', className)}>
          {children}
        </main>
        {footer && <Footer {...footer} />}
      </div>
    </LinkProvider>
  );
}
