# Load-time check

Load time is the only performance bar. Nothing in this repository caps bytes, so a large library is fine when it does the job. What matters is whether a visitor waits.

`scripts/perf.mjs` serves a built site, loads each route with [Lighthouse](https://github.com/GoogleChrome/lighthouse) (installed as a dev dependency, with `chrome-launcher`) and reports first contentful paint in milliseconds. It fails when a route is **1000 ms or more above its recorded baseline**.

## Run it

```sh
npm run build
npm run perf -- [--routes /,/docs/] [--ignore glob]... [--runs 1] [--baseline file.json] [--update] [--json]
```

- `npm run perf` measures `apps/gallery/dist`. For another site run `node scripts/perf.mjs <dist-dir> ...` with the same options. It is served from a small static server that gzips text, as a host would, with `/route/` serving `/route/index.html` and `404.html` for unknown paths.
- Without `--routes`, every prerendered page is a route except those matching `--ignore` or the `ignore` list the build saved in `.ejm-ssg/build.json` (copied static files such as brand assets).
- `--baseline` is a JSON file of `{ "/route/": milliseconds }`. The default is `scripts/perf-baseline.json`, which holds the gallery. A product repository keeps its own file.
- `--update` measures and writes the baseline instead of comparing. Run it after an intended change or on a new machine class, and commit the file with the change.
- `--runs N` takes the median of N loads per route (default 1). `--json` prints the report as JSON.
- Set `CHROME` to use another Chrome or Chromium binary.

Exit code 0 is within the threshold, 1 is a route a second or more above its baseline (the message names the route and both numbers), 2 is a usage or Chrome error. A route with no baseline is listed as `new` and does not fail.

## What is measured

Lighthouse's default mobile profile: a 412 px wide phone viewport, simulated slow 4G (150 ms round trip, 1.6 Mbps down) and a 4x CPU slowdown. Each load starts with a clean cache. The number is first contentful paint from Lighthouse's `first-contentful-paint` audit.

Lighthouse simulates the throttling from an unthrottled trace, so the numbers are steady: reruns of the same build land within about 100 ms. They also mostly follow the round trips and the render-blocking files on the critical path (the document, the stylesheet, the preloaded fonts). A script that does not block first paint will not move this number, which is the point: it measures what the visitor waits for, not how heavy the page is.

## Baseline: the gallery

`apps/gallery` built with `npm run build`, Lighthouse 13, Chrome on Linux, 2026-10-27. First contentful paint in ms.

| Route | FCP |
| --- | --- |
| `/` | 1654 |
| `/app/` | 1801 |
| `/application-layout/` | 1754 |
| `/tokens/` | 1579 |
| `/404.html` and every other route | 1651 to 1653 |

The full list is in `scripts/perf-baseline.json`.
