import type { DocPage } from '@ejm/ui';
import { docMeta } from './meta';

export const theming: DocPage = {
  ...docMeta['theming'],
  sections: [
    {
      id: 'themes',
      title: 'How a theme is chosen',
      blocks: [
        {
          type: 'params',
          caption: 'Theme mechanisms',
          labels: { name: 'Mechanism', description: 'Behavior' },
          rows: [
            { name: '<html data-theme="light|dark">', description: 'Sets the page theme. Light is the default.' },
            { name: 'no data-theme on the root', description: 'The system prefers-color-scheme decides, with no script.' },
            { name: 'data-theme on any element', description: 'Starts a new theme for that subtree. The nearest one wins.' },
            { name: '?theme=dark|light', description: 'A test override. The boot script applies it and never saves it.' },
          ],
        },
        { type: 'code', lang: 'html', code: '<section data-theme="dark" data-band="paper" class="band">\n  A dark preview inside a light page.\n</section>' },
        {
          type: 'p',
          children: <>No control takes a theme prop. <code>Specimen</code> with a <code>theme</code>, and <code>ThemePair</code>, write these attributes for a docs page, which is how the gallery shows light beside dark on the components, app and shell pages.</>,
        },
      ],
    },
    {
      id: 'no-flash',
      title: 'No flash of the wrong theme',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              <code>theme-boot.js</code> is 414 bytes with no dependencies. It runs before first paint and always sets <code>data-theme</code> on the root. It tries the <code>?theme=</code> override first, then the saved choice, then the system preference.
            </>
          ),
        },
        { type: 'callout', kind: 'warning', children: <p>Keep it a synchronous external file in the head. Inline script would break <code>script-src 'self'</code>, and a deferred one would flash the wrong theme.</p> },
      ],
    },
    {
      id: 'cookie',
      title: 'The cookie',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              On <code>ejmlabs.com</code> and its subdomains the choice is the <code>ejm-theme</code> cookie, so a visitor who picks dark on one site sees dark on all of them. On any other host, such as localhost or a preview, the choice is stored in <code>localStorage</code> under the same name.
            </>
          ),
        },
        { type: 'code', lang: 'text', label: 'Cookie', code: 'ejm-theme=dark; Domain=.ejmlabs.com; Path=/; Max-Age=31536000; SameSite=Lax; Secure' },
        {
          type: 'p',
          children: <><code>Secure</code> is added on https. Off an ejmlabs host the <code>Domain</code> attribute is left out, so the cookie is host-only. The boot script only reads; the hook writes.</>,
        },
      ],
    },
    {
      id: 'use-theme',
      title: 'Reading and setting the theme',
      blocks: [
        {
          type: 'p',
          children: (
            <>
              <code>useTheme()</code> returns the visitor's <code>choice</code> (light, dark or system), what is on screen as <code>resolved</code>, <code>setChoice</code> and <code>toggle</code>. <code>ThemeToggle</code> is the ready-made control. It takes no props, it is always the last item in the header, and the header and app shell include it for you.
            </>
          ),
        },
        {
          type: 'code',
          lang: 'tsx',
          code: `import { Button, useTheme } from '@ejm/ui';

function Sun() {
  const { resolved, toggle } = useTheme();
  return <Button variant="secondary" onClick={toggle}>Switch to {resolved === 'dark' ? 'light' : 'dark'}</Button>;
}`,
        },
        {
          type: 'callout',
          kind: 'tip',
          children: <p>The server and the first client render both see light. Do not branch on <code>resolved</code> for anything visible before hydration. Use the <code>dark:</code> variant, which follows the same rules as the theme.</p>,
        },
      ],
    },
  ],
};
