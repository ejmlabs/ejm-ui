import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { headToString, resolveHead } from './head';
import { SiteRoot } from './root';
import type { Route, Site } from './site';

export interface Rendered {
  html: string;
  /** `<title>` plus meta and link tags, ready for the document head. */
  head: string;
  title: string;
}

/** Every page to write: the routes, then the 404 page. */
export const allRoutes = (site: Site): Route[] => [...site.routes, site.notFound];

/** Renders one route to HTML. Lazy routes are loaded first, so the HTML is complete and hydration finds no fallback. */
export async function renderRoute(site: Site, route: Route): Promise<Rendered> {
  await route.preload();
  // The 404 page is rendered for a path no route owns, which is what a client sees at any unknown URL.
  const ssrPath = site.base + (route === site.notFound ? '/__ejm_not_found__' : route.path);
  const html = renderToString(createElement(SiteRoot, { site, ssrPath }));
  const head = resolveHead(site, route);
  return { html, head: headToString(head), title: head.title };
}
