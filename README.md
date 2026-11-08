# Einbürgerungstest

Trainer for the official naturalisation test catalogue (300 general + 10 Nordrhein-Westfalen questions) at **https://test.tsopany.com**. German UI, Google sign-in, progress per user in Postgres.

The build plan is in `PLAN.md`. Stack: `api/` (Fastify + TypeScript + MikroORM + Postgres 17), `client/` (Vue 3 + Vite + Pinia + vue-router + vue-i18n), `shared/` (zod, pure TypeScript used by both).

```bash
pnpm i && pnpm -C shared i && pnpm -C api i && pnpm -C client i
pnpm secrets           # renders api/.env from Infisical `dev`, see .deployment/localhost/README.md
pnpm -C api serve      # http://localhost:8115/api/health
pnpm -C client serve   # http://localhost:3051 (runs Vite through `infisical run`, needs `infisical login`)
pnpm check             # format, lint, typecheck, build, test for shared, api and client
```
