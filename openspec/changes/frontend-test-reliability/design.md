## Design

Collect tests with the pinned Vitest API, including parameterized and skipped cases. Run the ordinary test command twice with JSON reporting and compare each report with the collected identities. Report independently comparable flakes even when other evidence is incomplete.

Provision the browser and Pillow prerequisites before test collection. A shorter comparison deadline leaves time for artifact upload. Reports and logs can contain test output, so they remain workflow artifacts rather than trusted shared history.
