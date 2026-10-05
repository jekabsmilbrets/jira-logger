# Jira Logger

Self-hosted task and time tracking with an Angular PWA, Node.js 24.15+ / Fastify API and SQLite storage. Jira connection settings and credentials live in database settings.

## Requirements

- Docker and Docker Compose for the packaged deployment.
- A hostname for HTTPS, normally `jira-logger.io`.
- Persistent local storage for a single application instance. One user can use several browser tabs.
- A Jira URL and personal access token when Jira integration is enabled.
- For development: Node.js 24.15 or newer within major 24 and npm; see the component READMEs below.

## Setup

1. For a new deployment, copy `.docker/.env.example` to `.docker/.env`. For an existing deployment, edit the existing file and preserve its credentials and `POSTGRES_MIGRATION_STATUS`; do not overwrite it with the template. Review the commented timezone, browser-access and dashboard sections. Keep credentials out of Git and restrict the file to mode `0600`.
2. Resolve the application hostname to the deployment host. For local access, add `127.0.0.1 jira-logger.io` to `/etc/hosts`; add the configured dashboard hostname too when using it.
3. Build the packaged image. This checks PostgreSQL migration before preparing SQLite and initializes default settings and tags only for a fresh database.
4. Start the application and open [https://jira-logger.io](https://jira-logger.io).

```sh
if [ ! -f .docker/.env ]; then
  cp .docker/.env.example .docker/.env
fi
chmod 600 .docker/.env
# Review timezones, CORS and dashboard authentication.
bash manager.sh -a build
bash manager.sh -a start -b
```

Map `jira-logger.io` to this machine (for local use, `127.0.0.1 jira-logger.io` in `/etc/hosts`) and open https://jira-logger.io. Certificates are generated under `.docker/certs/`; trust the local certificate as needed. Traefik terminates HTTPS by default; `-t off` enables direct Node HTTPS. Replace the example Traefik dashboard password hash before exposing it.

If the Traefik dashboard is enabled, also resolve its configured hostname, normally `traefik.jira-logger.io`. To run directly without Traefik, use `bash manager.sh -a start -b -t off`. Source changes require rebuilding the image before starting again.

## Run with Docker

After setup, start in the foreground to follow container output, or pass `-b` to run in the background:

```sh
bash manager.sh -a start
bash manager.sh -a start -b
```

Traefik is enabled by default. For direct Node HTTPS with persisted host logs:

```sh
bash manager.sh -a start -b -t off -l on
```

Containers contain compiled files rather than mounted application source. After changing source, build and start again:

```sh
bash manager.sh -a build
bash manager.sh -a start -b
```

The image packages both compiled backend files at `/app/dist` and production Angular assets at `/app/public/ng`. There is one application instance and one persistent volume, `jira-logger_sqliteData`, containing `/data/jira-logger.sqlite` and its SQLite sidecars. The entrypoint prepares `/data` ownership for the unprivileged `node` user. No PostgreSQL, PHP, Nginx or asset initializer is part of the runtime.

## Common operations

```sh
bash manager.sh -a rebuild    # rebuild, check/import PostgreSQL and prepare SQLite
bash manager.sh -a migrate    # check cutover and apply SQLite schema migrations
bash manager.sh -a db-dump    # create ./db_backup.sqlite without overwriting it
bash manager.sh -a down       # stop containers while retaining database volumes
docker logs -f jira-logger-node
```

Rebuild preserves database records and does not reload seeds into an imported or existing database. `db-remove` permanently deletes SQLite data. For host log persistence, start with `-l on`; active logs live under `.logs/jira-logger/`, with seven-day archive cleanup. See [Backup and restore](#backup-and-restore) before restoring or deleting database files.

## `manager.sh` reference

Use `bash manager.sh -a ACTION`, with `-b` for background startup, `-t on|off` for Traefik (default on), and `-l on|off` for host logs (default off). Runtime/backend selection has been removed.

| Option | Values | Default | Purpose |
| --- | --- | --- | --- |
| `-a` | Action name | Required | Select the operation |
| `-b` | Flag | Off | Start in the background; otherwise attach to output |
| `-l` | `on`, `off` | `off` | Persist host logs |
| `-t` | `on`, `off` | `on` | Enable Traefik ingress |
| `-h` | Flag | — | Show built-in help |

| Action | Behavior |
| --- | --- |
| `build` | Build image, check/import PostgreSQL, stop application writers and prepare SQLite; seed only a fresh database |
| `start` | Generate certificates, drain old application containers, start and wait for readiness |
| `start-with-init` | Prepare database before starting; defaults load only for a fresh schema |
| `down` | Stop containers; retain volumes |
| `rebuild` | Build and check/import PostgreSQL before removing old containers, then prepare SQLite; retain data |
| `prepare-db` / `migrate` | Explicit schema maintenance |
| `migrate-postgres` | Build image and check/import the legacy PostgreSQL deployment without starting the application |
| `seed` | Load settings and tag seeds |
| `db-dump` | Safe SQLite backup to `./db_backup.sqlite`; refuses an existing output |
| `upgrade` | Safe timestamped SQLite backup, stop, build, migrate and start |
| `db-remove` | Delete only `jira-logger_sqliteData`; Docker refuses an attached volume |

`db-remove` permanently deletes SQLite data. It never removes the legacy `jira-logger_dbData` PostgreSQL volume. Server startup acquires exclusive ownership, applies migrations and seeds defaults only for a fresh schema before opening ingress. Existing and imported version-1 databases are not reseeded. Stop the server before mutating CLI maintenance; backup, migration status and Jira sync audit can run alongside it.

Use Docker logs normally. `-l on` persists logs under `.logs/jira-logger/`, retains the size governor and seven-day archive cleanup. Public endpoints include `/api/monitor` and `/api/doc`; readiness remains internal on port 3001.

Examples:

```sh
bash manager.sh -h
bash manager.sh -a start -b
bash manager.sh -a start -b -t off -l on
bash manager.sh -a rebuild
bash manager.sh -a migrate-postgres
bash manager.sh -a migrate
bash manager.sh -a prepare-db
bash manager.sh -a seed
bash manager.sh -a db-dump
bash manager.sh -a upgrade
docker logs -f jira-logger-node
```

## Jira import

Configure the Jira host and personal access token from the Settings page. The Jira import action then appears in the Tasks toolbar. Filter by assignee, reporter, resolution, project keys and result limit; select issues to create local tasks and adjust their tags before importing.

## Repository layout

- `backend-node/` — Node API, business services, SQLite repositories, migrations, maintenance CLI and tests.
- `frontend/` — Angular PWA, components, services and frontend tests.
- `.docker/` — Multi-stage image build, Compose overlays, certificate tooling and environment template.
- `tools/` — PostgreSQL export tooling and manager migration workflow tests.
- `manager.sh` — Docker lifecycle, migration checks, preparation and backup operations.

## Project specification

### Backend

- Node.js 24.15+ within major 24, TypeScript, Fastify 5, Vitest and ESLint.
- Built-in `node:sqlite` with one runtime connection, WAL, foreign keys and a five-second busy timeout.
- Controllers adapt HTTP requests; services implement workflows; repositories own prepared SQL and synchronous transactions.
- Six application tables: settings, tags, tasks, task/tag links, timers and Jira work logs.
- UTC millisecond timestamps for instants; calendar dates remain `YYYY-MM-DD` text. Luxon preserves user timezone conversion and report boundaries.
- Maintenance commands cover preparation, numbered SQL migrations, seed load/unload, Jira sync audit, import, backup and restore.
- See [backend-node/README.md](backend-node/README.md) for endpoint paths, command syntax, source structure and runtime configuration.

### Frontend

- Angular 22 PWA and Angular Material 22.
- Frontend-only development requires Node.js 22.22.3 or newer and npm 10.9.8 or newer; use Node 24.15+ within major 24 when developing the combined application.
- Tasks, tags, settings, timer controls, reports and Jira issue import.
- Refreshes authoritative task/timer/total state after mutations and when a tab becomes visible, preserving unsaved task forms.
- Production assets are built into the Node image; the Node server serves `/ng/` assets and Angular deep-link fallback.
- See [frontend/README.MD](frontend/README.MD) for Angular development, scaffolding, builds and tests.

### Infrastructure

- Docker Compose runs the packaged application, with optional Traefik HTTPS ingress and routing.
- Direct Node HTTPS is available with `-t off`; certificates are generated under `.docker/certs/`.
- SQLite persists in `jira-logger_sqliteData` at `/data/jira-logger.sqlite`; the runtime entrypoint prepares directory ownership for Node.
- Readiness uses the private loopback listener on port 3001; public API monitoring and documentation remain available.
- Optional host log persistence includes size limits and seven-day archive cleanup.
- PostgreSQL tooling is used only during cutover. The runtime needs no PHP, Composer, Doctrine, PostgreSQL service or shared asset initializer.

## Configuration

Docker Compose reads `.docker/.env`; standalone Node reads its process environment and does not automatically load that file. Use the template only to create a missing deployment file. For an existing file, compare the template's comments and keys and update it in place, retaining configured values and the migration marker. Compose fixes the database and asset locations, while local development can configure them directly.

The deployment file contains the two application timezones, `CORS_ALLOW_ORIGIN`, the two Traefik dashboard settings and, after validation, `POSTGRES_MIGRATION_STATUS`. `SQLITE_PATH`, asset paths, listener ports, TLS and logging are supplied by Compose overlays or standalone process configuration; adding them to `.docker/.env` alone does not override the current Compose definitions. PostgreSQL connection variables, `DATABASE_URL`, PHP application settings and asset-initializer API variables are no longer required for the SQLite deployment. The automatic cutover reads the legacy database/user configuration from its existing PostgreSQL container.

Leave the commented migration marker unset for a new deployment. Retain the active `migrated` marker on a completed cutover, including when the original PostgreSQL volume remains for recovery. Do not clear it when refreshing environment comments or copying settings: without it, the manager refuses the ambiguous combination of SQLite and retained PostgreSQL data. Back up `.docker/.env` privately along with recovery artifacts.

After changing deployment settings, apply them by starting the stack again with the same ingress/log options you normally use, for example `bash manager.sh -a start -b`. Environment-only edits do not require an image rebuild. Review CORS as a regular expression for the browser's scheme, hostname and port; the database-backed user timezone overrides the fallback setting.

| Setting | Purpose |
| --- | --- |
| `SQLITE_PATH` | Standalone database path; Docker sets `/data/jira-logger.sqlite` |
| `ASSETS_PATH` | Built frontend directory; Docker sets `/app/public/ng` |
| `APP_INTERNAL_TIMEZONE` | Internal calendar-date conversion timezone; default `UTC` |
| `APP_DEFAULT_USER_TIMEZONE` | Fallback user timezone; default `Europe/Riga` |
| `CORS_ALLOW_ORIGIN` | Allowed origin regular expression |
| `PORT`, `HEALTH_PORT` | Standalone public/private listener ports; defaults `3000`/`3001` |
| `TLS_CERT_FILE`, `TLS_KEY_FILE` | Both required together for standalone/direct HTTPS |
| `LOG_FILE` | Optional Node log file; Compose host-log overlays configure it |
| `TRAEFIK_DASHBOARD_HOST` | Dashboard hostname |
| `TRAEFIK_DASHBOARD_AUTH` | Dashboard Basic Auth password hash; replace the example |
| `POSTGRES_MIGRATION_STATUS` | Manager-written `migrated` or `not-required` marker after validation |

Jira settings live in the database and are edited on the Settings page: `jira.enabled`, `jira.host`, `jira.personal-access-token`, `jira.user-time-zone` and `jira.locale`. Fresh defaults disable Jira and supply placeholders; imported settings retain their existing values. Seed tags are `CAPEX`, `OPEX` and `OTHER`.

## PostgreSQL cutover

`build`, `rebuild`, `start`, `start-with-init`, `upgrade`, `prepare-db` and `migrate` check for migration automatically. You can also run `bash manager.sh -a migrate-postgres`. This discovers the old Compose `db` container by its `jira-logger` project label, stops project application writers, starts the old database if needed, and uses its installed `pg_dump` and `psql` with its existing database/user configuration. Stop any external writers or scheduled jobs yourself before invoking the action.

Private recovery artifacts are retained under `.migration-backups/postgres.XXXXXXXX/`: `recovery.dump` and `postgres-snapshot.json`. The existing importer validates and publishes a new SQLite file without overwriting an existing database. The original PostgreSQL volume is never deleted. Migration artifacts may contain credentials and must remain private.

Keep `.docker/postgresql/postgresql.conf` in place until cutover completes: existing PostgreSQL containers bind-mount it and need it to restart. The exporter floors PostgreSQL microsecond timestamps to integer milliseconds, matching the previous JavaScript date handling, including dates before 1970. Sub-millisecond precision remains in the untouched source and `recovery.dump`; second-based timer totals are preserved. Non-finite and out-of-range timestamps still fail validation.

To check export/import and stopped-container restart against isolated PostgreSQL containers, build the backend and run `node --test tools/test-postgres-migration.mjs`. Docker and a locally available `postgres:13-alpine` image are required; `POSTGRES_TEST_IMAGE` can select another image. The checks remove their temporary containers, volumes and data afterward.

After validation, the manager atomically writes `POSTGRES_MIGRATION_STATUS=migrated` to `.docker/.env`, preserving other settings. It writes `not-required` for a validated SQLite deployment without a legacy source, including fresh initialization. Every subsequent run checks SQLite schema, integrity and foreign keys again. A completion marker with a missing SQLite database fails and requires restoration; it cannot silently initialize a replacement. Both databases without a completed migration marker, or a legacy volume whose database container is missing, also fail instead of guessing. If interrupted after import but before recording the flag, inspect the retained artifacts and validate the destination before resolving the marker manually.

Build actions may stop application writers; run `start` afterward when ready. Automatic migration does not start the new application by itself. For a source outside the old Compose deployment, use the manual procedure below.

Plan a maintenance window. Keep the previous checkout/image, its `.docker/.env`, and the PostgreSQL volume intact. Do not run new-stack `down --remove-orphans` until the old database has been exported: it may remove its container, although it preserves its volume. Do not use `docker compose down -v` or prune volumes.

1. Stop old API writers and ingress, including PHP/Node containers and scheduled maintenance, while keeping PostgreSQL accessible. Capture a conventional `pg_dump` as a separate recovery artifact. Use `psql` with a connection service or `.pgpass` (mode 0600), not credentials embedded in shell history. Preserve the old deployment configuration privately.
2. Export a consistent snapshot with the provided exporter. It accepts the known original schema and the known post-migration schema; unsupported, mixed or unexpected shapes fail instead of guessing.

   ```sh
   umask 077
   tools/export-postgres.sh postgres-snapshot.json
   ```

   Configure `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `.pgpass` for the old server. See the exporter help for its arguments. This is an operator migration tool, not a PostgreSQL runtime dependency.
3. Build the new backend and import into a **new** file. Do not run seeds on the imported database.

   ```sh
   npm ci --prefix backend-node
   npm run build --prefix backend-node
   node backend-node/dist/db-tools.js import-postgres postgres-snapshot.json ./imported.sqlite
   ```

   The importer refuses an existing destination. Retain its verification output: compare source/import counts for settings, tags, tasks, task tags, time logs and Jira work logs; check identifiers, UTC dates, Jira ids and links. Verify SQLite integrity and foreign keys and inspect the Jira sync audit. Resolve any failure before cutover. Exported settings include Jira tokens; imported settings must retain their ids and values.
4. With the new server stopped, install the verified database into the new volume using the restore tool. The tool uses the same exclusive ownership lock as the server and refuses a live database. Build the image with Compose directly for this manual procedure; `manager.sh build` would attempt automatic cutover. The restore run creates the SQLite volume if missing. Mount the imported backup read-only and use a root maintenance process to read its private host permissions, then transfer the installed file to the Node runtime user:

   ```sh
   docker compose --env-file .docker/.env -p jira-logger \
     -f .docker/docker-compose.yml -f .docker/docker-compose.node.yml \
     build node

   docker compose --env-file .docker/.env -p jira-logger \
     -f .docker/docker-compose.yml -f .docker/docker-compose.node.yml \
     run --rm --no-deps --user 0 --entrypoint sh \
     -v "$PWD/imported.sqlite:/backup/imported.sqlite:ro" node -c \
     'node dist/db-tools.js restore /backup/imported.sqlite /data/jira-logger.sqlite && chown node:node /data/jira-logger.sqlite'
   ```

5. Run migration status and the Jira sync audit against the installed file. After successful manual import/restore and validation, activate `POSTGRES_MIGRATION_STATUS=migrated` in the existing `.docker/.env`, preserving all other values. This manual record is needed before manager startup when retaining the old PostgreSQL volume; the automatic workflow records it itself. Start the application and smoke-test settings, task/tag relationships, historical reports, timers and Jira work logs before admitting writers. Record the exact cutover time. Retain the snapshot, PostgreSQL dump, original environment configuration and legacy volume until the retention/rollback window ends.

Rollback before admitting new writes: stop Node, preserve a SQLite backup, restore the old checkout/configuration and reconnect its PostgreSQL volume. After admitting writes, PostgreSQL is stale. A rollback must first preserve and reconcile every SQLite-only change; switching back silently loses data. There is no automatic reverse migration or ongoing dual-write synchronization.

## Backup and restore

`bash manager.sh -a db-dump` uses the SQLite backup API, including committed WAL data, and publishes a private (0600) file without overwriting an existing backup. Never copy only the live `.sqlite` file or delete its WAL/SHM sidecars. Move earlier backups to secure storage before requesting the default name again. `upgrade` creates `db_backup.pre-upgrade.YYYY-MM-DD_HHMMSS.sqlite` before changing the deployment.

To restore, stop the server and any CLI writers. Run `db-tools.js restore BACKUP DESTINATION` as the database owner, using the volume command above. It validates the backup and acquires exclusive ownership; preserve the current database first, then inspect migration status and audit results before restart. Ownership uses a SQLite exclusive transaction on the persistent `.lock` sidecar; the OS releases it automatically after a crash or forced kill. Never delete or replace that sidecar while an owner is running. Upgrading from PID-file locks requires stopping every server and CLI owner and clearing the old PID text once; subsequent restarts need no cleanup. Store snapshots/backups encrypted with restricted access: they contain task history, settings and Jira credentials. Keep them out of Git, logs, tickets and public artifacts.

## Timers and Jira sync

Timer start/stop transitions are atomic across browser tabs; all tabs share the
same running timer state. Jira sync updates a known remote work-log id and falls
back to creation only on a confirmed HTTP 404. Other update errors remain failures.
If Jira accepts a change but the local write fails, inspect the remote work log and
audit before retrying; remote success is not automatically undone.

## Node development

The Node backend lives in `backend-node/` and uses TypeScript, Fastify, Vitest and ESLint. See [backend-node/README.md](backend-node/README.md) for configuration, source structure, CLI commands and API conventions.

```sh
npm ci --prefix backend-node
npm run build --prefix backend-node
npm run lint --prefix backend-node
npm test --prefix backend-node
export SQLITE_PATH="$PWD/jira-logger.sqlite"
# Serve a separately built frontend when using the standalone backend.
export ASSETS_PATH="$PWD/frontend/dist/jira-logger/browser"
npm start --prefix backend-node
```

Build the frontend before starting Node when serving it through `ASSETS_PATH`. The frontend development server runs separately with live source reload:

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend -- --watch=false
npm start --prefix frontend
```

See [frontend/README.MD](frontend/README.MD) for development-server details, Angular scaffolding, unit tests and end-to-end tooling. Set frontend API configuration and backend CORS to match your development host.
