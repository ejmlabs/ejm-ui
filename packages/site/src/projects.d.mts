export type ProjectId = 'ejmlabs' | 'cli' | 'ide' | 'harness' | 'chess' | 'ui';
export interface ProjectGuide {
  label: string;
  /** Intended canonical guide URL. Verify publication before enabling project discovery. */
  href: string;
}
export interface Project {
  id: ProjectId;
  /** `ejmlabs`, `ejm-cli`: the name used in titles and link text. */
  name: string;
  /** Exact hostname, no scheme. */
  host: string;
  /** Canonical origin with a trailing slash. */
  url: string;
  tagline: string;
  /** Repository URL, or an empty string when no remote repository is configured. */
  repo: string;
  /** Cloudflare Web Analytics site token for `host`, or an empty string when unconfigured. */
  analyticsToken: string;
  /** Directory under `@ejm/tokens/assets` that will hold this project's own brand files. */
  assetDir: string;
  /** Defaults true. Set false until the product and guide destinations are published and verified. */
  discoverable?: boolean;
  guides?: readonly ProjectGuide[];
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
/** Discoverable projects only. Use PROJECTS[id] directly for an unreleased build identity. */
export const PROJECT_LIST: readonly Project[];
export type LinkedProjectId = 'calm' | 'gerry';
/** A family site built without @ejm/site: linked from the other sites, with no build identity of its own. */
export interface LinkedProject {
  id: LinkedProjectId;
  name: string;
  /** Canonical origin with a trailing slash. */
  url: string;
  /** Repository URL, or an empty string for a product with no public repository. */
  repo: string;
}
/** Linked family sites, after the build identities in `otherSites`. */
export const LINKED_PROJECTS: readonly LinkedProject[];
export function assetPaths(project: Project, exists?: (dir: string) => boolean): ProjectAssets;
export function otherSites(currentId: ProjectId): SiteLink[];
export function sourceLinks(currentId: ProjectId): SiteLink[];
