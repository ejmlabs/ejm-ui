import type { ReactNode } from 'react';
import type { Band } from '@ejm/tokens';
import { useLinkComponent, type LinkComponent, type NavItem } from './link';
import { Brand, type SiteIdentity } from './Brand';
import { NavLink } from './NavLink';
import { NavMenu } from './NavMenu';
import { ThemeToggle } from './ThemeToggle';

export interface HeaderProps {
  /** The site's name and optional mark. The header owns the brand scale, spacing and type, inside the home link. */
  identity: SiteIdentity;
  /** Replaces the last control. Omit it to keep ThemeToggle; pass null to show none. */
  themeControl?: ReactNode;
  /** The accessible name of the home link. */
  homeLabel?: string;
  homeHref?: string;
  nav?: readonly NavItem[];
  /** Matches the band the page opens with. Default: the page ground. */
  band?: Band;
  linkComponent?: LinkComponent;
}

// One control recipe: 44px, the control radius, a bg-tone hover. The current page is marked by NavLink.
const itemClass = 'touch-target inline-flex min-h-11 items-center rounded-control px-3 text-fg hover:bg-tone';

/**
 * The site header, sticky on the page ground with no box or rule. The identity is at the left; at the right the nav, then the
 * ThemeToggle, always last. The nav is one landmark. When the header is narrower than 48rem (768px) its list folds into a native
 * <details> menu (NavMenu), so it works without scripts and takes no space when closed (the open menu is an overlay, so nothing
 * moves). The switch follows the header's own width, a container query, so a header in a narrow column shows the menu at any
 * viewport width. It sets the sticky offset through --ejm-header-h and keeps clear of the notch with safe-area insets.
 */
export function Header({ identity, themeControl, homeLabel = 'Home', homeHref = '/', nav = [], band, linkComponent }: HeaderProps) {
  const ambient = useLinkComponent();
  const Link = linkComponent ?? ambient;
  return (
    <header data-band={band} className="band @container sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="page-inset flex h-(--ejm-header-h) items-center justify-between gap-4">
        <Link href={homeHref} aria-label={homeLabel} className="-ms-2 inline-flex min-h-11 items-center rounded-control px-2 text-fg hover:bg-tone">
          {identity.artwork ? <Brand {...identity.artwork} name={identity.name} /> : <span className="text-heading tracking-tight">{identity.name}</span>}
        </Link>

        <div className="flex items-center gap-1">
          {nav.length > 0 && (
            // One landmark. In a header at least 48rem wide the list is shown and the disclosure is display:none; below it the other way
            // round, so only one of them is ever in the accessibility tree.
            <nav aria-label="Main">
              <ul className="hidden items-center gap-1 @3xl:flex">
                {nav.map(item => (
                  <li key={item.href}>
                    <NavLink item={item} link={Link} className={itemClass} />
                  </li>
                ))}
              </ul>
              <NavMenu nav={nav} link={Link} />
            </nav>
          )}
          {themeControl === undefined ? <ThemeToggle /> : themeControl}
        </div>
      </div>
    </header>
  );
}
