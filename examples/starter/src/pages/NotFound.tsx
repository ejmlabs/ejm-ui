import { Link } from '@ejm/ssg';
import { Band, SectionHead } from '@ejm/ui';

export default function NotFound() {
  return (
    <Band>
      <SectionHead as="h1" kicker="404" title="This page is not here" size="title">
        <Link href="/" className="link">Back to the home page</Link>
      </SectionHead>
    </Band>
  );
}
