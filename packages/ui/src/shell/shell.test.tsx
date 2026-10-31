import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { Button } from '../components/ui/button';
import { useDensity } from '../lib/density';
import { AppShell } from './AppShell';
import { Contents } from '../docs/Contents';
import { DocsSidebar } from '../docs/DocsSidebar';
import { Pager } from '../docs/Pager';
import { DocsLayout } from './DocsLayout';
import { Collapse } from './Collapse';
import { ExternalLink } from './ExternalLink';
import { Footer } from './Footer';
import { Header } from './Header';
import type { LinkComponent } from './link';
import { SiteLayout } from './SiteLayout';
import { SkipLink } from './SkipLink';
import { ThemeToggle } from './ThemeToggle';

expect.extend(axeMatchers);
const originalViewTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
const noViolations = async (el: HTMLElement) => (expect(await axe(el)) as unknown as AxeMatchers).toHaveNoViolations();

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  if (originalViewTransition) Object.defineProperty(document, 'startViewTransition', originalViewTransition);
  else Reflect.deleteProperty(document, 'startViewTransition');
});

const nav = [
  { label: 'Docs', href: '/docs', current: true },
  { label: 'Gallery', href: '/gallery' },
  { label: 'GitHub', href: 'https://github.com/ejmlabs', external: true },
];
const header = { identity: { name: 'ejmlabs' }, homeLabel: 'ejmlabs home', nav };
const footer = {
  identity: { name: 'ejmlabs', description: 'Shared open source tools.' },
  columns: [{ heading: 'Product', links: nav }, { heading: 'Company', links: [{ label: 'About', href: '/about' }] }],
  privacy: <p>No cookies except your theme.</p>,
  legal: <p>2026 ejmlabs</p>,
};

describe('ExternalLink', () => {
  it('marks the link external and says so to screen readers', () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>);
    const a = screen.getByRole('link', { name: 'Example, opens another site' });
    expect(a).toHaveAttribute('rel', 'external noopener');
    expect(a).not.toHaveAttribute('target');
    expect(a.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('always has the link style, which thickens its underline on hover', () => {
    render(<ExternalLink href="https://example.com">Example</ExternalLink>);
    expect(screen.getByRole('link')).toHaveClass('link');
  });
});

describe('ThemeToggle', () => {
  it('is named for its action, switches the theme on the root, saves it, and updates its name', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark theme' });
    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('ejm-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBe(button);
    expect(screen.getByRole('status')).toHaveTextContent('Dark theme on');
    await user.keyboard('{Enter}');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('saves the chosen theme when a native transition is skipped, and applies it only once', async () => {
    const user = userEvent.setup();
    let deferredUpdate: (() => void) | undefined;
    const start = vi.fn((update: () => void) => {
      deferredUpdate = update;
      return {
        ready: Promise.reject(new DOMException('Skipped', 'AbortError')),
        updateCallbackDone: Promise.resolve(),
        finished: Promise.resolve(),
        skipTransition: vi.fn(),
      };
    });
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Switch to .* theme/ });
    const target = button.getAttribute('aria-label')!.includes('dark') ? 'dark' : 'light';
    await user.click(button);
    expect(start).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.theme).toBe(target);
    expect(localStorage.getItem('ejm-theme')).toBe(target);
    deferredUpdate?.();
    expect(document.documentElement.dataset.theme).toBe(target);
    await user.click(button);
  });

  it('bypasses native transitions when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} }));
    const start = vi.fn();
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Switch to .* theme/ });
    const target = button.getAttribute('aria-label')!.includes('dark') ? 'dark' : 'light';
    await user.click(button);
    expect(start).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe(target);
    await user.click(button);
  });

  it('switches immediately if the native transition cannot start', async () => {
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: () => { throw new Error('Unavailable'); } });
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Switch to .* theme/ });
    const target = button.getAttribute('aria-label')!.includes('dark') ? 'dark' : 'light';
    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe(target);
    expect(localStorage.getItem('ejm-theme')).toBe(target);
    await user.click(button);
  });

  it('server-renders as a button with the light-theme name, before any script runs', () => {
    expect(renderToString(<ThemeToggle />)).toContain('aria-label="Switch to dark theme"');
  });

  it('is the ghost icon button of the control recipe: 44px, a pill, a bg-tone hover and no color transition', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(button).toHaveClass('size-11', 'rounded-pill', 'hover:bg-tone');
    expect(button.className).not.toMatch(/transition-(colors|all)/);
  });
});

