import { cn } from '../lib/utils';
import { useLinkComponent } from '../shell/link';

export interface PagerLink {
  href: string;
  title: string;
}

/**
 * Previous and next pages, as links of the site's router (see LinkProvider; plain anchors without one). Each link names the page it goes to, so it reads on its own. Two columns split by a hairline
 * from 36rem, stacked below. With one neighbor, that link keeps its own side.
 */
export function Pager({ prev, next, className }: { prev?: PagerLink | null; next?: PagerLink | null; className?: string }) {
  const Link = useLinkComponent();
  if (!prev && !next) return null;
  const link = 'touch-target focus-ring group block py-6 transition-colors duration-fast';
  return (
    <nav aria-label="Previous and next pages" className={cn('hairline-t mt-16 grid sm:grid-cols-2', className)}>
      {prev ? (
        <Link rel="prev" href={prev.href} className={cn(link, 'pe-6')}>
          <span className="block text-meta text-muted">Previous</span>
          <span className="mt-1 block text-lead font-semibold text-fg transition-colors duration-fast group-hover:text-link">
            <span aria-hidden="true" className="me-2 inline-block transition-transform duration-fast group-hover:-translate-x-1">
              &larr;
            </span>
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link rel="next" href={next.href} className={cn(link, 'text-end sm:ps-6')}>
          <span className="block text-meta text-muted">Next</span>
          <span className="mt-1 block text-lead font-semibold text-fg transition-colors duration-fast group-hover:text-link">
            {next.title}
            <span aria-hidden="true" className="ms-2 inline-block transition-transform duration-fast group-hover:translate-x-1">
              &rarr;
            </span>
          </span>
        </Link>
      )}
    </nav>
  );
}
