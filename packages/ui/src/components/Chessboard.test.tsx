import { fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Chessboard, type ChessboardProps } from './Chessboard';
import Surface from './chessboard/ChessboardSurface';
import './test-setup';

type Input = { type: string; squareFrom?: string; squareTo?: string };
type Promotion = { type: string; piece?: string };
interface BoardMock {
  position: string;
  color: 'w' | 'b';
  input?: (event: Input) => boolean;
  promotion?: (result: Promotion) => void;
  getPosition: ReturnType<typeof vi.fn>;
  getOrientation: ReturnType<typeof vi.fn>;
  getPiece: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  setOrientation: ReturnType<typeof vi.fn>;
  enableMoveInput: ReturnType<typeof vi.fn>;
  disableMoveInput: ReturnType<typeof vi.fn>;
  cancelMoveInput: ReturnType<typeof vi.fn>;
  addMarker: ReturnType<typeof vi.fn>;
  removeMarkers: ReturnType<typeof vi.fn>;
  showPromotionDialog: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}
const adapter = vi.hoisted(() => ({ instances: [] as BoardMock[] }));

vi.mock('cm-chessboard/src/Chessboard.js', () => ({
  INPUT_EVENT_TYPE: { moveInputStarted: 'started', validateMoveInput: 'validate', moveInputCanceled: 'canceled', moveInputFinished: 'finished' },
  Chessboard: vi.fn(function (_element: HTMLElement, props: { position: string; orientation: 'w' | 'b' }) {
    const board: BoardMock = {
      position: props.position.split(' ')[0]!, color: props.orientation,
      getPosition: vi.fn(() => board.position), getOrientation: vi.fn(() => board.color),
      getPiece: vi.fn((square: string) => ({ e2: 'wp', a7: 'wp', e1: 'wk', e7: 'bp' } as Record<string, string>)[square]),
      setPosition: vi.fn(async (fen: string) => { board.position = fen.split(' ')[0]!; }),
      setOrientation: vi.fn(async (color: 'w' | 'b') => { board.color = color; }),
      enableMoveInput: vi.fn((callback: (event: Input) => boolean) => { board.input = callback; }),
      disableMoveInput: vi.fn(),
      cancelMoveInput: vi.fn(() => { board.input?.({ type: 'canceled' }); }),
      addMarker: vi.fn(), removeMarkers: vi.fn(), destroy: vi.fn(),
      showPromotionDialog: vi.fn((_square: string, _color: string, callback: (result: Promotion) => void) => { board.promotion = callback; }),
    };
    adapter.instances.push(board);
    return board;
  }),
}));
vi.mock('cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js', () => ({ PromotionDialog: class {} }));
vi.mock('cm-chessboard/src/extensions/accessibility/Accessibility.js', () => ({ Accessibility: class {} }));
vi.mock('cm-chessboard/src/extensions/markers/Markers.js', () => ({
  Markers: class {}, MARKER_TYPE: { square: 'last', circlePrimary: 'premove', dot: 'dot', circle: 'capture' },
}));

const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const props = (extra: Partial<ChessboardProps> = {}): ChessboardProps => ({ fen, color: 'w', enabled: true, onMove: vi.fn(), ...extra });
const current = () => adapter.instances.at(-1)!;

beforeEach(() => {
  adapter.instances.length = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
});
afterEach(() => vi.unstubAllGlobals());

it('renders on the server without constructing a board surface', () => {
  expect(renderToString(<Chessboard {...props()} />)).toContain('Loading chessboard');
  expect(adapter.instances).toHaveLength(0);
});

it('emits moves without changing the accepted position and bridges promotion choices', () => {
  const onMove = vi.fn();
  const { rerender } = render(<Surface {...props({ onMove })} />);
  const board = current();
  expect(board.input?.({ type: 'started', squareFrom: 'e7' })).toBe(false);
  expect(board.input?.({ type: 'validate', squareFrom: 'e2', squareTo: 'e4' })).toBe(false);
  expect(onMove).toHaveBeenLastCalledWith({ from: 'e2', to: 'e4' });
  expect(board.setPosition).not.toHaveBeenCalled();
  onMove.mockClear();
  board.input?.({ type: 'validate', squareFrom: 'a7', squareTo: 'a8' });
  expect(onMove).not.toHaveBeenCalled();
  board.promotion?.({ type: 'canceled' });
  expect(onMove).not.toHaveBeenCalled();
  board.promotion?.({ type: 'pieceSelected', piece: 'wn' });
  expect(onMove).toHaveBeenCalledWith({ from: 'a7', to: 'a8', promotion: 'n' });
  const accepted = fen.replace('8/8/PPPPPPPP', '4P3/8/PPPP1PPP');
  rerender(<Surface {...props({ fen: accepted, onMove })} />);
  expect(board.setPosition).toHaveBeenCalledWith(accepted, true);
});

it('clears pointer hints on unconsumed Escape, preserves consumed Escape and disposes its listener', () => {
  const getLegalMoves = vi.fn(() => [{ square: 'e3' }, { square: 'd3', capture: true }]);
  const { rerender, unmount } = render(<Surface {...props({ showLegalMoves: true, getLegalMoves })} />);
  const board = current();
  board.input?.({ type: 'started', squareFrom: 'e2' });
  expect(getLegalMoves).toHaveBeenCalledWith('e2');
  expect(board.addMarker).toHaveBeenCalledWith('dot', 'e3');
  expect(board.addMarker).toHaveBeenCalledWith('capture', 'd3');
  const before = board.cancelMoveInput.mock.calls.length;
  const consumed = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  consumed.preventDefault();
  document.dispatchEvent(consumed);
  fireEvent.keyDown(document, { key: 'Escape', isComposing: true });
  fireEvent.keyDown(document, { key: 'Enter' });
  expect(board.cancelMoveInput).toHaveBeenCalledTimes(before);
  const target = document.createElement('button');
  document.body.append(target);
  target.focus();
  const promotionEscape = (event: KeyboardEvent) => { event.preventDefault(); event.stopPropagation(); };
  document.addEventListener('keydown', promotionEscape, true);
  fireEvent.keyDown(target, { key: 'Escape' });
  document.removeEventListener('keydown', promotionEscape, true);
  expect(board.cancelMoveInput).toHaveBeenCalledTimes(before);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(board.cancelMoveInput).toHaveBeenCalledTimes(before + 1);
  expect(document.activeElement).toBe(target);
  target.remove();
  expect(board.removeMarkers).toHaveBeenCalledWith('dot');
  expect(board.removeMarkers).toHaveBeenCalledWith('capture');
  rerender(<Surface {...props({ readOnly: true, enabled: false })} />);
  expect(board.destroy).toHaveBeenCalledOnce();
  const readOnly = current();
  expect(readOnly.enableMoveInput).not.toHaveBeenCalled();
  unmount();
  const calls = readOnly.cancelMoveInput.mock.calls.length;
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(readOnly.cancelMoveInput).toHaveBeenCalledTimes(calls);
  expect(readOnly.destroy).toHaveBeenCalledOnce();
});
