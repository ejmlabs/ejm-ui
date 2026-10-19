import { ArrowUpRight } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib/utils';

/**
 * A link to another site: rel="external noopener", an arrow, and "opens another site" for screen readers.
 * It is a plain anchor, never a router link, and does not open a new tab unless you pass target. With no className it
 * gets the `link` style; pass a className to style it yourself, as nav items do.
 */
export function ExternalLink({ className, children, rel, ...rest }: ComponentPropsWithoutRef<'a'> & { href: string }) {
  return (
    <a rel={cn('external noopener', rel)} className={className ?? 'link'} {...rest}>
      {children}
      <ArrowUpRight aria-hidden className="ms-0.5 inline-block size-[0.85em] align-baseline" strokeWidth={2.25} />
      <span className="sr-inline">, opens another site</span>
    </a>
  );
}
