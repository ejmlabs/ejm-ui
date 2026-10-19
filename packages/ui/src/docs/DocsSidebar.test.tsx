import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { LinkProvider, type LinkProps } from '../shell/link';
import { DocsSidebar, type DocsNavGroup } from './DocsSidebar';

const groups: DocsNavGroup[] = [
  { title: 'Start', items: [{ label: 'Getting started', href: '/docs' }, { label: 'Design language', href: '/docs/design' }] },
  { title: 'Build', items: [{ label: 'Components', href: '/docs/components' }, { label: 'Theming and the cookie', href: '/docs/theming' }, { label: 'Tokens and bands', href: '/docs/tokens' }] },
];

describe('DocsSidebar', () => {
  it('renders its links with the site link component from LinkProvider, and keeps aria-current', () => {
    const Routed = (props: LinkProps) => <a data-router="yes" {...props} />;
    const { container } = render(<LinkProvider value={Routed}><DocsSidebar groups={groups} current="/docs" /></LinkProvider>);
    expect(container.querySelectorAll('[data-router]')).toHaveLength(5);
    expect(container.querySelector('[data-router][aria-current="page"]')).toHaveAttribute('href', '/docs');
  });

  it('marks the current page and groups the links', async () => {
    const { container } = render(<DocsSidebar groups={groups} current="/docs/components" filter />);
    expect(screen.getByRole('navigation', { name: 'Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Components' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Getting started' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('list', { name: 'Build' })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it('filters as you type, announces the count, hides empty groups and clears on Escape', async () => {
    const user = userEvent.setup();
    render(<DocsSidebar groups={groups} current="/docs" filter />);
    const input = screen.getByRole('searchbox', { name: 'Filter pages' });
    await user.type(input, 'ing');
    expect(screen.getByRole('status')).toHaveTextContent('2 results');
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Getting started', 'Theming and the cookie']);
    await user.clear(input);
    await user.type(input, 'comp');
    expect(screen.getByRole('status')).toHaveTextContent('1 result');
    expect(screen.queryByText('Start')).toBeNull();
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent('No results for "zzz"');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('without scripts lists every page and keeps the filter hidden', () => {
    const html = renderToString(<DocsSidebar groups={groups} current="/docs" filter />);
    for (const label of ['Getting started', 'Design language', 'Components', 'Theming and the cookie', 'Tokens and bands']) expect(html).toContain(label);
    expect(html).toMatch(/<div hidden=""[^>]*>[^]*type="search"/);
  });

  it('shows the filter only after scripts run', () => {
    render(<DocsSidebar groups={groups} current="/docs" filter />);
    expect(within(document.body).getByRole('searchbox')).toBeVisible();
  });
});
