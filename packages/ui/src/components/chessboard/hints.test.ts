import { expect, it, vi } from 'vitest';
import { createBoardHints } from './hints';
import type { ChessboardDestination, ChessboardProps } from '../Chessboard';

it('replaces destination markers without removing last-move or premove markers', () => {
  const dot = Symbol('dot'), capture = Symbol('capture'), last = Symbol('last'), premove = Symbol('premove');
  let markers = [{ type: last, square: 'a1' }, { type: premove, square: 'a2' }];
  const getLegalMoves = vi.fn<(square: string) => ChessboardDestination[]>(square => square === 'e2'
    ? [{ square: 'e3' }, { square: 'd3', capture: true }] : [{ square: 'f3' }]);
  const state: Pick<ChessboardProps, 'enabled' | 'readOnly' | 'showLegalMoves' | 'getLegalMoves'> = { enabled: true, showLegalMoves: true, getLegalMoves };
  const hints = createBoardHints({
    addMarker(type: symbol, square: string) { markers.push({ type, square }); },
    removeMarkers(type: symbol) { markers = markers.filter(marker => marker.type !== type); },
  }, { dot, capture }, () => state);
  hints.select('e2');
  expect(markers.slice(2)).toEqual([{ type: dot, square: 'e3' }, { type: capture, square: 'd3' }]);
  hints.select('g1');
  expect(markers.slice(2)).toEqual([{ type: dot, square: 'f3' }]);
  hints.clear();
  hints.clear();
  expect(markers).toEqual([{ type: last, square: 'a1' }, { type: premove, square: 'a2' }]);
  for (const gate of [{ enabled: false }, { readOnly: true }, { showLegalMoves: false }, { showLegalMoves: undefined }]) {
    Object.assign(state, { enabled: true, readOnly: false, showLegalMoves: true }, gate);
    getLegalMoves.mockClear();
    hints.select('e2');
    expect(getLegalMoves).not.toHaveBeenCalled();
  }
  Object.assign(state, { enabled: true, readOnly: false, showLegalMoves: true });
  hints.select('outside');
  expect(getLegalMoves).not.toHaveBeenCalled();
});
