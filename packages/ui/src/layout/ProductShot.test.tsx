import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { expectAccessible, renderIn, themes } from '../components/test-setup';
import { Illustration } from './Illustration';
import { ProductShot, shotPreloadLinks, type ShotData, type ShotVariantData } from './ProductShot';

const variant = (theme: string, w = 960, h = 540): ShotVariantData => ({
  width: w,
  height: h,
  avif: `/a/${theme}.${w}w.avif ${w}w, /a/${theme}.${w * 2}w.avif ${w * 2}w`,
  webp: `/a/${theme}.${w}w.webp ${w}w, /a/${theme}.${w * 2}w.webp ${w * 2}w`,
  png: `/a/${theme}.${w}w.png ${w}w, /a/${theme}.${w * 2}w.png ${w * 2}w`,
  src: `/a/${theme}.${w}w.png`,
});
const shot = (over: Partial<ShotData> = {}): ShotData => ({
  product: 'ejm-cli',
  name: 'read-and-block',
  surface: 'terminal',
  title: 'ejm',
  caption: 'ejm-cli 0.3.1, captured 2026-10-18.',
  variants: { dark: variant('dark'), light: variant('light') },
  ...over,
});
const pictures = (c: HTMLElement) => [...c.querySelectorAll('picture')];

describe('ProductShot', () => {
  it('is a figure with AVIF, WebP and PNG sources, explicit size, alt and the caption', () => {
    const { container } = render(<ProductShot shot={shot()} alt="A read, then a blocked write" />);
    expect(container.querySelector('figure')).toBeInTheDocument();
    const [light] = pictures(container);
    expect([...light!.querySelectorAll('source')].map(s => s.getAttribute('type'))).toEqual(['image/avif', 'image/webp']);
    const img = light!.querySelector('img')!;
    expect(img).toHaveAttribute('width', '960');
    expect(img).toHaveAttribute('height', '540');
    expect(img).toHaveAttribute('alt', 'A read, then a blocked write');
    expect(img.getAttribute('srcset')).toContain('light.1920w.png 1920w');
    expect(screen.getByText('ejm-cli 0.3.1, captured 2026-10-18.').tagName).toBe('FIGCAPTION');
  });

  it('lists the smaller modern format first, and the preload hint follows it', () => {
    const webpFirst = shot({ variants: { dark: { ...variant('dark'), order: ['webp', 'avif'] }, light: { ...variant('light'), order: ['webp', 'avif'] } } });
    const { container } = render(<ProductShot shot={webpFirst} alt="x" />);
    expect([...container.querySelector('picture')!.querySelectorAll('source')].map(s => s.getAttribute('type'))).toEqual(['image/webp', 'image/avif']);
    expect(shotPreloadLinks(webpFirst)[0]).toMatchObject({ type: 'image/webp', imagesrcset: variant('dark').webp });
  });

  it('can replace or drop the caption', () => {
    const { rerender } = render(<ProductShot shot={shot()} alt="x" caption="My words." />);
    expect(screen.getByText('My words.')).toBeInTheDocument();
    rerender(<ProductShot shot={shot()} alt="x" caption={false} />);
    expect(document.querySelector('figcaption')).toBeNull();
  });

  it('loads only the visible theme: both variants are lazy, and the hidden one is display none', () => {
    const { container } = render(<ProductShot shot={shot()} alt="x" />);
    const [light, dark] = pictures(container);
    expect(light).toHaveClass('dark:hidden');
    expect(dark).toHaveClass('hidden', 'dark:block');
    for (const p of [light!, dark!]) {
      expect(p.querySelector('img')).toHaveAttribute('loading', 'lazy');
      expect(p.querySelector('img')).not.toHaveAttribute('fetchpriority');
    }
  });

  it('priority: one eager high-priority picture picks its variant by media, the other two are lazy', () => {
    const { container } = render(<ProductShot shot={shot()} alt="x" priority />);
    const [system, dark, light] = pictures(container);
    const img = system!.querySelector('img')!;
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    const sources = [...system!.querySelectorAll('source')].map(s => [s.getAttribute('type'), s.getAttribute('media'), s.getAttribute('srcset')!.includes('/dark.') ? 'dark' : 'light']);
    expect(sources).toEqual([
      ['image/avif', '(prefers-color-scheme: dark)', 'dark'],
      ['image/webp', '(prefers-color-scheme: dark)', 'dark'],
      ['image/avif', null, 'light'],
      ['image/webp', null, 'light'],
      [null, '(prefers-color-scheme: dark)', 'dark'],
    ]);
    for (const p of [dark!, light!]) expect(p.querySelector('img')).toHaveAttribute('loading', 'lazy');
    expect(dark).toHaveClass('hidden');
    expect(light).toHaveClass('hidden');
  });

  it('a shot captured in one theme shows that image in both', () => {
    const { container } = render(<ProductShot shot={shot({ variants: { dark: variant('dark') } })} alt="x" priority />);
    expect(pictures(container)).toHaveLength(1);
    expect(container.querySelector('img')).toHaveAttribute('fetchpriority', 'high');
  });

  it('frame draws the terminal bar for a terminal capture and refuses a window capture', () => {
    const { container, rerender } = render(<ProductShot shot={shot()} alt="x" frame />);
    const bar = container.querySelector('[data-shot-frame]')!;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveTextContent('ejm');
    expect(() => renderToStaticMarkup(<ProductShot shot={shot({ surface: 'window', product: 'ejm-ide' })} alt="x" frame />)).toThrow(/terminal captures only/);
    rerender(<ProductShot shot={shot()} alt="x" />);
    expect(container.querySelector('[data-shot-frame]')).toBeNull();
  });

  it('has no shadow unless elevation is set, and then only a token shadow', () => {
    const { container, rerender } = render(<ProductShot shot={shot()} alt="x" />);
    expect(container.innerHTML).not.toMatch(/shadow-/);
    rerender(<ProductShot shot={shot()} alt="x" elevation="float" />);
    expect(container.querySelector('.shadow-float')).toBeInTheDocument();
  });

  it.each(themes)('has no accessibility violations in the %s theme', async theme => {
    const { container } = renderIn(theme, <ProductShot shot={shot()} alt="A read, then a blocked write" frame priority />);
    await expectAccessible(container);
  });
});

