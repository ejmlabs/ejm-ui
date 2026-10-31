import type { Plugin, PluginOption } from 'vite';
import type { HeadersOptions } from './headers.mjs';
import type { Project, ProjectId } from './projects.mjs';

export interface EjmSiteOptions {
  project: ProjectId | Project;
  /** Options for `_headers`, or `false` to leave the file to the site. */
  headers?: HeadersOptions | false;
}
export interface EjmlabsOptions extends EjmSiteOptions {
  /** The site module, relative to the Vite root. Defaults to `src/site.tsx`. */
  site?: string;
}
/** Files the plugin serves and writes at the site root: published name to absolute path. */
export function sharedFiles(project: Project): Record<string, string>;
/** Tags as HTML strings. An optional content revision refreshes the icon and manifest URLs. */
export function headTags(base?: string, version?: string): string[];
/** Adds the shared assets and head, checks every prerendered page, and runs the design guard (once, even when `ejmUi()` also runs it). */
export function ejmSite(options: EjmSiteOptions): Plugin;
/**
 * The whole Vite setup of an ejmlabs site: `ejmUi()` (Tailwind, React, one React, the design guard), `ejmSite`, the `ejm-ssg`
 * prerenderer, and `build.target: 'es2022'` and `build.cssMinify: 'lightningcss'` unless the site sets them.
 */
export function ejmlabs(options: EjmlabsOptions): PluginOption[];
