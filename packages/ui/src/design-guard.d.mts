import type { Plugin } from 'vite';

export interface DesignGuard {
  /** True for a source file the guard checks: a script or stylesheet inside the root's `src`. */
  owns(file: string): boolean;
  /** Drop the cached result of a changed or deleted file. */
  invalidate(file: string): void;
  /** Check every file in `src`. Throws one error with a `[ejm-site:design] file:line:column message` line per violation. */
  validate(): { files: string[]; durationMs: number };
}

/** The ownership check for the app at `root`. It checks every root alike, the library's own gallery included. */
export function siteDesignGuard(root: string): DesignGuard;

/** The guard as a Vite plugin for build and dev. Only the first instance in a config is active. */
export function designGuardPlugin(): Plugin;
