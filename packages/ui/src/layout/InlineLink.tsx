import type { AnchorHTMLAttributes } from 'react';
import type { Closed } from '../lib/closed';
import { ExternalLink } from '../shell/ExternalLink';
import { useLinkComponent } from '../shell/link';

/** Inline links use the site's public routing adapter and one underline treatment. Inside `Button asChild` they take the button's
 *  recipe, which the button passes through its slot. */
export function InlineLink({ external = false, ...props }: Closed<AnchorHTMLAttributes<HTMLAnchorElement>> & { href: string; external?: boolean }) {
  const InternalLink = useLinkComponent();
  const { className, ...rest } = props as typeof props & { className?: string };
  // ExternalLink takes the slot's class the same way, and the `link` style without one.
  return external ? <ExternalLink {...props} /> : <InternalLink {...rest} className={className ?? 'link'} />;
}
