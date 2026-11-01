# Gallery deployment

The canonical host is `https://ui.ejmlabs.com`. The static Worker is
`ejmlabs-ui`; workers.dev and version preview URLs are disabled. The gallery
has no API, session service or analytics beacon. It uses the shared security
headers emitted by `@ejm/site`. Its `env.staging` Worker, `ejmlabs-ui-staging`,
serves `https://staging.ui.ejmlabs.com` with the same settings. Staging is
publicly reachable and serves the latest main.

The Wrangler config is `apps/gallery/wrangler.jsonc`. It publishes the build
output in `apps/gallery/dist`, for both the top-level Worker and `env.staging`.

From the reviewed source commit, install the locked dependencies, then run:

```sh
npm ci --ignore-scripts
npm run check
npm run build -w @ejm/gallery
```

A local Wrangler dry run against `apps/gallery/wrangler.jsonc` is fine for each
environment in that file. A local build or source PR does not publish the site.

A push to main deploys staging, then production once a maintainer approves it. How
that pipeline runs, what it refuses, how to follow a run, what to do when one fails
and how to roll back are in
[CI deploys](../../.agents/skills/ejmlabs-cloudflare/references/ci-deploys.md).

Run these checks on staging after each merge, and on the canonical host once
production has deployed: the host, shared headers, fonts and original OFL notices, 404
handling, complete no-script docs, keyboard navigation and light/dark
phone/desktop layouts. After a rollback, check the same host and routes again;
do not serve a source branch with failed gates.
