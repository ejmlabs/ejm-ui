import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Badge } from './badge';
import { Button } from './button';
import { Separator } from './separator';
import { Tooltip } from './tooltip';

describe('Badge', () => {
  it('reads as its text only: the separator mark is decorative', () => {
    render(<p><Badge separator="slash">beta</Badge></p>);
    expect(screen.getByText('/')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('beta')).toBeVisible();
  });
});

describe('Separator', () => {
  it('is invisible to assistive technology when decorative and a separator when it divides regions', () => {
    const { rerender } = render(<Separator />);
    expect(screen.queryByRole('separator')).toBeNull();
    rerender(<Separator decorative={false} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

describe('Tooltip', () => {
  it('shows on keyboard focus, describes the control, and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<Tooltip content="Copy the command"><Button aria-label="Copy">C</Button></Tooltip>);
    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Copy the command');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveAccessibleDescription('Copy the command');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe.each(themes)('accessibility in %s', theme => {
  it('badge and separator pass axe', async () => {
    const { container } = renderIn(
      theme,
      <div>
        <p><Badge tone="success">ok</Badge> <Badge separator="dot">v0.4</Badge></p>
        <Separator />
      </div>,
    );
    await expectAccessible(container);
  });
});
