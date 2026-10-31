# ssg-site Specification

## Purpose
Defines how `@ejm/ssg` prerenders Vite and React routes to static HTML and what routing state a
page can read while it hydrates and runs in the browser.

## Requirements

### Requirement: Pages read the live query string with useSearch
`@ejm/ssg` SHALL export `useSearch()`, which returns the current query string, including its
leading `?`, after hydration. During prerender and the hydration render it MUST return `''`, so the
static HTML and the first client render never depend on a browser URL. Protected by
`packages/ssg/src/client.test.tsx`.

#### Scenario: Prerender never reads a URL
- **WHEN** a route that renders `useSearch()` is prerendered
- **THEN** the HTML shows an empty query string

#### Scenario: Hydration without a mismatch
- **WHEN** that page hydrates at a URL with `?a=1`
- **THEN** React reports no hydration error and the page then shows `?a=1`

#### Scenario: Router push and back navigation
- **WHEN** the router pushes `?b=2` and the reader then goes back
- **THEN** the page shows `?b=2` and then `?a=1`

#### Scenario: replaceState does not re-render
- **WHEN** the page rewrites its own URL with `history.replaceState`
- **THEN** `useSearch()` keeps its value and the page does not remount
