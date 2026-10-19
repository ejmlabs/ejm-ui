import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Tabs } from './tabs';

const tabs = [
  { id: 'cli', label: 'CLI', panel: <p>Terminal agent</p> },
  { id: 'ide', label: 'IDE', panel: <p>Editor and engine</p> },
  { id: 'harness', label: 'Harness', panel: <p>Test harness</p> },
];

describe('Tabs', () => {
  it('selects the first tab, announces it with aria-selected and keeps only it in the tab order', () => {
    render(<Tabs label="Products" tabs={tabs} />);
    const [cli, ide] = screen.getAllByRole('tab');
    expect(cli).toHaveAttribute('aria-selected', 'true');
    expect(cli).toHaveAttribute('tabindex', '0');
    expect(ide).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('CLI');
    expect(screen.getByText('Terminal agent')).toBeVisible();
    expect(screen.getByText('Editor and engine')).not.toBeVisible();
  });

  it('moves with arrows (wrapping), Home and End, and selection follows focus', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Tabs label="Products" tabs={tabs} onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'IDE' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'IDE' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Editor and engine')).toBeVisible();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Harness' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'CLI' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Harness' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'CLI' })).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('cli');
  });

  it('manual activation moves focus with arrows and selects only on Enter', async () => {
    const user = userEvent.setup();
    render(<Tabs label="Products" tabs={tabs} activation="manual" />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'IDE' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'CLI' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tab', { name: 'IDE' })).toHaveAttribute('aria-selected', 'true');
  });

  it('selects on click and honors defaultValue', async () => {
    const user = userEvent.setup();
    render(<Tabs label="Products" tabs={tabs} defaultValue="ide" />);
    expect(screen.getByRole('tab', { name: 'IDE' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Harness' }));
    expect(screen.getByText('Test harness')).toBeVisible();
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const { container } = renderIn(theme, <Tabs label="Products" tabs={tabs} />);
    await expectAccessible(container);
  });
});
