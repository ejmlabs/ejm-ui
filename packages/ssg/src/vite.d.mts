import type { Plugin } from 'vite';

export interface EjmSsgOptions {
  /** The module whose default export is `defineSite(...)`, relative to the Vite root. */
  site: string;
}

/** Prerenders every route after the client build. Use with an `index.html` that holds `<!--ejm-head-->` in the head and `<div id="root"><!--ejm-root--></div>`. */
export function ejmSsg(options: EjmSsgOptions): Plugin;
