import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { fieldVariants } from '../../control-recipes.mjs';
import { Select } from './select';
import { Switch } from './switch';
import { Textarea } from './textarea';

describe('text fields', () => {
  it('Input and Textarea take typing and keep their label and error wiring', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <label htmlFor="n">Name</label>
        <Input id="n" aria-invalid="true" aria-describedby="n-err" />
        <p id="n-err">Enter a name.</p>
        <label htmlFor="m">Message</label>
        <Textarea id="m" />
      </form>,
    );
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Message'), 'Hello');
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter a name.');
    expect(screen.getByLabelText('Message')).toHaveValue('Hello');
  });
});

describe('field recipe', () => {
  it('Input, Select and Textarea take the one field look: rounded-control, control border, field fill, 44px rows at 16px type', () => {
    render(<><Input aria-label="Name" /><Select aria-label="Plan"><option>Free</option></Select><Textarea aria-label="Notes" /></>);
    for (const el of [screen.getByRole('textbox', { name: 'Name' }), screen.getByRole('combobox', { name: 'Plan' }), screen.getByRole('textbox', { name: 'Notes' })]) {
      expect(el.className.split(' ')).toEqual(expect.arrayContaining(['rounded-control', 'border', 'border-control', 'bg-field', 'text-base', 'touch-target', 'disabled:opacity-50', 'disabled:pointer-events-none']));
    }
    expect(screen.getByRole('textbox', { name: 'Name' }).className).toContain('min-h-11');
    expect(screen.getByRole('textbox', { name: 'Notes' }).className).toContain('min-h-28');
    expect(screen.getByRole('textbox', { name: 'Notes' }).className).not.toContain('min-h-11');
  });

  it('emits one height and one type size per density, and no color transition or own focus ring', () => {
    for (const kind of ['line', 'area'] as const) {
      for (const density of ['comfortable', 'compact'] as const) {
        const tokens = fieldVariants({ kind, density }).split(' ');
        expect(tokens.filter(t => t.startsWith('min-h-')), `${kind} ${density}`).toHaveLength(1);
        expect(tokens.filter(t => /^text-(sm|base)$/.test(t)), `${kind} ${density}`).toHaveLength(1);
        expect(tokens.filter(t => /^(transition-colors|transition-all|transition|focus-ring|rounded-compact)$/.test(t))).toEqual([]);
      }
    }
  });
});

describe('Select', () => {
  it('is a native select: the keyboard picks an option and onChange fires', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="s">Theme</label>
        <Select id="s" onChange={onChange}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </>,
    );
    await user.selectOptions(screen.getByLabelText('Theme'), 'dark');
    expect(screen.getByLabelText('Theme')).toHaveValue('dark');
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe('Switch', () => {
  it('toggles with Space and announces its state through role switch', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole('switch', { name: 'Notifications' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.tab();
    expect(sw).toHaveFocus();
    await user.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('is toggled by clicking its label text', async () => {
    const user = userEvent.setup();
    render(<Switch label="Notifications" />);
    await user.click(screen.getByText('Notifications'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Checkbox', () => {
  it('toggles with Space and reports mixed when indeterminate', async () => {
    const user = userEvent.setup();
    render(<><Checkbox label="Accept" /><Checkbox label="Some" checked="indeterminate" /></>);
    const box = screen.getByRole('checkbox', { name: 'Accept' });
    await user.tab();
    await user.keyboard(' ');
    expect(box).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Some' })).toBePartiallyChecked();
  });
});

describe.each(themes)('accessibility in %s', theme => {
  it('fields pass axe', async () => {
    const { container } = renderIn(
      theme,
      <form>
        <label htmlFor="a">Email</label>
        <Input id="a" type="email" />
        <label htmlFor="b">Notes</label>
        <Textarea id="b" />
        <label htmlFor="c">Plan</label>
        <Select id="c"><option>Free</option><option>Pro</option></Select>
        <Switch label="Updates" />
        <Checkbox label="Agree" />
      </form>,
    );
    await expectAccessible(container);
  });
});
