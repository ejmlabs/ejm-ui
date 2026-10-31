# Design

## Context

See proposal.md, Why. The source of every piece is `codex/chess-public-contracts` at d476d1c, which
passed 835 tests there. `main` differs from that branch in the files this change
touches:

- `packages/ssg/src/root.tsx` and `src/index.ts` changed on `main`, so the `useSearch` hunk does not
  apply as is.
- `packages/ui/src/layout/ApplicationGame.tsx` on `main` is #13's version, which sizes the board
  with `calc(100svh - 23rem)` and has the same props as d476d1c.
- `@ejm/ui` on `main` is set up for npm (`publishConfig`, `static.css`, `control-recipes`), so only
  the new dependency line moves into its `package.json`.
- `main` has no `catalog/games.json`; `GameClock` lives in `catalog/primitives.json`.
- The token sources (`theme.json`, `contrast.mjs`, its types and test) apply to `main` unchanged,
  and regenerating produces the same `theme.css` and `window.css` as d476d1c. The Rust theme stays
  current.

## Goals / Non-Goals

**Goals:**

- Behavior identical to d476d1c for each requirement in the specs, on `main`'s code.
- Each piece lands with the test that protects it.

**Non-Goals:**

- Redesigning the board, the layouts or `useSearch`.
- A gallery page for the board, or terminal targets.

## Decisions

### Port the pieces onto `main` instead of merging `main` into #12

#13 already carries most of #12 in its own form. A merge would resolve 67 conflicts mostly by
deleting #12's copies, leaving about 3,000 lines to review. A port from d476d1c touches only what is
missing.

### `useSearch` subscribes to `popstate` and `pushState` only

The hook uses `useSyncExternalStore` with `location.search` as the client snapshot and `''` as the
server snapshot, so hydration matches the prerendered HTML. It listens to `popstate` and to the
`pushState` event wouter's history patch dispatches, and not to `replaceState`, so a page that
rewrites its own URL does not re-render. wouter's `useSearch({ ssrSearch: '' })` was considered; it
also re-renders on `replaceState`, which is the behavior the client test forbids.

### Board roles live in `theme.json` and the generated CSS is regenerated

The roles and the `contrast.board` thresholds go into `theme.json`; `checkBoard` joins the existing
ui and band checks in `contrast.mjs`. The generated CSS is never edited by hand. Pure black is the
piece reference because the piece sprite's black bodies and every outline are pure black.

### The board is a lazy leaf around cm-chessboard 8.15.4

`Chessboard` renders a labelled `bg-tone` square until mount, then lazy-loads `ChessboardSurface`,
which owns the cm-chessboard instance, its extensions (promotion dialog, accessibility, markers),
orientation and hint helpers, and cleanup. It stays out of the barrel so the renderer and its CSS
reach only a page that imports the subpath. The version is pinned exactly and has no dependencies
of its own. Its sprites load through Vite `?url` imports, typed by the existing `src/assets.d.ts`;
every ejmlabs consumer builds with Vite. Chessground, the other maintained board, is GPL-3.0 and was not used.

### Chessboard states go into `catalog/primitives.json`

They sit beside `GameClock` rather than in a new `games.json`, which keeps one file per workstream.
`packages/core/contract.json` does not list the board, so strict parity is unaffected.

### The layout hunks are reapplied, not copied

`GameWorkspace` takes d476d1c's `--ejm-room` and `--ejm-board` custom properties and three column
grid in place of `main`'s `23rem` calc. `MovePairs` and `BoardPlaceholder` take their d476d1c
bodies. Props stay as they are on `main`.

### One barrel assertion protects the leaf boundary

No existing check notices `Chessboard` entering `packages/ui/src/index.ts`, so
`Chessboard.test.tsx` gains one assertion that the barrel has no `Chessboard` export.

### The work splits by file set

`useSearch`, the token gate, the board leaf and the layout share no files. Each is implemented
against its own focused test. `package.json`, the lockfile, `CHANGELOG.md` and `THEME.md` have one
editor, and the dependency is installed before the board work starts.

## Risks / Trade-offs

- [A new runtime dependency in a package set up for npm] → Exact pin, lockfile integrity compared
  with the entry #12 already used, installs run with lifecycle scripts off, and the package has no
  transitive dependencies.
- [The piece sprite is CC BY-SA 3.0] → The SVG ships unchanged and `THIRD_PARTY_NOTICES.md` keeps
  its attribution and share-alike terms, as on #12.
- [`?url` imports tie the leaf to Vite] → The board README says so; a non-Vite consumer would
  need its own asset handling.
- [The new placement moves existing `GameWorkspace` pages] → ejm-chess is the only consumer; no
  gallery or starter page uses the game layouts.
- [`remove-size-caps` also adds requirements to `ssg-site`] → Both changes add separate
  requirements and neither edits the other's, so either can archive first.

## Migration Plan

The change is additive. ejm-chess needs no prop changes to adopt it; it does need its own change to
stop calling the removed `ejm-ssg budget`. Rollback is reverting the squash commit, which removes
the export, the subpath module, the roles and the dependency together.
