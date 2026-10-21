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
          children: <><code>QUALITY.md</code> walks nine dimensions: typography, rhythm, depth, imagery, motion, detail, responsiveness, accessibility and performance. The references are Anthropic, Stripe and OpenAI. ejmlabs learns from how they decide and never reproduces their layouts, imagery or words.</>,
        },
        {
          type: 'list',
          ordered: true,
          items: [
            <>Build the page from <code>@ejm/ui</code> components, layouts and views.</>,
            <>Run <code>npm run check</code>, <code>npm run build</code> and the budget script.</>,
            <>Look at the page in light and dark with the matrix script.</>,
            <>Walk the nine dimensions. Write down any exception.</>,
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
            { name: 'Contrast', type: 'node packages/tokens/scripts/contrast.mjs --verbose', description: 'Text under 4.5:1, control borders or focus under 3:1, in both themes and on every band.' },
            { name: 'Application layout', type: 'node scripts/check-application-layout.mjs', description: 'Rendered 8px field and 24px content gaps, page padding, table density parity, touch targets and overflow in light and dark.' },
            { name: 'Viewport matrix', type: 'node scripts/shoot.mjs <url>', description: 'Horizontal overflow from 320px to 5120px, and touch targets under 44px.' },
            { name: 'Budgets', type: 'node scripts/size.mjs [dist]', description: 'HTML, CSS, JavaScript or font size over its budget.' },
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
      ],
    },
    {
      id: 'budgets',
      title: 'Budgets',
      blocks: [
        {
          type: 'p',
          children: <>Each prerendered route is measured on what it loads first. Sizes are gzip, except fonts, which are WOFF2. A breach exits non-zero and fails the build.</>,
        },
        {
          type: 'p',
          children: <>Use <code>node scripts/perf.mjs &lt;dist-dir&gt;</code> for browser measurements. Chrome startup has a separate 60-second limit with no retry. A startup error reports the last 8 KiB of browser stderr; page budgets and the browser sandbox remain unchanged.</>,
        },
        {
          type: 'params',
          caption: 'Performance budgets per route',
          labels: { name: 'Measure', type: 'Budget', description: 'Notes' },
          rows: [
            { name: 'JavaScript', type: '95 KB', description: 'React and react-dom (about 71 KB, measured), the router (wouter), hydration, theme and header. A page whose own code does not fit hydrates after the first scripts, with its HTML already complete. The demo island (40 KB) and code highlighting (20 KB) load lazily.' },
            { name: 'CSS', type: '14 KB', description: 'Only used utilities ship.' },
            { name: 'Fonts', type: '70 KB', description: 'The two preloaded Latin subsets, with font-display swap and metric-matched fallbacks.' },
            { name: 'HTML', type: '30 KB', description: 'Per route, and every route reads correctly with scripts off.' },
            { name: 'Largest Contentful Paint', type: '1.2 s', description: 'On a throttled mobile profile.' },
            { name: 'Cumulative Layout Shift', type: '0.05', description: 'The theme script is external, synchronous and under 1 KB, so nothing flashes or moves.' },
          ],
        },
        { type: 'callout', kind: 'warning', children: <p>Change a budget in the design document, not in the script alone. The numbers are a starting point and are tuned from measurement.</p> },
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
