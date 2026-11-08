# Local Development

The app runs against the **shared** podman postgres every tsopany app uses on this machine (network `tsopany_network`). Container commands live in
`localhost.podman.commands.template`: render it once with real secrets, then copy-paste the numbered blocks from the rendered file.

## Prerequisites

- Podman, machine running (`podman machine start` on Windows/macOS)
- Infisical CLI logged in to the self-hosted instance (`infisical login` → Self-Hosting → `https://secrets.tsopany.com`, see `../INFISICAL.md`)
- `envsubst` for rendering only - Git Bash or WSL on Windows, `gettext` on mac/Linux
- Node `>=24.6.0`, pnpm 12

## Render everything

`pnpm secrets` (repo root) renders every template in this folder in one go: `api/.env`, `localhost.podman.commands.md` and `DB_DUMP.md`.

## Run

```bash
pnpm i && pnpm -C shared i && pnpm -C api i && pnpm -C client i
pnpm -C api serve                   # http://localhost:8115/api/health (migrations apply on start)
pnpm -C client serve                # http://localhost:3051
```

## Database dump & restore

See `DB_DUMP.template` (render it like the commands file). Scripts in `scripts/`, archives in `dump/`.
