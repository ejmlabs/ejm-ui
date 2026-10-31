/// <reference path="./cm-chessboard.d.ts" />
/// <reference path="../../assets.d.ts" />
import { useEffect, useRef } from 'react';
import { Chessboard as CmChessboard, INPUT_EVENT_TYPE } from 'cm-chessboard/src/Chessboard.js';
import { PromotionDialog } from 'cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js';
import { Accessibility } from 'cm-chessboard/src/extensions/accessibility/Accessibility.js';
import { Markers, MARKER_TYPE } from 'cm-chessboard/src/extensions/markers/Markers.js';
import pieces from 'cm-chessboard/assets/pieces/standard.svg?url';
import markers from 'cm-chessboard/assets/extensions/markers/markers.svg?url&no-inline';
import 'cm-chessboard/assets/chessboard.css';
import 'cm-chessboard/assets/extensions/promotion-dialog/promotion-dialog.css';
import 'cm-chessboard/assets/extensions/markers/markers.css';
import type { ChessboardProps } from '../Chessboard';
import { cn } from '../../lib/utils';
import './chessboard.css';
import { createOrientationUpdater } from './orientation';
import { createBoardHints } from './hints';

/** cm-chessboard owns input, SVG, keyboard navigation and promotion focus. */
export default function ChessboardSurface(props: ChessboardProps) {
  const element = useRef<HTMLDivElement>(null);
  const board = useRef<CmChessboard | null>(null);
  const orient = useRef<ReturnType<typeof createOrientationUpdater> | null>(null);
  const hints = useRef<ReturnType<typeof createBoardHints> | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instance = new CmChessboard(element.current!, {
      position: latest.current.fen,
      orientation: latest.current.color,
      style: { cssClass: 'ejm-board', animationDuration: reduced ? 0 : 120, pieces: { file: pieces } },
      extensions: [
        { class: PromotionDialog, props: { language: 'en' } },
        { class: Accessibility, props: { language: 'en', keyboardMoveInput: !latest.current.readOnly, movePieceForm: false, piecesAsList: false } },
        { class: Markers, props: { sprite: markers } },
      ],
    });
    board.current = instance;
    orient.current = createOrientationUpdater(instance, () => board.current === instance);
    const hintController = createBoardHints(instance, { dot: MARKER_TYPE.dot, capture: MARKER_TYPE.circle }, () => latest.current);
    hints.current = hintController;
    const cancelPointerMove = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing
        || board.current !== instance || latest.current.readOnly || !latest.current.enabled) return;
      // Pointer selection may leave focus outside the board. Bubble after the
      // package handles promotion and keyboard Escape, without moving focus.
      hintController.clear();
      instance.cancelMoveInput();
    };
    document.addEventListener('keydown', cancelPointerMove);
    return () => {
      document.removeEventListener('keydown', cancelPointerMove);
      hintController.clear();
      board.current = null;
      orient.current = null;
      hints.current = null;
      instance.destroy();
    };
  }, [props.readOnly]);

  useEffect(() => {
    const instance = board.current;
    if (!instance) return;
    if (instance.getPosition() !== props.fen.split(' ')[0]) {
      void instance.setPosition(props.fen, !props.readOnly && !matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, [props.fen, props.readOnly]);

  useEffect(() => {
    const instance = board.current;
    if (!instance || !orient.current) return;
    void orient.current(props.color).catch(() => {
      if (board.current === instance) console.error('The chessboard could not turn.');
    });
  }, [props.color, props.readOnly]);

  useEffect(() => {
    const instance = board.current;
    if (!instance) return;
    instance.removeMarkers(MARKER_TYPE.square);
    instance.removeMarkers(MARKER_TYPE.circlePrimary);
    if (props.lastMove) {
      instance.addMarker(MARKER_TYPE.square, props.lastMove.from);
      instance.addMarker(MARKER_TYPE.square, props.lastMove.to);
    }
    if (props.premove) {
      instance.addMarker(MARKER_TYPE.circlePrimary, props.premove.from);
      instance.addMarker(MARKER_TYPE.circlePrimary, props.premove.to);
    }
  }, [props.lastMove, props.premove, props.readOnly]);

  useEffect(() => {
    const instance = board.current;
    if (!instance) return;
    const hintController = hints.current;
    hintController?.clear();
    instance.cancelMoveInput();
    if (props.readOnly || !props.enabled) { instance.disableMoveInput(); return; }
    instance.enableMoveInput(event => {
      if (event.type === INPUT_EVENT_TYPE.moveInputCanceled || event.type === INPUT_EVENT_TYPE.moveInputFinished) {
        hintController?.clear();
        return false;
      }
      if (board.current !== instance || latest.current.readOnly || !latest.current.enabled || !event.squareFrom) return false;
      if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        const ownPiece = instance.getPiece(event.squareFrom)?.[0] === latest.current.color;
        if (ownPiece) hintController?.select(event.squareFrom);
        return ownPiece;
      }
      if (event.type !== INPUT_EVENT_TYPE.validateMoveInput || !event.squareTo) return false;
      hintController?.clear();
      // Reselect friendly pieces without a server command on our turn.
      // Keep friendly-target recapture premoves available on their turn.
      if (instance.getPiece(event.squareTo)?.[0] === latest.current.color
        && latest.current.fen.split(' ')[1] === latest.current.color) return false;
      const move = { from: event.squareFrom, to: event.squareTo };
      if (instance.getPiece(move.from)?.[1] === 'p' && /^[a-h][18]$/.test(move.to)) {
        instance.showPromotionDialog(move.to, latest.current.color, result => {
          if (result.type === 'pieceSelected' && result.piece) latest.current.onMove({ ...move, promotion: result.piece[1] as 'q' | 'r' | 'b' | 'n' });
        });
      } else latest.current.onMove(move);
      // Only an accepted server snapshot changes the visible position.
      return false;
    }, props.color);
    return () => {
      if (board.current !== instance) return;
      hintController?.clear();
      instance.cancelMoveInput();
      instance.disableMoveInput();
    };
    // getLegalMoves is read through `latest`, so a host need not memoize it; a new identity must not cancel a move.
  }, [props.enabled, props.color, props.readOnly, props.fen, props.showLegalMoves]);

  return <div ref={element} className={cn('w-full aspect-square touch-manipulation', props.className)}
    onKeyDownCapture={event => {
      // Keyboard deselection emits no cancel event. Clear before the package
      // handles the key; a new selection redraws through moveInputStarted.
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') hints.current?.clear();
      if (event.key === 'Escape') board.current?.cancelMoveInput();
    }}
    onBlur={() => hints.current?.clear()}
    aria-label={props['aria-label'] ?? (props.readOnly
    ? `Read-only chessboard. ${props.color === 'w' ? 'White' : 'Black'} is at the bottom. Use the replay controls to change position.`
    : `Chessboard. You play ${props.color === 'w' ? 'White' : 'Black'}. Use arrow keys and Enter to move.`)} />;
}
