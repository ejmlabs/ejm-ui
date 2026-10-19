import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteDefaults } from './head';
import { PROJECT_LIST, PROJECTS, assetPaths, otherSites, sourceLinks } from './projects.mjs';
import { headTags, sharedFiles } from './vite.mjs';

describe('project registry', () => {
  it('has four sites, each on its own https host with a trailing-slash url and a token', () => {
    expect(PROJECT_LIST.map(p => p.host)).toEqual(['ejmlabs.com', 'cli.ejmlabs.com', 'ide.ejmlabs.com', 'harness.ejmlabs.com']);
    for (const p of PROJECT_LIST) {
      expect(p.url).toBe(`https://${p.host}/`);
      expect(p.analyticsToken).toMatch(/^[0-9a-f]{32}$/);
      expect(p.repo).toMatch(/^https:\/\/github\.com\/ejmlabs/);
    }
    expect(new Set(PROJECT_LIST.map(p => p.analyticsToken)).size).toBe(4);
  });

  it('links to the other sites as external and leaves out the current one', () => {
    const links = otherSites('cli');
    expect(links.map(l => l.label)).toEqual(['ejmlabs', 'ejm-ide', 'ejm-harness']);
    expect(links.every(l => l.external && l.href.startsWith('https://'))).toBe(true);
    expect(sourceLinks('ide')).toEqual([{ label: 'ejm-ide on GitHub', href: PROJECTS.ide.repo, external: true }]);
  });

  it('falls back to the ejmlabs brand files for a project without a folder', () => {
    expect(assetPaths(PROJECTS.cli).favicon).toBe('favicon');
    expect(assetPaths(PROJECTS.cli, d => d === 'projects/cli')).toMatchObject({ favicon: 'projects/cli', logoInk: 'projects/cli/logo-ink.svg', socialCard: 'projects/cli/social-card.png' });
  });

  it('cli, ide and harness serve their own icons and social card, ejmlabs keeps the root set', () => {
    const own = (id: 'ejmlabs' | 'cli' | 'ide' | 'harness') => sharedFiles(PROJECTS[id]);
    for (const id of ['cli', 'ide', 'harness'] as const) {
      const files = own(id);
      expect(files['favicon.svg'], id).toContain(`/assets/projects/${id}/`);
      expect(files['apple-touch-icon.png'], id).toContain(`/assets/projects/${id}/`);
      expect(files['social-card.png'], id).toContain(`/assets/projects/${id}/`);
      // Different artwork per project, not the same bytes under three names.
      expect(readFileSync(files['favicon.svg']!), id).not.toEqual(readFileSync(own('ejmlabs')['favicon.svg']!));
    }
    expect(own('ejmlabs')['social-card.png']).toMatch(/assets\/social\/social-card\.png$/);
    expect(new Set(['cli', 'ide', 'harness'].map(id => readFileSync(own(id as 'cli')['social-card.png']!).toString('hex'))).size).toBe(3);
  });

  it('every shared file the plugin serves exists in @ejm/ui and @ejm/tokens', () => {
    for (const p of PROJECT_LIST) for (const [name, path] of Object.entries(sharedFiles(p))) expect(existsSync(path), `${p.id}: ${name}`).toBe(true);
  });
});

describe('shared head', () => {
  it('adds the theme boot as an external synchronous script before the stylesheet, with color-scheme and icons', () => {
    const html = headTags('/').join('\n');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('<script src="/theme-boot.js"></script>');
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect(html).not.toMatch(/<script[^>]*(defer|async|type="module")/);
    expect(html).toContain('rel="manifest" href="/site.webmanifest"');
    expect(headTags('/docs/').join('')).toContain('src="/docs/theme-boot.js"');
  });

  it('gives defineSite the origin, title template, social card and font preloads', () => {
    const d = siteDefaults('harness');
    expect(d.origin).toBe('https://harness.ejmlabs.com');
    expect(d.head.titleTemplate).toBe('%s | ejm-harness');
    expect(d.head.og).toMatchObject({ siteName: 'ejm-harness', image: '/social-card.png' });
    expect(d.head.meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' });
    expect(d.fonts).toHaveLength(2);
    expect(siteDefaults('cli', { description: 'Mine.' }).head.description).toBe('Mine.');
  });
});
