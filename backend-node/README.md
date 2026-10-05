# Node backend

TypeScript backend for Jira Logger, using Fastify, SQLite (`node:sqlite`), Luxon and
Undici. It provides settings, tags, tasks and reports, timers, Jira integration,
and Jira work-log endpoints, plus database maintenance commands.

## Requirements and setup

- Node.js 24.15 or newer within major 24 and npm.
- A local writable SQLite path and a single database owner.
- Built frontend assets if the backend should serve the UI.

Run from the repository root:

```sh
npm ci --prefix backend-node
npm run build --prefix backend-node

export SQLITE_PATH="$PWD/jira-logger.sqlite"
node backend-node/dist/cli.js prepare-db

npm start --prefix backend-node
```

`prepare-db` creates the SQLite file if missing, applies migrations and loads default
settings and tags only for a fresh schema. Server startup acquires exclusive
ownership, applies migrations and initializes fresh defaults before opening ingress.
Existing and imported version-1 databases are not reseeded at startup. Stop the
server before maintenance commands requiring exclusive database ownership.

Preparation already seeds a fresh database; explicit seed commands are optional
maintenance operations listed below, not required setup or import steps. Do not
load seeds as part of a PostgreSQL import. When serving the separately built UI,
set `ASSETS_PATH` to its absolute directory, for example
`export ASSETS_PATH="$PWD/frontend/dist/jira-logger/browser"` from the repository root.

The build removes `dist/`, compiles TypeScript and resolves source path aliases
with `tsc-alias`. The server entry point is `dist/server.js`; the maintenance
entry point is `dist/cli.js`.

## Configuration

Configuration reads the process environment. Set these variables before starting
the server or running maintenance commands.

Standalone Node does not automatically load `.docker/.env`. Docker deployments
use that file through Compose; follow the root README's commented-template setup
and preserve existing credentials and the manager's migration marker when editing
it. `POSTGRES_MIGRATION_STATUS` belongs to the manager and is not a Node database
setting. The Docker SQLite and asset paths are fixed in the Compose definition.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SQLITE_PATH` | `./data/jira-logger.sqlite` | SQLite file path; Docker uses `/data/jira-logger.sqlite` |
| `APP_INTERNAL_TIMEZONE` | `UTC` | Internal date conversion timezone |
| `APP_DEFAULT_USER_TIMEZONE` | `Europe/Riga` | Fallback user timezone |
| `PORT` | `3000` | Public listener port on `0.0.0.0` |
| `HEALTH_PORT` | `3001` | Private readiness listener port on `127.0.0.1` |
| `ASSETS_PATH` | `./public/ng` | Directory containing frontend assets and `index.html` |
| `CORS_ALLOW_ORIGIN` | `^https?://localhost$` | Regular expression used to match request origins |
| `LOG_FILE` | Unset | Optional file destination for server logs |
| `TLS_CERT_FILE` | Unset | Certificate file for direct HTTPS |
| `TLS_KEY_FILE` | Unset | Private key file for direct HTTPS |

Set both TLS variables together; supplying only one causes configuration to fail.
Without them, the public listener uses HTTP. HTTPS responses include HSTS.
The readiness listener uses HTTP independently of public TLS configuration.

Jira configuration is stored in database settings: `jira.enabled`, `jira.host`,
`jira.personal-access-token`, `jira.user-time-zone` and `jira.locale`.
The setting seed disables Jira and supplies placeholder connection values.
Configure those settings before using Jira integration. The tag seed contains
`CAPEX`, `OPEX` and `OTHER`.

## HTTP interface

Feature controllers under `src/features/` define the API routes:

