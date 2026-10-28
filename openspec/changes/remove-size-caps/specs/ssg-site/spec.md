## ADDED Requirements

### Requirement: Site configuration has no size budget

`defineSite` SHALL NOT accept a `budget` option. `@ejm/ssg` SHALL NOT export `./budget`, and the `ejm-ssg` command SHALL offer only `build` and `dev`.

#### Scenario: Unknown command

- **WHEN** a user runs `ejm-ssg budget`
- **THEN** the command prints its usage for `build` and `dev` and exits 2

#### Scenario: Build ignores size

- **WHEN** `ejm-ssg build` produces a route with large assets
- **THEN** the build succeeds and prints no budget report

### Requirement: Pages that are not routes can be skipped by the load-time check

`defineSite` SHALL keep the `ignore` option. The build SHALL save it to `.ejm-ssg/build.json` so the load-time check skips those pages.

#### Scenario: Copied static pages

- **WHEN** a site sets `ignore: ['brand/**']`
- **THEN** `npm run perf` does not measure pages under `brand/`
