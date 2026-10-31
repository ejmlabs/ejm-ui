import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Plus } from 'lucide-react';
import { DensityProvider } from '../../lib/density';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('lets a link button wrap a long label (320px), while pills stay on one line', () => {
    render(<><Button variant="link">A long label that must be allowed to wrap on a narrow phone</Button><Button>Save</Button></>);
    expect(screen.getByRole('button', { name: /long label/ }).className).not.toContain('whitespace-nowrap');
    expect(screen.getByRole('button', { name: 'Save' }).className).toContain('whitespace-nowrap');
  });

  it('secondary is a transparent control-border pill, ghost has no border, link is underlined text, primary and danger are fills', () => {
    const of = (variant: 'secondary' | 'ghost' | 'link' | 'primary' | 'danger') => buttonVariants({ variant }).split(' ');
    const secondary = of('secondary');
    const ghost = of('ghost');
    const link = of('link');
    const primary = of('primary');
    const danger = of('danger');
    expect(secondary).toEqual(expect.arrayContaining(['border', 'border-control', 'hover:bg-tone', 'rounded-pill']));
    expect(secondary.some(c => c.startsWith('bg-'))).toBe(false);
    expect(ghost).toContain('hover:bg-tone');
    expect(ghost).not.toContain('border');
    expect(link).toEqual(expect.arrayContaining(['underline', 'decoration-1', 'hover:decoration-2', 'text-link']));
    expect(primary).toEqual(expect.arrayContaining(['bg-primary', 'hover:bg-primary-hover']));
    expect(danger).toEqual(expect.arrayContaining(['bg-danger', 'text-on-danger']));
  });

  it('is 44px at 16px type, compact is 32px at 14px with a touch target, and the icon is a square', () => {
    const md = buttonVariants().split(' ');
    expect(md).toEqual(expect.arrayContaining(['min-h-11', 'text-base', 'touch-target']));
    const compact = buttonVariants({ density: 'compact' }).split(' ');
    expect(compact).toEqual(expect.arrayContaining(['min-h-8', 'compact-target', 'touch-target', 'text-sm']));
    expect(buttonVariants({ size: 'icon' }).split(' ')).toContain('size-11');
    expect(buttonVariants({ size: 'icon', density: 'compact' }).split(' ')).toEqual(expect.arrayContaining(['size-8', 'compact-target']));
  });

  it('sizes the icon of an icon button whatever size the icon asks for: 20px, 16px compact', () => {
    const { container } = render(
      <>
        <Button size="icon" aria-label="Add"><Plus size={13} /></Button>
        <DensityProvider density="compact"><Button size="icon" aria-label="Add compact"><Plus /></Button></DensityProvider>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('[&_svg]:size-5', '[&_svg]:shrink-0');
    expect(screen.getByRole('button', { name: 'Add compact' })).toHaveClass('[&_svg]:size-4', '[&_svg]:shrink-0');
    // lucide-react hides an icon with no accessible prop; the button carries the name.
    for (const svg of container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(buttonVariants({ size: 'md' })).not.toContain('[&_svg]');
  });

  it('never puts two values for one property in a recipe, and carries no color transition, own focus ring or off-scale size', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'link', 'danger'] as const) {
      for (const size of ['md', 'icon'] as const) {
        for (const density of ['comfortable', 'compact'] as const) {
          const tokens = buttonVariants({ variant, size, density }).split(' ');
          const count = (re: RegExp) => tokens.filter(t => re.test(t)).length;
          expect(count(/^(min-h-|size-)/), `${variant} ${size} ${density} height`).toBe(1);
          expect(count(/^text-(sm|base)$/), `${variant} ${size} ${density} type`).toBe(1);
          expect(count(/^p[xy]?-\d/), `${variant} ${size} ${density} padding`).toBeLessThanOrEqual(1);
          expect(tokens.filter(t => /^(transition-colors|transition-all|transition|focus-ring|rounded-compact)$|^text-\[/.test(t))).toEqual([]);
        }
      }
    }
  });

  it('presses only a button: scale on active, motion-safe, and disabled or aria-disabled is dimmed and inert', () => {
    const tokens = buttonVariants().split(' ');
    expect(tokens).toContain('motion-safe:active:scale-[0.97]');
    expect(tokens).toEqual(expect.arrayContaining(['disabled:opacity-50', 'disabled:pointer-events-none', 'aria-disabled:opacity-50', 'aria-disabled:pointer-events-none']));
  });

  it('is a type=button button by default, so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('activates with Enter and Space, and not when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
    rerender(<Button disabled onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('draws the arrow inside a link when asChild is used, hidden from assistive technology', () => {
    render(<Button asChild arrow><a href="/docs">Read the docs</a></Button>);
    const link = screen.getByRole('link', { name: 'Read the docs' });
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const { container } = renderIn(
      theme,
      <p>
        <Button>Primary</Button> <Button variant="secondary">Secondary</Button> <Button variant="ghost">Ghost</Button>{' '}
        <Button variant="link" arrow>Link</Button> <Button disabled>Disabled</Button>
      </p>,
    );
    await expectAccessible(container);
  });
});
