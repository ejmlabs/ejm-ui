# Spec Delta

## Purpose

Defines how the shared game layouts in `@ejm/ui/layout` place a board beside its details and how the
move list follows play, so every game site gets the same arrangement.

## ADDED Requirements

### Requirement: The move list follows the latest move
`MovePairs` SHALL scroll its own bounded list to the newest move whenever a move is added, unless
the reader has scrolled the list up from its end. Scrolling back to the end SHALL resume following.
It MUST NOT scroll the document. Protected by `packages/ui/src/layout/Application.test.tsx`.

#### Scenario: New move while following
- **WHEN** the list is at its end and a move is added
- **THEN** the list scrolls to show the new move

#### Scenario: Reader scrolled up
- **WHEN** the reader scrolled the list up and a move is added
- **THEN** the list keeps the reader's position

#### Scenario: Reader returns to the end
- **WHEN** the reader scrolls back to the end and another move is added
- **THEN** the list follows the new move again

### Requirement: The board placeholder matches the loading board
`BoardPlaceholder` SHALL use the same `bg-tone` fill as the `Chessboard` loading square, so swapping
one for the other does not change the fill. Protected by `packages/ui/src/layout/Application.test.tsx`.

#### Scenario: Placeholder swap
- **WHEN** a page renders `BoardPlaceholder` and then the loading `Chessboard` in its place
- **THEN** both carry the `bg-tone` fill

### Requirement: The game workspace centres the board
`GameWorkspace` SHALL centre the board column on the page and size it to the viewport, leaving room
for a player strip above and below it. From 64rem the details SHALL sit to the right of the board;
below that they follow it. On a phone the board SHALL keep the full width. jsdom has no layout, so
this is checked by viewing a game page at phone and desktop widths in both themes.

#### Scenario: Desktop
- **WHEN** a game page is viewed at 1280px wide
- **THEN** the board is centred and the details sit to its right

#### Scenario: Phone
- **WHEN** a game page is viewed at 390px wide
- **THEN** the board fills the width and the details follow it
