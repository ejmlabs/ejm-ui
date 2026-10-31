import type { ChessboardProps } from '../Chessboard';

interface MarkerBoard<Marker> {
  addMarker(type: Marker, square: string): void;
  removeMarkers(type: Marker): void;
}

type HintState = Pick<ChessboardProps, 'enabled' | 'readOnly' | 'showLegalMoves' | 'getLegalMoves'>;

/** Own only destination decorations. Last-move and premove markers have separate lifetimes. */
export function createBoardHints<Marker>(board: MarkerBoard<Marker>, markers: { dot: Marker; capture: Marker }, state: () => HintState) {
  let visible = false;
  function clear() {
    if (!visible) return;
    board.removeMarkers(markers.dot);
    board.removeMarkers(markers.capture);
    visible = false;
  }
  return {
    clear,
    select(square: string) {
      clear();
      const current = state();
      if (!current.showLegalMoves || !current.enabled || current.readOnly || !/^[a-h][1-8]$/.test(square)) return;
      for (const destination of current.getLegalMoves?.(square) ?? []) {
        if (!/^[a-h][1-8]$/.test(destination.square)) continue;
        board.addMarker(destination.capture ? markers.capture : markers.dot, destination.square);
        visible = true;
      }
    },
  };
}
