import { Link } from '@ejm/ssg';
import { Button, Hero } from '@ejm/ui';

export default function NotFound() {
  return (
    <Hero
      eyebrow="404"
      title="Page not found"
      actions={<Button asChild arrow><Link href="/">Back to the gallery</Link></Button>}
    >
      <p>Nothing is at this address. Every page in the gallery is linked from the home page.</p>
    </Hero>
  );
}
