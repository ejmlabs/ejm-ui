## ADDED Requirements

### Requirement: Detect frontend flakes on main

The frontend reliability workflow SHALL collect a Vitest inventory and run the suite twice on every main push and daily. It SHALL retain evidence and fail when any run fails or any test is skipped, omitted, or ambiguous. It SHALL name comparable tests with both a passing and failing result.

#### Scenario: An intermittent failure

- **WHEN** the same test fails once and passes once
- **THEN** the workflow SHALL fail and identify the test

#### Scenario: Missing evidence

- **WHEN** any expected test is omitted or skipped
- **THEN** the workflow SHALL fail without suppressing independently comparable flakes
