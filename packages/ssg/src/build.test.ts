import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(pkg, 'fixtures', 'basic');
const dist = join(fixture, 'dist');

// A real build of the fixture through the CLI, then read the files it wrote. No script ever runs: DOMParser only parses.
const page = (file: string) => new DOMParser().parseFromString(readFileSync(join(dist, file), 'utf8'), 'text/html');
const attr = (doc: Document, sel: string, name: string) => doc.querySelector(sel)?.getAttribute(name);

beforeAll(() => {
  execFileSync('node', [join(pkg, 'bin', 'ejm-ssg.mjs'), 'build'], { cwd: fixture, stdio: 'pipe' });
}, 180_000);

describe('prerendered HTML, no JavaScript', () => {
  it('home has its content, header and live region in the static HTML', () => {
    const doc = page('index.html');
    expect(doc.querySelector('#root h1')?.textContent).toBe('Home heading');
    expect(doc.querySelector('#root p')?.textContent).toContain('before any script runs');
    expect([...doc.querySelectorAll('header a')].map(a => a.getAttribute('href'))).toEqual(['/', '/lazy/', '/lazy/#details', '/missing/', 'https://example.com/']);
    expect(doc.getElementById('ejm-announcer')?.getAttribute('aria-live')).toBe('polite');
    expect(doc.querySelectorAll('title')).toHaveLength(1);
  });

  it('the lazy route is rendered in full, not left to a Suspense fallback', () => {
    const doc = page('lazy/index.html');
    expect(doc.querySelector('#main h1')?.textContent).toBe('Lazy heading');
    expect(doc.querySelector('.lazy-note')?.textContent).toContain('own chunk');
  });

  it('404.html renders the not found page', () => {
    const doc = page('404.html');
    expect(doc.querySelector('#main h1')?.textContent).toBe('Nothing here');
    expect(attr(doc, 'meta[name=robots]', 'content')).toBe('noindex');
    expect(doc.querySelector('link[rel=canonical]')).toBeNull();
  });

  it('every route has its own head tags', () => {
    const home = page('index.html');
    expect(home.title).toBe('Home | Fixture');
    expect(attr(home, 'meta[name=description]', 'content')).toBe('The home page.');
    expect(attr(home, 'link[rel=canonical]', 'href')).toBe('https://fixture.test/');
    expect(attr(home, 'meta[property="og:title"]', 'content')).toBe('Home | Fixture');
    expect(attr(home, 'meta[property="og:url"]', 'content')).toBe('https://fixture.test/');
    expect(attr(home, 'meta[property="og:site_name"]', 'content')).toBe('Fixture');

    const lazy = page('lazy/index.html');
    expect(lazy.title).toBe('Lazy page | Fixture');
    expect(attr(lazy, 'meta[name=description]', 'content')).toBe('A fixture site.');
    expect(attr(lazy, 'link[rel=canonical]', 'href')).toBe('https://fixture.test/lazy/');
    expect(attr(lazy, 'meta[property="og:image"]', 'content')).toBe('https://fixture.test/og.png');
  });

  it('injects the font preload, the hashed CSS and the chunk of a lazy route', () => {
    const home = page('index.html');
    const font = home.querySelector('link[rel=preload][as=font]');
    expect(font?.getAttribute('href')).toMatch(/^\/assets\/Fixture-.+\.woff2$/);
    expect(font?.hasAttribute('crossorigin')).toBe(true);
    expect(attr(home, 'link[rel=stylesheet]', 'href')).toMatch(/^\/assets\/index-.+\.css$/);

    const lazy = page('lazy/index.html');
    expect(attr(lazy, 'link[rel=modulepreload]', 'href')).toMatch(/^\/assets\/Lazy-.+\.js$/);
    const sheets = [...lazy.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href'));
    expect(sheets.some(h => /Lazy-.+\.css$/.test(h ?? ''))).toBe(true);
    // Home does not pay for the lazy page.
    expect(home.querySelector('link[rel=modulepreload]')).toBeNull();
    expect(readFileSync(join(dist, 'index.html'), 'utf8')).not.toContain('Lazy-');
  });

  it('writes the links of the site and of the route, each once', () => {
    const hrefs = (doc: Document) => [...doc.head.querySelectorAll('link[rel=preload][as=image]')].map(l => l.getAttribute('href') ?? l.getAttribute('imagesrcset'));
    expect(hrefs(page('index.html'))).toEqual(['/hero.png']);
    expect(hrefs(page('lazy/index.html'))).toEqual(['/hero.png', '/lazy.avif 1x']);
    const second = page('lazy/index.html').head.querySelector('link[imagesrcset]')!;
    expect([second.getAttribute('type'), second.getAttribute('media')]).toEqual(['image/avif', '(min-width: 40em)']);
    expect(page('index.html').head.querySelector('link[href="/hero.png"]')?.getAttribute('fetchpriority')).toBe('high');
    expect(page('404.html').head.querySelectorAll('link[rel=preload][as=image]')).toHaveLength(1);
  });

  it('keeps a Static part in the HTML and out of every script', () => {
    const doc = page('index.html');
    expect(doc.querySelector('[data-ejm-static] .prose-note')?.textContent).toContain('static-marker-7f3a');
    const scripts = readdirSync(join(dist, 'assets')).filter(f => f.endsWith('.js'));
    expect(scripts.length).toBeGreaterThan(0);
    for (const f of scripts) expect(readFileSync(join(dist, 'assets', f), 'utf8'), f).not.toContain('static-marker-7f3a');
  });

  it('emits an image imported only by a Static part and reuses shared font assets', () => {
    const image = attr(page('index.html'), '[data-ejm-static] img', 'src');
    expect(image).toMatch(/^\/assets\/server-only-.+\.svg$/);
    expect(readFileSync(join(dist, image!.slice(1)), 'utf8')).toContain('<svg');
    const assets = readdirSync(join(dist, 'assets'));
    expect(assets.filter(f => /^Fixture-.+\.woff2$/.test(f))).toHaveLength(1);
    const sheets = new Set(['index.html', 'lazy/index.html'].flatMap(file =>
      [...page(file).querySelectorAll('link[rel=stylesheet]')].map(link => link.getAttribute('href')!.split('/').pop()),
    ));
    expect(assets.filter(f => f.endsWith('.css')).sort()).toEqual([...sheets].sort());
    for (const f of assets.filter(f => f.endsWith('.js')))
      expect(readFileSync(join(dist, 'assets', f), 'utf8'), f).not.toContain('server-only-');
  });

  it('marks external links', () => {
    expect(attr(page('index.html'), '#out', 'rel')).toBe('external noopener');
  });
});

describe('lazy routes', () => {
  it('preloads a lazy chunk only on the route that uses it', () => {
    const preloads = (file: string) => [...page(file).querySelectorAll('link[rel=modulepreload]')].map(l => l.getAttribute('href')!.split('/').pop());
    expect(preloads('index.html').some(f => f?.startsWith('Lazy-'))).toBe(false);
    expect(preloads('lazy/index.html').some(f => f?.startsWith('Lazy-'))).toBe(true);
  });

  it('has no budget command', () => {
    const cli = spawnSync('node', [join(pkg, 'bin', 'ejm-ssg.mjs'), 'budget'], { cwd: pkg, encoding: 'utf8' });
    expect(cli.status).toBe(2);
    expect(cli.stderr).toContain('usage: ejm-ssg build | dev');
  });
});


describe('server asset merge', () => {
  it('rejects a conflicting filename without overwriting the client asset', () => {
    const output = mkdtempSync(join(tmpdir(), 'ejm-ssg-collision-'));
    try {
      const cli = join(pkg, '..', '..', 'node_modules', 'vite', 'bin', 'vite.js');
      const result = spawnSync(process.execPath, [cli, 'build', '--config', 'vite.collision.config.ts', '--outDir', output], {
        cwd: fixture,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'production' },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('server asset conflicts with client output: assets/Fixture-');
      const font = readdirSync(join(output, 'assets')).find(f => f.endsWith('.woff2'))!;
      expect(readFileSync(join(output, 'assets', font))).toEqual(readFileSync(join(fixture, 'src', 'fonts', 'Fixture.woff2')));
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 180_000);
});

describe('page hook', () => {
  it('hands every written page to a plugin with api.onPages, and a thrown error fails the build', () => {
    const output = mkdtempSync(join(tmpdir(), 'ejm-ssg-pages-'));
    try {
      const cli = join(pkg, '..', '..', 'node_modules', 'vite', 'bin', 'vite.js');
      const result = spawnSync(process.execPath, [cli, 'build', '--config', 'vite.pages.config.ts', '--outDir', output], {
        cwd: fixture,
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'production' },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('pages seen: 404.html=true index.html=true lazy/index.html=true');
      expect(readFileSync(join(output, 'lazy', 'index.html'), 'utf8')).toContain('Lazy heading');
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  }, 180_000);
});
