# Frontend test reliability

The frontend reliability workflow runs on main and daily. It collects the
Vitest test inventory, runs the suite twice, and fails on skipped, missing,
ambiguous or failed evidence. It identifies tests with both a passing and a
failing result, even when other evidence is incomplete. The workflow attempts to
upload available reports and logs as an artifact; they may contain test output.

To reproduce on a machine with the repository's locked dependencies, Chrome and
Pillow installed, set `CHROME` to the browser and run
`python3 scripts/frontend_flake_check.py /tmp/ui-frontend-flakes` with a new
output directory. The collection loads test modules and global setup; it is not
a sandbox. A missing prerequisite or an unverified hosted run is not a pass.
