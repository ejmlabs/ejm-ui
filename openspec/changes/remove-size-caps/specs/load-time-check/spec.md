## ADDED Requirements

### Requirement: Load time is the only performance bar

The repository SHALL NOT enforce a limit on bundle bytes, transferred bytes, file size or dependency count. A build, a check or a test SHALL NOT fail because a size is large.

#### Scenario: A large script does not fail a check

- **WHEN** a route ships a much larger script than before
- **THEN** `npm run build` and `npm run check` still pass
- **AND** only the load-time check can flag it, and only when first contentful paint rises by a whole second or more

### Requirement: First contentful paint is measured per route

`npm run perf` SHALL serve a built site, load each route with Lighthouse on its default mobile profile with simulated slow 4G and 4x CPU slowdown, and print first contentful paint in milliseconds per route as the median of the runs.

#### Scenario: Report for the gallery

- **WHEN** `npm run perf` runs after `npm run build`
- **THEN** it prints one row per prerendered route with its median first contentful paint and its baseline
- **AND** a route that cannot be measured is reported as an error, not a pass

### Requirement: A whole second over the baseline is flagged

The check SHALL compare each route with `scripts/perf-baseline.json` and exit non-zero when a route's median is 1000 ms or more above its baseline.

#### Scenario: Regression of one second

- **WHEN** a route's baseline is 1500 ms and its median is 2500 ms
- **THEN** the check exits 1 and names the route, both numbers and the difference

#### Scenario: Smaller change or improvement

- **WHEN** a route is 999 ms slower than its baseline, or faster
- **THEN** the check exits 0

#### Scenario: Recording a baseline

- **WHEN** the check runs with `--update`
- **THEN** it writes the medians to the baseline file and exits 0
