import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Button } from './button';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from './menu';

function Demo({ onPick = () => {} }: { onPick?: (what: string) => void }) {
  return (
    <Menu>
      <MenuTrigger asChild><Button variant="secondary">Actions</Button></MenuTrigger>
      <MenuContent>
        <MenuLabel>Project</MenuLabel>
        <MenuItem onSelect={() => onPick('rename')}>Rename</MenuItem>
        <MenuItem onSelect={() => onPick('copy')}>Copy link</MenuItem>
        <MenuSeparator />
        <MenuItem disabled>Delete</MenuItem>
      </MenuContent>
    </Menu>
  );
}

describe('Menu', () => {
  it('opens from the keyboard, moves with arrows, skips disabled items, selects with Enter and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Demo onPick={onPick} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Copy link' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus(); // Delete is disabled, so it wraps
    await user.keyboard('{ArrowUp}{Enter}');
    expect(onPick).toHaveBeenCalledWith('copy');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const user = userEvent.setup();
    renderIn(theme, <Demo />);
    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');
    await expectAccessible(document.body);
  });
});
