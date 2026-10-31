import type { ComponentPropsWithoutRef } from 'react';
import type { Closed } from '../lib/closed';
import { ExternalAnchor } from './ExternalAnchor';

export type ExternalLinkProps = Closed<ComponentPropsWithoutRef<'a'>> & { href: string };

/**
 * A link to another site: rel="external noopener", an arrow, and "opens another site" for screen readers.
 * It is a plain anchor, never a router link, in the `link` style, and does not open a new tab unless you pass target.
 */
export function ExternalLink(props: ExternalLinkProps) {
  return <ExternalAnchor {...props} className="link" />;
}
