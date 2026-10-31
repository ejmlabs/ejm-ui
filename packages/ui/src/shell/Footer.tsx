import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Brand, type SiteIdentity } from './Brand';
import { useLinkComponent, type LinkComponent, type NavItem } from './link';
import { NavLink } from './NavLink';

export interface FooterColumn {
  heading: string;
  links: readonly NavItem[];
}

export interface FooterProps {
  /** The project identity uses the shared footer branding recipe. */
  identity?: SiteIdentity;
  columns?: readonly FooterColumn[];
  /** The privacy note, for example what analytics runs and how Do Not Track is honored. Shown above the legal line. */
  privacy?: ReactNode;
  /** The last line: copyright, a version. */
  legal?: ReactNode;
  linkComponent?: LinkComponent;
}

// A link on the column edge has no box to fill, so it turns text-link on hover, instantly. The current page is marked by NavLink.
const linkClass = 'touch-target inline-flex items-center py-1.5 text-muted hover:text-link aria-[current=page]:text-fg';

/**
 * The site footer: a full-bleed Ink band (dark in both themes) with link columns, a slot for the privacy note and a legal
 * line. The columns are one `nav` named "Footer" (headings name the groups). Columns reflow from one to three. It keeps clear of the home bar with a safe-area inset.
 */
export function Footer({ identity, columns = [], privacy, legal, linkComponent }: FooterProps) {
  const ambient = useLinkComponent();
  const Link = linkComponent ?? ambient;
  return (
    <footer data-band="ink" className="band pt-rhythm-sm pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="page">
        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,3fr)]">
          {identity && <div className="max-w-measure">
            {identity.artwork ? <Brand {...identity.artwork} name={identity.name} placement="footer" /> : <p className="text-heading tracking-tight">{identity.name}</p>}
            {identity.description && <p className="mt-3 text-muted">{identity.description}</p>}
          </div>}
          {/* One landmark for all the columns: the headings name the groups, and the name "Footer" cannot clash with a page's own navs. */}
          {columns.length > 0 && (
          <nav aria-label="Footer" className={cn('grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3', !identity && 'lg:col-span-2')}>
            {columns.map(col => (
              <div key={col.heading}>
                <h2 className="text-meta text-muted">{col.heading}</h2>
                <ul className="mt-3">
                  {col.links.map(l => (
                    <li key={l.href}>
                      <NavLink item={l} link={Link} className={linkClass} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          )}
        </div>
        {(privacy || legal) && (
          <div className="hairline-t mt-12 grid gap-3 pt-6 text-meta text-muted">
            {privacy && <div className="max-w-measure">{privacy}</div>}
            {legal && <div>{legal}</div>}
          </div>
        )}
      </div>
    </footer>
  );
}
