import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { CodeTabs } from './CodeTabs';
import { tabPreference } from './hooks';

const tabs = [
  { label: 'CSS', code: '@import "x";', lang: 'css' },
  { label: 'TypeScript', code: 'import "x";', lang: 'ts' },
  { label: 'Rust', code: 'use x;', lang: 'rust' },
];

describe('CodeTabs', () => {
  beforeEach(() => tabPreference.reset());

  it('without scripts shows every panel stacked under its label and no dead tab list', () => {
    const html = renderToString(<CodeTabs tabs={tabs} />);
    for (const t of tabs) expect(html).toContain(`>${t.label}</p>`);
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain('hidden');
    for (const c of ['@import', 'import', 'use']) expect(html).toContain(c);
  });

  it('becomes the WAI-ARIA tabs pattern: roles, one tab stop, one visible panel', async () => {
    const { container } = render(<CodeTabs tabs={tabs} />);
    const list = screen.getByRole('tablist', { name: 'Language' });
    const all = within(list).getAllByRole('tab');
    expect(all.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(all.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('CSS');
    expect(all[0]).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    await expectAccessible(container);
  });

  it('moves with arrows, wraps, jumps with Home and End, and shows the matching panel', async () => {
    const user = userEvent.setup();
    render(<CodeTabs tabs={tabs} />);
    const [css, ts, rust] = screen.getAllByRole('tab') as HTMLElement[];
    css!.focus();
    await user.keyboard('{ArrowRight}');
    expect(ts).toHaveFocus();
    expect(ts).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('TypeScript');
    expect(ts!.tabIndex).toBe(0);
    expect(css!.tabIndex).toBe(-1);
    await user.keyboard('{End}');
    expect(rust).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(css).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(rust).toHaveFocus();
    await user.keyboard('{Home}');
    expect(css).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('CSS');
  });

  it('keeps Tab moving out of the list, not along it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <CodeTabs tabs={tabs} />
        <button>after</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('tab', { name: 'CSS' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Copy CSS code' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('region', { name: 'CSS code' })).toHaveFocus();
  });

  it('selects the same language in other groups', async () => {
    const user = userEvent.setup();
    render(
      <>
        <CodeTabs label="First" tabs={tabs} />
        <CodeTabs label="Second" tabs={tabs.slice(0, 2)} />
      </>,
    );
    await user.click(within(screen.getByRole('tablist', { name: 'First' })).getByRole('tab', { name: 'TypeScript' }));
    expect(within(screen.getByRole('tablist', { name: 'Second' })).getByRole('tab', { name: 'TypeScript' })).toHaveAttribute('aria-selected', 'true');
  });
});
