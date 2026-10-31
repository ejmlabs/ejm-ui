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
staging job then runs `wrangler deploy --env staging` automatically, and once
it succeeds a production job deploys the same built files with the top-level
config. The merge is the human decision; no deploy waits for an approval.
Deploys queue: a newer merge never stops a deploy that is already running.

Deploy jobs run Wrangler 4.153.0, pinned in the shared repository, not this
repository's dependencies. The Cloudflare token is the `CLOUDFLARE_API_TOKEN`
secret of the `staging` and `production` GitHub environments. The existing
Cloudflare account must own the domain, and that token must have
Worker/custom-domain rights. A manual `wrangler deploy` from a workstation is
no longer the procedure; a local Wrangler dry run against
`apps/gallery/wrangler.jsonc` is still fine. The repository's protected source
review gates apply before merge. A local build or source PR does not publish
the site.

## Before the first deploy

The shared deploy fails closed unless these are in place:

- The `staging` and `production` GitHub environments exist, and each has a
  custom deployment branch policy with exactly one branch, `main`.
- Both environments hold the `CLOUDFLARE_API_TOKEN` secret.

`python3 scripts/set_deploy_token.py` in `ejmlabs/.github` sets up both for
every site repository at once.

The deploy also refuses a build whose `apps/gallery/wrangler.jsonc` differs from
the reviewed commit, so change that file in source, never in a build step.

If a DNS record for `ui-staging.ejmlabs.com` already exists outside Wrangler,
Wrangler prompts in CI and nobody can answer. The shared guide says: "a custom
domain whose DNS record exists makes Wrangler prompt, and CI cannot answer"
(`docs/operations.md`, "Site deploys", in `ejmlabs/.github`).

Run these checks on staging after each merge, and on the canonical host once
production has deployed: the host, shared headers, fonts and original OFL notices, 404
handling, complete no-script docs, keyboard navigation and light/dark
phone/desktop layouts. Retain the source SHA and Worker version ID. For
rollback, redeploy a previously accepted Worker version in Cloudflare, or
revert the change on main, then verify the same host and routes; do not serve a source branch with failed
gates.
