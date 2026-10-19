import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectAccessible, renderIn, themes } from '../components/test-setup';
import { Callout } from './Callout';
import { LinkProvider, type LinkProps } from '../shell/link';
import { Pager } from './Pager';
import { ParamTable } from './ParamTable';

describe('Callout', () => {
  it.each([
    ['note', 'Note'],
    ['tip', 'Tip'],
    ['warning', 'Warning'],
  ] as const)('puts the word %s first, so the meaning does not rest on color', async (kind, word) => {
    for (const theme of themes) {
      const { container, unmount } = renderIn(theme, <Callout kind={kind}>Back up the file first.</Callout>);
      const note = screen.getByRole('note');
      expect(note.firstElementChild).toHaveTextContent(word);
      expect(note).toHaveTextContent('Back up the file first.');
      await expectAccessible(container);
      unmount();
    }
  });
});

describe('ParamTable', () => {
  const rows = [
    { name: 'kind', type: "'note' | 'tip'", default: 'required', description: 'Which aside.' },
    { name: 'limit', type: 'number', default: '10', description: 'How many.' },
  ];
  it('is a labelled, focusable scroll region with row headers, so it can scroll by keyboard on a phone', async () => {
    const { container } = render(<ParamTable caption="Callout props" rows={rows} />);
    const region = screen.getByRole('region', { name: 'Callout props' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toContain('overflow-x-auto');
    expect(screen.getByRole('rowheader', { name: 'kind' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Callout props' })).toBeInTheDocument();
    await expectAccessible(container);
  });
  it('takes a link as a name, and extra prose columns with their own headings', async () => {
    const { container } = render(
      <ParamTable
        caption="Gates"
        labels={{ name: 'Gate', description: 'Fails on' }}
        columns={[{ key: 'command', label: 'Command', mono: true }, { key: 'when', label: 'When it runs' }]}
        rows={[
          { name: <a href="/docs/contrast">Contrast</a>, key: 'contrast', cells: { command: 'node scripts/contrast.mjs', when: 'Before every release.' }, description: 'Text under 4.5:1.' },
          { name: <a href="/docs/budgets">Budgets</a>, key: 'budgets', cells: { command: 'ejm-ssg budget', when: 'On every build.' }, description: 'A route over its size.' },
        ]}
      />,
    );
    expect(screen.getByRole('rowheader', { name: 'Contrast' })).toContainElement(screen.getByRole('link', { name: 'Contrast' }));
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Gate', 'Command', 'When it runs', 'Fails on']);
    expect(screen.getByRole('cell', { name: 'node scripts/contrast.mjs' }).className).toContain('font-mono');
    expect(screen.getByRole('cell', { name: 'On every build.' }).className).not.toContain('font-mono');
    await expectAccessible(container);
  });
  it('leaves out a column nobody uses', () => {
    render(<ParamTable caption="Plain" rows={[{ name: 'a', description: 'b' }]} />);
    expect(screen.queryByRole('columnheader', { name: 'Type' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Default' })).toBeNull();
  });
});

const Routed = ({ href, ...rest }: LinkProps) => <a data-router="yes" href={href} {...rest} />;

describe('Pager', () => {
  it('uses the site link component from LinkProvider, and a plain anchor without one', () => {
    const pages = { prev: { href: '/a', title: 'A' }, next: { href: '/b', title: 'B' } };
    const { container, rerender } = render(<Pager {...pages} />);
    expect(container.querySelectorAll('[data-router]')).toHaveLength(0);
    rerender(<LinkProvider value={Routed}><Pager {...pages} /></LinkProvider>);
    expect(container.querySelectorAll('[data-router]')).toHaveLength(2);
  });
  it('names the adjacent pages and marks them prev and next', async () => {
    const { container } = render(<Pager prev={{ href: '/docs', title: 'Getting started' }} next={{ href: '/docs/tokens', title: 'Tokens and bands' }} />);
    const nav = screen.getByRole('navigation', { name: 'Previous and next pages' });
    expect(nav).toBeInTheDocument();
    const prev = screen.getByRole('link', { name: /Getting started/ });
    const next = screen.getByRole('link', { name: /Tokens and bands/ });
    expect(prev).toHaveAttribute('rel', 'prev');
    expect(prev).toHaveAttribute('href', '/docs');
    expect(next).toHaveAttribute('rel', 'next');
    await expectAccessible(container);
  });
  it('shows only the neighbor that exists, and nothing for a lone page', () => {
    const only = renderToString(<Pager next={{ href: '/b', title: 'B' }} />);
    expect(only).toContain('rel="next"');
    expect(only).not.toContain('rel="prev"');
    expect(renderToString(<Pager />)).toBe('');
  });
  it('is keyboard operable', async () => {
    const user = userEvent.setup();
    render(<Pager prev={{ href: '#a', title: 'A' }} next={{ href: '#b', title: 'B' }} />);
    await user.tab();
    expect(screen.getByRole('link', { name: /A$/ })).toHaveFocus();
  });
});
