import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { expectAccessible, renderIn, themes } from '../test-setup';
import { Button } from './button';
import { Dialog } from './dialog';

// jsdom has no showModal or close. This stands in for the browser: open sets the attribute and focuses the first button, close removes it and fires "close".
// Focus trapping and the inert page are the browser's own work on a native dialog and are checked in a real browser (the gallery).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); this.querySelector<HTMLElement>('button')?.focus(); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});

function Demo({ initial = false }: { initial?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open settings</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Settings" description="Change how the app behaves.">
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Dialog>
      <p>{open ? 'state open' : 'state closed'}</p>
    </>
  );
}

describe('Dialog', () => {
  it('opens as a modal named by its title and described by its description', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Settings');
    expect(dialog).toHaveAccessibleDescription('Change how the app behaves.');
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const opener = screen.getByRole('button', { name: 'Open settings' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(opener).not.toHaveFocus();
    // The browser turns Escape into a cancelable "cancel" event on the dialog.
    screen.getByRole('dialog', { hidden: true }).dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(await screen.findByText('state closed')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('closes from its own buttons and from a click on the backdrop', async () => {
    const user = userEvent.setup();
    render(<Demo initial />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByText('state closed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    await user.click(screen.getByRole('dialog'));
    expect(screen.getByText('state closed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('state closed')).toBeInTheDocument();
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const { container } = renderIn(theme, <Demo initial />);
    await expectAccessible(container);
  });
});
