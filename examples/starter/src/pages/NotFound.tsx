import { InlineLink } from '@ejm/ui/layout/SiteContent';
import { Hero } from '@ejm/ui';

export default function NotFound() {
  return (
    <Hero eyebrow="404" title="This page is not here" actions={<InlineLink href="/">Back to the home page</InlineLink>} />
  );
}
