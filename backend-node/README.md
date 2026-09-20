# Node backend

TypeScript backend for Jira Logger, using Fastify, PostgreSQL (`pg`), Luxon and
Undici. It provides settings, tags, tasks and reports, timers, Jira integration,
and Jira work-log endpoints, plus database maintenance commands.

## Requirements and setup

- Node.js 24 (`>=24 <25` in `package.json`) and npm.
- A reachable PostgreSQL server and credentials for the application database.
- Built frontend assets if the backend should serve the UI.

Run from the repository root:

```sh
npm ci --prefix backend-node
npm run build --prefix backend-node

export DATABASE_URL='postgresql://localhost/jira_logger'
node backend-node/dist/cli.js prepare-db
node backend-node/dist/cli.js seed:load setting
node backend-node/dist/cli.js seed:load tag

npm start --prefix backend-node
```

Replace `DATABASE_URL` with your connection details. `prepare-db` creates the
database if needed and runs migrations; it requires permission to create a
database when one does not exist. Use `migrate` instead for an existing database.
The HTTP server does not run migrations or seeds automatically.

The build removes `dist/`, compiles TypeScript and resolves source path aliases
with `tsc-alias`. The server entry point is `dist/server.js`; the maintenance
entry point is `dist/cli.js`.

## Configuration

Configuration reads the process environment. Set these variables before starting
the server or running maintenance commands.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://localhost/jira_logger` | PostgreSQL connection URL; `serverVersion` and `charset` query parameters are removed |
| `APP_INTERNAL_TIMEZONE` | `UTC` | Internal date conversion timezone |
| `APP_DEFAULT_USER_TIMEZONE` | `Europe/Riga` | Fallback user timezone |
| `PORT` | `3000` | Public listener port on `0.0.0.0` |
| `HEALTH_PORT` | `3001` | Private readiness listener port on `127.0.0.1` |
| `ASSETS_PATH` | `/var/www/public/ng` | Directory containing frontend assets and `index.html` |
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
The server checks readiness before opening public ingress.

Static assets are served under `/ng/`; the SPA fallback reads `index.html` from
`ASSETS_PATH`. Set that path to your built frontend directory for local UI use.

## Maintenance commands

After building, run `node backend-node/dist/cli.js <command>` from the repository
root.

| Command | Action |
| --- | --- |
| `prepare-db` | Create the database if needed, then apply migrations |
| `migrate` | Apply pending migrations |
| `migrations:status` | Print migration status |
| `seed:load setting` / `seed:load tag` | Load the named seed |
| `seed:setting` / `seed:tag` | Aliases for loading the named seed |
| `seed:unload setting` / `seed:unload tag` | Remove entries by seed name |
| `app:audit:jira-sync-data` | Print the Jira sync data audit as JSON |

Migration definitions live in
`src/features/maintenance/migrations.constants.ts`. `src/migrations.ts` exports
`migrations` and `migrationLock` for consumers of `dist/migrations.js`.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `src/application/` | Application composition, environment configuration and injectable resources |
| `src/database/` | PostgreSQL pool, transactions and database record types |
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
