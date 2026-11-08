# INFISICAL.md

Secrets live in Infisical, self-hosted at `https://secrets.tsopany.com`, project `einbuergerungstest`, environments `dev` and `prd`. Only `*.template` files are committed; they hold
`${VAR}` placeholders that `envsubst` fills from Infisical. Secret names: `localhost/SECRETS.md` (dev), `tsopany-vm-setup/einbuergerungstest/SECRETS.md` (prd).

## Local

```bash
npm install -g @infisical/cli
infisical login                     # Self-Hosting -> https://secrets.tsopany.com
infisical init                      # repo root, select project einbuergerungstest -> writes .infisical.json (commit it)
pnpm secrets                        # renders api/.env, localhost.podman.commands.md and DB_DUMP.md from `dev`
```

Vite reads `VITE_*` straight from the process: `infisical run --env=dev --recursive -- vite serve --port 3051`. `VITE_*` values end up in the shipped bundle - never put a
real secret behind a `VITE_` name.

## Production VM

Rendered by `tsopany-vm-setup` (`deploy-einbuergerungstest.yml`): its Machine Identity needs read access to project `einbuergerungstest`, environment `prd`, and its repo variable
`INFISICAL_PROJECT_ID_EINBUERGERUNGSTEST` names the project. `secrets.sh` renders `api.env` and `docker-compose.yaml` from `prd`.
