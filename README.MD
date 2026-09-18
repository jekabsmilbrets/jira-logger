# JIRA-LOGGER

This is a JIRA time logger software for easy time logging.
Project consists of API and Angular PWA.

## Running docker mode

To run in docker mode you need to have Docker and Docker Compose installed.

## Setup

1) Prepare `./.docker/.env` from `./.docker/.env.example` (source of truth template).
2) Build images and initialize the database: `sh manager.sh -a build`
3) Start containers: `sh manager.sh -a start`

Notes:
- `manager.sh` uses the shared Compose files plus the selected backend overlay. Node is the default on every invocation; use `-B php` or `--backend php` explicitly for PHP.
- On a fresh checkout, run `manager.sh -a build` once before `start`; Compose then populates the shared frontend assets volume during startup.
- Backend env variables are loaded from `./.docker/.env` via `docker-compose.yml`.
- `manager.sh` creates the shared Docker `traefik` network automatically when it is missing.
- Host log persistence is disabled by default. Use `docker compose logs` or `sh manager.sh -a start` attached output for normal use. Pass `-l on` only when you explicitly need debug log files in `./.logs/jira-logger/`.
- Use `manager.sh` for compose startup so the required env file, compose overlays, and optional Traefik mode are applied consistently.

## Basic Usage

1) To run with **console output**:
   `sh manager.sh -a start`
2) To run in **background**:
   `sh manager.sh -a start -b`
3) To run with **Traefik**:
   `sh manager.sh -a start -b`
   To disable Traefik:
   `sh manager.sh -a start -b -t off`
   When Traefik is disabled, add a local host mapping such as `127.0.0.1 jira-logger.io` and open `http://jira-logger.io` or `https://jira-logger.io`.
   To enable persisted host logs for debugging:
   `sh manager.sh -a start -b -l on`
4) Runtime containers are copy-only (no backend/frontend bind mounts), so source code changes require image rebuild + restart (`sh manager.sh -a build` then `sh manager.sh -a start`), or `sh manager.sh -a rebuild` followed by `sh manager.sh -a start`.
5) To fully **rebuild** the stack (down + build, including DB prepare and seed):
   `sh manager.sh -a rebuild`
6) To **remove all database data** (dangerous, deletes all data!):
   `sh manager.sh -a db-remove`
7) To **dump the database** to a single SQL file (`db_dump.sql`):
   `sh manager.sh -a db-dump`
8) To run DB migrations using the selected backend:
   `sh manager.sh -a migrate`
9) To **upgrade an existing checkout** from the old stack layout to the new one:
   `sh manager.sh -a upgrade`

- Traefik is enabled by default. Use `-t off` to start without Traefik.
- Traefik dashboard is exposed through HTTPS with basic auth:
  - set `TRAEFIK_DASHBOARD_HOST` and `TRAEFIK_DASHBOARD_AUTH` in `./.docker/.env`
  - default local dashboard host: `traefik.jira-logger.io`
  - add host mapping in `/etc/hosts` for local setup (example): `127.0.0.1 traefik.jira-logger.io`
  - open: `https://traefik.jira-logger.io/dashboard/`
- Frontend assets are stored in a shared Docker volume populated by `assets-init`, which is part of the default stack startup.
- `assets-init` is the only container that writes `runtime-config.json` into the shared frontend assets volume.
- Nginx starts only after Compose reports that `assets-init` completed successfully.
- Runtime logs are available by default through `docker compose logs` and `sh manager.sh -a start` attached output.
- Persisted host logs are a debug-only path. For normal startup, leave `-l` off and use `docker compose logs`.
- To re-enable persisted host logs for debugging, pass `-l on` to `manager.sh`.
- When `-l on` is used, persisted producers write `log-*.log` files under `./.logs/jira-logger/`; new files following that convention are discovered automatically.
- When `-l on` is used, migration output is appended to `log-migrate.log` during `prepare-db` and `migrate`.
- When `-l on` is used, runtime log cap is enforced by `log-governor` container:
  - per-file hard cap: `50MB` (`52428800` bytes)
  - scan interval: `30s`
  - behavior: keeps newest content by size-based trim when a file exceeds cap
  - applies to every `log-*.log` file in the host log directory
- When `-l on` is used, log rotation/cleanup runs on every `start`/`start-with-init`:
  - active `log-*.log` files are rotated to `./.logs/jira-logger/archive/log-*.YYYY-MM-DD_HHMMSS.log`
  - archived logs older than 7 days are deleted