| Area | Paths |
| --- | --- |
| Settings | `/api/setting`, `/api/setting/:id` |
| Tags | `/api/tag`, `/api/tag/:id` |
| Tasks and reports | `/api/task`, `/api/task/:id`, `/api/task/exist/:name` |
| Timers | `/api/task/:id/time-log`, `/api/task/:id/time-log/:timerId`, `/api/task/:id/time-log/start`, `/api/task/:id/time-log/stop` |
| Timer summaries | `/api/task/active`, `/api/task/today/seconds` |
| Jira | `/api/task/jira/missing`, `/api/task/:id/:date` |
| Jira work logs | `/api/jira-work-log`, `/api/jira-work-log/:id` |

`GET /api/doc` serves the bundled HTML API documentation. `GET /api/monitor`
returns a welcome message and the current time in the user timezone.

`GET /internal/ready` checks database readiness on the private listener and
returns 503 if the check fails. The same path returns 404 on the public listener.
The server locks and prepares the database, then checks readiness before opening
public ingress.

Timer start/stop transitions run atomically in SQLite, so multiple browser tabs
cannot interleave the stop-and-start writes. Tabs still share one application timer
state.

Jira work-log sync updates a known remote id first. Only a confirmed HTTP 404
allows fallback to remote creation; other update failures are surfaced instead of
blindly creating duplicates. A remote success followed by a local database failure
is not compensated automatically; inspect Jira and the audit before retrying.

Static assets are served under `/ng/`; the SPA fallback reads `index.html` from
`ASSETS_PATH`. Set that path to your built frontend directory for local UI use.

## Maintenance commands

After building, run `node backend-node/dist/cli.js <command>` from the repository
root.

| Command | Action |
| --- | --- |
| `prepare-db` | Create the file if needed, migrate and seed defaults only for a fresh schema |
| `migrate` | Apply pending migrations |
| `migrations:status` | Print migration status |
| `seed:load setting` / `seed:load tag` | Load the named seed |
| `seed:setting` / `seed:tag` | Aliases for loading the named seed |
| `seed:unload setting` / `seed:unload tag` | Remove entries by seed name |
| `app:audit:jira-sync-data` | Print the Jira sync data audit as JSON |
| `db:backup <path>` | Write a consistent SQLite backup without overwriting an existing destination |

Immutable migration SQL lives in `src/features/maintenance/migrations/*.sql`.
Schema versions are recorded with SQLite `PRAGMA user_version`; add a new migration
for later changes instead of editing an applied migration. Build scripts copy the
SQL files into `dist/`.

CLI operations acquire exclusive ownership except `db:backup`, `migrations:status`
and `app:audit:jira-sync-data`, which can run alongside the server. Server, CLI
writers and restore share a SQLite exclusive transaction on the `.lock` sidecar.
The OS releases ownership after a crash or forced kill, allowing the next owner
to start automatically. The sidecar remains on disk; never delete or replace it
while an owner is running, since doing so breaks mutual exclusion.

When upgrading from PID-file locks, stop **all** server and maintenance owners
before clearing the old PID text from the `.lock` file once. Container PIDs do
not reliably identify owners from the host. No lock cleanup is needed afterward.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `src/application/` | Application composition, environment configuration and injectable resources |
| `src/database/` | SQLite connection, transactions and database record types |
| `src/features/` | Feature controllers, services, repositories and maintenance commands |
| `src/http/` | Fastify server, private health server, system routes and HTTP helpers |
| `src/logging/` | File log stream that reopens the file for each append |
| `src/time/` | Date conversion and database-backed user timezone lookup |
| `src/shared/` | Coercion, validation, response mapping and shared response types |
| `test/` | Application, database, health server, maintenance and ESLint configuration tests |
| `eslint-rules/` | Local ESLint rules |

`Application` owns the database, settings repository, timezone service and
maintenance service. It constructs feature routes and lazily creates the Jira
client when routes are requested. Controllers adapt HTTP requests, services
implement workflows, repositories own SQL, and `ResponseMapper` produces response
DTOs from supplied records.