describe('Header', () => {
  it('puts the toggle last, marks the current page, and links external items as external', () => {
    render(<Header {...header} />);
    const banner = screen.getByRole('banner');
    const focusable = [...banner.querySelectorAll('a, button, summary')];
    expect(focusable[focusable.length - 1]).toHaveAccessibleName('Switch to dark theme');
    expect(within(banner).getAllByRole('link', { name: 'Docs' })[0]).toHaveAttribute('aria-current', 'page');
    expect(within(banner).getAllByRole('link', { name: /GitHub/ })[0]).toHaveAttribute('rel', 'external noopener');
    expect(within(banner).getByRole('link', { name: 'ejmlabs home' })).toHaveAttribute('href', '/');
  });

  it('opens the narrow menu from the keyboard, closes on Escape with focus back on the button, and closes after choosing a link', async () => {
    const user = userEvent.setup();
    const { container } = render(<Header {...header} />);
    const details = container.querySelector('details')!;
    const summary = details.querySelector('summary')!;
    await user.click(summary);
    expect(details.open).toBe(true);
    await user.keyboard('{Escape}');
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
    await user.click(summary);
    expect(details.open).toBe(true);
    await user.click(within(details).getByRole('link', { name: 'Gallery' }));
    expect(details.open).toBe(false);
  });

  it('gives nav items and the menu button the control recipe: 44px, the control radius, a bg-tone hover', () => {
    const { container } = render(<Header {...header} />);
    const docs = within(screen.getByRole('banner')).getAllByRole('link', { name: 'Docs' })[0]!;
    expect(docs).toHaveClass('min-h-11', 'rounded-control', 'hover:bg-tone');
    expect(container.querySelector('summary')).toHaveClass('min-h-11', 'rounded-control', 'hover:bg-tone');
    expect(container.innerHTML).not.toMatch(/transition-(colors|all)/);
  });

  it('shows the current page with weight 600 and an underline, not color alone', () => {
    render(<Header {...header} />);
    const docs = within(screen.getByRole('banner')).getAllByRole('link', { name: 'Docs' })[0]!;
    expect(docs).toHaveAttribute('aria-current', 'page');
    expect(docs).toHaveClass('aria-[current=page]:font-semibold', 'aria-[current=page]:underline');
  });

  it('opens the narrow menu as an overlay inset to the page gutter, with hairline rows that are 48px targets', () => {
    const { container } = render(<Header {...header} />);
    const panel = container.querySelector('details > div') as HTMLElement;
    expect(panel).toHaveClass('rounded-window', 'border', 'border-line', 'bg-ground', 'shadow-float', 'group-open:animate-fade');
    expect(panel).toHaveClass('inset-x-(--ejm-page-gutter)');
    expect(panel).not.toHaveClass('inset-x-0');
    const rows = [...panel.querySelectorAll('li')];
    expect(rows).toHaveLength(nav.length);
    for (const row of rows) expect(within(row).getByRole('link')).toHaveClass('min-h-12', 'hover:bg-tone');
    expect(rows.slice(1).every(row => row.className.includes('hairline-t'))).toBe(true);
  });

  it('switches between the list and the menu by its own width, a container query, not the viewport', () => {
    const { container } = render(<Header {...header} />);
    const banner = screen.getByRole('banner');
    expect(banner).toHaveClass('@container');
    expect(banner.querySelector('nav > ul')).toHaveClass('hidden', '@3xl:flex');
    expect(container.querySelector('details')).toHaveClass('@3xl:hidden');
    expect(banner.innerHTML).not.toMatch(/\bmd:(flex|hidden)\b/);
  });

  it('closes the menu on a press outside it', async () => {
    const user = userEvent.setup();
    const { container } = render(<><Header {...header} /><p>elsewhere</p></>);
    const details = container.querySelector('details')!;
    await user.click(details.querySelector('summary')!);
    expect(details.open).toBe(true);
    await user.click(screen.getByText('elsewhere'));
    expect(details.open).toBe(false);
  });

  it('uses the supplied link component for internal links only', () => {
    const Router: LinkComponent = ({ href, ...p }) => <a data-router href={href} {...p} />;
    const { container } = render(<Header {...header} linkComponent={Router} />);
    const routed = [...container.querySelectorAll('a[data-router]')].map(a => a.getAttribute('href'));
    expect(routed).toContain('/docs');
    expect(routed).not.toContain('https://github.com/ejmlabs');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Header {...header} />);
    await noViolations(container);
  });
});

