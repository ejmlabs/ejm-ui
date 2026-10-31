import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectAccessible } from '../components/test-setup';
import { Button } from '../components/ui/button';
import { Elevations } from './Elevations';
import { Compare, Specimen, ThemePair, TypeScale } from './Specimen';

describe('Specimen', () => {
  it('names the group by its visible label and keeps the page theme without one', () => {
    render(<Specimen label="Compact, for applications"><Button>Save</Button></Specimen>);
    const group = screen.getByRole('group', { name: 'Compact, for applications' });
    expect(group).not.toHaveAttribute('data-theme');
    expect(group).not.toHaveAttribute('data-band');
    expect(within(group).getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('starts its theme on the Paper ground', () => {
    render(<Specimen label="Dark" theme="dark">x</Specimen>);
    const group = screen.getByRole('group', { name: 'Dark' });
    expect(group).toHaveAttribute('data-theme', 'dark');
    expect(group).toHaveAttribute('data-band', 'paper');
    expect(group).toHaveClass('band');
  });
});

describe('ThemePair', () => {
  it('renders its children once in a light and once in a dark specimen, two columns from 64rem', async () => {
    const { container } = render(<ThemePair><Button>Save</Button></ThemePair>);
    const light = screen.getByRole('group', { name: 'Light theme' });
    const dark = screen.getByRole('group', { name: 'Dark theme' });
    expect(light).toHaveAttribute('data-theme', 'light');
    expect(dark).toHaveAttribute('data-theme', 'dark');
    expect(within(light).getByRole('button', { name: 'Save' })).not.toBe(within(dark).getByRole('button', { name: 'Save' }));
    expect(container.firstElementChild).toHaveClass('lg:grid-cols-2');
    await expectAccessible(container);
  });

  it('is the Compare layout', () => {
    const { container } = render(<Compare><p>a</p><p>b</p></Compare>);
    expect(container.firstElementChild).toHaveClass('grid', 'lg:grid-cols-2');
  });
});

describe('TypeScale and Elevations', () => {
  it('shows each of the six sizes once, in its own size', () => {
    const { container } = render(<TypeScale />);
    const sizes = [...container.querySelectorAll('p')].map(p => [...p.classList].find(c => c.startsWith('text-')));
    expect(sizes).toEqual(['text-display', 'text-title', 'text-heading', 'text-lead', 'text-body', 'text-meta']);
  });

  it('shows the three shadow levels on window samples', () => {
    const { container } = render(<Elevations />);
    const samples = [...container.firstElementChild!.children];
    expect(samples.map(s => s.textContent)).toEqual(['shadow-rest', 'shadow-raised', 'shadow-float']);
    samples.forEach((s, i) => expect(s).toHaveClass('rounded-window', ['shadow-rest', 'shadow-raised', 'shadow-float'][i]!));
  });
});
