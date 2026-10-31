/** A prerendered page: its path relative to the build folder (`about/index.html`) and its HTML. */
export interface Page {
  file: string;
  html: string;
}
export interface PagesOptions {
  /** The site's own origin. Absolute links to it need no `rel="external"`; any other absolute `http(s)` or `//host` link does. */
  origin?: string;
}
export interface PageProblem {
  file: string;
  rule: string;
}
/** Every structural violation: not exactly one h1, a skipped heading level, a first focusable element that is not the skip link to #main, no `main#main`, or an external link without `rel="external"`. */
export function pageProblems(pages: readonly Page[], options?: PagesOptions): PageProblem[];
/** Throws one error with a `[ejm-site:pages] <file>: <rule>` line per violation. */
export function checkPages(pages: readonly Page[], options?: PagesOptions): void;
