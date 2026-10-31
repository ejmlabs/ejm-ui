import type { AnchorHTMLAttributes } from 'react';
import type { Closed } from '../lib/closed';
import { ExternalLink } from '../shell/ExternalLink';
import { useLinkComponent } from '../shell/link';

/** Inline links use the site's public routing adapter and one underline treatment. */
export function InlineLink({ external = false, ...props }: Closed<AnchorHTMLAttributes<HTMLAnchorElement>> & { href: string; external?: boolean }) {
  const InternalLink = useLinkComponent();
  // ExternalLink already takes the `link` style when it gets no class.
  return external ? <ExternalLink {...props} /> : <InternalLink {...props} className="link" />;
}
