# Setup checklist

Everything that cannot be done from code, in the order it has to happen. Code is finished through the VM stack (see `PLAN.md` §7); nothing below is done yet.
Names: app `einbuergerungstest`, domain `test.tsopany.com`, api port `8115`, client port `3051`, Infisical project `einbuergerungstest` (envs `dev`, `prd`).

## 1. Repositories

- [ ] `tsopany/einbuergerungstest`: review the tree, make the first commit on `main` (use `pnpm commit`), create the GitHub repo, push.
- [ ] `tsopany-vm-setup`: review `git diff` + `einbuergerungstest/`, commit, push (do not set anything else yet; its deploy is gated by `VM_DEPLOY_ENABLED`).

## 2. Google sign-in

Google Cloud Console > APIs & Services > Credentials. The consent screen must be published (not "testing") or only listed test users can sign in.

- [ ] OAuth client **dev**: authorized origin `http://localhost:3051`, redirect URI `http://localhost:8115/api/auth/google/callback`.
- [ ] OAuth client **prod**: authorized origin `https://test.tsopany.com`, redirect URI `https://test.tsopany.com/api/auth/google/callback` (byte-exact).
- [ ] Keep both client id/secret pairs for step 3.

## 3. Infisical (`https://secrets.tsopany.com`)

- [ ] Create project `einbuergerungstest` with environments `dev` and `prd`.
- [ ] Add to `dev` only: `VITE_API_BASE_URL` = `http://localhost:8115` (the dev client reads it through `infisical run`; production builds use the GitHub variable).
- [ ] Add to **both** envs (values differ): `DB_USER` = `einbuergerungstest`, `DB_DATABASE` = `einbuergerungstest`, `DB_PASSWORD` (URL-safe: `openssl rand -base64 24 | tr -d '/+='`),
  `JWT_SECRET` (`openssl rand -base64 48`), `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` (dev client in `dev`, prod client in `prd`).
- [ ] Give the deploy Machine Identity read access to the project (Access Control > Machine Identities) for env `prd`.
- [ ] In the app repo root: `infisical init`, pick the project, commit `.infisical.json`.
- [ ] Copy the project id for step 6.

## 4. Local run (optional but worth doing once before deploying)

- [ ] `pnpm i && pnpm -C shared i && pnpm -C api i && pnpm -C client i`
- [ ] `pnpm secrets` (renders `api/.env` and the podman command files from `dev`), then follow `.deployment/localhost/README.md` for the shared postgres and the database.
- [ ] `infisical login` (the client's `serve` script runs Vite through `infisical run`, no `.env` file needed).
- [ ] `pnpm -C api serve` and `pnpm -C client serve`; sign in with Google at `http://localhost:3051`, answer a question, run a mock exam.

## 5. DNS

- [ ] A record `test.tsopany.com` -> the VM IP (same IP as `stage.tsopany.app`). Caddy fetches the certificate by itself once the host resolves.

## 6. GitHub settings

In `tsopany/einbuergerungstest`, Settings > Environments > **production**:

- [ ] Secrets: `SSH_PRIVATE_KEY`, `GHCR_PAT` (read:packages), `SONAR_TOKEN`, `SONAR_HOST_URL` (same values the other apps use).
- [ ] Variables: `SSH_HOST`, `SSH_USERNAME` (`deploy`), `VITE_API_BASE_URL` = `https://test.tsopany.com`.

In `tsopany/tsopany-vm-setup`, Settings > Secrets and variables > Actions > Variables:

- [ ] `INFISICAL_PROJECT_ID_EINBUERGERUNGSTEST` = the project id from step 3.
- [ ] `VM_DEPLOY_ENABLED` = `true` if it is not set already (it is a repository variable).

Optional: SonarQube project `tsopany_einbuergerungstest_app` on `https://sonar.tsopany.com`; branch protection on `main`.

## 7. First deploy (order matters)

The api image and the SPA must exist before the stack starts, and the stack must exist before Caddy joins its network.

- [ ] Push the app repo to `main`. `check-main-server.yml` runs the specs on Postgres and pushes `ghcr.io/tsopany/einbuergerungstest-api:latest`; its **deploy step fails on this first run**
  (the folder on the VM does not exist yet) - that is expected. `check-main-client.yml` copies the SPA to `/var/deploy/einbuergerungstest/client`.
- [ ] If the GHCR package is private, check that the VM's `docker login ghcr.io` user can read `einbuergerungstest-api` (package settings > access).
- [ ] In `tsopany-vm-setup`, run **Deploy einbuergerungstest** (Actions > Run workflow). It uploads the stack, renders `api.env` and `docker-compose.yaml` from Infisical `prd`, creates the folders and starts it.
  If the render fails, read the error: a missing Infisical secret renders empty and the workflow checks the healthcheck escaping only.
- [ ] On the VM check nothing rendered empty: `cd /var/deploy/einbuergerungstest && grep -nE '^[A-Z0-9_]+=$' api.env` (only `TRUSTED_ORIGINS=` may be empty) and `docker compose ps` (both healthy).
- [ ] Run **Deploy caddy** (it now joins `einbuergerungstest_einbuergerungstest_network` and mounts the client folder).
- [ ] `curl -I https://test.tsopany.com` and `curl https://test.tsopany.com/api/health` -> `{"status":"ok"}`.

## 8. After it is up

- [ ] Smoke test on the real site: sign in with Google, answer a question, reload (progress stays), run an exam to the result page, reset progress, sign out.
- [ ] Backups: on the VM `chmod +x /var/deploy/einbuergerungstest/*.sh`, add the cron line from the `tsopany-vm-setup` README (`45 7 * * * .../backup.sh`), run `backup.sh` once by hand,
  then `./verify-restore.sh` (a backup that was never restored is not a backup).
- [ ] A later push to `main` redeploys client and api on its own; confirm the deploy step of `check-main-server.yml` is green this time.

## 9. Before telling anyone

- [ ] Replace the placeholder contact address in `client/src/lib/legal.ts` (`privacy@tsopany.com` was made up) and add an Impressum (operator name and address) - a public German site needs one.
- [ ] Picture credits are shown under the options of the 6 credited questions; check one on the live site.
- [ ] Optional: `pnpm nexus` (GitNexus index; `gitnexus setup` changes tool config, so run it yourself).
