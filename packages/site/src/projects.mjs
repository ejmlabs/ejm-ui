// The four ejmlabs sites. One registry feeds the analytics host map, the security headers, the cross-site nav and the footers.
// Plain JavaScript with a .d.mts next to it, so the Vite plugin and the CLI can load it from node_modules without a TypeScript loader.

/** @type {Readonly<Record<'ejmlabs' | 'cli' | 'ide' | 'harness', import('./projects.d.mts').Project>>} */
export const PROJECTS = Object.freeze({
  ejmlabs: {
    id: 'ejmlabs',
    name: 'ejmlabs',
    host: 'ejmlabs.com',
    url: 'https://ejmlabs.com/',
    tagline: 'A one-person lab for small experiments, useful software, and open source tools.',
    repo: 'https://github.com/ejmlabs',
    // Cloudflare Web Analytics site tokens are public by design (see ANALYTICS in the old design kit).
    analyticsToken: '1ccb35c8ea484d13beb469e289e0adb8',
    assetDir: 'projects/ejmlabs', // no folder: the ejmlabs files are the root sets in @ejm/tokens/assets
  },
  cli: {
    id: 'cli',
    name: 'ejm-cli',
    host: 'cli.ejmlabs.com',
    url: 'https://cli.ejmlabs.com/',
    tagline: 'A coding agent for your terminal. One native binary, read only until you grant more.',
    repo: 'https://github.com/ejmlabs/ejm-cli',
    analyticsToken: '5815d1d0cf10429ab3ac683193235314',
    assetDir: 'projects/cli',
  },
  ide: {
    id: 'ide',
    name: 'ejm-ide',
    host: 'ide.ejmlabs.com',
    url: 'https://ide.ejmlabs.com/',
    tagline: 'A free, open-source desktop editor built in Rust, with an agent beside your code.',
    repo: 'https://github.com/ejmlabs/ejm-ide',
    analyticsToken: '3c5bc3f589384a77801bbe33c09a95a8',
    assetDir: 'projects/ide',
  },
  harness: {
    id: 'harness',
    name: 'ejm-harness',
    host: 'harness.ejmlabs.com',
    url: 'https://harness.ejmlabs.com/',
    tagline: 'An open Rust engine that runs many coding agents on one resource governor.',
    repo: 'https://github.com/ejmlabs/ejm-harness',
    analyticsToken: '0bfa5a59716e48008f6b02a8e19389f4',
    assetDir: 'projects/harness',
  },
});

export const PROJECT_LIST = Object.freeze(Object.values(PROJECTS));

/** Where a project's brand files are inside @ejm/tokens/assets. cli, ide and harness have their own set in `projects/<id>/`;
 *  ejmlabs uses the root files (`favicon/`, `logos/`, `social/`). `exists` lets the caller say which directories are really there,
 *  and a project without a folder falls back to the ejmlabs files. */
export function assetPaths(project, exists = () => false) {
  const own = exists(project.assetDir);
  return {
    favicon: own ? project.assetDir : 'favicon',
    logoInk: own ? `${project.assetDir}/logo-ink.svg` : 'logos/ejmlabs-ink.svg',
    logoPaper: own ? `${project.assetDir}/logo-paper.svg` : 'logos/ejmlabs-paper.svg',
    socialCard: own ? `${project.assetDir}/social-card.png` : 'social/social-card.png',
  };
}

/** The other sites as nav or footer items. They are another origin, so they are marked external; the current site is left out. */
export function otherSites(currentId) {
  return PROJECT_LIST.filter(p => p.id !== currentId).map(p => ({ label: p.name, href: p.url, external: true }));
}

/** Source links for the footer (all external). */
export function sourceLinks(currentId) {
  const own = PROJECTS[currentId];
  return [{ label: `${own.name} on GitHub`, href: own.repo, external: true }];
}
