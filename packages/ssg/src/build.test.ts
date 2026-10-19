import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { checkBudget } from './budget.mjs';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(pkg, 'fixtures', 'basic');
const dist = join(fixture, 'dist');
const KB = 1024;

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

describe('budget gate', () => {
  it('passes for the fixture and counts only what each route references', () => {
    const report = checkBudget(dist);
    expect(report.breaches).toEqual([]);
    expect(report.rows.map(r => r.route).sort()).toEqual(['/', '/404', '/lazy/']);
    const jsOf = (route: string) => report.rows.find(r => r.route === route)!.files.js.map(f => f.split('/').pop());
    expect(jsOf('/').some(f => f?.startsWith('Lazy-'))).toBe(false);
    expect(jsOf('/lazy/').some(f => f?.startsWith('Lazy-'))).toBe(true);
    expect(report.rows.find(r => r.route === '/')!.bytes.fonts).toBe(8192);
  });

  it('fails, naming the route and the overage, when a budget drops below the current size', () => {
    const current = checkBudget(dist).rows.find(r => r.route === '/lazy/')!.bytes.js;
    const limit = current / KB - 1;
    const report = checkBudget(dist, { js: limit });
    expect(report.breaches.length).toBeGreaterThan(0);
    expect(report.breaches.some(b => b.startsWith('/lazy/: js is ') && b.includes(`over the ${limit} KB budget by`))).toBe(true);
  });

  it('skips pages that match an ignore glob, from the options and from --ignore, and still measures the rest', () => {
    const all = checkBudget(dist).rows.map(r => r.route);
    expect(checkBudget(dist, {}, { ignore: ['lazy/**'] }).rows.map(r => r.route)).toEqual(all.filter(r => r !== '/lazy/'));
    expect(checkBudget(dist, {}, { ignore: ['/404.html', 'lazy/'] }).rows.map(r => r.route)).toEqual(['/']);
    expect(checkBudget(dist, { js: 1 }, { ignore: ['**'] }).rows).toEqual([]);
    const cli = spawnSync('node', [join(pkg, 'bin', 'ejm-ssg.mjs'), 'budget', dist, '--js', '1', '--ignore', 'lazy/**', '--ignore', '404.html', '--ignore', 'index.html'], { cwd: pkg, encoding: 'utf8' });
    expect(cli.stdout).not.toContain('/lazy/');
  });

  it('exits non-zero from the script and from the CLI on a breach, zero otherwise', () => {
    const run = (cmd: string, args: string[]) => spawnSync('node', [cmd, ...args], { cwd: pkg, encoding: 'utf8' });
    const script = join(pkg, '..', '..', 'scripts', 'ssg-budget.mjs');
    const cli = join(pkg, 'bin', 'ejm-ssg.mjs');
    expect(run(script, [dist]).status).toBe(0);
    const bad = run(script, [dist, '--js', '10']);
    expect(bad.status).toBe(1);
    expect(bad.stdout).toContain('OVER BUDGET');
    expect(run(cli, ['budget', dist, '--css', '0.1']).status).toBe(1);
    expect(run(cli, ['budget', dist, '--js', '75']).status).toBe(0);
  });

  it('keeps an empty site under the 75 KB gzip initial JavaScript budget', () => {
    const home = checkBudget(dist).rows.find(r => r.route === '/')!;
    console.log(`empty site initial JS: ${(home.bytes.js / KB).toFixed(1)} KiB gzip (${(home.bytes.js / 1000).toFixed(1)} kB), CSS ${home.bytes.css} B, HTML ${home.bytes.html} B`);
    expect(home.bytes.js).toBeLessThan(75 * KB);
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
