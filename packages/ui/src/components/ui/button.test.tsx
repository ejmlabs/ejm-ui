import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Button } from './button';

describe('Button', () => {
  it('lets a link button wrap a long label (320px), while pills stay on one line', () => {
    render(<><Button variant="link">A long label that must be allowed to wrap on a narrow phone</Button><Button>Save</Button></>);
    expect(screen.getByRole('button', { name: /long label/ }).className).not.toContain('whitespace-nowrap');
    expect(screen.getByRole('button', { name: 'Save' }).className).toContain('whitespace-nowrap');
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
