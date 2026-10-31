import type { ReactNode } from 'react';
import { DensityProvider } from '../lib/density';
import { Collapse } from './Collapse';
import { LinkProvider, useLinkComponent, type LinkComponent, type NavItem } from './link';
import { NavLink } from './NavLink';
import { SkipLink } from './SkipLink';
import { ThemeToggle } from './ThemeToggle';

export interface AppShellProps {
  /** The product mark or name, in the top bar. */
  brand: ReactNode;
  homeHref?: string;
  homeLabel?: string;
  /** Controls that sit in the top bar before the theme toggle (a search field, an account menu). */
  actions?: ReactNode;
  /** Replaces the last theme control. Omit to use ThemeToggle; pass null to show none. */
  themeControl?: ReactNode;
  /** The side navigation: one item per page (`label`, `href`, `current`, `external`). Below 768px it becomes a labelled disclosure above the content. */
  nav: readonly NavItem[];
  navLabel?: string;
  linkComponent?: LinkComponent;
  children: ReactNode;
}

// One control recipe, compact because the shell is: 32px with a mouse, 44px on touch, the control radius and a bg-tone hover. NavLink marks the current page.
const navItemClass = 'touch-target compact-target flex min-h-8 items-center rounded-control px-3 text-sm text-fg hover:bg-tone';

/**
 * The frame for an application: a top bar with the theme toggle last, a side navigation (items, rendered through the router-agnostic
 * link context) and the content. No boxes: the bar and the nav are the page ground, separated by one hairline each (one under the bar
 * from 768px, one beside the nav). The page scrolls as a whole (the bar and nav stay put), which keeps find, zoom and print working.
 * Collapses to a single column below 768px.
 * It provides `compact` density, so every Button, field, tab and the theme toggle inside is compact with no prop: 32px on a fine
 * pointer, 44px on touch. The top bar keeps its 56px height.
 */
export function AppShell({ brand, homeHref = '/', homeLabel = 'Home', actions, themeControl, nav, navLabel = 'Navigation', linkComponent, children }: AppShellProps) {
  const ambient = useLinkComponent();
  const Link = linkComponent ?? ambient;
  return (
    <LinkProvider value={Link}>
      <DensityProvider density="compact">
        <div className="flex min-h-svh flex-col">
          <SkipLink />
          <header className="band sticky top-0 z-40 pt-[env(safe-area-inset-top)] md:hairline">
            <div className="flex h-14 items-center justify-between gap-4 px-(--ejm-page-gutter)">
              <Link href={homeHref} aria-label={homeLabel} className="touch-target compact-target -ms-2 inline-flex items-center rounded-control px-2 py-1 text-fg hover:bg-tone">
                {brand}
              </Link>
              <div className="flex items-center gap-2">
                {actions}
                {themeControl === undefined ? <ThemeToggle /> : themeControl}
              </div>
            </div>
          </header>
          <div className="grid flex-1 md:grid-cols-[15rem_minmax(0,1fr)]">
            <div className="md:border-e md:border-line">
              <div className="px-(--ejm-page-gutter) md:sticky md:top-[calc(3.5rem+env(safe-area-inset-top,0px))] md:max-h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] md:overflow-y-auto md:overscroll-contain md:py-6 md:ps-[max(var(--ejm-page-gutter),env(safe-area-inset-left,0px))] md:pe-4">
                <Collapse from="md" label={navLabel}>
                  <nav aria-label={navLabel} className="pb-4 md:pb-0">
                    <ul className="grid gap-1">
                      {nav.map(item => (
                        <li key={item.href}>
                          <NavLink item={item} link={Link} className={navItemClass} />
                        </li>
                      ))}
                    </ul>
                  </nav>
                </Collapse>
              </div>
            </div>
            <main id="main" tabIndex={-1} className="min-w-0 px-(--ejm-page-gutter) py-8 focus:outline-none md:px-8 lg:px-12">
              {children}
            </main>
          </div>
        </div>
      </DensityProvider>
    </LinkProvider>
  );
}
