import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as barrel from '../index';
import { Chessboard, type ChessboardProps } from './Chessboard';
import Surface from './chessboard/ChessboardSurface';
import { expectAccessible } from './test-setup';

type Input = { type: string; squareFrom?: string; squareTo?: string };
type Promotion = { type: string; piece?: string };
interface BoardMock {
  view: { svg: SVGSVGElement };
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

type Extension = { class: new (board: BoardMock, props: Record<string, unknown>) => unknown; props: Record<string, unknown> };

vi.mock('cm-chessboard/src/Chessboard.js', () => ({
  INPUT_EVENT_TYPE: { moveInputStarted: 'started', validateMoveInput: 'validate', moveInputCanceled: 'canceled', moveInputFinished: 'finished' },
  Chessboard: vi.fn(function (element: HTMLElement, props: { position: string; orientation: 'w' | 'b'; extensions: Extension[] }) {
    // Like ChessboardView in cm-chessboard 8.15.4: the constructor appends one svg with role img, synchronously, before the extensions run.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'cm-chessboard');
    svg.setAttribute('role', 'img');
    element.append(svg);
    const board: BoardMock = {
      view: { svg },
      position: props.position.split(' ')[0]!, color: props.orientation,
      getPosition: vi.fn(() => board.position), getOrientation: vi.fn(() => board.color),
      getPiece: vi.fn((square: string) => ({ e2: 'wp', a7: 'wp', e1: 'wk', e7: 'bp' } as Record<string, string>)[square]),
      setPosition: vi.fn(async (fen: string) => { board.position = fen.split(' ')[0]!; }),
      setOrientation: vi.fn(async (color: 'w' | 'b') => { board.color = color; }),
      enableMoveInput: vi.fn((callback: (event: Input) => boolean) => { board.input = callback; }),
      disableMoveInput: vi.fn(),
      cancelMoveInput: vi.fn(() => { board.input?.({ type: 'canceled' }); }),
      addMarker: vi.fn(), removeMarkers: vi.fn(), destroy: vi.fn(() => svg.remove()),
      showPromotionDialog: vi.fn((_square: string, _color: string, callback: (result: Promotion) => void) => { board.promotion = callback; }),
    };
    for (const extension of props.extensions) new extension.class(board, extension.props);
    adapter.instances.push(board);
    return board;
  }),
}));
vi.mock('cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js', () => ({ PromotionDialog: class {} }));
vi.mock('cm-chessboard/src/extensions/accessibility/Accessibility.js', () => ({
  // Like KeyboardMoveInput in cm-chessboard 8.15.4: with keyboardMoveInput the svg becomes a focusable application named "Chessboard".
  Accessibility: class {
    constructor(board: BoardMock, props: { keyboardMoveInput: boolean }) {
      if (!props.keyboardMoveInput) return;
      board.view.svg.setAttribute('tabindex', '0');
      board.view.svg.setAttribute('role', 'application');
      board.view.svg.setAttribute('aria-label', 'Chessboard');
    }
  },
}));
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

it('stays out of the @ejm/ui barrel so the renderer and styles load only through the subpath', () => {
  expect(barrel).not.toHaveProperty('Chessboard');
  expect(Chessboard).toBeTypeOf('function');
});

it('names the board svg by mode, never its wrapper, for the player and for a recorded game', async () => {
  const { container, rerender } = render(<Surface {...props()} />);
  const wrapper = container.firstElementChild;
  const svg = container.querySelector('svg.cm-chessboard');
  // With move input the package makes the svg a focusable application; read only it stays an image.
  expect(screen.getByRole('application', { name: 'Chessboard. You play White. Use arrow keys and Enter to move.' })).toBe(svg);
  await expectAccessible(container);
  rerender(<Surface {...props({ color: 'b' })} />);
  expect(screen.getByRole('application', { name: /You play Black/ })).toBe(svg);
  rerender(<Surface {...props({ readOnly: true, enabled: false })} />);
  expect(screen.getByRole('img', { name: /^Read-only chessboard\. White is at the bottom/ })).toBe(container.querySelector('svg.cm-chessboard'));
  expect(screen.queryByRole('application')).toBeNull();
  await expectAccessible(container);
  rerender(<Surface {...props({ readOnly: true, enabled: false, 'aria-label': 'Move 12 of the game' })} />);
  expect(screen.getByRole('img', { name: 'Move 12 of the game' })).toBeInTheDocument();
  expect(wrapper).not.toHaveAttribute('aria-label');
});

it('does not offer moves in the default name while input is off', () => {
  const { rerender } = render(<Surface {...props({ enabled: false })} />);
  expect(screen.getByRole('application', { name: 'Chessboard. You play White. You cannot move right now.' })).toBeInTheDocument();
  rerender(<Surface {...props()} />);
  expect(screen.getByRole('application', { name: 'Chessboard. You play White. Use arrow keys and Enter to move.' })).toBeInTheDocument();
});

it('keeps a host name on the new svg when readOnly rebuilds the board', () => {
  const name = 'Game 7, White to move';
  const { rerender } = render(<Surface {...props({ 'aria-label': name })} />);
  expect(screen.getByRole('application', { name })).toBeInTheDocument();
  rerender(<Surface {...props({ readOnly: true, enabled: false, 'aria-label': name })} />);
  expect(adapter.instances).toHaveLength(2);
  expect(screen.getByRole('img', { name })).toBeInTheDocument();
  rerender(<Surface {...props({ 'aria-label': name })} />);
  expect(adapter.instances).toHaveLength(3);
  expect(screen.getByRole('application', { name })).toBeInTheDocument();
});

it('shows a named loading square, then the named board once the lazy surface has loaded', async () => {
  render(<Chessboard {...props()} />);
  expect(screen.getByRole('status', { name: 'Loading chessboard' })).toBeInTheDocument();
  expect(await screen.findByRole('application', { name: /^Chessboard\. You play White/ })).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
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

it('keeps a move in progress when the host re-renders with a new getLegalMoves function', () => {
  const { rerender } = render(<Surface {...props({ showLegalMoves: true, getLegalMoves: () => [{ square: 'e3' }] })} />);
  const board = current();
  board.input?.({ type: 'started', squareFrom: 'e2' });
  const cancels = board.cancelMoveInput.mock.calls.length;
  rerender(<Surface {...props({ showLegalMoves: true, getLegalMoves: () => [{ square: 'e4' }] })} />);
  expect(board.cancelMoveInput).toHaveBeenCalledTimes(cancels);
  expect(board.disableMoveInput).not.toHaveBeenCalled();
  expect(board.enableMoveInput).toHaveBeenCalledOnce();
});

it('keeps hints while focus moves inside the board and clears them when focus leaves it', () => {
  const { container } = render(<Surface {...props({ showLegalMoves: true, getLegalMoves: () => [{ square: 'e3' }] })} />);
  const board = current();
  board.input?.({ type: 'started', squareFrom: 'e2' });
  expect(board.addMarker).toHaveBeenCalledWith('dot', 'e3');
  const [square, promotion] = [document.createElement('button'), document.createElement('button')];
  container.firstElementChild!.append(square, promotion);
  fireEvent.focusOut(square, { relatedTarget: promotion });
  expect(board.removeMarkers).not.toHaveBeenCalledWith('dot');
  fireEvent.focusOut(promotion, { relatedTarget: document.body });
  expect(board.removeMarkers).toHaveBeenCalledWith('dot');
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
