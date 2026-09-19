# Node backend architecture

This implementation preserves the PHP-compatible HTTP API, database schema,
migration history, environment variables and maintenance commands. The OOP
refactor changes only `backend-node/`. Existing PHP, frontend, Compose, manager
and compatibility fixture files remain unchanged.

## Ownership and dependencies

`Application` in `src/application.ts` is the composition root. Each instance owns
its configuration, database pool, repositories, timezone provider, services,
controllers and Jira transport. Constructor injection permits independent
applications and replacement persistence/transport boundaries in tests.

- Controllers in the feature modules adapt Fastify requests and responses.
- Services in those modules validate input and implement workflows. They have
  no SQL and accept data rather than Fastify requests or replies.
- Feature repositories own SQL and return records from `src/models.ts`.
- `ResponseMapper` maps supplied records to typed response DTOs without querying.
- `TimezoneService` reads the current setting for each operation; `DateCodec`
  applies the instance's internal timezone. Date parsing retains PHP coercion,
  rollover and daylight-saving behavior.
- `Database` owns transaction boundaries and pool-local PostgreSQL timestamp
  parsers. `JiraClient` owns its Undici dispatcher. Neither creates global clients.
- `MaintenanceService`, `MaintenanceRepository` and `MigrationRepository` share
  the same application resources as HTTP workflows. CLI applications create no
  Jira transport unless HTTP routes are constructed.

Importing `server.js` or `cli.js` neither constructs clients nor reads runtime
configuration. Their executable guards preserve the `dist/server.js` and
`dist/cli.js` entry points. `buildServer(application)` connects Fastify to an
application; `/internal/ready` checks its database. Fastify drains real HTTP
requests before its close hook releases application resources. Application
cleanup is idempotent and attempts both database and Jira cleanup even when one
fails. SIGINT, SIGTERM and a failed listen close the server's resources.

The compiler retains strict mode and enables `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` and `noImplicitOverride`. External JSON is narrowed
from `unknown`; database rows and HTTP projections have explicit types. The
existing Fastify, PostgreSQL, Undici and Luxon dependencies are retained.

## Compatibility investigation and implementation notes

Each extraction followed the existing PHP/Node flow, frontend use, SQL effects,
validation order and failure handling before moving the implementation. Existing
fixtures were rerun at the relevant increment. These details are intentional:

| Subsystem | Preserved behavior | Focused evidence |
| --- | --- | --- |
| Infrastructure | Doctrine URL options are removed; timestamps remain strings within application pools; client construction and imports do not query | `test/database.test.mjs`, `test/application.test.mjs` |
| Settings and tags | Validation/error ordering, token redaction, uniqueness messages and used-tag deletion rejection | Existing `settings`, `resources` and input `matrix` fixtures |
| Tasks | Task and tag changes share one transaction; association lookup errors occur before the write exception handler; null description retains its previous value | Existing `resources` and input `matrix` fixtures |
| Reports | Inclusive boundaries, clipped timer DTOs, original times, active-timer precedence, filter coercion and timezone overlaps | Existing `reports`, `report-matrix` and date tests |
| Timers | Starting first commits stopping all running timers, then inserts separately; an insert failure leaves previous timers stopped | Existing `timer-failure`, `resources` and date fixtures |
| Jira search | Legacy/enhanced search fallback, pagination, case-insensitive duplicate filtering, malformed payload and upstream error distinctions | Existing `jira-search`, `jira-errors` and `jira-transport` fixtures |
| Jira sync | Remote write precedes local persistence; failed local persistence does not compensate remote success; PUT failure fallback and 60-second minimum remain | Existing `jira`, `jira-local`, `jira-errors` and shutdown fixtures |
| Maintenance | Seed idempotency and edited values, unload-by-name, read-only audit, shared advisory lock, migration rollback and historical Riga timestamp conversion | `test/maintenance.test.mjs` and existing migration fixture |

`migrations` and `migrationLock` remain exported by `dist/migrations.js` with the
original SQL and versions. The existing migration fixture creates its own
`pg.Client` and compares timestamp strings. It previously acquired text parsers
as an accidental side effect of importing the backend. Run that unchanged
fixture with the explicit test-only preload below. Application imports do not
install those process-wide parsers.

## Build and run

From the repository root:

```sh
npm ci --prefix backend-node
npm run build --prefix backend-node
node backend-node/dist/server.js
node backend-node/dist/cli.js migrate
node backend-node/dist/cli.js migrations:status
node backend-node/dist/cli.js seed:load setting
node backend-node/dist/cli.js seed:load tag
node backend-node/dist/cli.js app:audit:jira-sync-data
```

Set `DATABASE_URL` for host execution. The existing environment variables also
remain supported: `APP_INTERNAL_TIMEZONE`, `APP_DEFAULT_USER_TIMEZONE`, `PORT`,
`ASSETS_PATH`, `CORS_ALLOW_ORIGIN` and `LOG_FILE`.

The existing manager builds and runs Node in Docker by default. PHP remains an
explicit option, using the shared database:

```sh
sh manager.sh -a build
sh manager.sh -a start-with-init -b
sh manager.sh -a start -b --backend php
sh manager.sh -a start -b --backend node
```

## Verification

Tests performing writes require disposable databases and controlled Jira
fixtures. Follow `../compatibility/README.md` for the existing harness setup.
With that database and PHP/Node fixtures running:

```sh
DATABASE_URL='postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' npm test --prefix backend-node
TZ=UTC node --import ./backend-node/test/support/pg-text-timestamps.mjs --test compatibility/migrations.test.mjs
COMPATIBILITY_URL=http://127.0.0.1:18082 node --test --test-concurrency=1 compatibility/settings.test.mjs compatibility/resources.test.mjs compatibility/reports.test.mjs compatibility/timer-failure.test.mjs compatibility/jira.test.mjs
node --test --test-concurrency=1 compatibility/matrix.test.mjs compatibility/cors.test.mjs compatibility/jira-local.test.mjs compatibility/jira-search.test.mjs compatibility/jira-errors.test.mjs compatibility/report-matrix.test.mjs
RUN_DOCKER_MANAGER_ACCEPTANCE=1 node --test compatibility/manager-docker.test.mjs
```

The manager fixture builds isolated Docker stacks and checks maintenance, log
archives, readiness and data preservation through switching in both directions.
The separate opt-in shutdown fixture requires the acceptance stack described in
the compatibility documentation. Jira transport timeout probes require the
Docker PHP fixture on port 18086 for consistent execution-time limits.

Internal lifecycle tests cover independent injected application instances,
imports without clients, cleanup failures and an in-flight HTTP request during
shutdown. Real socket tests use ephemeral loopback ports: Fastify injection does
not exercise Node's socket-draining behavior.

Local run evidence is stored in ignored `.validation/` logs. Executed acceptance
results for this refactor are recorded in `VALIDATION.md`.
