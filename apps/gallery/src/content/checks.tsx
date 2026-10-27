import type { DocPage } from '@ejm/ui';
import { docMeta } from './meta';

export const checks: DocPage = {
  ...docMeta['checks'],
  sections: [
    {
      id: 'bar',
      title: 'The quality bar',
      blocks: [
        {
          type: 'p',
          children: <><code>QUALITY.md</code> covers content, visual design, access and performance. Use the fewest words that preserve meaning. Prefer a clear visual or omit redundant copy. Keep labels, accessible names, consent and security facts, honest state and recovery.</>,
        },
        {
          type: 'list',
          ordered: true,
          items: [
            <>Build the page from <code>@ejm/ui</code> components, layouts and views.</>,
            <>Run <code>npm run check</code>, <code>npm run build</code> and <code>npm run perf</code>.</>,
            <>Look at the page in light and dark with the matrix script.</>,
            <>Walk the quality criteria. Record any exception.</>,
          ],
        },
      ],
    },
    {
      id: 'gates',
      title: 'Gates',
      blocks: [
        {
          type: 'params',
          caption: 'Quality gates',
          labels: { name: 'Gate', type: 'Command', description: 'Fails on' },
          rows: [
            { name: 'Text, types and tests', type: 'npm run check', description: 'Em dashes, stale generated files, changed brand assets, type errors and failing tests.' },
            { name: 'Site design ownership', type: 'ejm-ssg build', description: 'Consumer CSS rules, visual classes, inline styles and unsupported shared overrides. The @ejm/site Vite check is mandatory, including unused source files.' },
            { name: 'Contrast', type: 'node packages/tokens/scripts/contrast.mjs --verbose', description: 'Text under 4.5:1, control borders or focus under 3:1, in both themes and on every band.' },
            { name: 'Viewport matrix', type: 'node scripts/shoot.mjs <url>', description: 'Horizontal overflow from 320px to 5120px. It also reports touch targets under 44px.' },
            { name: 'Load time', type: 'npm run perf', description: 'A route whose first contentful paint is a second or more above its baseline.' },
            { name: 'Parity', type: 'node scripts/parity.mjs', description: 'A web, Ink or Rust target that lacks a component or a state from the contract.' },
          ],
        },
        { type: 'h3', id: 'matrix', title: 'The device matrix' },
        {
          type: 'p',
          children: <>The matrix script starts headless Chrome and drives it over the DevTools Protocol, with no dependencies. It shoots one URL at 14 sizes, from an iPhone SE at 320px to a 5120px super ultrawide. It exits non-zero if any size overflows. Run it in both themes.</>,
        },
        {
          type: 'tabs',
          label: 'Theme',
          tabs: [
            { label: 'Light', lang: 'sh', code: 'node scripts/shoot.mjs http://localhost:4874/docs --theme light --out /tmp/docs' },
            { label: 'Dark', lang: 'sh', code: 'node scripts/shoot.mjs http://localhost:4874/docs --theme dark --out /tmp/docs' },
          ],
        },
        { type: 'callout', kind: 'tip', children: <p>Use <code>--only iphone-mini,laptop,ultrawide-45</code> for a quick look, and <code>--full</code> to save the whole page.</p> },
        { type: 'h3', id: 'application-layout', title: 'Check a complete application page' },
        {
          type: 'p',
          children: <>The <a href="/application-layout/">application layout example</a> shows headings, fields, links, actions and table states in both densities. Capture it with the viewport matrix, then review spacing, alignment, table padding and keyboard navigation. These visual checks are manual; <code>npm run check</code> does not measure them.</>,
        },
        {
          type: 'p',
          children: <>Build and serve the gallery, then run the matrix in a second terminal. Use Google Chrome, or set <code>CHROME=/path/to/chrome</code> for another Chromium installation.</>,
        },
        { type: 'code', lang: 'sh', code: 'npm run build -w @ejm/gallery\nnpm run preview -w @ejm/gallery -- --port 4874' },
        { type: 'code', lang: 'sh', code: 'node scripts/shoot.mjs http://localhost:4874/application-layout/ --theme light --out /tmp/ejm-layout-light\nnode scripts/shoot.mjs http://localhost:4874/application-layout/ --theme dark --out /tmp/ejm-layout-dark' },
        {
          type: 'p',
          children: <>Product pages still need checks for their own content and conditional states.</>,
        },
      ],
    },
    {
      id: 'load-time',
      title: 'Load time',
      blocks: [
        {
          type: 'p',
          children: <>Load time is the only performance bar. Nothing caps bytes: use the maintained library that does the job and measure what it costs a visitor.</>,
        },
        {
          type: 'p',
          children: <><code>npm run perf</code> loads each prerendered route in Lighthouse on its mobile profile (simulated slow 4G, 4x CPU slowdown) and reports first contentful paint. A route fails when it is a second or more above its recorded baseline. Prerendered HTML still reads correctly with scripts off, and the synchronous theme script avoids a flash of the wrong theme.</>,
        },
      ],
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      blocks: [
        {
          type: 'list',
          items: [
            <>Text is at least 4.5:1, and control borders and focus rings at least 3:1, in light and dark.</>,
            <>Meaning never relies on color alone. Callouts, status and chart series carry text labels.</>,
            <>Every page has a skip link, one h1, no skipped heading levels and a full keyboard path.</>,
            <>Components with behavior follow the WAI-ARIA pattern and announce their result.</>,
          ],
        },
      ],
    },
  ],
};
