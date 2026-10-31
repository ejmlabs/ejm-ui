import { cn } from '../lib/utils';
import { ExternalAnchor } from './ExternalAnchor';
import type { LinkComponent, NavItem } from './link';

// The current page is never color alone: weight 600 and a 2px underline, on every nav link in the shell.
const current = 'aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[0.4em]';

/**
 * Private to the shell, not exported from its barrel. One nav item as a link: a plain ExternalAnchor for an external item, the site's
 * router link otherwise, and aria-current plus the current-page mark for the current item. The caller supplies the rest of the class.
 */
export function NavLink({ item, link: Link, className }: { item: NavItem; link: LinkComponent; className: string }) {
  const classes = cn(className, current);
  const aria = item.current ? 'page' : undefined;
  return item.external ? (
    <ExternalAnchor href={item.href} className={classes} aria-current={aria}>
      {item.label}
    </ExternalAnchor>
  ) : (
    <Link href={item.href} className={classes} aria-current={aria}>
      {item.label}
    </Link>
  );
}
