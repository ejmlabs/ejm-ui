import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import HarnessDemo from './harness';
import { expectAccessible, renderIn, setup, themes } from '../test-helpers';

const journal = () => screen.getByRole('log', { name: 'Journal' });

describe('HarnessDemo', () => {
  it('says it is simulated and that every value is a sample', () => {
    renderIn('light', <HarnessDemo {...setup(false).options} />);
    expect(screen.getByText('Simulated')).toBeVisible();
    expect(screen.getByText('sample values')).toBeVisible();
  });

  it('records a committed slider change in the journal, and the keyboard changes it by one', async () => {
    const { options } = setup(false);
    renderIn('light', <HarnessDemo {...options} />);
    const slider = screen.getByRole('slider', { name: 'Max concurrent' });
    expect(slider).toHaveValue('3');
    // jsdom does not move a range input on an arrow key, so the change a keyboard makes is sent directly.
    fireEvent.change(slider, { target: { value: '4' } });
    fireEvent.keyUp(slider);
    expect(slider).toHaveValue('4');
    expect(within(journal()).getByText('governor.limit')).toBeInTheDocument();
  });

  it('only as many sessions run as the limit allows', async () => {
    const { options, clock } = setup(false);
    renderIn('light', <HarnessDemo {...options} />);
    await act(async () => clock.advance(300));
    const sessions = within(screen.getByRole('list', { name: 'Sessions' }));
    expect(sessions.getAllByText('running')).toHaveLength(3);
    expect(sessions.getAllByText('queued')).toHaveLength(1);
  });

  it('crash worker is off until a session runs, then journals the crash and replays instead of rerunning', async () => {
    const { options, clock } = setup(false);
    const user = userEvent.setup();
    renderIn('light', <HarnessDemo {...options} />);
    const crash = screen.getByRole('button', { name: 'Crash worker' });
    expect(crash).toBeDisabled();
    await act(async () => clock.advance(3000));
    expect(crash).toBeEnabled();
    await user.click(crash);
    const j = within(journal());
    expect(j.getByText('worker.crashed')).toBeInTheDocument();
    expect(j.getByText('recovery.start')).toBeInTheDocument();
    await act(async () => clock.advance(3000));
    expect(j.getAllByText('session.resumed').length).toBeGreaterThan(0);
  });

  it('switches the code sample with the arrow keys', async () => {
    const { options } = setup(false);
    const user = userEvent.setup();
    renderIn('light', <HarnessDemo {...options} />);
    screen.getByRole('tab', { name: 'Rust' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'TypeScript', selected: true })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Harness.create');
  });

  it.each(themes)('has no accessibility violations in the %s theme', async (theme) => {
    const { options, clock } = setup(false);
    const { container } = renderIn(theme, <HarnessDemo {...options} />);
    await act(async () => clock.advance(3000));
    await expectAccessible(container);
  });
});
