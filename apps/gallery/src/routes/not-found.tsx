import { Link } from '@ejm/ssg';
import { Band, SectionHead } from '@ejm/ui';

export default function NotFound() {
  return (
    <Band tone="paper" aria-labelledby="not-found-title">
      <SectionHead purpose="page" kicker="404" title="Page not found" id="not-found-title" as="h1">
        <p className="m-0">Nothing is at this address. Every page in the gallery is linked from the home page.</p>
        <p className="mt-8 mb-0"><Link href="/" className="link text-lead">Back to the gallery</Link></p>
      </SectionHead>
    </Band>
  );
}