describe('illustrations', () => {
  const drawn = () => shot({ surface: 'window', kind: 'illustration', product: 'ejm-ide', caption: '' });

  it('always shows the label, says illustration in the alt text, and has no capture caption', () => {
    const { container } = render(<ProductShot shot={drawn()} alt="A chat with a tool call and a diff" caption="Drawn from the README." />);
    expect(container.querySelector('figcaption')).toHaveTextContent('Illustration of ejm-ide, not a screenshot');
    expect(container.querySelector('figcaption')).toHaveTextContent('Drawn from the README.');
    for (const img of container.querySelectorAll('img')) expect(img.getAttribute('alt')).toBe('Illustration of ejm-ide, not a screenshot: A chat with a tool call and a diff');
    expect(container.querySelector('figure')).toHaveAttribute('data-kind', 'illustration');
  });

  it('keeps the label when the caption is removed, and does not repeat it in the alt text', () => {
    const { container } = render(<ProductShot shot={drawn()} alt="An illustration of the chat" caption={false} />);
    expect(container.querySelector('[data-illustration-label]')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', 'An illustration of the chat');
  });

  it('refuses a terminal frame, which would make it look like a capture', () => {
    expect(() => renderToStaticMarkup(<ProductShot shot={{ ...drawn(), surface: 'terminal' }} alt="x" frame />)).toThrow(/illustration/);
  });

  it('wraps a React composition in a labelled figure', async () => {
    const { container } = render(<Illustration product="ejm-ide" caption="Reconstructed from the README."><div>composition</div></Illustration>);
    expect(screen.getByRole('figure', { name: 'Illustration of ejm-ide, not a screenshot' })).toHaveTextContent('composition');
    expect(container.querySelector('figcaption')).toHaveTextContent('Illustration of ejm-ide, not a screenshotReconstructed from the README.');
    await expectAccessible(container);
  });
});

describe('shotPreloadLinks', () => {
  it('preloads the AVIF of the picture the page will use, one per system scheme', () => {
    const links = shotPreloadLinks(shot());
    expect(links).toHaveLength(2);
    expect(links.map(l => l.media)).toEqual(['(prefers-color-scheme: dark)', 'not all and (prefers-color-scheme: dark)']);
    expect(links[0]).toMatchObject({ rel: 'preload', as: 'image', type: 'image/avif', fetchpriority: 'high', imagesrcset: variant('dark').avif, imagesizes: '(min-width: 960px) 960px, 100vw' });
    expect(links[1]!.imagesrcset).toBe(variant('light').avif);
  });

  it('is a single unconditional hint for a one-theme shot and honours custom sizes', () => {
    const [only, ...rest] = shotPreloadLinks(shot({ variants: { light: variant('light') } }), '50vw');
    expect(rest).toEqual([]);
    expect(only!.media).toBeUndefined();
    expect(only!.imagesizes).toBe('50vw');
  });
});

describe('theme classes', () => {
  // Use production source detection: compiling runtime classes would hide missing literal classes in the component source.
  it('are found by the stylesheet source scan and show one variant per theme and system', async () => {
    const css = join(dirname(fileURLToPath(import.meta.url)), '..', 'styles.css');
    const compiler = await compile(readFileSync(css, 'utf8'), { base: dirname(css), onDependency() {} });
    const scanner = new Scanner({ sources: compiler.sources });
    const out = compiler.build(scanner.scan());
    const rule = (selector: RegExp, display: string) => expect(out).toMatch(new RegExp(`${selector.source}[^{]*\\{\\s*display: ${display}`));
    // data-theme light on a dark system shows the light picture and hides the system one.
    expect(out).toMatch(/@media \(prefers-color-scheme:dark\) \{/);
    rule(/:root\[data-theme=light\] \.[^{]*\\:block/, 'block');
    rule(/:root\[data-theme=light\] \.[^{]*\\:hidden/, 'none');
    // data-theme dark on a light system shows the dark picture and hides the system one.
    expect(out).toMatch(/@media \(prefers-color-scheme:light\) \{/);
    rule(/\\:dark\\:block:where\(\[data-theme="dark"\]/, 'block');
    rule(/\\:dark\\:hidden:where\(\[data-theme="dark"\]/, 'none');
  });
});
