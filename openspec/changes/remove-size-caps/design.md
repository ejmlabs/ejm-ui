## Context

Size was enforced in several places: `scripts/size.mjs`, `ejm-ssg budget` and the build step of the Vite plugin, `build-static.mjs`, `size-islands.mjs`, and tests that assert a byte count. `scripts/perf.mjs` already measures in Chrome but speaks to the DevTools Protocol by hand and also gates on byte budgets.

## Decisions

1. **Remove, do not raise.** Every byte, size and dependency-count cap goes. Raising numbers keeps the idea that bytes are the bar.
2. **Lighthouse for timing.** `lighthouse` is maintained by the Chrome team and `chrome-launcher` finds Chrome and honors `CHROME_PATH`. This replaces the hand-written protocol client, tally, throttling and CLS/LCP code. Lighthouse's desktop profile is the normal-connection throttle (simulated 10 Mbps, 40 ms round trip, no CPU slowdown). The default mobile profile (slow 4G, 4x CPU) is about five times stricter and turns a single 150 KB script into a failure, which would be a byte cap in practice.
3. **First contentful paint is the number.** FCP is what a visitor waits on before seeing the page. The script reports it per route as the median of N runs (default 1).
4. **Baseline file.** `scripts/perf-baseline.json` maps route to milliseconds. A route fails when its median is at least 1000 ms above its baseline. `--update` rewrites the baseline from the current run; with `--routes` it merges those routes into the existing file. A missing baseline file is an error (exit 2) unless `--update` is given. A route with no baseline is reported and not failed. A faster route never fails. One second is large enough to sit above run noise and small enough to catch a change that costs a visitor a visible delay.
5. **Static server stays.** Lighthouse needs a URL. The existing small server in `perf.mjs` serves `dist` with gzip, as a host would, so transfer cost is realistic. It stays as a thin adapter.
6. **`ignore` stays.** The `ignore` globs of `defineSite` choose pages that are not routes. The perf script still reads them from `.ejm-ssg/build.json`, and matches them with `picomatch`.
7. **Not removed.** The tree-shaking check compares two builds to prove the barrel and deep imports match, which is correctness. Cloudflare header rule limits and playback bounds are platform and safety limits.
8. **Follow-up.** `size-islands.mjs` also proved that demo islands stay in lazy chunks and that a one-product page does not carry another product's frames. That structural guarantee is dropped with the script. Rebuilding it as a small test is recorded in the tasks as a follow-up, not done here.

## Risks

- Lighthouse adds a large dev dependency. Accepted: it is dev only and bytes are not a bar.
- Timings vary by machine. The baseline is recorded per machine class and the threshold is a whole second, so only large changes trip it.
