import type { Plugin } from 'vite';

export interface EjmSsgOptions {
  /** The module whose default export is `defineSite(...)`, relative to the Vite root. */
  site: string;
}

/** A prerendered page: its path relative to the build folder (`index.html`, `about/index.html`, `404.html`) and its HTML. */
export interface PrerenderedPage {
  file: string;
  html: string;
}

/** A plugin that sets `api: { onPages }` is called once, after every page is written, and fails the build by throwing. */
export interface PagesApi {
  onPages(pages: readonly PrerenderedPage[]): void | Promise<void>;
}

/** Prerenders every route after the client build. Use with an `index.html` that holds `<!--ejm-head-->` in the head and `<div id="root"><!--ejm-root--></div>`. */
export function ejmSsg(options: EjmSsgOptions): Plugin;