## Importing Tasks from Jira

Enable Jira and configure its host and personal access token on the Settings page. The Jira import icon then appears in the Tasks toolbar.

The import dialog can search by assignee, reporter, resolution, project keys, and a result limit of 50, 100, 150, or 200. Results include only Jira issues that do not already exist as local tasks and can be sorted by key, summary, status, issue type, or updated time.

Select the issues to import. Use the tag action on a result row to review or change its local tags, then import the selected issues.

## Selecting the backend

Both implementations use the same database, migration ledger and frontend assets.
The frontend does not need rebuilding specifically to change backend selection.
Build the selected backend images before starting that selection:

```sh
# Default Node backend
sh manager.sh -a build
sh manager.sh -a start -b

# Retained PHP backend
sh manager.sh --backend php -a build
sh manager.sh --backend php -a start -b

# Return to Node; selection never persists between manager invocations
sh manager.sh -a build
sh manager.sh -a start -b
```

`start` stops ingress, drains the old backend, waits for the selected backend to
be healthy, then starts ingress and removes obsolete services. A readiness failure
leaves ingress stopped. Re-run the desired selection after correcting the failure.
Normal `down`, rebuild and switching preserve database volumes. `db-remove` is
the explicit destructive operation.

`build` and `rebuild` prepare the database and load missing seed settings/tags.
`start-with-init` prepares it without seeding. `upgrade` first backs up the database,
then builds, migrates and starts without seeding. Supply `--backend php` to each
action when retaining PHP, including `upgrade`, `prepare-db`, `migrate` and `seed`.

Node maintenance runs without PHP. For additional maintenance commands:

```sh
docker compose --env-file .docker/.env \
  -p jira-logger -f .docker/docker-compose.yml \
  -f .docker/docker-compose.dev.yml -f .docker/docker-compose.node.yml \
  run --rm node node dist/cli.js app:audit:jira-sync-data
```

Other Node CLI commands are `prepare-db`, `migrate`, `migrations:status`,
`seed:setting`, `seed:tag`, `seed:load setting`, `seed:load tag`,
`seed:unload setting` and `seed:unload tag`. Unloading deletes seed names, including
edited seed records. Audit is read-only and reports duplicate Jira records and
invalid timer ranges. Use `app:migrate` for PHP so both runtimes acquire the same
database advisory lock; direct Doctrine migration invocation bypasses that lock.

Node uses the existing `DATABASE_URL`, `APP_INTERNAL_TIMEZONE`,
`APP_DEFAULT_USER_TIMEZONE` and `CORS_ALLOW_ORIGIN` settings. Jira credentials stay
in the shared settings table and are redacted by the API. Node readiness is internal
to the container; `/api/monitor` remains the public monitor and `/api/doc` documents
the API. With `-l on`, Node writes `log-node.log` under the existing log policy.

Compatibility checks and isolated Docker fixtures are described in
[compatibility/README.md](compatibility/README.md). Full rewrite acceptance is
tracked in [NODE_BACKEND_REWRITE_PLAN.md](NODE_BACKEND_REWRITE_PLAN.md).

## Upgrading Older Checkouts

If you are updating from an older checkout that still used `backend/.env` or bind-mounted frontend assets, run:

`sh manager.sh -a upgrade`

What `upgrade` does:
- requires `./.docker/.env` to exist and treats it as the runtime config source of truth;
- warns if `./backend/.env` is still present, because it is now legacy;
- creates a timestamped pre-upgrade database backup such as `./db_dump.pre-upgrade.YYYY-MM-DD_HHMMSS.sql`;
- stops the old stack, rebuilds images, refreshes shared assets, runs DB migrations, and starts the new stack;
- does not run seed commands.
- starts the upgraded stack in background by default; use `docker compose logs -f` or `sh manager.sh -a start` if you want attached logs afterward.

After first start, a certificate will be generated at `.docker/nginx-selfsigned.crt`,
which should be imported into your system's root certificates to allow SSL for API calls and Angular PWA.

## Project Specification

### API
* Node.js 24 / TypeScript / Fastify 5 (default)
* Symfony 8
* Doctrine
* PostgreSQL
* PHP >=8.5.4 <9.0 / PHP-FPM
* Nginx

### FE
* Angular 22
* Material 22
* Node >=22.22.3
* NPM >=10.9.8
