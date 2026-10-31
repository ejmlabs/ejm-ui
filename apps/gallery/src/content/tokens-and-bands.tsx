import type { DocPage } from '@ejm/ui';
import { docMeta } from './meta';

export const tokensAndBands: DocPage = {
  ...docMeta['tokens-and-bands'],
  sections: [
    {
      id: 'where-they-come-from',
      title: 'Where tokens come from',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              The palette lives in <code>packages/tokens/theme.json</code>. Generators turn it into CSS variables, the Tailwind v4 theme, the Rust theme, Monaco themes and terminal schemes, so the web, the IDE and the terminal share one source.{' '}
              <code>packages/ui/THEME.md</code> is the contract: if a name is not in it, it does not exist.
            </>
          ),
        },
        { type: 'callout', kind: 'note', children: <p>The Tailwind default palette, radius, shadow and font namespaces are reset. <code>bg-red-500</code>, <code>rounded-xl</code> and <code>shadow-md</code> do not exist.</p> },
        { type: 'p', children: <>Only <code>@ejm/ui</code> writes these names, in its own components. A site never writes a color, a class or a style. It picks a component, and the component picks the token.</> },
      ],
    },
    {
      id: 'bands',
      title: 'Bands',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              A band is a full-bleed section with its own ground. The page itself is the Paper band. <code>Hero</code> is Paper, and each top-level <code>Section</code> after it takes the next ground, so you never name one.
            </>
          ),
        },
        {
          type: 'params',
          caption: 'How Section picks its ground',
          labels: { name: 'Section', description: 'Ground' },
          rows: [
            { name: 'First after the Hero', description: 'Mist, then Paper, then Mist again, among sibling Sections, in both themes.' },
            { name: 'emphasis', description: 'Sage. It does not count in the alternation. Use it at most once on a page.' },
            { name: 'Nested Section', description: 'No band of its own. It keeps the ground of the Section around it.' },
          ],
        },
        {
          type: 'p',
          children: (
            <>
              Underneath, a band is <code>data-band</code> on an element plus the <code>band</code> utility. Sections write <code>data-band=&quot;auto&quot;</code>, and the theme picks Mist for odd positions and Paper for even ones with <code>:nth-child(odd of [data-band=&quot;auto&quot;])</code>. A browser without that selector leaves the page ground, which still reads. Name a band yourself only to show every ground, as the <a href="/tokens/">tokens page</a> does with <code>Band</code>.
            </>
          ),
        },
        {
          type: 'code',
          lang: 'html',
          code: `<section data-band="auto" class="band py-rhythm">
  <div class="page"> ... </div>
</section>`,
        },
        {
          type: 'params',
          caption: 'The four bands',
          labels: { name: 'Band', type: 'Light theme', default: 'Dark theme', description: 'Use' },
          rows: [
            { name: 'paper', type: 'F6F5EF, Ink text', default: '131614, E3E5DC text', description: 'The page. With Mist, about 60 percent of a page.' },
            { name: 'mist', type: 'E8EDE3, Ink text', default: '1C211D, E3E5DC text', description: 'The quiet alternate.' },
            { name: 'sage', type: '8A9A7B, Ink text', default: 'the same', description: 'The lead color, about 30 percent of a page.' },
            { name: 'ink', type: '202721, Paper text', default: 'the same', description: 'A dark moment in either theme. The footer uses it.' },
          ],
        },
        { type: 'p', children: <>Forest stays under 10 percent of a page and never sets a large ground, which is why it is not a band. Bands can nest, and the nearest one wins.</> },
        { type: 'h3', id: 'sage-rules', title: 'Rules for Sage' },
        {
          type: 'p',
          children: <>Ink on Sage is 5.09:1 and Forest on Sage is 3.52:1, so the numbers decide the rules.</>,
        },
        {
          type: 'list',
          items: [
            <>All text on Sage is Ink. Make hierarchy with size, weight and the mono face, not a lighter color.</>,
            <>Forest on Sage is for large type only. Use <code>text-link-large</code> at 24px and up.</>,
            <>The primary button on Sage is an Ink pill with Paper text.</>,
            <>Status on Sage must carry a word or glyph, never color alone. Charts do not sit on Sage.</>,
          ],
        },
      ],
    },
    {
      id: 'semantic-names',
      title: 'Semantic names',
      blocks: [
        {
          type: 'p',
          children: <>Every band sets the same variables, so a child that uses <code>text-fg</code>, <code>text-muted</code> and <code>border-line</code> is right on every ground.</>,
        },
        {
          type: 'params',
          caption: 'The names a band sets',
          labels: { name: 'Tailwind name', type: 'Variable', description: 'Meaning' },
          rows: [
            { name: 'bg-ground', type: '--ejm-ground', description: 'The band background.' },
            { name: 'text-fg', type: '--ejm-fg', description: 'Body and heading text.' },
            { name: 'text-muted', type: '--ejm-muted', description: 'Secondary text. 4.5:1 on its ground.' },
            { name: 'border-line', type: '--ejm-line', description: 'Hairline rules. Visible, but not a control edge.' },
            { name: 'bg-tone', type: '--ejm-tone', description: 'Hover and selected row fill, a step off the ground.' },
            { name: 'text-link', type: '--ejm-link', description: 'Links and accent text. 4.5:1.' },
            { name: 'border-control', type: '--ejm-control', description: 'Control borders. 3:1.' },
            { name: 'ring-focus', type: '--ejm-focus', description: 'The focus ring. 3:1.' },
            { name: 'bg-primary', type: '--ejm-primary', description: 'The primary button fill.' },
            { name: 'text-on-primary', type: '--ejm-on-primary', description: 'Text on the primary fill. 4.5:1.' },
          ],
        },
        { type: 'h3', id: 'status-and-hues', title: 'Status and chart hues' },
        {
          type: 'p',
          children: <>Status is one vocabulary: <code>ok</code>, <code>warn</code>, <code>error</code>, <code>info</code> and <code>pending</code>. <code>Status</code> draws a glyph and the word. <code>Badge</code> takes the same names plus <code>neutral</code>, and a dashboard change takes one as its <code>status</code>. The colors are <code>text-success</code>, <code>text-warn</code>, <code>text-danger</code> and <code>text-info</code>, each 4.5:1 on its ground. Charts use <code>hue-1</code> to <code>hue-6</code>, each 3:1 on the ground. A color always comes with a word or a label.</>,
        },
        { type: 'h3', id: 'product-windows', title: 'Product windows and code' },
        {
          type: 'p',
          children: <>Product windows and code use the window colors: <code>ui-ground</code>, <code>ui-editor</code>, <code>ui-text</code> and the <code>syn-*</code> syntax names. They follow the page theme and never the band. Every syntax color is checked at 4.5:1 on the code ground.</>,
        },
      ],
    },
  ],
};
