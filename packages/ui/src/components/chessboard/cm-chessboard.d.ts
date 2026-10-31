declare module 'cm-chessboard/src/Chessboard.js' {
  export interface InputEvent { type: string; squareFrom?: string; squareTo?: string }
  export interface MarkerType { class: string; slice: string; position?: string }
  export class Chessboard {
    constructor(element: HTMLElement, props?: {
      position?: string; orientation?: 'w' | 'b'; assetsUrl?: string;
      style?: { cssClass?: string; animationDuration?: number; pieces?: { file: string } };
      extensions?: { class: new (board: Chessboard, props?: Record<string, unknown>) => unknown; props?: Record<string, unknown> }[];
    });
    destroy(): void;
    setPosition(fen: string, animated?: boolean): Promise<void>;
    setOrientation(color: 'w' | 'b', animated?: boolean): Promise<void>;
    getOrientation(): 'w' | 'b';
    getPosition(): string;
    getPiece(square: string): string | undefined;
    enableMoveInput(callback: (event: InputEvent) => boolean, color?: 'w' | 'b'): void;
    disableMoveInput(): void;
    cancelMoveInput(): void;
    showPromotionDialog(square: string, color: 'w' | 'b', callback: (result: { type: string; piece?: string }) => void): void;
    addMarker(type: MarkerType, square: string): void;
    removeMarkers(type?: MarkerType): void;
  }
  export const INPUT_EVENT_TYPE: Record<'moveInputStarted' | 'validateMoveInput' | 'moveInputCanceled' | 'moveInputFinished', string>;
}
declare module 'cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js' {
  import { Chessboard } from 'cm-chessboard/src/Chessboard.js';
  export class PromotionDialog { constructor(board: Chessboard, props?: Record<string, unknown>) }
}
declare module 'cm-chessboard/src/extensions/accessibility/Accessibility.js' {
  import { Chessboard } from 'cm-chessboard/src/Chessboard.js';
  export class Accessibility { constructor(board: Chessboard, props?: Record<string, unknown>) }
}
declare module 'cm-chessboard/src/extensions/markers/Markers.js' {
  import { Chessboard, type MarkerType } from 'cm-chessboard/src/Chessboard.js';
  export class Markers { constructor(board: Chessboard, props?: Record<string, unknown>) }
  export const MARKER_TYPE: Record<'frame' | 'square' | 'circlePrimary' | 'dot' | 'circle', MarkerType>;
}
