# Tasks

## 1. Manifest

- [x] 1.1 Remove the `bin` field from `packages/shots/package.json` and refresh the lockfile with scripts off, and verify `git diff` shows only those two files
- [x] 1.2 Run `npm ci` with scripts off, and verify `git status` no longer shows a mode change on `packages/shots/src/capture.mjs`
- [x] 1.3 Add the change to `CHANGELOG.md`, run `npx vitest run packages/shots`, then `npm run check` and `node scripts/pack-proof.mjs`, and verify all pass

## Workflow follow-up

- Archive this change in its PR. The same PR ticks `add-chess-board` task 6.3 once ejm-chess's typecheck passes against ejm-ui `main`, and archives that change with its `chessboard`, `game-layout` and `ssg-site` specs.
