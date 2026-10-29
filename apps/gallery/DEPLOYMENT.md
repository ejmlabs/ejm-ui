# Gallery deployment

The canonical host is `https://ui.ejmlabs.com`. The static Worker is
`ejmlabs-ui`; workers.dev and version preview URLs are disabled. The gallery
has no API, session service or analytics beacon. It uses the shared security
headers emitted by `@ejm/site`. Its `env.staging` Worker, `ejmlabs-ui-staging`,
serves `https://ui-staging.ejmlabs.com` with the same settings. Staging is
publicly reachable and serves the latest main.

From the reviewed source commit, install the locked dependencies, then run:

```sh
npm ci --ignore-scripts
npm run check
npm run build -w @ejm/gallery
```

A push to main runs `.github/workflows/deploy.yml`, the canonical caller of the
shared `ejmlabs/.github` workflow `deploy-site.yml`. A build job with
`contents: read` and no secrets builds the gallery from that main commit. A
staging job then runs `wrangler deploy --env staging` automatically. A
production job deploys the same built files with the top-level config, but
only after the required reviewer (@everettmorgan) approves the run in the
GitHub `production` environment. That approval is the owner's deploy
authorization. A newer merge cancels an older production deploy that is still
waiting.

Deploy jobs run Wrangler 4.151.3, pinned in the shared repository, not this
repository's dependencies. The Cloudflare token is the `CLOUDFLARE_API_TOKEN`
secret of the `staging` and `production` GitHub environments. The existing
Cloudflare account must own the domain, and that token must have
Worker/custom-domain rights. A manual `wrangler deploy` from a workstation is
no longer the procedure; a local Wrangler dry run against
`apps/gallery/wrangler.jsonc` is still fine. The repository's protected source
review gates apply before merge. A local build or source PR does not publish
the site.

Run these checks on staging after each merge, and on the canonical host after
approval: the host, shared headers, fonts and original OFL notices, 404
handling, complete no-script docs, keyboard navigation and light/dark
phone/desktop layouts. Retain the source SHA and Worker version ID. For
rollback, redeploy a previously accepted Worker version in Cloudflare, or
approve an earlier run's production job while it is still available, then
verify the same host and routes; do not serve a source branch with failed
gates.
