import type { ChessboardColor as Color } from '../Chessboard';

interface OrientationBoard {
  getOrientation(): Color;
  setOrientation(color: Color, animated?: boolean): Promise<void>;
}

/** The package accepts one turn at a time. Keep the latest requested color. */
export function createOrientationUpdater(board: OrientationBoard, isCurrent: () => boolean) {
  let desired = board.getOrientation();
  let turning = false;
  return async (color: Color) => {
    desired = color;
    if (turning) return;
    turning = true;
    try {
      while (isCurrent() && board.getOrientation() !== desired) await board.setOrientation(desired, false);
    } finally { turning = false; }
  };
}
