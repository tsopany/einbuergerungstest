# Einbürgerungstest API

Fastify + MikroORM on PostgreSQL. All routes live under `/api`:

- `GET /api/health`
- `GET /api/auth/google` and `/api/auth/google/callback`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET /api/me`, `DELETE /api/me` (deletes the account and everything stored for it)
- `GET /api/answers`, `POST /api/answers` `{questionId, chosen, source: practice|weak}` (the api decides `correct` from `shared/questions.json`)
- `POST /api/exams`, `POST /api/exams/:id/finish` `{questionIds[33], answers[]}` (30 general + 3 state, owner only, once, within 60 min + 2 min grace), `GET /api/exams`
- `GET /api/seed` (the number that fixes the user's deck order, made on first use)
- `DELETE /api/progress` (answers, exams and seed; the account stays)

Errors are `{statusCode, error, code, message}`.

## Local Postgres

The app uses the shared podman containers of this machine, see `../.deployment/localhost/README.md`. `DATABASE_URL=postgresql://einbuergerungstest:<password>@localhost:5432/einbuergerungstest`
goes in `api/.env` (copy `.env.example`, or `pnpm secrets` at the root).

## Database scripts

```bash
pnpm db:migrate     # apply pending migrations from src/db/migrations (also runs on server start)
pnpm db:reset       # drop schema public and re-apply every migration; refuses NODE_ENV=production
```

Applied migrations are immutable: `db:migrate` fails when an applied file changed on disk. Ship schema changes as a new numbered file.

## Request guard and rate limits

Every route but `/api/health` is refused unless the `Host` is in `TRUSTED_HOSTS` (required in production), the request is https in production, and any `Origin` is the frontend
origin or in `TRUSTED_ORIGINS`. Rate limits are per client address (`request.ip`: behind Caddy it is the real client only when `TRUSTED_PROXIES` is set, `loopback,uniquelocal`
in production): 30 a minute for sign-in and its callback, 200 for everything else; `/api/health` has none. Counters live in the process, so they assume one api instance.

## Tests

`pnpm test` needs no database: the specs run MikroORM on PGlite (Postgres in WASM), each spec file in its own in-memory database built from `src/db/migrations`. Spec helpers import
the database through the `#testdb` alias, so the same specs also run against a real Postgres.

`pnpm test:real` runs every spec against real Postgres, plus the specs PGlite cannot run (`test/db/{migrate,reset,setup}.spec.ts`, `test/real/`). Each spec file gets its own
scratch database that is dropped afterwards. Point it at a role that may create databases:

```bash
REAL_DATABASE_URL='postgresql://<role>:<password>@localhost:5432/postgres' pnpm test:real
```
