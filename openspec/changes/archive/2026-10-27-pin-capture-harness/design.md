# Design

## Context

Both sources are exported from git objects into temporary build trees, with metadata describing their commits. CLI and harness are separate siblings.

## Goals / Non-Goals

**Goals:** Select the harness commit from the CLI's committed pin and retain exact provenance.

**Non-Goals:** Fetch missing revisions, change product sources, or alter capture outputs already recorded.

## Decisions

Read the pin from the selected CLI commit rather than its working tree; validate a full SHA and its availability before creating or changing the export. Archive each selected commit and record that same commit in metadata. A missing revision fails with a diagnostic rather than fetching or silently building another version.

## Risks / Trade-offs

A shallow harness checkout may lack the pinned commit. The error names the needed revision so the operator can fetch it deliberately. Existing captures are historical evidence and remain unchanged.
