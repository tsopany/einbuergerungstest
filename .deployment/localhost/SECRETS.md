# SECRETS.md

This document lists the **secret names** the localhost setup needs. Values must never be committed.

All of them live in Infisical (project `einbuergerungstest`, environment `dev`, self-hosted at `https://secrets.tsopany.com`) and are rendered with
`infisical run --env=dev --recursive -c "envsubst < <file>.template > <file>"` (see `../INFISICAL.md`). Names below match what the `*.template` files in this folder actually
reference. When adding a `${VAR}` to a template, add it here too.

## Database

Consumed by `api.env.template` (`DATABASE_URL`), `localhost.podman.commands.template` and `DB_DUMP.template`.

- `DB_USER` - Postgres user (`einbuergerungstest`)
- `DB_PASSWORD` - Postgres password (must be URL-safe, it is interpolated raw into `DATABASE_URL`)
- `DB_DATABASE` - Postgres database name (`einbuergerungstest`)

## API

Consumed by `api.env.template`.

- `JWT_SECRET` - access token signing key, at least 32 characters

## OAuth

Consumed by `api.env.template`. Register the dev Google OAuth client with the redirect URI `http://localhost:8115/api/auth/google/callback` (fixed in the template) and the
authorized origin `http://localhost:3051`.

- `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` - Google OAuth client (dev)

## Client

Not rendered into a file: `pnpm -C client serve` runs Vite through `infisical run --env=dev --recursive --`, so Infisical `dev` supplies the variables to the process.
`VITE_*` values end up in the shipped bundle - never put a real secret behind a `VITE_` name.

- `VITE_API_BASE_URL` - api origin for the dev client: `http://localhost:8115` (not a secret; production builds take it from the GitHub variable of the same name)
