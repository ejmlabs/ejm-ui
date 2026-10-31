# Design

## Context

Each proof packs its packages one at a time with `npm pack -w packages/<name> --json` and reads one entry from the output (`info.name`, `info.filename`, `info.size`, `info.unpackedSize`, `info.entryCount`, and `info.files` in the publish proof). The two scripts do not share a module: each defines its own `read`, `run` and `step` helpers and its own pack loop.

## Goals / Non-Goals

**Goals:** Both proofs run under npm 11 and npm 12 with identical results.

**Non-Goals:** Extract a helper shared by the two scripts, change what is packed, or pin an npm version.

## Decisions

Accept both shapes at each call site: `const out = JSON.parse(...); const [info] = Array.isArray(out) ? out : Object.values(out);`. With `-w <one package>` both shapes hold exactly one entry, so taking the first value is correct and needs no package name. The alternative, a shared `scripts/` helper, would add a module for one expression while the scripts still duplicate `read`, `run` and `step`. Consolidating them is a separate refactor.

## Risks / Trade-offs

A future npm may change the shape again. The proofs then fail on the first `info.name` read, not silently, because a wrong shape yields `undefined` fields. The same two-site edit applies at that point.
