import { contract } from '@ejm/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Prompt, type PromptProps } from './Prompt';
import { expectAccessible, renderIn, themes } from './test-setup';

function Controlled(props: Partial<PromptProps>) {
  const [v, setV] = useState('');
  return <Prompt value={v} onValueChange={setV} {...props} />;
}

describe('Prompt', () => {
  it('idle takes typing and submits the value on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Controlled onSubmit={onSubmit} placeholder="Type a command" />);
    await user.type(screen.getByRole('textbox', { name: 'Command' }), 'ejm init{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('ejm init');
  });

  it('busy says "working", ignores input and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();
    render(<Prompt value="ejm init" state="busy" onSubmit={onSubmit} onValueChange={onValueChange} />);
    expect(screen.getByRole('status')).toHaveTextContent(contract.text.prompt.busy);
    await user.type(screen.getByRole('textbox'), 'x{Enter}');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('error shows its message under the line and ties it to the input', () => {
    render(<Prompt value="ejm nope" state="error" message="Unknown command: nope." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unknown command: nope.');
    expect(screen.getByRole('textbox')).toBeInvalid();
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Unknown command: nope.');
  });

  it.each(themes)('passes the accessibility check in %s', async theme => {
    const { container } = renderIn(theme, <><Prompt value="" /><Prompt value="x" state="busy" /><Prompt value="y" state="error" message="Failed." /></>);
    await expectAccessible(container);
  });
});
