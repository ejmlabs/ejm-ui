import type { DocPage } from '@ejm/ui';

// What each docs page is called and says first, as plain data with no React. The route list, the head tags, the sidebar and the page
// itself all read it, so the gallery's entry bundle never has to import the page content just to name a route.
type Meta = Pick<DocPage, 'slug' | 'group' | 'title' | 'lead'>;

export const docMeta = {
  'getting-started': { slug: 'getting-started', group: 'Start', title: 'Getting started', lead: 'Install the workspace, import one stylesheet and build a page from bands and components.' },
  'design-language': { slug: 'design-language', group: 'Foundations', title: 'Design language', lead: 'Structure comes from type, space, hairlines and full-bleed bands, not boxes. A few firm rules keep every ejmlabs surface consistent.' },
  'tokens-and-bands': { slug: 'tokens-and-bands', group: 'Foundations', title: 'Tokens and bands', lead: 'Components never hold color values. They use semantic names that a band and a theme resolve, so every child reads correctly on every ground.' },
  'theming': { slug: 'theming', group: 'Foundations', title: 'Theming and the cookie', lead: 'Light and dark follow the visitor, with no flash. One cookie carries the choice across every ejmlabs.com site.' },
  'components': { slug: 'components', group: 'Build', title: 'Components', lead: 'Check here before you build something new. Everything is exported from @ejm/ui, reads the theme contract, and follows the WAI-ARIA pattern for its role.' },
  'checks': { slug: 'checks', group: 'Quality', title: 'Checks and budgets', lead: 'Every line of the quality bar is something a script, a screenshot or the keyboard can check. A page ships when each line holds.' },
} satisfies Record<string, Meta>;

/** The page slugs in reading order. The first is the index at /docs. */
export const docSlugs = Object.keys(docMeta) as (keyof typeof docMeta)[];
