import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StateBlock } from './StateBlock';
import { Table } from './Table';
import { expectAccessible, renderIn, themes } from './test-setup';
import { Badge } from './ui/badge';
import { Button, buttonVariants } from './ui/button';
import { Switch } from './ui/switch';
import { Tooltip } from './ui/tooltip';

// density="compact" is for applications. Defaults must not change, and a compact control must still be 44px on a coarse pointer (touch-target)
// while being 32px on a fine one.
describe('density', () => {
  it('leaves every default as it was', () => {
    const base = buttonVariants();
    expect(base).toBe(buttonVariants({ density: 'comfortable' }));
    expect(base).toContain('rounded-pill');
    expect(base).not.toContain('rounded-compact');
  });

  it('Button compact: 5px radius, 13px type, 32px on a fine pointer, still a touch target', () => {
    render(<><Button density="compact">Save</Button><Button density="compact" variant="ghost" size="sm">Sm</Button><Button>Save big</Button></>);
    for (const name of ['Save', 'Sm']) {
      const b = screen.getByRole('button', { name });
      expect(b.className).toContain('rounded-compact');
      expect(b.className).not.toMatch(/rounded-(pill|control)/);
      expect(b.className).toContain('touch-target');
      expect(b.className).toContain('compact-target');
      expect(b.className).toContain('text-[0.8125rem]');
    }
    expect(screen.getByRole('button', { name: 'Save big' }).className).not.toContain('compact');
  });

  it('Button danger is a red fill with its own text color, and icon is a square', () => {
    render(<><Button variant="danger">Delete</Button><Button size="icon" density="compact" aria-label="Close">x</Button><Button size="icon" aria-label="More">y</Button></>);
    expect(screen.getByRole('button', { name: 'Delete' }).className).toMatch(/bg-danger .*text-on-danger|text-on-danger .*bg-danger/);
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('size-8');
    expect(screen.getByRole('button', { name: 'Close' }).className).not.toContain('size-11');
    expect(screen.getByRole('button', { name: 'More' }).className).toContain('size-11');
    expect(screen.getByRole('button', { name: 'More' }).className).not.toContain('compact-target');
  });

  it('Switch compact: 28 by 16px track, 12px thumb, 32px target on a fine pointer', async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch density="compact" aria-label="Wrap" />);
    const root = screen.getByRole('switch', { name: 'Wrap' });
    const track = container.querySelector('span')!;
    expect(track.className).toContain('h-4');
    expect(track.className).toContain('w-7');
    expect(track.className).not.toContain('w-12');
    expect(root.className).toContain('touch-target');
    expect(root.className).toContain('compact-target');
    expect(track.firstElementChild!.className).toContain('size-3');
    await user.click(root);
    expect(root).toHaveAttribute('aria-checked', 'true');
  });

  it('Switch default is unchanged', () => {
    const { container } = render(<Switch aria-label="Wrap" />);
    expect(container.querySelector('span')!.className).toContain('w-12');
  });

  it('Tooltip compact: mono 13px text and the 5px radius', async () => {
    const user = userEvent.setup();
    render(<Tooltip content="Copy" density="compact"><Button aria-label="Copy">C</Button></Tooltip>);
    await user.tab();
    const tip = (await screen.findAllByText('Copy')).find(el => el.className.includes('bg-fg'))!;
    expect(tip.className).toContain('rounded-compact');
    expect(tip.className).toContain('font-mono');
    expect(tip.className).toContain('text-[0.8125rem]');
  });

  it('Badge compact is 12px', () => {
    render(<><Badge density="compact">beta</Badge><Badge>ga</Badge></>);
    expect(screen.getByText('beta').parentElement!.className).toContain('text-xs');
    expect(screen.getByText('ga').parentElement!.className).not.toContain('text-xs');
  });

  it('StateBlock compact: less space, a compact action', () => {
    const { container } = render(<StateBlock kind="empty" message="Nothing here." action={{ label: 'Add one' }} density="compact" />);
    expect(container.firstElementChild!.className).toContain('py-3');
    expect(screen.getByRole('button', { name: /Add one/ }).className).toContain('rounded-compact');
  });

  it('Table: compact rows, and truncate={false} shows every character with no title or ellipsis', () => {
    const columns = [{ key: 'a', label: 'Name' }, { key: 'b', label: 'Note', width: 4 }];
    const rows = [{ a: 'x', b: 'a very long note that would be cut' }];
    const { container, rerender } = render(<Table columns={columns} rows={rows} density="compact" />);
    expect(container.querySelector('td')!.className).toContain('py-1.5');
    expect(container.querySelector('.truncate')).not.toBeNull();
    rerender(<Table columns={columns} rows={rows} truncate={false} />);
    expect(container.querySelector('.truncate')).toBeNull();
    expect(screen.getByRole('cell', { name: 'a very long note that would be cut' })).toBeInTheDocument();
    expect(container.querySelector('[title]')).toBeNull();
  });
});

describe.each(themes)('compact density accessibility in %s', theme => {
  it('passes axe', async () => {
    const { container } = renderIn(
      theme,
      <div>
        <Button density="compact" variant="danger">Delete</Button> <Button density="compact" size="icon" aria-label="Close">x</Button>{' '}
        <Switch density="compact" label="Wrap" /> <Badge density="compact" tone="success">ok</Badge>
        <StateBlock kind="error" message="Could not load." density="compact" />
        <Table columns={[{ key: 'a', label: 'A' }]} rows={[{ a: 'x' }]} density="compact" truncate={false} />
      </div>,
    );
    await expectAccessible(container);
  });
});
