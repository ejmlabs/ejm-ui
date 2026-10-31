import type { DocPage } from '@ejm/ui';
import { docMeta } from './meta';

export const gettingStarted: DocPage = {
  ...docMeta['getting-started'],
  sections: [
    {
      id: 'what-it-is',
      title: 'What ejm-ui is',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              ejm-ui holds the tokens, the Tailwind theme, React components in the shadcn/ui style, hooks, layouts and the gallery you are reading. It is one npm workspace with real React 19, strict TypeScript and
              Tailwind CSS v4.
            </>
          ),
        },
        {
          type: 'p',
          children: <>The components are closed. They take content, state and accessible attributes, and no <code>className</code> or <code>style</code>. You give a page its words and the kit decides how it looks.</>,
        },
        {
          type: 'params',
          caption: 'Packages in the workspace',
          labels: { name: 'Package', description: 'What it holds' },
          rows: [
            { name: '@ejm/tokens', description: 'theme.json, brand assets and the generators for CSS, Tailwind, Rust, Monaco and terminal themes.' },
            { name: '@ejm/ui', description: 'Components, hooks, layouts, docs parts, the one stylesheet, the Vite preset and the base tsconfig.' },
            { name: '@ejm/core', description: 'Framework-free logic: state machines, the component contract and formatting. It has no React in it.' },
            { name: '@ejm/demos', description: 'Scenario data and the demo engines for the product pages.' },
            { name: '@ejm/ssg', description: 'The prerender package for Vite and React sites: static HTML for every route, hydration and links.' },
            { name: '@ejm/site', description: 'What every ejmlabs site shares: the Vite plugin, the project registry, analytics, the shared head and the security headers.' },
            { name: '@ejm/gallery', description: 'This site: the gallery and the docs, a prerendered Vite and React site built on @ejm/ssg and @ejm/site.' },
          ],
        },
        {
          type: 'callout',
          kind: 'note',
          children: <p>Packages are not published to a registry yet. Clone the repository and use its npm workspace.</p>,
        },
      ],
    },
    {
      id: 'install',
      title: 'Install and run',
      blocks: [
        { type: 'p', children: <>Use Node.js 24 and npm. On Linux, tests also need Python and C/C++ build tools for node-pty. One workspace install covers every package.</> },
        {
          type: 'code',
          lang: 'sh',
          code: `git clone https://github.com/ejmlabs/ejm-ui.git
cd ejm-ui
npm ci --ignore-scripts
npm rebuild node-pty --ignore-scripts=false
npm run dev        # the gallery dev server (ejm-ssg dev)
npm run build      # build every package and app; the gallery prerenders every page
npm run check      # text checks, type check and tests`,
        },
        { type: 'p', children: <>Rebuild only <code>node-pty</code>, without repository, model or release credentials. Keep other dependency install scripts disabled.</> },
        { type: 'p', children: <>Run <code>npm run check</code> before you commit. <a href="/docs/checks">Checks</a> lists what it protects.</> },
      ],
    },
    {
      id: 'set-up',
      title: 'Set up a site',
      blocks: [
        {
          type: 'p',
          children: <>A site needs three small files: one Vite plugin, one base tsconfig and one stylesheet import. <code>examples/starter</code> is the reference.</>,
        },
        { type: 'h3', id: 'plugin', title: 'One Vite plugin' },
        {
          type: 'p',
          children: (
            <>
              <code>ejmlabs({'{ project }'})</code> from <code>@ejm/site/vite</code> is the whole build setup. It adds Tailwind, React, one copy of React for linked and installed packages, the design guard, the shared head and headers, prerendering and the shared build options. A site lists no other plugin and sets no <code>resolve.dedupe</code>.
            </>
          ),
        },
        {
          type: 'code',
          lang: 'ts',
          label: 'vite.config.ts',
          code: `import { defineConfig } from 'vite';
import { ejmlabs } from '@ejm/site/vite';

export default defineConfig({ plugins: [ejmlabs({ project: 'ejmlabs' })] });`,
        },
        { type: 'h3', id: 'tsconfig', title: 'One base tsconfig' },
        {
          type: 'p',
          children: <><code>@ejm/ui/tsconfig.json</code> holds the strict compiler options and resolves one copy of the React types, whether the packages are linked or installed. A site extends it and names its files.</>,
        },
        {
          type: 'code',
          lang: 'json',
          label: 'tsconfig.json',
          code: `{
  "extends": "@ejm/ui/tsconfig.json",
  "include": ["src", "vite.config.ts"]
}`,
        },
        { type: 'h3', id: 'stylesheet', title: 'One stylesheet' },
        {
          type: 'p',
          children: (
            <>
              <code>@ejm/ui/styles.css</code> styles every component, including the docs and app parts. It loads Tailwind, the generated color theme, the two brand fonts, the type scale, the page column and the motion rules. It turns off Tailwind&apos;s automatic source scan, so it never reads your folders.
            </>
          ),
        },
        { type: 'code', lang: 'css', label: 'src/styles.css', code: '@import "@ejm/ui/styles.css";' },
        {
          type: 'p',
          children: <>A site writes no utility classes, so that one line is the whole stylesheet. There are no partial stylesheets to forget. A route that shows product demos imports the public <code>@ejm/demos/cli.css</code>, <code>ide-preview.css</code> or <code>harness.css</code> profile for the product it shows.</>,
        },
        {
          type: 'p',
          children: <>The plugin adds the color scheme, <code>theme-boot.js</code> and the icons to the head, so you do not write them. <a href="/docs/theming">Theming and the cookie</a> explains the script.</>,
        },
        { type: 'h3', id: 'compose', title: 'Build a page' },
        {
          type: 'p',
          children: (
            <>
              A page is one <code>Hero</code> and a stack of <code>Section</code> blocks. You pass words. <code>Section</code> derives its heading level, its ground, its ids and its spacing, and the components inside it read correctly on every ground. Rows, type and space do the grouping, so there are no cards.
            </>
          ),
        },
        {
          type: 'code',
          lang: 'tsx',
          code: `import { Hero, Row, Rows, Section } from '@ejm/ui';

export default function Home() {
  return (
    <>
      <Hero title="Small experiments">
        <p>What we build, and why.</p>
      </Hero>
      <Section title="Projects" kicker="01 / Projects">
        <Rows aria-label="Projects">
          <Row title="ejm-cli" href="/cli/" description="A Rust terminal coding agent." meta="Rust / terminal" />
        </Rows>
      </Section>
    </>
  );
}`,
        },
        {
          type: 'p',
          children: <>If a visual pattern is missing, add it to ejm-ui as a block. A site that passes <code>className</code>, <code>style</code> or local CSS fails the build.</>,
        },
        { type: 'h3', id: 'read-a-token', title: 'Read a token anywhere' },
        {
          type: 'p',
          children: (
            <>The same color has a name in every layer. The primary fill is Sage on a light page. Use the semantic name, never a hex value. Only <code>@ejm/ui</code> writes Tailwind classes, so a site gets these names by using the component.</>
          ),
        },
        {
          type: 'tabs',
          label: 'Language',
          tabs: [
            { label: 'CSS', lang: 'css', code: '.button {\n  background: var(--ejm-primary);\n  color: var(--ejm-on-primary);\n}' },
            { label: 'Tailwind', lang: 'tsx', code: '// inside @ejm/ui\n<a href="/start" className="bg-primary text-on-primary hover:bg-primary-hover">\n  Start\n</a>' },
            { label: 'Rust', lang: 'rust', code: 'use ejm_theme::DARK;\n\nlet fill = DARK.primary;' },
          ],
        },
      ],
    },
    {
      id: 'next',
      title: 'Where to go next',
      blocks: [
        {
          type: 'list',
          items: [
            <><a href="/docs/design-language">Design language</a> for the rules that keep every page one family.</>,
            <><a href="/docs/tokens-and-bands">Tokens and bands</a> for every color name and what it is for.</>,
            <><a href="/docs/components">Components</a> for what exists before you build something new.</>,
            <><a href="/docs/checks">Checks</a> for what fails a build.</>,
          ],
        },
      ],
    },
  ],
};
