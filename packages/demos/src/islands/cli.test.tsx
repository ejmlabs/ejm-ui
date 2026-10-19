import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CliDemo from './cli';
import { expectAccessible, renderIn, setup, themes } from '../test-helpers';

afterEach(() => vi.restoreAllMocks());
const transcript = () => screen.getByRole('region', { name: 'Transcript' });

describe('CliDemo', () => {
  it('says it is simulated and shows the scenario note', () => {
    renderIn('light', <CliDemo {...setup().options} />);
    expect(screen.getByRole('group', { name: /ejm-cli demo, simulated/ })).toBeInTheDocument();
    expect(screen.getByText('Simulated')).toBeVisible();
    expect(screen.getByText(/Nothing runs on your machine and nothing is sent anywhere/)).toBeVisible();
  });

  it('sends a typed prompt, streams the answer and blocks the patch while write is off', async () => {
    const { options, settle } = setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    renderIn('light', <CliDemo {...options} />);
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Fix the flaky retry test{Enter}');
    await settle();
    const t = within(transcript());
    expect(t.getByText('Fix the flaky retry test')).toBeInTheDocument();
    expect(t.getByText(/blocked: write access is not granted/)).toBeInTheDocument();
    expect(screen.getByText(/grants: read$/)).toBeInTheDocument();
    expect(screen.getByRole('log', { name: /announcements/ })).toHaveTextContent('Run finished.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('applies the blocked patch when write is granted', async () => {
    const { options, settle } = setup();
    const user = userEvent.setup();
    renderIn('light', <CliDemo {...options} />);
    await user.click(screen.getByRole('button', { name: 'Fix the flaky retry test' }));
    await settle();
    await user.click(screen.getByRole('switch', { name: /Grant write/ }));
    await settle();
    expect(screen.getByText(/grants: read \+ write/)).toBeInTheDocument();
    expect(within(transcript()).getAllByText(/replaced 1 match in src\/retry\.rs/)).toHaveLength(2);
  });

  it('opens sessions with Ctrl+S, moves with the arrow keys, and Escape closes it and returns focus to the composer', async () => {
    const { options } = setup();
    const user = userEvent.setup();
    renderIn('light', <CliDemo {...options} />);
    const input = screen.getByRole('textbox', { name: 'Message' });
    await user.click(input);
    await user.keyboard('{Control>}s{/Control}');
    const list = screen.getByRole('listbox', { name: 'Sessions' });
    expect(list).toHaveFocus();
    expect(within(list).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(within(list).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveFocus();
  });

  it('recalls history with the arrow keys and inserts a newline with Alt+Enter', async () => {
    const { options } = setup();
    const user = userEvent.setup();
    renderIn('light', <CliDemo {...options} />);
    const input = screen.getByRole('textbox', { name: 'Message' });
    await user.type(input, '/help{Enter}');
    expect(screen.getByRole('dialog', { name: 'Help' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('/help');
    await user.clear(input);
    await user.type(input, 'one{Alt>}{Enter}{/Alt}two');
    expect(input).toHaveValue('one\ntwo');
  });

  it('pause stops a run and reset starts over', async () => {
    const { options, settle } = setup();
    const user = userEvent.setup();
    renderIn('light', <CliDemo {...options} />);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Explain this repository' }));
    await settle();
    expect(within(transcript()).queryByText(/Ask me to fix it if you like/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    await settle();
    expect(within(transcript()).getByText(/Ask me to fix it if you like/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(within(transcript()).getByText('What shall we build?')).toBeInTheDocument();
  });

  it.each(themes)('has no accessibility violations in the %s theme', async (theme) => {
    const { container } = renderIn(theme, <CliDemo {...setup().options} />);
    await expectAccessible(container);
  });
});
