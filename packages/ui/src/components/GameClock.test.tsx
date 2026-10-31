import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GameClock } from './GameClock';
import { expectAccessible, renderIn, themes } from './test-setup';

afterEach(() => vi.useRealTimers());

it('shows only host-supplied time and label without a ticking live region', () => {
  vi.useFakeTimers();
  const { rerender } = render(<GameClock value="5:03" label="White has 5 minutes and 3 seconds" running />);
  act(() => { vi.advanceTimersByTime(10_000); });
  expect(screen.getByRole('timer', { name: 'White has 5 minutes and 3 seconds' })).toHaveTextContent('5:03');
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByText('5:03')).not.toHaveAttribute('aria-live');
  rerender(<GameClock value="0:19" label="White has 19 seconds. Low time." low />);
  expect(screen.getByRole('timer', { name: 'White has 19 seconds. Low time.' })).toHaveTextContent('0:19');
});

it('marks low time with a glyph beside the time, not by fill color alone, and lets a host replace the role', () => {
  const { rerender } = render(<GameClock value="0:19" label="White has 19 seconds. Low time." low />);
  const clock = screen.getByRole('timer');
  expect(clock).toHaveTextContent('!0:19');
  expect(clock.querySelector('[aria-hidden="true"]')).toHaveTextContent('!');
  rerender(<GameClock value="0:19" label="White has 19 seconds." />);
  expect(screen.getByRole('timer')).toHaveTextContent(/^0:19$/);
  rerender(<GameClock value="0:19" label="Clock" role="status" />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});

it.each(themes)('keeps clock displays accessible in %s', async theme => {
  const { container } = renderIn(theme, <>
    <GameClock value="5:03" label="White has 5 minutes and 3 seconds" />
    <GameClock value="4:18" label="Black has 4 minutes and 18 seconds" running />
    <GameClock value="0:19" label="White has 19 seconds. Low time." running low />
  </>);
  await expectAccessible(container);
});
