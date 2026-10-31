import { ExternalLink, type DocPage } from '@ejm/ui';
import { docMeta } from './meta';

export const components: DocPage = {
  ...docMeta['components'],
  sections: [
    {
      id: 'how-they-work',
      title: 'How components are built',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              Controls are shadcn/ui source copied in and edited here, on React 19. Where a native element can replace a primitive, the component uses it: <code>Dialog</code> is the browser's <code>dialog</code>, <code>Select</code> is a native <code>select</code>, and the mobile menus are <code>details</code>. Radix is used where it earns its weight, in menus, tooltips, switches and checkboxes.
            </>
          ),
        },
        {
          type: 'p',
          children: <>Every component has a render test and an accessibility check in light and dark. Components with behavior also have a keyboard test.</>,
        },
        { type: 'h3', id: 'closed', title: 'Components are closed' },
        {
          type: 'p',
          children: <>No component accepts <code>className</code>, <code>style</code> or <code>dangerouslySetInnerHTML</code>. A component takes content, state, events and accessible attributes, and the kit owns every class. A type test over the <code>@ejm/ui</code> barrel fails when an export accepts one of them, and the design guard fails a site build that passes one.</>,
        },
        {
          type: 'p',
          children: <>There are no visual props to go with them. <code>Hero</code> has no size or tone. <code>SectionHead</code> has no size. <code>Header</code> takes an <code>identity</code> and no logo, and <code>Footer</code> takes an <code>identity</code> and no brand. <code>Reveal</code> and <code>Stagger</code> take a tag from <code>div</code>, <code>section</code>, <code>ul</code>, <code>ol</code> and <code>li</code>, and no class. <code>ThemeToggle</code> takes no props.</>,
        },
      ],
    },
    {
      id: 'controls',
      title: 'Controls',
      blocks: [
        {
          type: 'params',
          caption: 'Controls',
          labels: { name: 'Component', description: 'What it is' },
          rows: [
            { name: 'Button', description: 'Primary, secondary, ghost, link and danger variants. Pass asChild to give a link the same look.' },
            { name: 'Input, Textarea', description: 'Text fields in the control radius, with the 3:1 control border and focus ring.' },
            { name: 'Select', description: 'A native select with the control look. Phones keep their own picker.' },
            { name: 'Checkbox, RadioGroup, Switch', description: 'The label is the whole target, 44px tall. The drawing inside is compact.' },
            { name: 'Badge', description: 'A tag as plain mono text. No fill, no border. Tones are neutral, ok, warn, error, info and pending.' },
            { name: 'Separator', description: 'A hairline. Never a box edge.' },
            { name: 'Tooltip', description: 'A small label for a control, in the overlay chrome.' },
            { name: 'Tabs', description: 'Arrows wrap, Home and End jump, and only the current tab is in the tab order.' },
            { name: 'Disclosure', description: 'A native details element with a control-height summary. It works without a script.' },
            { name: 'Dialog', description: 'A modal on the native dialog element, in the overlay chrome.' },
            { name: 'Menu', description: 'A dropdown with typeahead, Escape, and focus back to the trigger.' },
            { name: 'ToastProvider, useToast', description: 'Toasts in a polite live region. F8 moves focus to the stack. Give each provider on one page its own label.' },
          ],
        },
        {
          type: 'p',
          children: <>Every control comes from one recipe: 44px tall (32px in a compact surface, on a fine pointer), pill buttons, control-radius fields, one hover tone, one focus ring, and a disabled state at half opacity. Dialog, Menu, Select popups and Toast share one overlay chrome, the only place a shadow appears. See them on <a href="/components/">the components page</a>.</>,
        },
        { type: 'h3', id: 'button', title: 'Button' },
        {
          type: 'params',
          caption: 'Button props',
          rows: [
            { name: 'variant', type: "'primary' | 'secondary' | 'ghost' | 'link' | 'danger'", default: "'primary'", description: 'The look. Primary is the Sage fill. Secondary is a hairline outline.' },
            { name: 'size', type: "'md' | 'icon'", default: "'md'", description: 'A 44px button, or a 44px square for an icon-only control. Give an icon button an aria-label.' },
            { name: 'density', type: "'comfortable' | 'compact'", default: 'the surface', description: 'An override. Leave it out: the surface sets it.' },
            { name: 'arrow', type: 'boolean', default: 'false', description: 'Adds the trailing arrow, which slides 4px on hover and stays put under reduced motion.' },
            { name: 'asChild', type: 'boolean', default: 'false', description: 'Renders the child element, for example a link, with the button look.' },
          ],
        },
        {
          type: 'code',
          lang: 'tsx',
          label: 'Button',
          code: `import { Button } from '@ejm/ui';

<Button asChild arrow>
  <a href="/docs">Read the docs</a>
</Button>`,
        },
        { type: 'h3', id: 'density', title: 'Density comes from the surface' },
        {
          type: 'p',
          children: <>A site is comfortable: controls are 44px. <code>AppShell</code> and <code>Page variant=&quot;application&quot;</code> make every control inside compact: 14px text and 32px with a mouse, still 44px on touch. <code>DensityProvider</code> sets it for any region, which is how the gallery shows both side by side.</>,
        },
        {
          type: 'code',
          lang: 'tsx',
          code: `import { Button, DensityProvider } from '@ejm/ui';

<DensityProvider density="compact">
  <Button>Save</Button>
</DensityProvider>`,
        },
      ],
    },
    {
      id: 'layout-parts',
      title: 'Layout parts',
      blocks: [
        {
          type: 'p',
          children: <>A page is one <code>Hero</code> and a stack of <code>Section</code> blocks. Everything else goes inside a Section.</>,
        },
        {
          type: 'params',
          caption: 'Layout parts',
          labels: { name: 'Component', description: 'What it is' },
          rows: [
            { name: 'Hero', description: 'The page opening and its one h1. Props: eyebrow, title, children, actions, aside, art. No size, no tone, no panel.' },
            { name: 'Section', description: 'A part of a page. It derives its heading level, ground, ids and spacing.' },
            { name: 'Rows, Row', description: 'A hairline list that replaces cards. A row has a title, text, mono meta and an arrow.' },
            { name: 'Facts, Fact', description: 'Mono labels, hairlines and values. Stacks in a narrow column.' },
            { name: 'Stat, MetricGrid', description: 'A figure with a mono label, and one grid for comparable figures. Loading, error and empty are words.' },
            { name: 'Columns, ContentFlow, Actions, Note', description: 'A five and seven split, readable content, a wrapping row of buttons, and a nearby qualification.' },
            { name: 'ProductShot, ProductStage', description: 'A real capture of a product, with a caption. A stage layers one to three captures.' },
            { name: 'Text, Rule, Status, Art', description: 'A run of text, a hairline with a label, a glyph and a word, and decorative line art.' },
            { name: 'SectionHead, Band, Page', description: 'The lower-level parts under Section. Use them only for a specimen or an application page.' },
          ],
        },
        { type: 'h3', id: 'section', title: 'Section' },
        {
          type: 'params',
          caption: 'Section props',
          rows: [
            { name: 'title', type: 'ReactNode', description: 'The heading. Required. An h2 at the top of a page, one level deeper inside each Section, never past h6.' },
            { name: 'kicker', type: 'string', description: 'A mono line above the title, for example "01 / Projects".' },
            { name: 'intro', type: 'ReactNode', description: 'Lead copy beside the title from 48rem of the Section, below it when narrow.' },
            { name: 'actions', type: 'ReactNode', description: 'Buttons or links after the intro.' },
            { name: 'emphasis', type: 'boolean', default: 'false', description: 'Takes the Sage ground instead of the alternating one. Ignored in a nested Section.' },
            { name: 'id', type: 'string', description: 'Names the heading. A generated id is used when it is left out.' },
          ],
        },
        {
          type: 'code',
          lang: 'tsx',
          code: `<Section title="Projects" kicker="01 / Projects">
  <Rows aria-label="Projects">...</Rows>

  <Section title="Terminal">
    <p>A subsection. Its title is one level down.</p>
  </Section>
</Section>`,
        },
        {
          type: 'list',
          items: [
            <>The <strong>level</strong> comes from nesting, so a heading never skips a level.</>,
            <>The <strong>ground</strong> alternates Mist and Paper among sibling Sections, and <code>emphasis</code> gives Sage.</>,
            <>The <strong>id</strong> is generated, and the section is always labelled by its heading.</>,
            <>The <strong>spacing</strong> is one rhythm: a fixed gap under the opening and between the children of the body.</>,
          ],
        },
        { type: 'callout', kind: 'tip', children: <p>Keep the Sections of a page as siblings, so they alternate. Bare paragraphs and lists directly in the body keep the reading measure.</p> },
        { type: 'h3', id: 'application', title: 'Application recipes' },
        {
          type: 'p',
          children: <>An application page has no Hero and no bands. <code>Page variant=&quot;application&quot;</code> is the surface: compact controls and shared gaps. <code>AppSection</code>, <code>AppForm</code>, <code>AppField</code>, <code>AppFieldset</code>, <code>AppActions</code>, <code>AppHeading</code>, <code>AppFlow</code> and <code>AppGroup</code> carry the rest, and they accept content and semantics only. <a href="/application-layout/">The application layout page</a> is the worked example.</>,
        },
      ],
    },
    {
      id: 'data-and-state',
      title: 'Data and state',
      blocks: [
        {
          type: 'p',
          children: <>These four are shared with the terminal targets, so the web, Ink and Rust versions have the same props and states. The contract in <code>packages/core/contract.json</code> lists them, and a parity script fails when a target drops a state.</>,
        },
        {
          type: 'params',
          caption: 'Contract components',
          labels: { name: 'Component', type: 'States', description: 'What it is' },
          rows: [
            { name: 'Table', type: 'default, empty, loading, error', description: 'Hairline rows, right-aligned numbers, and a scroll region on narrow screens.' },
            { name: 'StateBlock', type: 'empty, loading, error', description: 'One plain sentence and at most one action. Never a bare zero.' },
            { name: 'Prompt', type: 'idle, busy, error', description: 'An input line in the terminal manner.' },
            { name: 'KeyHints', type: 'default', description: 'Key and label pairs in one line of mono text.' },
          ],
        },
        {
          type: 'params',
          caption: 'App parts',
          labels: { name: 'Component', description: 'What it is' },
          rows: [
            { name: 'Dashboard', description: 'A row of figures, a chart, a table and an activity feed. A change under a figure takes a status word, or none for a neutral change. It has one state for the whole and one for each part.' },
            { name: 'ChartLine, ChartBar, ChartArea', description: 'Up to six series, each with a hue, a marker or fill pattern, a legend name and a table of its values.' },
            { name: 'ActivityList', description: 'Hairline rows with a relative time and a status that is a glyph and a word.' },
          ],
        },
        { type: 'callout', kind: 'note', children: <p>Callout has three states, note, tip and warning, each named by a word first. The docs parts below are web only.</p> },
      ],
    },
    {
      id: 'game-parts',
      title: 'Game parts',
      blocks: [
        {
          type: 'p',
          children: <><code>Chessboard</code> is a leaf. The <code>@ejm/ui</code> barrel does not export it, so its renderer and styles reach a page only through a lazy import. <code>GameClock</code> is a small display and is in the barrel.</>,
        },
        {
          type: 'code',
          lang: 'tsx',
          label: 'Chessboard and GameClock',
          code: `import { lazy, Suspense } from 'react';
import { GameClock } from '@ejm/ui';

const Chessboard = lazy(() => import('@ejm/ui/components/Chessboard').then(module => ({ default: module.Chessboard })));

<Suspense fallback={null}>
  <Chessboard fen={fen} color="w" enabled={false} readOnly onMove={() => {}} />
</Suspense>
<GameClock value="5:03" label="White has 5 minutes and 3 seconds" running />`,
        },
        { type: 'h3', id: 'chessboard', title: 'Chessboard' },
        {
          type: 'p',
          children: <>The host supplies the position, the legal destinations and the accepted moves. The kit holds no chess rules. Server rendering draws a labelled loading square, and the board loads after the page mounts.</>,
        },
        {
          type: 'params',
          caption: 'Chessboard props',
          rows: [
            { name: 'fen', type: 'string', default: 'required', description: 'The full position. The board shows exactly this.' },
            { name: 'color', type: "'w' | 'b'", default: 'required', description: 'The side at the bottom.' },
            { name: 'enabled', type: 'boolean', default: 'required', description: 'Whether the board takes moves.' },
            { name: 'readOnly', type: 'boolean', default: 'false', description: 'A recorded game. The board is an image, not a control. Pass enabled={false} with it.' },
            { name: 'showLegalMoves', type: 'boolean', default: 'false', description: 'Marks the destinations from getLegalMoves when a piece is selected.' },
            { name: 'getLegalMoves', type: '(square: string) => readonly ChessboardDestination[]', description: 'Destinations the host computes from its own position, each { square, capture? }.' },
            { name: 'lastMove', type: '{ from: string; to: string }', description: 'Marks both squares of the last accepted move.' },
            { name: 'premove', type: 'ChessboardMove | null', description: 'Marks a queued move.' },
            { name: 'onMove', type: '(move: ChessboardMove) => void', default: 'required', description: 'A proposal. The board changes only when the host passes a new fen.' },
            { name: 'aria-label', type: 'string', description: "Replaces the default name of the board's svg." },
          ],
        },
        { type: 'callout', kind: 'note', children: <p>The board is built on <ExternalLink href="https://github.com/shaack/cm-chessboard">cm-chessboard</ExternalLink> (MIT). Its pieces are <ExternalLink href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</ExternalLink> artwork by Cburnett and Rfc1394. Keep their notices in your credits.</p> },
        { type: 'h3', id: 'gameclock', title: 'GameClock' },
        {
          type: 'params',
          caption: 'GameClock props',
          rows: [
            { name: 'value', type: 'string', default: 'required', description: 'The time as text, such as 5:03. The host owns the ticking.' },
            { name: 'label', type: 'string', default: 'required', description: 'The accessible name, with the time in words.' },
            { name: 'running', type: 'boolean', default: 'false', description: 'The clock is running. It takes the primary fill.' },
            { name: 'low', type: 'boolean', default: 'false', description: 'Low on time. It takes the danger fill and a warning glyph, so color is not the only signal.' },
            { name: 'role', type: 'string', default: "'timer'", description: 'A timer is a live region that is off, so a tick is not announced. A role you pass wins.' },
          ],
        },
      ],
    },
    {
      id: 'shell',
      title: 'Shell and hooks',
      blocks: [
        {
          type: 'params',
          caption: 'Shell, motion and hooks',
          labels: { name: 'Name', description: 'What it does' },
          rows: [
            { name: 'SiteLayout', description: 'Skip link, Header, main and Footer. The route supplies one Hero and its Sections.' },
            { name: 'Brand', description: 'Canonical artwork with optional light and dark sources, an optional name and shared sizing.' },
            { name: 'DocsLayout', description: 'A sidebar, a 68ch reading column and a contents list, both folding into labelled disclosures on narrow screens.' },
            { name: 'AppShell', description: 'A top bar, a side navigation and content for applications. It makes every control inside compact.' },
            { name: 'Header, Footer, ThemeToggle', description: 'The sticky header (it needs an identity) with a menu below 768px, the Ink footer, and the light and dark switch, which takes no props.' },
            { name: 'ExternalLink, SkipLink, Collapse', description: 'A link to another site with an arrow, the first focusable element, and one native disclosure.' },
            { name: 'Reveal, Stagger, useReveal, useDrawOn', description: 'Entrance and scroll motion. Nothing is hidden without scripts or under reduced motion.' },
            { name: 'useTheme', description: 'Light, dark or system, saved to the ejm-theme cookie.' },
            { name: 'useMediaQuery, useReducedMotion, useContainerQuery, useInView', description: 'Server-safe measurements. The first render matches the server.' },
            { name: 'useClipboard, useHotkeys', description: 'Copy with a confirmation, and keyboard shortcuts that ignore typing in fields.' },
          ],
        },
      ],
    },
    {
      id: 'docs-parts',
      title: 'Docs parts',
      blocks: [
        {
          type: 'p',
          children: <>This page is built from them. They live in <code>@ejm/ui</code>, and a page is plain data: a title, a lead and sections.</>,
        },
        {
          type: 'params',
          caption: 'Docs parts',
          labels: { name: 'Part', description: 'Behavior' },
          rows: [
            { name: 'DocsSidebar', description: 'Grouped page links with aria-current. A filter narrows them and says how many results.' },
            { name: 'Contents', description: 'On this page. Links work without scripts. With scripts it marks the heading being read and moves focus to a heading you choose.' },
            { name: 'CodeBlock', description: 'A language label, a Copy button that says Copied, and a code area that scrolls inside itself.' },
            { name: 'CodeTabs', description: 'The tabs pattern for the same task in several languages. With no script every panel shows under its label.' },
            { name: 'Callout', description: 'Note, Tip or Warning: a left rule and a word first.' },
            { name: 'ParamTable', description: 'Names in mono, tabular figures, and a scroll region on narrow screens.' },
            { name: 'Pager', description: 'Previous and next links that name the pages.' },
          ],
        },
        {
          type: 'tabs',
          label: 'Language',
          tabs: [
            {
              label: 'TypeScript',
              lang: 'tsx',
              code: `import { Callout, CodeBlock } from '@ejm/ui';

<CodeBlock lang="css" code='@import "@ejm/ui/styles.css";' />
<Callout kind="tip">Preview both themes side by side.</Callout>`,
            },
            { label: 'Data', lang: 'ts', code: "const page: DocPage = {\n  slug: 'theming',\n  group: 'Foundations',\n  title: 'Theming and the cookie',\n  lead: 'Light and dark follow the visitor.',\n  sections: [{ id: 'cookie', title: 'The cookie', blocks: [{ type: 'p', children: 'One cookie.' }] }],\n};" },
          ],
        },
      ],
    },
  ],
};
