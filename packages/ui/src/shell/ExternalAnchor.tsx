import { ArrowUpRight } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../lib/utils';

/**
 * Private to the shell, not exported from its barrel. The external anchor with the class its caller chooses: ExternalLink gives it the
 * `link` style, NavLink gives it a nav style. It adds rel="external noopener", the arrow and "opens another site" for screen readers.
 */
export function ExternalAnchor({ className, children, rel, ...rest }: ComponentPropsWithoutRef<'a'> & { href: string }) {
  return (
    <a rel={cn('external noopener', rel)} className={className} {...rest}>
      {children}
      <ArrowUpRight aria-hidden className="ms-0.5 inline-block size-[0.85em] align-baseline" strokeWidth={2.25} />
      <span className="sr-inline">, opens another site</span>
    </a>
  );
}
