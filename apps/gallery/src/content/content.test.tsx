import { pageContents, pageHref, pagerFor } from '@ejm/ui';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DocsPageView } from './docs-page';
import { docs } from './index';
import { docMeta, docSlugs } from './meta';

// Server-rendered HTML is what a visitor with scripts disabled gets, so these tests read it directly.
const html = (slug?: string) => renderToString(<DocsPageView slug={slug} />);
const text = (h: string) => h.replace(/<[^>]+>/g, '');
const ids = (h: string) => [...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]!);

describe('docs content', () => {
  it('keeps the route list in step with the pages', () => {
    expect(docs.pages.map(p => p.slug)).toEqual([...docSlugs]);
    for (const page of docs.pages) expect(page).toMatchObject(docMeta[page.slug as keyof typeof docMeta]);
  });

  it.each(docs.pages.map(p => [p.slug, p] as const))('%s: with scripts off, contents links jump to real headings and the page has one h1', (slug, page) => {
    const h = html(page === docs.pages[0] ? undefined : slug);
    const have = new Set(ids(h));
    const hrefs = [...h.matchAll(/<a href="#([^"]+)"/g)].map(m => m[1]!);
    for (const item of pageContents(page)) {
      expect(h).toContain(`href="#${item.id}"`);
      expect(have.has(item.id), `${slug}: no heading with id ${item.id}`).toBe(true);
    }
    for (const target of hrefs) expect(have.has(target), `${slug}: dead anchor #${target}`).toBe(true);
    expect(ids(h).length).toBe(new Set(ids(h)).size);
    expect(h.match(/<h1[ >]/g)).toHaveLength(1);
    expect([...h.matchAll(/<h([1-6])[ >]/g)].map(m => +m[1]!).every((lvl, i, all) => i === 0 || lvl - all[i - 1]! <= 1)).toBe(true);
  });

  it('every internal docs link points at a page that exists', () => {
    const real = new Set(docs.pages.map(p => pageHref(docs, p)));
    for (const page of docs.pages) {
      for (const m of html(page === docs.pages[0] ? undefined : page.slug).matchAll(/href="(\/docs[^"#]*)"/g)) expect(real.has(m[1]!), m[1]).toBe(true);
    }
  });

  it('shows every tab panel under its label, the filter input (hidden) and no dead tab list', () => {
    const h = html('design-language');
    expect(h).toContain('type="search"');
    expect(h).toMatch(/<div hidden=""[^>]*><label[^>]*>Filter pages/);
    expect(h).not.toContain('role="tab"');
    expect(h).not.toContain('role="tablist"');
    // Both language panels of the reduced-motion tabs are present, each under its label.
    expect(h).toContain('>TypeScript</p>');
    expect(h).toContain('>HTML</p>');
    expect(text(h)).toContain('animate-reveal');
    expect(h).toContain('Third item');
    // The CSS, TypeScript and Rust panels of the token example.
    const start = html();
    for (const word of ['var(--ejm-primary)', 'bg-primary', 'DARK.primary']) expect(text(start)).toContain(word);
    expect(start).toContain('>Rust</p>');
  });

  it('marks the current page, links the neighbours and names them', () => {
    const h = html('tokens-and-bands');
    expect(h).toMatch(/href="\/docs\/tokens-and-bands"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/docs\/tokens-and-bands"/);
    expect(h).toContain('rel="prev"');
    expect(h).toContain('rel="next"');
    const { prev, next } = pagerFor(docs, docs.pages[2]!);
    expect(prev?.title).toBe('Design language');
    expect(next?.title).toBe('Theming and the cookie');
    expect(html()).not.toContain('rel="prev"');
  });

  it('uses no em dashes', () => {
    for (const page of docs.pages) expect(html(page === docs.pages[0] ? undefined : page.slug)).not.toContain(String.fromCharCode(0x2014));
  });
});
