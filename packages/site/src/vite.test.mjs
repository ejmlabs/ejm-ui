// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ejmUi } from '@ejm/ui/vite';
import { ejmSite, ejmlabs } from './vite.mjs';

const names = plugins => plugins.flat(Infinity).map(p => p.name);
const page = main => `<body><a href="#main">Skip</a><main id="main">${main}</main></body>`;
const buildOptions = user => ejmlabs({ project: 'ejmlabs' }).flat(Infinity).find(p => p.name === 'ejm-site:build').config(user);

describe('ejmlabs preset', () => {
  it('is the ui preset, the site files, the prerenderer and the shared build options, in that order', () => {
    expect(names(ejmlabs({ project: 'ejmlabs' }))).toEqual([...names(ejmUi()), 'ejm-site', 'ejm-ssg', 'ejm-site:build']);
  });

  it('sets the build target and CSS minifier only when the site leaves them unset', () => {
    expect(buildOptions({})).toEqual({ build: { target: 'es2022', cssMinify: 'lightningcss' } });
    expect(buildOptions({ build: { target: 'es2020' } })).toEqual({ build: { cssMinify: 'lightningcss' } });
    expect(buildOptions({ build: { cssMinify: false } })).toEqual({ build: { target: 'es2022' } });
    expect(buildOptions({ build: { target: 'es2020', cssMinify: 'esbuild' } })).toEqual({ build: {} });
  });

  it('rejects an unknown project', () => {
    expect(() => ejmlabs({ project: 'nope' })).toThrow(/unknown project/);
  });
});

describe('ejmSite page check', () => {
  const plugin = ejmSite({ project: 'ejmlabs' });

  it('fails the build for a page that breaks a rule, naming the file and the rule', () => {
    expect(() => plugin.api.onPages([{ file: 'about/index.html', html: page('<h1>A</h1><h1>B</h1>') }])).toThrow('[ejm-site:pages] about/index.html: exactly one h1 is required, found 2');
  });

  it('accepts pages that meet the rules, and links to the project own origin', () => {
    expect(() => plugin.api.onPages([{ file: 'index.html', html: page('<h1>A</h1><a href="https://ejmlabs.com/work/">Work</a>') }])).not.toThrow();
  });

  it('requires rel external on a link to another ejmlabs site', () => {
    expect(() => plugin.api.onPages([{ file: 'index.html', html: page('<h1>A</h1><a href="https://cli.ejmlabs.com/">CLI</a>') }])).toThrow(/needs rel="external": https:\/\/cli\.ejmlabs\.com\//);
  });
});
