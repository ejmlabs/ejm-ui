// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkPages, pageProblems } from './pages.mjs';

const page = (main, { before = '<a class="skip-link" href="#main">Skip to content</a><header><nav><a href="/">Home</a></nav></header>' } = {}) =>
  `<!doctype html><html lang="en"><head><title>t</title></head><body>${before}<main id="main">${main}</main><footer><a href="/about/">About</a></footer></body></html>`;
const good = page('<h1>Title</h1><h2>One</h2><h3>Deep</h3><h2>Two</h2>');
const rules = (html, options) => pageProblems([{ file: 'index.html', html }], options).map(p => p.rule);

describe('page rules', () => {
  it('accepts a page that meets every rule', () => {
    expect(rules(good)).toEqual([]);
    expect(() => checkPages([{ file: 'index.html', html: good }])).not.toThrow();
  });

  it('requires exactly one h1', () => {
    expect(rules(page('<h1>A</h1><h1>B</h1>'))).toEqual(['exactly one h1 is required, found 2']);
    expect(rules(page('<h2>A</h2>'))).toContain('exactly one h1 is required, found 0');
  });

  it('names the file and the rule in the build error', () => {
    const pages = [{ file: 'index.html', html: good }, { file: 'work/index.html', html: page('<h1>A</h1><h1>B</h1>') }];
    expect(() => checkPages(pages)).toThrow(new Error('[ejm-site:pages] work/index.html: exactly one h1 is required, found 2'));
  });

  it('reports every page and every rule in one error', () => {
    const bad = page('<h2>A</h2>', { before: '<a href="/">Home</a>' });
    let message = '';
    try { checkPages([{ file: 'a/index.html', html: bad }, { file: 'b/index.html', html: bad }]); } catch (error) { message = error.message; }
    expect(message.split('\n').filter(line => line.startsWith('[ejm-site:pages] a/index.html: '))).toHaveLength(3);
    expect(message.split('\n').filter(line => line.startsWith('[ejm-site:pages] b/index.html: '))).toHaveLength(3);
  });

  it('fails a heading level skipped going down, not going up or staying level', () => {
    expect(rules(page('<h1>A</h1><h2>B</h2><h4>C</h4>'))).toEqual(['heading level skipped: h4 follows h2']);
    expect(rules(page('<h1>A</h1><h3>B</h3>'))).toEqual(['heading level skipped: h3 follows h1']);
    expect(rules(page('<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2><h2>E</h2>'))).toEqual([]);
    expect(rules(page('<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4><h2>E</h2><h3>F</h3>'))).toEqual([]);
  });

  it('starts the heading order at h1', () => {
    expect(rules(page('<h2>A</h2><h1>B</h1>', { before: '<a href="#main">Skip</a>' }))).toEqual(['heading level skipped: h2 follows no heading']);
  });

  it('ignores headings inside template content', () => {
    expect(rules(page('<h1>A</h1><template><h4>x</h4><h1>y</h1></template>'))).toEqual([]);
  });

  describe('skip link', () => {
    it('must be the first focusable element and point at #main', () => {
      expect(rules(page('<h1>A</h1>', { before: '<a href="/">Home</a><a href="#main">Skip</a>' }))).toEqual(['the first focusable element must be the skip link to #main, found <a href="/">']);
      expect(rules(page('<h1>A</h1>', { before: '<a href="#content">Skip</a>' }))).toEqual(['the first focusable element must be the skip link to #main, found <a href="#content">']);
      expect(rules(page('<h1>A</h1>', { before: '<button>Menu</button><a href="#main">Skip</a>' }))).toEqual(['the first focusable element must be the skip link to #main, found <button>']);
      expect(rules(page('<h1>A</h1>', { before: '<a href="#main">Skip</a>' }))).toEqual([]);
    });

    it.each([
      ['input', '<input name="q">'],
      ['select', '<select><option>a</option></select>'],
      ['textarea', '<textarea></textarea>'],
      ['summary', '<details><summary>More</summary></details>'],
      ['tabindex 0', '<div tabindex="0">x</div>'],
    ])('is not preceded by a %s', (_name, control) => {
      expect(rules(page('<h1>A</h1>', { before: `${control}<a href="#main">Skip</a>` }))).toHaveLength(1);
    });

    it.each([
      ['an anchor without href', '<a name="x">x</a>'],
      ['tabindex -1', '<div tabindex="-1">x</div>'],
      ['a disabled button', '<button disabled>x</button>'],
      ['a hidden input', '<input type="hidden" name="x">'],
      ['plain text elements', '<p>x</p><div>y</div>'],
    ])('may follow %s', (_name, before) => {
      expect(rules(page('<h1>A</h1>', { before: `${before}<a href="#main">Skip</a>` }))).toEqual([]);
    });

    it('fails a page with nothing focusable', () => {
      expect(rules(page('<h1>A</h1>', { before: '' }))).toContain('the first focusable element must be the skip link to #main, found <a href="/about/">');
    });
  });

  it('requires main#main', () => {
    const html = '<body><a href="#main">Skip</a><main><h1>A</h1></main></body>';
    expect(rules(html)).toEqual(['main#main is required']);
    expect(rules('<body><a href="#main">Skip</a><div id="main"><h1>A</h1></div></body>')).toEqual(['main#main is required']);
  });

  describe('links to another site', () => {
    const link = (a, options) => rules(page(`<h1>A</h1>${a}`), options);
    it('need rel containing external', () => {
      expect(link('<a href="https://example.com/x">x</a>')).toEqual(['a link to another site needs rel="external": https://example.com/x']);
      expect(link('<a href="http://example.com/">x</a>')).toHaveLength(1);
      expect(link('<a href="//example.com/">x</a>')).toHaveLength(1);
      expect(link('<a href="https://example.com/" rel="noopener">x</a>')).toHaveLength(1);
      expect(link('<a href="https://example.com/" rel="external noopener">x</a>')).toEqual([]);
      expect(link('<a href="https://example.com/" rel="noopener EXTERNAL">x</a>')).toEqual([]);
    });

    it('do not apply to relative links, anchors, mailto or tel', () => {
      expect(link('<a href="/work/">x</a><a href="#top">x</a><a href="mailto:a@example.com">x</a><a href="tel:+1">x</a><a href="work/">x</a>')).toEqual([]);
    });

    it('treat absolute links to the configured origin as the same site', () => {
      const own = '<a href="https://ejmlabs.com/work/">x</a><a href="https://ejmlabs.com">x</a>';
      expect(link(own, { origin: 'https://ejmlabs.com/' })).toEqual([]);
      expect(link(own)).toHaveLength(2);
      expect(link('<a href="https://cli.ejmlabs.com/">x</a>', { origin: 'https://ejmlabs.com/' })).toHaveLength(1);
      expect(link('<a href="http://ejmlabs.com/">x</a>', { origin: 'https://ejmlabs.com/' })).toHaveLength(1);
    });

    it('skip other elements with an href', () => {
      expect(rules(page('<h1>A</h1><link rel="canonical" href="https://example.com/">'))).toEqual([]);
    });
  });
});
