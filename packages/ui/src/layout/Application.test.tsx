import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { Chessboard } from '../components/Chessboard';
import { AppActions, AppField, AppFieldset, AppForm, AppHeading, AppSection, BoardPlaceholder, GameWorkspace, MoveHistory, MovePairs } from './Application';

afterEach(cleanup);

it('keeps form submission, labels, fieldset state and programmatic heading focus', () => {
  const submit = vi.fn(event => event.preventDefault());
  const heading = createRef<HTMLHeadingElement>();
  render(<AppSection aria-labelledby="account-title">
    <AppHeading id="account-title" ref={heading} tabIndex={-1}>Account</AppHeading>
    <AppForm aria-label="Account details" onSubmit={submit}>
      <AppFieldset disabled><legend>Player details</legend>
        <AppField><label htmlFor="player">Player name</label><input id="player" name="player" /></AppField>
      </AppFieldset>
      <button type="submit">Save</button>
    </AppForm>
    <AppActions as="nav" aria-label="Account links"><a href="/play/">Play</a></AppActions>
  </AppSection>);
  expect(screen.getByRole('region', { name: 'Account' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Player details' })).toBeDisabled();
  expect(screen.getByLabelText('Player name')).toBeDisabled();
  fireEvent.submit(screen.getByRole('form', { name: 'Account details' }));
  expect(submit).toHaveBeenCalledOnce();
  expect(screen.getByRole('navigation', { name: 'Account links' })).toContainElement(screen.getByRole('link', { name: 'Play' }));
  heading.current?.focus();
  expect(heading.current).toHaveFocus();
});

it('follows the latest move inside the move list until the reader scrolls up', () => {
  const { rerender } = render(<MovePairs moves={[{ number: 1, white: 'e4' }]} />);
  const list = screen.getByRole('list', { name: 'Moves' });
  Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 480 });
  Object.defineProperty(list, 'clientHeight', { configurable: true, value: 100 });
  rerender(<MovePairs moves={[{ number: 1, white: 'e4', black: 'e5' }]} />);
  expect(list.scrollTop).toBe(480);
  list.scrollTop = 100;
  fireEvent.scroll(list);
  rerender(<MovePairs moves={[{ number: 1, white: 'e4', black: 'e5' }, { number: 2, white: 'Nf3' }]} />);
  expect(list.scrollTop).toBe(100);
  list.scrollTop = 380;
  fireEvent.scroll(list);
  rerender(<MovePairs moves={[{ number: 1, white: 'e4', black: 'e5' }, { number: 2, white: 'Nf3', black: 'Nc6' }]} />);
  expect(list.scrollTop).toBe(480);
});

it('fills the board placeholder with the Chessboard loading fill, so the swap does not flash', () => {
  const { container } = render(<BoardPlaceholder>Opening the chessboard.</BoardPlaceholder>);
  const loading = renderToString(<Chessboard fen="8/8/8/8/8/8/8/8 w - - 0 1" color="w" enabled={false} onMove={() => {}} />);
  expect(container.firstElementChild).toHaveClass('bg-tone');
  expect(loading).toContain('bg-tone');
});

it('retains game keyboard handling, named details and content after the board', () => {
  const key = vi.fn();
  render(<GameWorkspace label="Recorded game" detailsLabel="Players and moves" tabIndex={0} onKeyDown={key} board={<p>Board</p>} after={<p>Game record</p>}>
    <MovePairs moves={[{ number: 1, white: 'e4', black: 'e5' }]} />
  </GameWorkspace>);
  const game = screen.getByRole('region', { name: 'Recorded game' });
  game.focus();
  fireEvent.keyDown(game, { key: 'ArrowRight' });
  expect(key).toHaveBeenCalledOnce();
  expect(game).toContainElement(screen.getByText('Board'));
  expect(game).toContainElement(screen.getByText('Game record'));
  expect(screen.getByRole('complementary', { name: 'Players and moves' })).toContainElement(screen.getByRole('list', { name: 'Moves' }));
});

it('exposes replay selection and keeps its scroll inside the move list', () => {
  const choose = vi.fn();
  const items = [{ id: 1, number: 1, color: 'w' as const, san: 'e4' }, { id: 2, number: 1, color: 'b' as const, san: 'e5' }];
  const { rerender } = render(<MoveHistory items={items} selectedId={1} onSelect={choose} />);
  const list = screen.getByRole('list', { name: 'Moves' });
  const second = screen.getByRole('button', { name: '1… e5' });
  Object.defineProperty(list, 'clientHeight', { configurable: true, value: 100 });
  Object.defineProperty(second.closest('li'), 'offsetTop', { configurable: true, value: 120 });
  Object.defineProperty(second.closest('li'), 'offsetHeight', { configurable: true, value: 40 });
  fireEvent.click(second);
  expect(choose).toHaveBeenCalledWith(2);
  rerender(<MoveHistory items={items} selectedId={2} onSelect={choose} />);
  expect(second).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', { name: '1. e4' })).not.toHaveAttribute('aria-current');
  expect(list.scrollTop).toBe(60);
  rerender(<MoveHistory items={items} selectedId={0} onSelect={choose} />);
  expect(list.scrollTop).toBe(0);
});
