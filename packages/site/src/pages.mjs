// Structural rules for prerendered pages, checked with parse5 after `ejm-ssg` writes them. ejmSite runs this on every page; a
// violation fails the build with `[ejm-site:pages] <file>: <rule>`. Plain JavaScript with a .d.mts next to it, like the other Node code.
import { parse } from 'parse5';

const MAIN = '#main';
const attr = (node, name) => node.attrs.find(a => a.name === name)?.value;
const tagOf = node => `<${node.tagName}${attr(node, 'href') === undefined ? '' : ` href="${attr(node, 'href')}"`}>`;

/** Every element in document order. Template content is inert, so it is not entered. */
function* elements(node) {
  for (const child of node.childNodes ?? []) {
    if (child.tagName) yield child;
    yield* elements(child);
  }
}

/** True for an element a keyboard user reaches with Tab: a link with an href, an enabled control, a summary, or a tabindex of 0 or more. */
function focusable(node) {
  const tabindex = Number.parseInt(attr(node, 'tabindex') ?? '', 10);
  if (!Number.isNaN(tabindex)) return tabindex >= 0;
  const disabled = attr(node, 'disabled') !== undefined;
  switch (node.tagName) {
    case 'a': return attr(node, 'href') !== undefined;
    case 'button': case 'select': case 'textarea': return !disabled;
    case 'input': return !disabled && attr(node, 'type')?.toLowerCase() !== 'hidden';
    case 'summary': return true;
    default: return false;
  }
}

/** A link counts as another site when it is absolute (`http:`, `https:` or `//host`) and its origin is not `origin`. */
function otherSite(href, origin) {
  if (!/^(?:https?:)?\/\//i.test(href)) return false;
  try { return new URL(href, 'https://invalid.example').origin !== origin; } catch { return false; }
}

function rulesOf(html, origin) {
  const rules = [];
  const all = [...elements(parse(html))];
  const headings = all.filter(e => /^h[1-6]$/.test(e.tagName)).map(e => Number(e.tagName[1]));

  const h1 = headings.filter(level => level === 1).length;
  if (h1 !== 1) rules.push(`exactly one h1 is required, found ${h1}`);
  let previous = 0;
  for (const level of headings) {
    if (level > previous + 1) rules.push(`heading level skipped: h${level} follows ${previous ? `h${previous}` : 'no heading'}`);
    previous = level;
  }

  const first = all.find(focusable);
  if (!first) rules.push(`the first focusable element must be the skip link to ${MAIN}, but the page has none`);
  else if (first.tagName !== 'a' || attr(first, 'href') !== MAIN) rules.push(`the first focusable element must be the skip link to ${MAIN}, found ${tagOf(first)}`);

  if (!all.some(e => e.tagName === 'main' && attr(e, 'id') === 'main')) rules.push('main#main is required');

  for (const link of all) {
    const href = link.tagName === 'a' ? attr(link, 'href') : undefined;
    if (href !== undefined && otherSite(href, origin) && !(attr(link, 'rel') ?? '').toLowerCase().split(/\s+/).includes('external')) {
      rules.push(`a link to another site needs rel="external": ${href}`);
    }
  }
  return rules;
}

/**
 * @param {{ file: string, html: string }[]} pages
 * @param {{ origin?: string }} [options] `origin` is the site's own origin; absolute links to it need no `rel="external"`.
 * @returns {{ file: string, rule: string }[]}
 */
export function pageProblems(pages, { origin } = {}) {
  const own = origin ? new URL(origin).origin : undefined;
  return pages.flatMap(({ file, html }) => rulesOf(html, own).map(rule => ({ file, rule })));
}

/** Throws one error naming every violation, as `[ejm-site:pages] <file>: <rule>` lines. */
export function checkPages(pages, options) {
  const problems = pageProblems(pages, options);
  if (problems.length) throw new Error(problems.map(({ file, rule }) => `[ejm-site:pages] ${file}: ${rule}`).join('\n'));
}
