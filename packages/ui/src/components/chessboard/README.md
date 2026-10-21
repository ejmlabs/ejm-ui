# Chessboard and GameClock

Import `Chessboard` from the public leaf `@ejm/ui/components/Chessboard`.
Its maintained board runtime, CSS and SVG assets load after the client mounts.
Server rendering produces a square loading surface without starting the board.
The main `@ejm/ui` barrel does not export Chessboard.

```tsx
import { Chessboard } from '@ejm/ui/components/Chessboard';

<Chessboard
  fen={acceptedFen}
  color="w"
  enabled={canSubmit}
  showLegalMoves={showHints}
  getLegalMoves={legalDestinations}
  lastMove={lastAcceptedMove}
  premove={premove}
  onMove={submitMove}
/>
```

The host supplies full FEN, accepted positions, legal destinations and move
submission. A destination is `{ square: 'e4', capture: false }`; callers should
deduplicate destinations when several promotion choices reach the same square.
Hints default to off. The kit imports no chess rules, engine, game DTO or server
module. Returning a move does not update the board: the host must supply its
accepted position. Set `readOnly` and `enabled={false}` for recorded games.

The shared surface owns pointer and keyboard input, promotion and focus, marker
lifetimes, serialized orientation changes, reduced-motion behavior and disposal.
Unconsumed document Escape cancels pointer selection without moving focus.
Promotion keeps the maintained package's capture-phase Escape handler.
Position, orientation, input state and hint preference changes clear selection.
The marker SVG uses Vite's `?url&no-inline` public asset query because the board
package does not recognize a data URI as an absolute sprite URL.

Import `GameClock` from `@ejm/ui/components/GameClock` or `@ejm/ui`. It accepts
`value`, `label`, `running` and `low` plus native span attributes. It only renders
the display. The host owns clock estimation, ticking and adjudication. No live
region is added, so a ticking clock does not announce every update. Low time
uses the paired danger and on-danger tokens in both themes.

## Maintained dependency and artwork

This adapter uses `cm-chessboard@8.15.4`, MIT, by Stefan Haack. The small ambient
declarations describe the public methods used here because this version ships
without TypeScript declarations. Check these contracts and the board lifecycle
tests when upgrading; replace them with upstream types when available.

The unchanged `assets/pieces/standard.svg` is by Cburnett and Rfc1394, modified by
shaack for cm-chessboard. It uses CC BY-SA 3.0, separately from the code's MIT
license. The distributed SVG retains its embedded attribution. Keep the notice
and source links in consumer credits and retain the share-alike terms for any
artwork adaptation. The noncommercial Staunty sprite is not imported.

- [Maintained source and MIT license](https://github.com/shaack/cm-chessboard)
- [Original piece sprite and notice](https://github.com/shaack/cm-chessboard/blob/master/assets/pieces/standard.svg)
- [Cburnett](https://en.wikipedia.org/wiki/User:Cburnett)
- [Rfc1394](https://en.wikipedia.org/wiki/User:Rfc1394)
- [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)

Adapter tests cover marker ownership, cancellation, promotion callback bridging,
position authority, orientation serialization, disposal and server rendering.
Real pointer, keyboard, promotion, theme and phone checks still require a built
browser surface. The package tests do not prove those browser integrations.
