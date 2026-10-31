import { lazy, Suspense, useEffect, useState } from 'react';

export type ChessboardColor = 'w' | 'b';
export interface ChessboardMove { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }
export interface ChessboardDestination { square: string; capture?: boolean }

export interface ChessboardProps {
  fen: string;
  color: ChessboardColor;
  enabled: boolean;
  readOnly?: boolean;
  /** Off by default. The host supplies legal destinations without loading rules into the kit. */
  showLegalMoves?: boolean;
  getLegalMoves?(square: string): readonly ChessboardDestination[];
  lastMove?: { from: string; to: string };
  premove?: ChessboardMove | null;
  onMove(move: ChessboardMove): void;
  'aria-label'?: string;
}

const Surface = lazy(() => import('./chessboard/ChessboardSurface'));

/** Maintained board input and visuals. The host owns legality and accepted positions. */
export function Chessboard(props: ChessboardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const loading = <div role="status" aria-label="Loading chessboard" className="w-full aspect-square bg-tone" />;
  return <Suspense fallback={loading}>
    {mounted ? <Surface {...props} /> : loading}
  </Suspense>;
}
