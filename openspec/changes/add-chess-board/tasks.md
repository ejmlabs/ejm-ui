# Tasks

Source for every port is `git show d476d1c:<path>`. Run the focused check for a task before ticking
it.

## 1. Dependency

- [x] 1.1 Add `cm-chessboard` 8.15.4, pinned exactly, to `packages/ui/package.json` with lifecycle scripts off, and verify `git diff` shows only that line plus the lockfile entry, whose integrity matches d476d1c's lockfile and lists no dependencies

## 2. useSearch in @ejm/ssg

- [x] 2.1 Add `useSearch` to `packages/ssg/src/root.tsx` and export it from `src/index.ts`, and verify the `useSearch` cases from d476d1c's `packages/ssg/src/client.test.tsx` pass with `npx vitest run packages/ssg/src/client.test.tsx`
- [x] 2.2 Document `useSearch` in `packages/ssg/README.md` as d476d1c does, and verify the README names its prerender, push, back and `replaceState` behavior

## 3. Board roles and contrast gate in @ejm/tokens

- [x] 3.1 Apply d476d1c's `theme.json` roles and `contrast.board` thresholds, `checkBoard` in `scripts/contrast.mjs` and `contrast.d.mts`, and its contrast test, and verify `npx vitest run packages/tokens/src/contrast.test.ts` passes
- [x] 3.2 Regenerate the token outputs with `npm run build -w @ejm/tokens`, and verify `npm run check -w @ejm/tokens` and `node scripts/sync-rust-theme.mjs --check` pass with only `generated/theme.css` and `generated/window.css` changed
- [x] 3.3 Document the board roles in `packages/ui/THEME.md` as d476d1c does, and verify the documented values match `theme.json`

## 4. Chessboard leaf in @ejm/ui

- [x] 4.1 Port `components/Chessboard.tsx` and `components/chessboard/` (surface, typings, orientation and hint helpers and their tests, `chessboard.css` drawing with `--ejm-ui-board-*`, README), and verify `npx vitest run packages/ui/src/components/Chessboard.test.tsx packages/ui/src/components/chessboard` passes
- [x] 4.2 Add a barrel assertion to `Chessboard.test.tsx` that `@ejm/ui` has no `Chessboard` export, and verify it fails when the export is added to `src/index.ts` and passes without it
- [x] 4.3 Add the `Chessboard` states to `src/catalog/primitives.json`, rebuild `src/catalog.json`, and verify `node packages/ui/scripts/build-catalog.mjs --check` and `node scripts/parity.mjs --strict` pass
- [x] 4.4 Add the `Chessboard` and `ChessboardSurface` rows and usage notes to `packages/ui/COMPONENTS.md` and the cm-chessboard and piece sprite notices to `THIRD_PARTY_NOTICES.md`, and verify `node packages/ui/scripts/check-components.mjs` passes

## 5. Game layout in @ejm/ui

- [x] 5.1 Add d476d1c's two layout tests to `packages/ui/src/layout/Application.test.tsx` and verify they fail on `main`'s `ApplicationGame.tsx`
- [x] 5.2 Reapply the `GameWorkspace`, `MovePairs` and `BoardPlaceholder` changes to `ApplicationGame.tsx` with props unchanged, and verify `npx vitest run packages/ui/src/layout/Application.test.tsx` passes
- [x] 5.3 Update the game workspace notes in `packages/ui/src/layout/README.md`, and verify they describe the centred board and the 64rem details column

## 6. Integration

- [x] 6.1 Add the change to `CHANGELOG.md`, and verify `npm run check` passes with no stray file mode or generated changes in `git status`
- [x] 6.2 Run `npm run build` and `node scripts/pack-proof.mjs`, and verify both pass with `@ejm/ui/components/Chessboard` and the `useSearch` export in the packed interfaces
- [ ] 6.3 Typecheck and build ejm-chess against this branch through a scratch checkout, without touching the shared `../ejm-ui` clone, and verify `npm run typecheck` and `npm run build` pass (if the Stockfish assets are absent, run `npx ejm-ssg build` and report that `engine:check` did not run)
- [x] 6.4 View an ejm-chess game page from that build at 390px and 1280px wide in both themes, and verify the board is centred, the details sit right of it at 1280px, and the board squares, pieces and marks read clearly

## Workflow follow-up

- Open the PR ready for review; the owner reviews it and applies `gate:approve`.
- Archive the change after merge and sync `chessboard`, `game-layout` and `ssg-site` into `openspec/specs/`.
- ejm-chess drops its `ejm-ssg budget` scripts under its own OpenSpec change.
