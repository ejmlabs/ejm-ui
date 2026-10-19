export type ProjectId = 'ejmlabs' | 'cli' | 'ide' | 'harness';
export interface Project {
  id: ProjectId;
  /** `ejmlabs`, `ejm-cli`: the name used in titles and link text. */
  name: string;
  /** Exact hostname, no scheme. */
  host: string;
  /** Canonical origin with a trailing slash. */
  url: string;
  tagline: string;
  repo: string;
  /** Cloudflare Web Analytics site token for `host`. */
  analyticsToken: string;
  /** Directory under `@ejm/tokens/assets` that will hold this project's own brand files. */
  assetDir: string;
}
export interface SiteLink {
  label: string;
  href: string;
  external: true;
}
export interface ProjectAssets {
  /** Directory under `@ejm/tokens/assets` holding the favicon set and `site.webmanifest`. */
  favicon: string;
  logoInk: string;
  logoPaper: string;
  socialCard: string;
}
export const PROJECTS: Readonly<Record<ProjectId, Project>>;
export const PROJECT_LIST: readonly Project[];
export function assetPaths(project: Project, exists?: (dir: string) => boolean): ProjectAssets;
export function otherSites(currentId: ProjectId): SiteLink[];
export function sourceLinks(currentId: ProjectId): SiteLink[];