`HttpServer` owns the public Fastify server and private readiness server.
Shutdown drains those listeners before closing application resources.
`src/server.ts` and `src/cli.ts` provide executable entry points guarded so that
importing them does not start the application.

## Development checks

### Architecture and development conventions

Keep controllers thin: they match routes, decode and validate requests, invoke services, and return HTTP responses. Feature `*.types.ts` files describe request/filter data and service or repository interfaces; validation helpers enforce input rules. Services implement task, timer, Jira, settings and report workflows. Repositories own SQL, filtering and relationships, while database record types describe persisted values. Shared and time helpers handle stateless coercion, duration calculations and timezone conversion.

Use constructor injection and explicit TypeScript types. Keep network calls and awaited work outside synchronous database transactions. Add a numbered SQL migration for schema changes, and preserve endpoint validation, status codes and response shapes when changing workflows. Update `src/http/documentation.constants.ts` when an API contract changes. Do not expose internal exceptions, tokens, authorization headers, passwords or database credentials in responses or logs.

### Tests, static analysis and formatting

Run from the repository root:

```sh
npm run build --prefix backend-node
npm run lint --prefix backend-node
npm test --prefix backend-node
```

TypeScript uses strict checking, including `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` and `noImplicitOverride`. ESLint treats warnings as
failures; `npm run lint:fix --prefix backend-node` applies automatic fixes.
Vitest runs `src/**/*.spec.ts` and `test/**/*.spec.ts`. Some lifecycle tests open
ephemeral loopback ports to exercise socket shutdown behavior.

Run a focused test or apply available formatting fixes:

```sh
npm test --prefix backend-node -- --run test/database.test.spec.ts
npm test --prefix backend-node -- --run -t 'test name'
npm run lint:fix --prefix backend-node
```

### Before committing

Run build, lint and tests. Review new SQL migrations, verify updated API documentation, and cover validation failures, integration errors, database constraints, date/timezone boundaries and daylight-saving changes. For frontend or deployment changes, run the frontend checks and relevant container smoke tests as well. Dependency auditing remains available with `npm audit --prefix backend-node`; review updates with `npm outdated --prefix backend-node`.

## Response format

Successful JSON responses generally use a `data` envelope:

```json
{ "data": {} }
```

API errors use `errors`, either a list of messages or a field-to-message object for structured validation:

```json
{ "errors": ["Error message"] }
```

Some successful mutations return HTTP 204 with no response body. Preserve each endpoint's existing shape and status code rather than introducing an envelope for those responses. See the HTTP response helpers and feature controllers for the exact behavior.

## Jira integration

Jira communication uses the Node Jira client and Undici transport. Configure the Jira URL, personal access token, enabled state, locale and user timezone through application settings. The frontend issue importer creates local tasks from selected Jira issues. Task names used for work-log synchronization must match an issue key, such as `PROJECT-123`.

The backend calculates reportable durations, creates or updates remote work logs, and stores their Jira identifiers and calendar dates locally. Synchronization requires at least 60 seconds. Overlapping synchronization requests for the same task/date share one in-process operation. Deleting a local timer or local Jira work-log record does not itself issue a remote Jira deletion; preserve the service's existing behavior when extending it.

Only a confirmed remote HTTP 404 allows an update to fall back to creation. Other failures require inspection before retrying, particularly when Jira may have accepted a write before the local database update failed. Use `app:audit:jira-sync-data` to inspect duplicate work-log metadata and invalid timer ranges. Keep secrets out of integration logs.

## Offline database tools

`node backend-node/dist/db-tools.js import-postgres SNAPSHOT NEW_SQLITE` imports
a validated exporter snapshot into a new file and verifies the result; existing
destinations are refused. `node backend-node/dist/db-tools.js restore BACKUP DESTINATION`
validates and installs a backup while the server is stopped, using exclusive
ownership locking. Both snapshots and databases contain Jira credentials and
must be stored privately. See the root README for cutover, backup and rollback.
