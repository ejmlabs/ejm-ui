import { expect, it, vi } from 'vitest';
import { createOrientationUpdater } from './orientation';
import type { ChessboardColor as Color } from '../Chessboard';

it('keeps the final rapid flip without overlapping turns or turning a detached board', async () => {
  let color: Color = 'w';
  let finish!: () => void;
  let current = true;
  const turn = vi.fn((next: Color) => new Promise<void>(resolve => {
    finish = () => { color = next; resolve(); };
  }));
  const update = createOrientationUpdater({ getOrientation: () => color, setOrientation: turn }, () => current);
  await update('w');
  expect(turn).not.toHaveBeenCalled();
  const pending = update('b');
  await update('w');
  await update('b');
  await update('w');
  expect(turn).toHaveBeenCalledTimes(1);
  finish();
  await Promise.resolve();
  expect(turn).toHaveBeenCalledTimes(2);
  expect(turn).toHaveBeenLastCalledWith('w', false);
  finish();
  await pending;
  expect(color).toBe('w');
  const detached = update('b');
  current = false;
  await update('w');
  finish();
  await detached;
  expect(turn).toHaveBeenCalledTimes(3);
});
