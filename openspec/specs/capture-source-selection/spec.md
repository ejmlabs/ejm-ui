# capture-source-selection Specification

## Purpose
Keep product screenshots traceable to a compatible set of committed source revisions.

## Requirements

### Requirement: Capture the CLI pinned harness revision

The clean capture build SHALL export CLI HEAD and the full harness commit named by the CLI's committed `.github/harness-revision`, independent of working-tree changes and the harness checkout's HEAD. Both metadata records SHALL identify the exported commits.

#### Scenario: Harness checkout is on another revision
- **WHEN** the CLI pin names a locally available harness commit different from harness HEAD
- **THEN** the build exports that pinned commit and records it as the harness source.

#### Scenario: Invalid or unavailable pin
- **WHEN** the CLI pin is missing, malformed, or names an unavailable commit
- **THEN** the build fails before changing the export directory and does not modify the source checkouts.
