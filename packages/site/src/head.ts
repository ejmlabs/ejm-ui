import type { SiteHead } from '@ejm/ssg';
import { fontPreloads } from '@ejm/ui/font-preloads';
import { PROJECTS, type ProjectId } from './projects.mjs';

/** The URLs of the two brand fonts, hashed by Vite, for `defineSite({ fonts })`. They are preloaded on every route. */
export const siteFonts = (): string[] => fontPreloads.map(p => p.href);

export interface SiteDefaults {
  origin: string;
  head: SiteHead;
  fonts: string[];
}

export interface SiteDefaultsOptions {
  /** Replaces the project tagline as the default description. */
  description?: string;
  /** `Page | ejmlabs` by default. */
  titleTemplate?: string;
  /** Social card path or URL. Default: `/social-card.png`, which the `ejmSite` Vite plugin writes from the brand assets. */
  image?: string;
}

/**
 * The shared part of `defineSite`: origin, title template, description, Open Graph and Twitter card tags, and the font preloads.
 * Spread it and add routes: `defineSite({ ...siteDefaults('cli'), App, routes })`.
 * The color-scheme and theme-color metas, the theme-boot script and the icon links are static tags in `index.html`,
 * which the `ejmSite` Vite plugin adds (the ssg head cannot carry them).
 */
export function siteDefaults(id: ProjectId, options: SiteDefaultsOptions = {}): SiteDefaults {
  const p = PROJECTS[id];
  const description = options.description ?? p.tagline;
  return {
    origin: p.url.replace(/\/$/, ''),
    head: {
      titleTemplate: options.titleTemplate ?? `%s | ${p.name}`,
      description,
      og: { siteName: p.name, image: options.image ?? '/social-card.png', type: 'website' },
      meta: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'en_US' },
      ],
    },
    fonts: siteFonts(),
  };
}
