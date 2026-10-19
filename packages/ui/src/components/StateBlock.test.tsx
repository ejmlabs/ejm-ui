import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StateBlock } from './StateBlock';
import { expectAccessible, renderIn, themes } from './test-setup';

describe('StateBlock', () => {
  it('names each state in a word and says one sentence', () => {
    for (const [kind, word] of [['empty', 'Empty'], ['loading', 'Loading'], ['error', 'Error']] as const) {
      const { unmount } = render(<StateBlock kind={kind} message="One plain sentence." />);
      expect(screen.getByText(word)).toBeInTheDocument();
      expect(screen.getByText('One plain sentence.')).toBeInTheDocument();
      unmount();
    }
  });

  it('error is an alert, loading is a polite status, empty is neither', () => {
    const { rerender } = render(<StateBlock kind="error" message="Failed." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<StateBlock kind="loading" message="Working." />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    rerender(<StateBlock kind="empty" message="Nothing here." />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('runs its one action on click and on its shortcut key, but not while typing in a field', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<><input aria-label="field" /><StateBlock kind="error" message="Failed." action={{ key: 'r', label: 'Retry' }} onAction={onAction} /></>);
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onAction).toHaveBeenCalledTimes(1);
    await user.keyboard('r');
    expect(onAction).toHaveBeenCalledTimes(2);
    await user.click(screen.getByLabelText('field'));
    await user.keyboard('r');
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const { container } = renderIn(theme, <><StateBlock kind="empty" message="No projects yet." /><StateBlock kind="loading" message="Loading projects." /><StateBlock kind="error" message="Could not load projects." action={{ label: 'Try again' }} /></>);
    await expectAccessible(container);
  });
});
