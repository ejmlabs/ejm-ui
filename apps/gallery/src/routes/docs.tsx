import type { ComponentType } from 'react';
import { DocsPageView } from '../content/docs-page';
import { docs } from '../content';

// Every docs page is one component per slug, all in this one chunk. site.tsx loads the one the route names.
export const docPages: Record<string, ComponentType> = Object.fromEntries(
  docs.pages.map((p, i) => [p.slug, () => <DocsPageView slug={i === 0 ? undefined : p.slug} />]),
);

export default docPages['getting-started']!;
