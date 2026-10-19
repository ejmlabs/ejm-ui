# Performance check

`scripts/perf.mjs` measures a built site in headless Chrome on a throttled mobile profile and fails when a route is over the budgets in `QUALITY.md`. It complements `scripts/size.mjs` (file sizes read from disk, no browser): this one reports what Chrome actually transferred and how fast it painted.

## Run it

```sh
node scripts/perf.mjs <dist-dir | url...> [--routes /,/lazy/] [--ignore glob]... [--budget-file f.json] [--runs 3] [--json]
                      [--lcp 1200] [--cls 0.05] [--tolerance 15]
```

- A **dist directory** (for example `apps/gallery/dist` after `npm run build`) is served from a small built-in static server: `/route/` serves `/route/index.html`, unknown paths get `404.html` with status 404, text is gzipped (level 9, like `size.mjs`) because a real host would do that. Without `--routes` every prerendered page is measured, including `/404.html`, except pages that match an `--ignore` glob or the `ignore` list the build saved in `.ejm-ssg/build.json` (static files such as copied brand assets are pages but not routes; same globs as `ejm-ssg budget`, see `packages/ssg/README.md`).
- **Urls** are measured as given (a staging or production site). Whatever that host sends is what you get.
- `--budget-file` is JSON in KB: `{ "js": 75, "css": 12 }` (or `{ "budget": { ... } }`, the shape of `.ejm-ssg/build.json`). Missing keys fall back to the build's saved budget when one sits next to the dist, then to the defaults in `packages/ssg/src/budget.mjs` (js 95, css 14, fonts 70, html 30).
- `--runs N`: medians of N cold loads per route and mode (default 3). `--json` prints the full report.
- Set `CHROME` to use another Chrome or Chromium binary.

Exit code 0 is within budget, 1 is a breach (the message names route, metric and overage), 2 is a usage or Chrome error (including Chrome not installed).

## What is measured

Every load uses a fresh browser context (cold cache, cold connections), cache disabled, and waits 1.5 s after the load event so late paints and shifts count.

| Metric | Source |
| --- | --- |
| Transfer size of HTML, CSS, JS, fonts (and other) | `Network.loadingFinished` `encodedDataLength` per request, grouped by the resource type Chrome reports. It is what crossed the wire, gzip included, **response headers included** (about 200 to 300 bytes per request), so it reads a little above the body sizes `size.mjs` computes. Everything the page loads counts, lazy chunks too, if the route loads them. |
| Requests | Finished requests, minus `data:` urls and Chrome's own favicon request |
| FCP | Chrome's `firstContentfulPaint` lifecycle event, from the start of the document request |
| LCP | `PerformanceTimeline` `largest-contentful-paint` events (last one wins), from the start of the document request |
| CLS | Sum of `layout-shift` values without recent input (no session windowing; fine for pages nobody interacts with) |
| TBT | Long tasks after FCP, sum of duration over 50 ms. Approximation of Lighthouse TBT (which also stops at Time to Interactive) |
| LCP and CLS with JavaScript off | Same loads with `Emulation.setScriptExecutionDisabled`. This is the prerendered HTML painting by itself. Reported, not gated. |

Gated: the four sizes, LCP (JS on) and CLS (JS on). A metric that could not be measured is a breach, not a pass.

## Throttling

Set through the DevTools Protocol before each navigation:

- Viewport 375x812, device pixel ratio 3, mobile and touch emulation
- CPU 4x slower (`Emulation.setCPUThrottlingRate`)
- Network "Slow 4G": 1.6 Mbps down, 750 kbps up, 150 ms round trip (`Network.emulateNetworkConditions`), cache disabled

This is the usual DevTools mobile profile. It applies to the local static server too, so a dist directory is measured as if served over a slow phone connection.

## Noise

Size numbers are exact and repeat to the byte. Timing numbers are not. Throttled timings move with machine load, Chrome version, thermal state and whatever else is running, and CPU throttling scales the host's speed, so a slow laptop gives slower numbers than a fast one. On the fixture below, five single runs of `/` gave LCP between 436 and 450 ms, a spread of about 3 percent on an idle machine; a busy machine or a heavier page will spread more. What to do about it:

- Median of N runs (default 3). Use `--runs 5` for a number you will quote.
- LCP has a tolerance (default 15 percent, `--tolerance`), so the gate trips at 1380 ms rather than 1200. A `~` next to an LCP means over target but inside tolerance. CLS and sizes have no tolerance.
- Compare against the same machine's earlier numbers before blaming a change. A 5 percent shift is noise; a 50 percent shift is real.
- This is a lab number on emulated hardware. It is not a field measurement and will not match Lighthouse or PageSpeed to the millisecond.

## Baseline: the ssg fixture (an empty React site)

`packages/ssg/fixtures/basic`, built with `ejm-ssg build`, `--runs 5`, Chrome on macOS, idle machine, 2026-10-18. This is the floor: React and the router with almost no content.

| Route | JS | CSS | Fonts | HTML | Requests | FCP | LCP | CLS | LCP no JS | CLS no JS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 71.3 KB | 0.6 KB | 8.2 KB | 0.8 KB | 4 | 436 ms | 439 ms | 0.000 | 380 ms | 0.000 |
| `/lazy/` | 71.7 KB | 0.8 KB | 8.2 KB | 0.9 KB | 6 | 448 ms | 452 ms | 0.000 | 396 ms | 0.000 |
| `/404.html` | 71.3 KB | 0.6 KB | 8.2 KB | 0.8 KB | 4 | 428 ms | 432 ms | 0.000 | 387 ms | 0.000 |

Total blocking time was 0 on every route. React plus hydration costs about 71 KB of the 95 KB JavaScript budget before any site code, so about 24 KB is left for the router, theme, header and page code. The no-JS paint is only about 50 ms ahead of the hydrated one on this page because the 71 KB script does not block first paint; on a page with more to hydrate the gap grows.
