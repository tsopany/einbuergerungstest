# Einbürgerungstest Deployment

One origin on **https://test.tsopany.com**, production only (no stage): the reverse proxy forwards `/api/*` and `/.well-known/*` unchanged to the api, which serves all its
routes under `/api`; everything else is the SPA. No path rewriting.

- `localhost/` - local development on the shared podman postgres, see `localhost/README.md`
- `INFISICAL.md` - how templates are rendered with Infisical
- The VM stack (Postgres 17 + api, no redis, no vector) lives in `tsopany-vm-setup/einbuergerungstest/`, with its `SECRETS.md`; the shared `caddy` stack serves `test.tsopany.com`.

## How a change ships

A push to `main` is a deploy:

- `check-main-client.yml` builds the SPA and copies it to `/var/deploy/einbuergerungstest/client`.
- `check-main-server.yml` runs the API specs on Postgres, builds and pushes `ghcr.io/tsopany/einbuergerungstest-api:latest`, then pulls it on the VM and restarts `einbuergerungstest-api`.
- `check-main-analyze.yml` runs the tests with coverage and, when the repository variable `SONAR_ENABLED` is `true`, the SonarQube scan.
- Branches other than `main` only run `check-dev-client.yml` / `check-dev-server.yml` (`pnpm check`, and the specs on a real Postgres).

GitHub environment `production` needs the secrets `SSH_PRIVATE_KEY`, `GHCR_PAT`, `SONAR_TOKEN`, `SONAR_HOST_URL` and the variables `SSH_HOST`, `SSH_USERNAME`,
`VITE_API_BASE_URL` (`https://test.tsopany.com`).

Compose changes and secrets are deployed from `tsopany-vm-setup`, not from here.