describe('landmarks', () => {
  // A docs page as a site composes it: header, sidebar, contents, pager and a footer whose column is also called "Documentation".
  const page = (
    <SiteLayout
      header={header}
      footer={{ ...footer, columns: [{ heading: 'Documentation', links: nav }, { heading: 'Product', links: nav }] }}
    >
      <DocsLayout
        sidebar={<DocsSidebar groups={[{ title: 'Start', items: [{ label: 'Getting started', href: '/docs' }] }]} current="/docs" />}
        contents={<Contents items={[{ id: 'a', label: 'A', level: 2 }]} />}
      >
        <h1>Docs</h1>
        <Pager next={{ href: '/docs/next', title: 'Next' }} />
      </DocsLayout>
    </SiteLayout>
  );

  it('gives every navigation landmark its own name, with one in the header and one in the footer', () => {
    render(page);
    const names = screen.getAllByRole('navigation').map(n => n.getAttribute('aria-label'));
    expect(names.sort()).toEqual(['Documentation', 'Footer', 'Main', 'On this page', 'Previous and next pages']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('passes axe, including landmark-unique, as a whole page', async () => {
    const { container } = render(page);
    await noViolations(container);
  });
});

describe('Footer', () => {
  it('is an Ink band with labelled link columns and the privacy slot', () => {
    render(<Footer {...footer} />);
    const f = screen.getByRole('contentinfo');
    expect(f).toHaveAttribute('data-band', 'ink');
    const columns = within(within(f).getByRole('navigation', { name: 'Footer' }));
    expect(columns.getByRole('heading', { name: 'Product' })).toBeInTheDocument();
    expect(columns.getByRole('heading', { name: 'Company' })).toBeInTheDocument();
    expect(within(f).getByText('No cookies except your theme.')).toBeInTheDocument();
    expect(within(f).getByRole('link', { name: /GitHub/ })).toHaveAttribute('rel', 'external noopener');
  });

  it('marks the current page like the header does, and turns links text-link on hover with no transition', () => {
    const { container } = render(<Footer {...footer} />);
    const docs = within(screen.getByRole('contentinfo')).getAllByRole('link', { name: 'Docs' })[0]!;
    expect(docs).toHaveAttribute('aria-current', 'page');
    expect(docs).toHaveClass('aria-[current=page]:font-semibold', 'aria-[current=page]:underline', 'hover:text-link');
    expect(container.innerHTML).not.toMatch(/transition-(colors|all)/);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Footer {...footer} />);
    await noViolations(container);
  });
});

describe('SiteLayout', () => {
  it('has the skip link first, one main with id and focus target, and the landmarks in order', async () => {
    const { container } = render(<SiteLayout header={header} footer={footer}><h1>Title</h1></SiteLayout>);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '#main');
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(main).toHaveAttribute('tabindex', '-1');
    const order = [...container.querySelectorAll('header, main, footer')].map(e => e.tagName);
    expect(order).toEqual(['HEADER', 'MAIN', 'FOOTER']);
    await noViolations(container);
  });

  it('passes the link component down to the header and footer', () => {
    const Router: LinkComponent = ({ href, ...p }) => <a data-router href={href} {...p} />;
    const { container } = render(<SiteLayout header={header} footer={footer} linkComponent={Router}>x</SiteLayout>);
    expect(container.querySelectorAll('header a[data-router]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('footer a[data-router]').length).toBeGreaterThan(0);
  });

  it('renders all of its content on the server, with no scripts', () => {
    const html = renderToString(<SiteLayout header={header} footer={footer}><h1>Visible</h1></SiteLayout>);
    expect(html).toContain('Visible');
    expect(html).toContain('Skip to main content');
    expect(html).not.toContain('data-reveal');
    expect(html).not.toContain(' hidden=""');
  });
});

describe('DocsLayout', () => {
  it('collapses sidebar and contents into native labelled disclosures, once each, and keeps source order', async () => {
    const { container } = render(
      <DocsLayout sidebar={<ul><li><a href="/a">Page A</a></li></ul>} contents={<ul><li><a href="#x">Heading X</a></li></ul>}>
        <article><h1>Doc</h1></article>
      </DocsLayout>,
    );
    const summaries = [...container.querySelectorAll('details > summary')].map(s => s.textContent);
    expect(summaries).toEqual(['Browse docs', 'On this page']);
    expect(screen.getAllByText('Page A')).toHaveLength(1);
    const text = container.textContent ?? '';
    expect(text.indexOf('Page A')).toBeLessThan(text.indexOf('Heading X'));
    expect(text.indexOf('Heading X')).toBeLessThan(text.indexOf('Doc'));
    await noViolations(container);
  });

  it('places and sticks each disclosure through its grid cell, so Collapse itself takes no class', () => {
    const { container } = render(<DocsLayout sidebar={<p>nav</p>} contents={<p>toc</p>}>x</DocsLayout>);
    const [sidebar, contents] = [...container.querySelectorAll('details')];
    expect(sidebar!.parentElement).toHaveClass('lg:sticky');
    expect(contents!.parentElement).toHaveClass('xl:sticky');
  });

  it('omits the contents disclosure when there are none', () => {
    const { container } = render(<DocsLayout sidebar={<p>nav</p>}>x</DocsLayout>);
    expect(container.querySelectorAll('details')).toHaveLength(1);
  });

  it('where ::details-content is unsupported, opens the details on a wide screen', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<DocsLayout sidebar={<p>nav</p>}>x</DocsLayout>);
    expect(container.querySelector('details')!.open).toBe(true);
  });
});

describe('AppShell', () => {
  const appNav = [{ label: 'Files', href: '#files', current: true }, { label: 'Search', href: '#search' }];

  it('renders the nav items as compact controls and marks only the current one', () => {
    render(<AppShell brand={<span>app</span>} nav={appNav}>x</AppShell>);
    const links = within(screen.getByRole('navigation', { name: 'Navigation' })).getAllByRole('link');
    expect(links.map(l => l.textContent)).toEqual(['Files', 'Search']);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).not.toHaveAttribute('aria-current');
    for (const link of links) expect(link).toHaveClass('min-h-8', 'compact-target', 'touch-target', 'rounded-control', 'text-sm', 'hover:bg-tone');
    expect(links[0]).toHaveClass('aria-[current=page]:font-semibold', 'aria-[current=page]:underline');
  });

  it('routes internal items through the link component and opens external ones as external', () => {
    const Router: LinkComponent = ({ href, ...p }) => <a data-router href={href} {...p} />;
    render(<AppShell brand={<span>app</span>} linkComponent={Router} nav={[{ label: 'Files', href: '/files' }, { label: 'Status', href: 'https://status.example', external: true }]}>x</AppShell>);
    const nav = screen.getByRole('navigation', { name: 'Navigation' });
    expect(within(nav).getByRole('link', { name: 'Files' })).toHaveAttribute('data-router');
    expect(within(nav).getByRole('link', { name: /Status/ })).not.toHaveAttribute('data-router');
    expect(within(nav).getByRole('link', { name: /Status/ })).toHaveAttribute('rel', 'external noopener');
  });

  it('has a top bar with the toggle last, a labelled side nav and main', async () => {
    const { container } = render(
      <AppShell brand={<span>ejm-ide</span>} nav={[{ label: 'Files', href: '/files' }]} actions={<button type="button">Search</button>}>
        <h1>Workspace</h1>
      </AppShell>,
    );
    const bar = screen.getByRole('banner');
    const buttons = within(bar).getAllByRole('button');
    expect(buttons.map(b => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Search', 'Switch to dark theme']);
    expect(screen.getByRole('navigation', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '#main');
    await noViolations(container);
  });

  it('keeps the 56px top bar', () => {
    render(<AppShell brand={<span>app</span>} nav={appNav}>x</AppShell>);
    expect(screen.getByRole('banner').firstElementChild).toHaveClass('h-14');
  });

  it('makes every control inside compact without a prop, and leaves controls outside it comfortable', () => {
    function Density() {
      return <output>{useDensity()}</output>;
    }
    const { container } = render(
      <>
        <Button>Outside</Button>
        <Density />
        <AppShell brand={<span>app</span>} nav={appNav}>
          <Button>Inside</Button>
          <Density />
        </AppShell>
      </>,
    );
    expect([...container.querySelectorAll('output')].map(o => o.textContent)).toEqual(['comfortable', 'compact']);
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveClass('compact-target', 'text-sm');
    expect(screen.getByRole('button', { name: 'Outside' })).not.toHaveClass('compact-target');
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveClass('min-h-11', 'text-base');
  });

  it('makes the theme toggle in the bar a compact icon button', () => {
    render(<AppShell brand={<span>app</span>} nav={appNav}>x</AppShell>);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toHaveClass('size-8', 'compact-target');
  });

  it('gives the home link the control recipe: the control radius and a bg-tone hover', () => {
    const { container } = render(<AppShell brand={<span>app</span>} nav={appNav}>x</AppShell>);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveClass('rounded-control', 'hover:bg-tone');
    expect(container.innerHTML).not.toMatch(/transition-(colors|all)/);
  });
});

describe('Collapse and SkipLink', () => {
  it('render a labelled native disclosure and a skip link to main', () => {
    const { container } = render(
      <>
        <SkipLink />
        <Collapse from="md" label="Browse">
          <p>inside</p>
        </Collapse>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(container.querySelector('details > summary')).toHaveTextContent('Browse');
    expect(container.innerHTML).not.toMatch(/transition-(colors|all)/);
  });
});

describe('closed props', () => {
  // The types are the test: tsc fails when an expected error disappears. closed-api.test.ts covers className and style for every
  // export; these are the legacy props the guard already rejected in sites.
  it('has no logo, brand, className or style on the shell', () => {
    const elements = [
      // @ts-expect-error logo was removed: sites supply identity
      <Header key="logo" {...header} logo={<b>Legacy</b>} />,
      // @ts-expect-error className was removed
      <Header key="header" {...header} className="x" />,
      // @ts-expect-error brand was removed: sites supply identity
      <Footer key="brand" {...footer} brand={<b>Legacy</b>} />,
      // @ts-expect-error className was removed
      <Footer key="footer" {...footer} className="x" />,
      // @ts-expect-error className was removed
      <SiteLayout key="site" header={header} className="x">x</SiteLayout>,
      // @ts-expect-error className was removed
      <Collapse key="collapse" from="md" label="x" className="x">x</Collapse>,
      // @ts-expect-error className was removed
      <ExternalLink key="external" href="https://example.com" className="x">x</ExternalLink>,
      // @ts-expect-error style was removed
      <ExternalLink key="external-style" href="https://example.com" style={{ color: 'red' }}>x</ExternalLink>,
    ];
    expect(elements).toHaveLength(8);
  });
});
