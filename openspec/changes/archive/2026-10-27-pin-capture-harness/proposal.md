# Proposal

## Why

Capture exports currently combine CLI HEAD with whichever harness HEAD happens to be checked out. This can mismatch the committed CLI dependency pin and produce an invalid or misleading clean build.

## What Changes

- Export the CLI commit and its committed harness revision without touching either checkout.
- Fail before modifying the export if the pin is missing, invalid, or unavailable.
- Update capture instructions and replace incidental gallery copy assertions with behavior checks.

## Capabilities

### New Capabilities

- `capture-source-selection`: Select traceable, compatible source revisions for product captures.

### Modified Capabilities

None.

## Impact

Changes affect the private `@ejm/shots` capture tooling and gallery tests. Product source and the parity contract remain out of scope.
