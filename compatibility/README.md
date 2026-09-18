# Backend compatibility probes

Baseline: `73b3cca2` (clean working tree). The PHP implementation is the reference.

Use `docker compose -p jira-logger-compatibility -f compatibility/compose.yml up -d --wait`
to start the disposable PostgreSQL 13 instance. It uses tmpfs, a distinct project,
and a loopback-only port. Never point write probes at the deployed application.

The PHP router refuses any database URL outside this fixture instance. Run it
with `DATABASE_URL=postgresql://compatibility:disposable@127.0.0.1:55439/compatibility`,
`APP_ENV=prod`, `APP_SECRET=compatibility`, `APP_INTERNAL_TIMEZONE=UTC`,
`APP_DEFAULT_USER_TIMEZONE=Europe/Riga`, and `CORS_ALLOW_ORIGIN=^https?://localhost$`.
Start PHP with `php -S 127.0.0.1:18081 compatibility/php-router.php`.

Build Node with `npm ci --prefix backend-node` and `npm run build --prefix backend-node`.
Use the same database/timezone environment and `PORT=18082` to run
`node backend-node/dist/server.js`. These host fixture servers are separate from
the required Docker runtime.

Run HTTP fixtures sequentially because Jira fixtures temporarily replace settings:

```sh
COMPATIBILITY_URL=http://127.0.0.1:18081 node --test --test-concurrency=1 compatibility/settings.test.mjs compatibility/resources.test.mjs compatibility/reports.test.mjs compatibility/timer-failure.test.mjs compatibility/jira.test.mjs
COMPATIBILITY_URL=http://127.0.0.1:18082 node --test --test-concurrency=1 compatibility/settings.test.mjs compatibility/resources.test.mjs compatibility/reports.test.mjs compatibility/timer-failure.test.mjs compatibility/jira.test.mjs
node --test --test-concurrency=1 compatibility/matrix.test.mjs compatibility/cors.test.mjs compatibility/jira-local.test.mjs
TZ=UTC node --test compatibility/migrations.test.mjs
node --test compatibility/manager.test.mjs
TZ=Europe/Riga npm test --prefix frontend -- --watch=false
```

The migration fixture creates and drops only a uniquely named database on the
disposable PostgreSQL instance. Manager unit fixtures use a recording Docker stub.
They do not establish real-engine acceptance for every manager action.

For real Docker testing, use project `jira-logger-acceptance`, the dummy environment
`compatibility/docker.env`, shared and dev Compose files, a backend overlay,
`compatibility/docker.yml`, and the matching `compatibility/docker.node.yml` or
`compatibility/docker.php.yml`. These overrides isolate container names, volumes
and ports (HTTP 18084, HTTPS 18443, PostgreSQL 15540). Never omit those overrides
when operating the acceptance project. The three HTTP suites for settings,
resources and reports also accept `COMPATIBILITY_URL=http://127.0.0.1:18084`.

Executed rewrite evidence: all 554 frontend tests pass with `TZ=Europe/Riga`.
Without that timezone, one existing calendar-hour assertion fails (553 pass).
Five HTTP fixtures pass through Docker nginx on each backend. Browser checks on
Node covered task editing, timer start/stop, history and daily report rendering.
See the plan's implementation notes for remaining acceptance work; these results
are not a claim of full completion.
