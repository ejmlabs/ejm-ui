# chessboard Specification

## Purpose
Defines the public `@ejm/ui/components/Chessboard` leaf that draws a chess position and reports
proposed moves, and the board theme roles it draws with. Chess rules and move authority stay with
the host.

## Requirements

### Requirement: The server renders a labelled loading square
`Chessboard` SHALL render a square status element labelled "Loading chessboard" with the
`bg-tone` fill on the server and on the first client render. It MUST NOT construct the board
renderer until after mount. Protected by `packages/ui/src/components/Chessboard.test.tsx`.

#### Scenario: Server render
- **WHEN** `Chessboard` renders to a string
- **THEN** the output holds the labelled loading square and no board renderer was constructed

### Requirement: A move is a proposal
`Chessboard` SHALL report a dragged, clicked or keyboard move through `onMove` and MUST keep
showing the position from `fen` until the host supplies a new one. A promotion choice SHALL be
reported as the `promotion` field of that move. Protected by
`packages/ui/src/components/Chessboard.test.tsx`.

#### Scenario: Host rejects a move
- **WHEN** the reader moves a piece and the host leaves `fen` unchanged
- **THEN** `onMove` received the move and the board still shows the original position

#### Scenario: Promotion
- **WHEN** the reader moves a pawn to the last rank and picks a piece in the promotion dialog
- **THEN** `onMove` receives the move with that piece as `promotion`

### Requirement: Escape cancels a pointer selection
An Escape key press that no other handler consumed SHALL clear destination hints and cancel a
pending pointer move. An Escape the board or promotion dialog already consumed MUST be left alone.
Unmounting SHALL remove the listener. Protected by `packages/ui/src/components/Chessboard.test.tsx`.

#### Scenario: Unconsumed Escape
- **WHEN** a piece is selected by pointer and the reader presses Escape
- **THEN** the hints clear and the move input is cancelled

#### Scenario: Unmount
- **WHEN** the board unmounts
- **THEN** a later Escape reaches no board handler

### Requirement: Legal destinations come from the host
Destination hints SHALL be off unless the host sets `showLegalMoves`, and SHALL show only the
squares the host returns from `getLegalMoves(square)`. Replacing hints MUST NOT remove the
last-move or premove markers. Protected by `packages/ui/src/components/chessboard/hints.test.ts`.

#### Scenario: Hints replace hints only
- **WHEN** the board shows last-move and premove markers and the reader selects another piece
- **THEN** the old destination markers are replaced and the last-move and premove markers remain

### Requirement: Orientation changes settle on the latest color
Rapid `color` changes SHALL leave the board facing the last color requested. Turns MUST NOT
overlap, and a board that has been disposed MUST NOT be turned. Protected by
`packages/ui/src/components/chessboard/orientation.test.ts`.

#### Scenario: Rapid flips
- **WHEN** `color` changes from `w` to `b` and back to `w` before the first turn finishes
- **THEN** the board ends facing white and no two turns ran at once

### Requirement: The board stays out of the barrel
The `@ejm/ui` barrel MUST NOT export `Chessboard`, so its renderer and styles enter only a consumer
that imports the `@ejm/ui/components/Chessboard` subpath. Protected by a barrel assertion in
`packages/ui/src/components/Chessboard.test.tsx`.

#### Scenario: Barrel import
- **WHEN** a consumer imports the `@ejm/ui` barrel
- **THEN** it has no `Chessboard` export, and the subpath does

### Requirement: Board roles keep pieces, marks and squares legible
Both themes SHALL define `board-light`, `board-dark` and `board-mark` ui roles. The token contrast
gate MUST fail when pure black falls under 3:1 against either square, `board-mark` falls under 3:1
against either square, or the two squares fall under 1.4:1 apart. Protected by
`packages/tokens/src/contrast.test.ts`.

#### Scenario: Shipped roles pass
- **WHEN** the contrast gate runs on `theme.json`
- **THEN** it reports no board problem

#### Scenario: A dark square hides black pieces
- **WHEN** the dark theme's `board-dark` is changed to a color under 3:1 against black
- **THEN** the gate reports the theme, the square and the measured ratio
