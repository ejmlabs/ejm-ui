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
The squares follow the page theme through `ui-board-light` and `ui-board-dark`,
the coordinates through `ui-board-on-light` and `ui-board-on-dark`, and the
markers and the keyboard focus frame through `ui-board-mark` (see THEME.md).
Each coordinate color is gated at 4.5:1 against the square it sits on.
The accessible name sits on the package's `svg.cm-chessboard`: the focusable
board, or the image when `readOnly`. It is not on the wrapper `div`, where an
`aria-label` without a role is prohibited. A host `aria-label` replaces the
default text.
The marker SVG uses Vite's `?url&no-inline` public asset query because the board
package does not recognize a data URI as an absolute sprite URL.

Import `GameClock` from `@ejm/ui/components/GameClock` or `@ejm/ui`. It accepts
`value`, `label`, `running` and `low` plus native span attributes. It only renders
the display. The host owns clock estimation, ticking and adjudication. It
defaults to `role="timer"`, whose live region is off, so a ticking clock does not
announce every update; a host `role` wins and `label` stays the accessible name.
Low time uses the paired danger and on-danger tokens in both themes and shows the
warn glyph from `@ejm/core` (`glyphs.status.warn`, `aria-hidden`) beside the time,
so it does not rely on the fill color alone.

## Maintained dependency and artwork

This adapter uses `cm-chessboard@8.15.4`, MIT, by Stefan Haack. The small ambient
declarations describe the public methods used here because this version ships
without TypeScript declarations. Check these contracts and the board lifecycle
tests when upgrading; replace them with upstream types when available.

Known limit: axe-core reports `empty-table-header` on the real board, from the
empty corner header cell of the package's visually hidden board-as-table. On a
page whose headings do not lead to its hidden `h3`, it also reports
`heading-order`. The table stays on because it is the screen-reader view of the
position.

Known limit: the last-move highlight is `ui-board-mark` at 18 percent opacity,
drawn above the coordinates. On a highlighted edge square a coordinate label
falls from at least 5.09:1 to between 3.75:1 and 4.25:1 in the dark theme and to
3.94:1 on the light theme's dark square (computed, sRGB compositing). No palette
color keeps 4.5:1 there, and a highlight faint enough to keep it would hide the
last move.

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
position authority, orientation serialization, the accessible name on the
package's `svg` (against a mock of the package), disposal and server rendering.
Real pointer, keyboard, promotion, theme and phone checks still require a built
browser surface. The package tests do not prove those browser integrations.
