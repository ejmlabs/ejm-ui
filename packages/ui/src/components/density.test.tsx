import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DensityProvider } from '../lib/density';
import { StateBlock } from './StateBlock';
import { Table } from './Table';
import { expectAccessible, renderIn, themes } from './test-setup';
import { Badge } from './ui/badge';
import { Button, buttonVariants } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Disclosure } from './ui/disclosure';
import { Input } from './ui/input';
import { Menu, MenuContent, MenuItem, MenuTrigger } from './ui/menu';
import { RadioGroup } from './ui/radio-group';
import { Select } from './ui/select';
import { Switch } from './ui/switch';
import { Tabs } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Tooltip } from './ui/tooltip';

// Density is set once by the surface (AppShell, Page variant="application") and read from context; the `density` prop still overrides it.
// A compact control is 32px on a fine pointer (compact-target) and still 44px on a coarse one (touch-target).
const compactHeight = ['min-h-8', 'compact-target', 'touch-target', 'text-sm'];
const classesOf = (el: HTMLElement) => el.className.split(' ');

describe('density', () => {
  it('leaves every default as it was', () => {
    const base = buttonVariants();
    expect(base).toBe(buttonVariants({ density: 'comfortable' }));
    expect(base).toContain('rounded-pill');
    expect(base).toContain('min-h-11');
    expect(base).not.toContain('rounded-compact');
  });

  it('a compact Button, Input and Select share the same compact height classes, and none keeps the comfortable ones', () => {
    render(
      <>
        <Button density="compact">Save</Button>
        <Input density="compact" aria-label="Name" />
        <Select density="compact" aria-label="Plan"><option>Free</option></Select>
      </>,
    );
    for (const el of [screen.getByRole('button', { name: 'Save' }), screen.getByRole('textbox', { name: 'Name' }), screen.getByRole('combobox', { name: 'Plan' })]) {
      expect(classesOf(el)).toEqual(expect.arrayContaining(compactHeight));
      expect(classesOf(el)).not.toContain('min-h-11');
      expect(classesOf(el)).not.toContain('text-base');
    }
  });

  it('a Button inside DensityProvider compact is compact with no prop, and the prop still overrides it', () => {
    render(
      <DensityProvider density="compact">
        <Button>Save</Button>
        <Button density="comfortable">Save big</Button>
        <Button size="icon" aria-label="Close">x</Button>
      </DensityProvider>,
    );
    expect(classesOf(screen.getByRole('button', { name: 'Save' }))).toEqual(expect.arrayContaining(compactHeight));
    expect(classesOf(screen.getByRole('button', { name: 'Save big' }))).toEqual(expect.arrayContaining(['min-h-11', 'text-base']));
    expect(classesOf(screen.getByRole('button', { name: 'Save big' }))).not.toContain('compact-target');
    expect(classesOf(screen.getByRole('button', { name: 'Close' }))).toEqual(expect.arrayContaining(['size-8', 'compact-target']));
  });

  it('every field control reads the surface density: Input, Select, Textarea, Switch, Checkbox, RadioGroup and Disclosure', () => {
    const { container } = render(
      <DensityProvider density="compact">
        <Input aria-label="Name" />
        <Select aria-label="Plan"><option>Free</option></Select>
        <Textarea aria-label="Notes" />
        <Switch label="Wrap" />
        <Checkbox label="Agree" />
        <RadioGroup label="Mode" name="mode" value="a" onValueChange={() => {}} options={[{ value: 'a', label: 'A' }]} />
        <Disclosure summary="More">Body</Disclosure>
      </DensityProvider>,
    );
    expect(classesOf(screen.getByRole('textbox', { name: 'Name' }))).toEqual(expect.arrayContaining(compactHeight));
    expect(classesOf(screen.getByRole('combobox', { name: 'Plan' }))).toEqual(expect.arrayContaining(compactHeight));
    // The textarea keeps its own minimum height; compact only sets the type.
    expect(classesOf(screen.getByRole('textbox', { name: 'Notes' }))).toEqual(expect.arrayContaining(['min-h-28', 'text-sm']));
    for (const label of ['Wrap', 'Agree', 'A']) expect(classesOf(screen.getByText(label).closest('label')!)).toEqual(expect.arrayContaining(['min-h-8', 'compact-target', 'touch-target']));
    expect(classesOf(container.querySelector('summary')!)).toEqual(expect.arrayContaining(['min-h-8', 'compact-target', 'touch-target']));
  });

  it('Tabs and menu items read the surface density too', async () => {
    const user = userEvent.setup();
    render(
      <DensityProvider density="compact">
        <Tabs label="Products" tabs={[{ id: 'a', label: 'One', panel: <p>First</p> }]} />
        <Menu>
          <MenuTrigger asChild><Button>Actions</Button></MenuTrigger>
          <MenuContent><MenuItem>Rename</MenuItem></MenuContent>
        </Menu>
      </DensityProvider>,
    );
    expect(classesOf(screen.getByRole('tab', { name: 'One' }))).toEqual(expect.arrayContaining(['min-h-8', 'compact-target', 'touch-target', 'text-sm']));
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(classesOf(await screen.findByRole('menuitem', { name: 'Rename' }))).toEqual(expect.arrayContaining(['min-h-8', 'compact-target', 'touch-target', 'text-sm']));
  });

  it('Button danger is a red fill with its own text color, and icon is a square', () => {
    render(<><Button variant="danger">Delete</Button><Button size="icon" density="compact" aria-label="Close">x</Button><Button size="icon" aria-label="More">y</Button></>);
    expect(classesOf(screen.getByRole('button', { name: 'Delete' }))).toEqual(expect.arrayContaining(['bg-danger', 'text-on-danger']));
    expect(classesOf(screen.getByRole('button', { name: 'Close' }))).toContain('size-8');
    expect(classesOf(screen.getByRole('button', { name: 'Close' }))).not.toContain('size-11');
    expect(classesOf(screen.getByRole('button', { name: 'More' }))).toContain('size-11');
    expect(classesOf(screen.getByRole('button', { name: 'More' }))).not.toContain('compact-target');
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

  it.each([['compact', 'px-2'], ['comfortable', 'px-3']] as const)('Tooltip %s: one overlay (control radius, line border, raised shadow, text-sm) that only changes its padding (%s)', async (density, padding) => {
    const user = userEvent.setup();
    render(<Tooltip content="Copy" density={density}><Button aria-label="Copy">C</Button></Tooltip>);
    await user.tab();
    const tip = (await screen.findAllByText('Copy')).find(el => el.className.includes('shadow-raised'))!;
    expect(classesOf(tip)).toEqual(expect.arrayContaining(['rounded-control', 'border', 'border-line', 'bg-ground', 'text-sm', 'shadow-raised', 'animate-fade', padding]));
    expect(tip.className).not.toContain('rounded-compact');
  });

  it('Badge compact tightens the gap; the type stays text-meta', () => {
    render(<><Badge density="compact">beta</Badge><Badge>ga</Badge></>);
    expect(classesOf(screen.getByText('beta').parentElement!)).toEqual(expect.arrayContaining(['gap-1', 'text-meta']));
    expect(classesOf(screen.getByText('ga').parentElement!)).toEqual(expect.arrayContaining(['gap-1.5', 'text-meta']));
  });

  it('StateBlock compact: less space, a compact action', () => {
    const { container } = render(<StateBlock kind="empty" message="Nothing here." action={{ label: 'Add one' }} density="compact" />);
    expect(container.firstElementChild!.className).toContain('py-3');
    expect(classesOf(screen.getByRole('button', { name: /Add one/ }))).toEqual(expect.arrayContaining(compactHeight));
  });

  it('Table: rows are py-4, compact py-2, and truncate={false} shows every character with no title or ellipsis', () => {
    const columns = [{ key: 'a', label: 'Name' }, { key: 'b', label: 'Note', width: 4 }];
    const rows = [{ a: 'x', b: 'a very long note that would be cut' }];
    const { container, rerender } = render(<Table columns={columns} rows={rows} density="compact" />);
    expect(classesOf(container.querySelector('td')!)).toContain('py-2');
    expect(container.querySelector('.truncate')).not.toBeNull();
    rerender(<Table columns={columns} rows={rows} truncate={false} />);
    expect(classesOf(container.querySelector('td')!)).toContain('py-4');
    expect(container.querySelector('.truncate')).toBeNull();
    expect(screen.getByRole('cell', { name: 'a very long note that would be cut' })).toBeInTheDocument();
    expect(container.querySelector('[title]')).toBeNull();
  });
});

describe.each(themes)('compact density accessibility in %s', theme => {
  it('passes axe', async () => {
    const { container } = renderIn(
      theme,
      <DensityProvider density="compact">
        <Button variant="danger">Delete</Button> <Button size="icon" aria-label="Close">x</Button>{' '}
        <Switch label="Wrap" /> <Badge tone="ok">ok</Badge>
        <StateBlock kind="error" message="Could not load." />
        <Table columns={[{ key: 'a', label: 'A' }]} rows={[{ a: 'x' }]} truncate={false} />
      </DensityProvider>,
    );
    await expectAccessible(container);
  });
});
