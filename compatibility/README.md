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
node --test compatibility/log-governor.test.mjs
RUN_DOCKER_MANAGER_ACCEPTANCE=1 node --test compatibility/manager-docker.test.mjs
TZ=Europe/Riga npm test --prefix frontend -- --watch=false
```

The migration fixture creates and drops only a uniquely named database on the
disposable PostgreSQL instance. Manager unit fixtures use a recording Docker stub.
The opt-in real manager fixture copies source into a temporary directory, changes
only deployment identities/ports, runs the action matrix against Docker and removes
its disposable volumes. Its execution log is retained in that temporary directory.

For real Docker testing, use project `jira-logger-acceptance`, the dummy environment
`compatibility/docker.env`, shared and dev Compose files, a backend overlay,
`compatibility/docker.yml`, and the matching `compatibility/docker.node.yml` or
`compatibility/docker.php.yml`. These overrides isolate container names, volumes
and ports (HTTP 18084, HTTPS 18443, PostgreSQL 15540). Never omit those overrides
when operating the acceptance project. The three HTTP suites for settings,
resources and reports also accept `COMPATIBILITY_URL=http://127.0.0.1:18084`.

Executed rewrite evidence: all 554 frontend tests pass with `TZ=Europe/Riga`.
Without that timezone, one existing calendar-hour assertion fails (553 pass).
Five HTTP fixtures pass through Docker nginx on each backend. Browser checks
covered task editing, timer start/stop and daily reports on both backends, plus
Node timer history and partial-save retry. PHP-written edits and totals remained
visible after returning to Node. The frontend source is unchanged.
The route/validation/side-effect inventory is in [OPERATIONS.md](OPERATIONS.md).

Additional differential suites are `jira-local.test.mjs`, `jira-search.test.mjs`,
`jira-errors.test.mjs` and `report-matrix.test.mjs`. Run them sequentially because
they temporarily replace fixture settings. `jira-transport.test.mjs` measures real
60-second timeouts and takes about two minutes. On macOS, use containerized PHP on
port 18086 and set `PHP_TRANSPORT_PORT=18086`: the host PHP execution timer can
terminate its built-in server while cURL waits. The container must use the same
fixture database via `host.docker.internal:55439`.
Set `JIRA_STALL_BODY=1` to test the separate mid-body timeout contract (framework
500 for work-log writes). Both modes passed on PHP and Node. Interrupted legacy
search is covered separately by `jira-search.test.mjs` and returns 502.

`RUN_DOCKER_SHUTDOWN=1 node --test compatibility/shutdown.test.mjs` stops and
restarts only the acceptance Node container during an in-flight controlled Jira
write, verifies persistence, and restores settings. For the browser retry check,
run `node compatibility/browser-save-fixture.mjs prepare`, edit both fixture timer
descriptions to `retry-first-edited` and `retry-second-edited` through their start
time cells, save, then retry the expected failure. Run the script with `verify`
to assert one persisted update per row and `cleanup` to remove its data/trigger.
Always run cleanup, including after an interrupted browser check.

The real manager matrix also verifies switching without rebuilding, separate
backend nginx images, failed readiness with ingress stopped, and HTTPS routing
through a private Traefik network. It removes its own persistent volumes only
during the explicit removal action and final test cleanup.

`jira-demo.test.mjs` is explicitly opt-in and targets only the user-authorized
`https://jira.demo.almworks.com`. Set `RUN_LIVE_JIRA_DEMO=1`, `JIRA_DEMO_USER` and
`JIRA_DEMO_PASSWORD`; it creates a one-day PAT in memory, tests Docker Node on
18084 and Docker PHP on 18086, removes only its labeled work logs, then revokes the
PAT. Demo resets can invalidate a run; rerun to obtain a fresh token. Credentials
and tokens must never be committed or printed. This live fixture passed for both
backends; controlled fixtures remain the repeatable source for failure cases.
