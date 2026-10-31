# Proposal

## Why

ejm-chess imports three things that `main` does not have: `useSearch` from `@ejm/ssg`, the
`@ejm/ui/components/Chessboard` leaf, and the board theme roles that leaf draws with. They exist on
`codex/chess-public-contracts` (#12, head d476d1c), but #13 already landed the rest of that branch
on `main` in its own form, so merging #12 would mostly delete duplicates. Porting only the missing
pieces lets ejm-chess build against `main`.

## What Changes

- `@ejm/ssg` exports `useSearch()`. It returns the live query string after hydration, follows
  router pushes and back navigation, ignores `replaceState`, and returns `''` during prerender and
  hydration so the static HTML never depends on a browser URL.
- `@ejm/tokens` gains the `board-light`, `board-dark` and `board-mark` ui roles in both themes,
  generated as `--ejm-ui-board-*`. A new `checkBoard` contrast check fails when the pure black piece
  art falls under 3:1 on either square, the mark falls under 3:1 on either square, or the two
  squares fall under 1.4:1 apart.
- `@ejm/ui` gains the public `components/Chessboard` leaf. It renders a labelled loading square on
  the server and loads the maintained cm-chessboard renderer after mount. The host supplies FEN,
  orientation, accepted moves and optional legal destinations; the kit holds no chess rules. It
  stays out of the `@ejm/ui` barrel. New dependency: `cm-chessboard` 8.15.4 (MIT, with a
  CC BY-SA 3.0 piece sprite), recorded in `THIRD_PARTY_NOTICES.md`.
- `@ejm/ui` game layout: `GameWorkspace` centres the board column and sizes it to the viewport,
  with the details to its right from 64rem. `MovePairs` follows the latest move unless the reader
  scrolled up. `BoardPlaceholder` uses the `bg-tone` fill that the Chessboard loading square uses,
  so the swap does not flash.

## Capabilities

### New Capabilities

- `chessboard`: the public Chessboard leaf, its server and loading behavior, its host contract, and
  the board theme roles with their contrast gate.
- `game-layout`: how the game workspace places the board and details, and how the move list
  follows play.
- `ssg-site`: the `useSearch` requirement. The in-flight `remove-size-caps` change also adds
  requirements to this capability; neither change edits the other's requirements.

### Modified Capabilities

None. `openspec/specs/` has no capability this change alters.

## Impact

- Packages: `@ejm/ssg` (`src/root.tsx`, `src/index.ts`, client tests, README), `@ejm/tokens`
  (`theme.json`, generated CSS, `scripts/contrast.mjs` and its types and test), `@ejm/ui`
  (`components/Chessboard.tsx`, `components/chessboard/`, the primitives catalog, `layout/ApplicationGame.tsx`,
  `package.json`, `COMPONENTS.md`, `THEME.md`, `THIRD_PARTY_NOTICES.md`), the root lockfile and
  `CHANGELOG.md`.
- Public interface: one new `@ejm/ssg` export and one new `@ejm/ui` subpath module, both additive.
  The Rust theme in `crates/ejm-tui` does not change; `sync-rust-theme.mjs --check` stays current.
- Consumers: ejm-chess builds against this. Existing consumers of `GameWorkspace`, `MovePairs` and
  `BoardPlaceholder` keep the same props and see the new placement and fill.

Out of scope:

- The gallery and the starter. No gallery page for the board is added here.
- `crates/ejm-tui` and the Ink package. The board is web only.
- ejm-chess's own build scripts. It still calls the removed `ejm-ssg budget`; that change belongs to
  ejm-chess under its own OpenSpec change.
- The design ownership check. ejm-chess's source already passes `main`'s mandatory check, so the
  retired `enforceDesignKit` option from #12 is not restored.
- The rest of #12, which #13 already landed. Closing #12 stays with its owner.
