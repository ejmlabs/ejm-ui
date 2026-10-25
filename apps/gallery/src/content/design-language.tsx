import type { DocPage } from '@ejm/ui';
import { docMeta } from './meta';

export const designLanguage: DocPage = {
  ...docMeta['design-language'],
  sections: [
    {
      id: 'containerless',
      title: 'Containerless by default',
      blocks: [
        {
          type: 'p',
          children: <>ejm-ui has no cards, panels, tiles or tonal boxes. A group is a heading, whitespace and a hairline. A section is a band with its own ground.</>,
        },
        {
          type: 'list',
          items: [
            <>Rows are separated by a 1px hairline. A hover or selected row takes a step of tone, not a box.</>,
            <>Tags are plain mono text, not filled chips.</>,
            <>Only product windows, menus and overlays have a shadow. Nothing else does.</>,
            <>Code is an object, so it may have a flat tonal ground. It has no shadow and no radius.</>,
          ],
        },
        { type: 'callout', kind: 'warning', children: <p>Instead of a card, use a row or a band. The Tailwind palette, shadow and radius names are reset, so a color or shape outside the system does not compile.</p> },
      ],
    },
    {
      id: 'type',
      title: 'Type',
      blocks: [
        {
          type: 'p',
          children: <>Two families only: Manrope for text and IBM Plex Mono for labels, metadata and code. Nothing else loads. Sizes scale smoothly with the screen from 320px to 5120px, and from 1920px the five largest sizes scale a second time.</>,
        },
        {
          type: 'params',
          caption: 'The type scale',
          labels: { name: 'Utility', type: 'Size', default: 'Weight', description: 'Use it for' },
          rows: [
            { name: 'text-display-lg', type: '44px to 140px', default: '600', description: 'The single display line of a hero.' },
            { name: 'text-display', type: '36px to 96px', default: '600', description: 'Section heads.' },
            { name: 'text-title', type: '28px to 56px', default: '600', description: 'Page titles.' },
            { name: 'text-heading', type: '20px to 32px', default: '600', description: 'Headings inside a page.' },
            { name: 'text-lead', type: '19px to 26px', default: '400', description: 'The sentence under a title.' },
            { name: 'text-stat', type: '52px to 136px', default: '600', description: 'Large figures.' },
            { name: 'text-body', type: '16px to 20px', default: '400', description: 'Running text. Line height 1.6.' },
            { name: 'text-meta', type: '13px to 14.4px', default: '500', description: 'Labels and metadata, in IBM Plex Mono.' },
          ],
        },
        { type: 'p', children: <>Body lines stop at 68 characters (<code>max-w-measure</code>). Numbers in tables and facts use tabular figures (<code>tabular-nums</code>). Nothing is smaller than 12px.</> },
      ],
    },
    {
      id: 'space',
      title: 'Space and the page column',
      blocks: [
        {
          type: 'p',
          children: <>Bands are always full bleed. The column inside them is <code>page</code>: it steps up from a 16px gutter on a phone to a 96px gutter on the widest screens, and stays a readable width in between.</>,
        },
        {
          type: 'params',
          caption: 'Page column by screen width',
          labels: { name: 'From width', type: 'Gutter', default: 'Column max', description: 'Scale' },
          rows: [
            { name: '320px', type: '16px', default: '1200px', description: '1' },
            { name: '760px', type: '48px', default: '1200px', description: '1' },
            { name: '1600px', type: '64px', default: '1360px', description: '1' },
            { name: '1920px', type: '72px', default: '1520px', description: '1.125' },
            { name: '2560px', type: '80px', default: '1840px', description: '1.25' },
            { name: '4400px', type: '96px', default: '2800px', description: '1.5' },
          ],
        },
        { type: 'p', children: <>Vertical space comes from <code>py-rhythm</code>, 72px to 160px, so neighbouring sections breathe the same way on every screen.</> },
      ],
    },
    {
      id: 'motion',
      title: 'Motion',
      blocks: [
        { type: 'p', children: <>Motion moves transform and opacity only, takes under 300ms for an interaction and under 1.2 seconds for a page entrance, and needs a cause: arrival, a state change or a user action.</> },
        { type: 'h3', id: 'reduced-motion', title: 'Reduced motion and no script' },
        {
          type: 'p',
          children: <>Under reduced motion nothing moves and every element is already in its final place. The same holds with scripts off: scroll reveal hides an element only while the script that will show it is running.</>,
        },
        {
          type: 'tabs',
          label: 'Language',
          tabs: [
            { label: 'TypeScript', lang: 'tsx', code: "import { Reveal } from '@ejm/ui';\n\n<Reveal as=\"li\" from=\"up\" index={2}>Third item</Reveal>" },
            { label: 'HTML', lang: 'html', code: '<li class="animate-reveal" style="--ejm-i: 2">Third item</li>' },
          ],
        },
        { type: 'callout', kind: 'tip', children: <p>Stagger with an index, not a delay you invent. The index stops at 8, so a staged entrance never runs past 1.2 seconds.</p> },
      ],
    },
  ],
};
