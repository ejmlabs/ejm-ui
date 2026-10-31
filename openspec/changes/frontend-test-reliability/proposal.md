## Why

The scheduled reliability check covers Rust only. Frontend failures on main need independent repeated test evidence too.

## What changes

Run the frontend test suite twice on main and daily, compare identities against a real Vitest inventory, and retain the reports and logs.

## Impact

The check fails on any failure, skipped test, missing or ambiguous evidence. The existing human-admitted PR gate remains in place.
