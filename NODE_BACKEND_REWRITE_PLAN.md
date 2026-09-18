# Node.js Backend Rewrite Plan

## 1. Objective and implementation rules

### Feasibility and required outcome

The PHP backend can be rewritten in Node.js. Its main responsibilities—PostgreSQL persistence, task and timer management, reporting, settings, and Jira HTTP integration—have no fundamental dependency on PHP.

The completed rewrite must provide:

- The existing PHP backend, retained in `backend/`.
- A new TypeScript backend in `backend-node/`.
- Docker execution for both backends.
- Node as the default backend selected by `manager.sh`.
- Explicit PHP selection through `--backend php` or `-B php`.
- The existing Angular frontend working without application-code changes.
- Shared PostgreSQL data, migration history, frontend assets, and public URLs.
- Node implementations of database preparation, migrations, seeds, and audits, without requiring a PHP image or container.

Only one backend should serve application traffic at a time. Retaining both implementations provides an explicit fallback; it does not introduce dual writes or automatic failover.

### Compatibility policy

Preserve existing behavior, including verified quirks and failures. Do not combine the rewrite with fixes, API redesign, database modernization, frontend refactoring, or authentication changes.

The agreed exception is date input: support the documented explicit formats rather than attempting to reproduce PHP’s unrestricted natural-language date parsing.

Where the initial plan does not enumerate a behavior, the current PHP implementation and its frontend consumers remain the compatibility reference. Do not substitute framework defaults without verifying that they match.

### Mandatory deeper investigation for every subsystem

The three completed investigation passes are a starting point. They do not replace investigation during implementation.

Before rewriting each subsystem:

1. Read its current PHP implementation, configuration, database mappings, tests, and relevant dependencies.
2. Trace every relevant entry point, caller, downstream operation, and frontend consumer.
3. Inspect actual behavior beyond the happy path: malformed inputs, missing records, validation groups, exceptions, ordering, precision, transactions, partial success, and side effects.
4. Use focused runtime probes when source inspection or mocked tests cannot establish the behavior.
5. Record the findings in this plan’s implementation notes and corresponding compatibility fixtures.
6. Implement the Node equivalent only after the subsystem’s behavior has been established.

Continue investigating while rewriting. If a new dependency or behavior appears, inspect it and update the findings and tests before proceeding with affected implementation.

A subsystem is complete only when its investigated behavior has been compared between PHP and Node. Do not silently resolve an unexplained difference by changing the expected result.

### Chosen architecture

Use a single backend application with:

- Node.js 24 LTS.
- TypeScript with strict checking and ESM.
- Fastify 5 for HTTP routing.
- `pg` for PostgreSQL access and parameterized SQL.
- Luxon for timezone operations, behind narrowly scoped PHP-compatible date handling.
- Undici for Jira HTTP requests and a Jira-specific TLS dispatcher.
- Node’s built-in UUID generation and test runner.
- Fastify’s structured logging.

Use explicit response mapping and resource-specific request normalization. Fastify’s default validation and error responses must not replace the existing contracts.

Organize code around the existing responsibilities: tasks, timers, tags, settings, reports, Jira, database maintenance, and HTTP compatibility. Share genuinely common behavior such as date conversion, response envelopes, and database access.

Do not introduce an ORM, queue, dependency-injection framework, microservices, or speculative abstraction layers.

## 2. Application and API compatibility

### Public endpoint inventory

Preserve all 33 existing API operations and the documentation endpoint.

| Area | Operations |
|---|---|
| Tasks | `GET/POST /api/task`; `GET/PATCH/DELETE /api/task/{id}` |
| Task helpers | `GET /api/task/active`; `GET /api/task/today/seconds`; `GET /api/task/exist/{name}` |
| Jira task operations | `GET /api/task/jira/missing`; `POST /api/task/{id}/{date}` |
| Time logs | `GET/POST /api/task/{taskId}/time-log`; `GET/PATCH/DELETE /api/task/{taskId}/time-log/{id}` |
| Timer lifecycle | `POST /api/task/{taskId}/time-log/start`; `POST /api/task/{taskId}/time-log/stop` |
| Tags | `GET/POST /api/tag`; `GET/PATCH/DELETE /api/tag/{id}` |
| Settings | `GET/POST /api/setting`; `GET/PATCH/DELETE /api/setting/{id}` |
| Local Jira work logs | `GET/POST /api/jira-work-log`; `GET/PATCH/DELETE /api/jira-work-log/{id}` |
| Monitor | `GET /api/monitor` |
| Documentation | `GET /api/doc` |

Keep the existing methods. Do not add PUT replacements, bulk endpoints, pagination, or renamed resources.

Preserve `/api/doc` with locally packaged documentation assets and descriptions matching the compatibility contract. Serving documentation must not require PHP.

### Routing and fallback behavior

Port route constraints individually.

The current constrained UUID expression is:

```text
[0-9a-f]{8}-[0-9a-f]{4}-[13-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
```

Do not replace it with a broader UUID validator. Conversely, do not apply it to parameters that PHP leaves unconstrained.

The timer routes have different constraints:

- Collection GET constrains `taskId`.
- Item GET, PATCH, and DELETE constrain the timer `id`, but not `taskId`.
- Collection POST does not constrain `taskId`.
- Start and stop declare a constraint for an unused `id` parameter, leaving their actual `taskId` unconstrained.

Preserve the task-name existence route’s ability to capture names containing slashes.

The Jira synchronization date route accepts its existing calendar-date expression only:

```text
[0-9]{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|(?<!02-)3[01])
```

Do not allow Unix timestamps or full ISO datetimes in this route merely because other date inputs accept them.

Real Symfony routing probes established that unknown GET and HEAD requests under `/api` match the Angular fallback. Examples include unknown API paths and some paths containing invalid UUIDs.

Preserve that behavior:

- Matched API handlers retain their existing JSON responses, including legitimate `404` responses.
- Unmatched GET/HEAD requests use the Angular index fallback.
- Unsupported methods preserve the corresponding `405` response and `Allow` header.
- Do not use a blanket Nginx rule that converts every API `404` into the Angular index.

Mount the frontend assets read-only into Node so it can serve the same fallback when needed.

### Request validation and errors

Create a compatibility matrix per operation covering:

- Omitted fields.
- Explicit `null`.
- Empty strings.
- Wrong scalar types.
- Unknown properties.
- Arrays and scalar JSON roots.
- Malformed JSON.
- Missing or invalid route/query parameters.

Preserve Symfony serializer behavior before applying validation. A single conventional JSON Schema requiring an object and all fields would change existing behavior.

Verified examples:

| Request | Current behavior |
|---|---|
| Empty task object | `406`, property-keyed validation errors |
| Empty tag object | Framework `500` |
| Empty setting object | Framework `500` |
| Malformed JSON | Controller `400` with `errors` array |
| Unknown extra properties | Ignored where the PHP serializer ignores them |
| Numeric or explicit-null string fields | Deserialization failure where currently rejected |

The tag and setting failures arise from uninitialized typed fields whose required constraints do not run in the controller’s validation groups. Preserve the observable result without reproducing unsafe internal implementation patterns.

Keep controller errors separate from framework errors:

- Controller errors use the existing `errors` array or property-keyed map.
- Framework exceptions use the observed `type`, `title`, `status`, and `detail` JSON fields for JSON clients.
- Framework exceptions negotiate HTML when requested through `Accept`.
- Preserve relevant response headers and exact application error messages.
- Do not expose Node stack traces or internal diagnostics.

Preserve existing operation-specific `200`, `204`, `400`, `404`, `405`, `406`, `409`, `500`, and `502` outcomes. Do not normalize all creation responses to `201`, empty collections to `200`, or validation failures to `400`.

### Serialization contracts

Preserve the response envelope and its truthiness behavior:

- Falsy data can cause the `data` property to be omitted.
- `meta` and `errors` retain their current inclusion rules.
- Nested null values remain distinct from omitted properties.
- Empty results retain their endpoint-specific status and representation.

Preserve these response fields where applicable:

| Resource | Fields |
|---|---|
| Task | `id`, `name`, `description`, `timeLogs`, `tags`, `jiraWorkLogs`, `createdAt`, `updatedAt`, `lastTimeLog` |
| Time log | `id`, `startTime`, `endTime`, `description`, `manuallyModified`, `originalStartTime`, `originalEndTime`, `createdAt`, `updatedAt` |
| Tag | `id`, `name`, `createdAt`, `updatedAt`, `isUsed` |
| Setting | `id`, `name`, `value` |
| Jira work log | `id`, `workLogId`, `description`, `timeSpentSeconds`, `startTime`, `createdAt`, `updatedAt` |
| Monitor | `time`, `message` |

Task list/report projections and ordinary task entity responses must remain distinct where their values differ.

The frontend calculates `timeLogged`; do not introduce a competing server field or change how nested timer data supports that calculation.

### Resource behavior

**Tasks and tags**

- Preserve uniqueness handling and existing name comparison behavior.
- Keep explicit empty tag arrays as “clear associations.”
- Keep omitted tags as “retain associations.”
- Preserve current handling of syntactically valid but unknown tag IDs.
- Preserve tag `isUsed` calculation and `409` when deleting an in-use tag.
- Preserve task deletion of dependent records and join-table associations.
- Do not add new sorting or pagination where SQL currently provides no explicit ordering.

**Timers**

- Treat the route’s task identity as authoritative where PHP overwrites a body-provided task.
- Ignore body IDs where PHP ignores them.
- Scope timer reads, edits, and deletion to both the task and timer.
- Preserve null-versus-omitted behavior for updates.
- Preserve manually modified flags and timestamps.
- The chronology callback is not applied by the current create/update validation groups. Do not start rejecting equal or reversed times if PHP accepts them.

Starting a timer is not one atomic operation today: existing timers are stopped and committed before the new timer is inserted. If insertion fails, the previous timers remain stopped.

Preserve that transaction boundary. Do not silently wrap both actions in one transaction or introduce a database constraint guaranteeing a single running timer.

**Settings**

- Preserve uniqueness of both setting names and values.
- Keep values as strings.
- Redact values for case-insensitive name matches containing `token`, `password`, `secret`, or `key`.
- Preserve the redaction marker `***REDACTED***`.
- Reject attempts to persist that marker with the existing `400` response.
- Preserve backend boolean interpretation and its difference from the frontend’s narrower `"true"`/`"false"` interpretation.
- Resolve current settings for relevant operations rather than keeping stale Jira or timezone configuration indefinitely.

**Local Jira work-log CRUD**

These endpoints operate on local records; they do not themselves perform Jira synchronization.

Preserve their limited writable fields and existing failure behavior. In particular, creating a record through this API does not populate required remote work-log identity/date fields, so the existing database failure path must remain represented by the current application response.

Do not expand the DTO to make this operation succeed as an incidental rewrite improvement.

### Frontend expectations and workflows

Use the unchanged frontend as a compatibility consumer.

Preserve:

- List services that interpret `404` as an empty collection.
- Active-task handling that interprets `404` as no active task.
- The `data.totalSeconds` shape for today’s total.
- Timer writes returning persisted timer data and IDs.
- Task and setting writes committing before the frontend reloads their lists.
- Settings forms that depend on seeded records already existing.

Timer editing is a sequence of independent requests:

1. Create staged timers.
2. Update staged timers.
3. Delete staged timers.
4. Reload the list.

After each successful operation, the frontend removes it from the retry queue. A later failure must not roll back earlier successful requests or cause the server to invent a batch transaction.

Preserve backup/import behavior: the browser performs sequential tag, task, and timer operations. Do not add backend import/export endpoints or reinterpret unsupported backup metadata.

Preserve Jira intake’s sequential processing and partial failures, and synchronization flows that stop and restart timers, including partial-success cases.

The empty Jira intake response currently omits `data`, which can cause a frontend failure. Preserve this verified behavior under the agreed compatibility policy.

### CORS

Preserve the configured origin regular expression and current headers:

- Methods: `GET, OPTIONS, POST, PUT, PATCH, DELETE`.
- Requested headers echoed under the existing allow-all configuration.
- Exposed headers and cache duration matching PHP.
- Preflight cache duration: `3600` seconds.
- Preflight response status: `200`.
- Disallowed origins receive no allowed-origin header.
- An OPTIONS request without preflight headers follows normal routing behavior.

Do not substitute Fastify defaults such as a `204` preflight response or a different rejection status.

## 3. Persistence, dates, reporting, and Jira

### PostgreSQL compatibility

Retain the existing schema and database major version.

The relevant application tables are:

- `task`
- `time_log`
- `tag`
- `tag_task`
- `setting`
- `jira_work_log`

Preserve column types, UUID representation, nullability, uniqueness constraints, indexes, foreign keys, and deletion behavior.

Use parameterized SQL. Fetch associated collections separately or in bounded batches so joining tags, timers, and Jira logs does not multiply rows or distort totals.

Do not infer ordering from incidental database results. Preserve explicit ordering and avoid adding arbitrary ordering elsewhere.

Configure PostgreSQL date parsing deliberately. JavaScript’s automatic conversion of SQL `DATE` and timestamp values must not introduce timezone shifts or precision changes.

### Date and timezone behavior

Preserve the roles of:

- `APP_INTERNAL_TIMEZONE`
- `APP_DEFAULT_USER_TIMEZONE`
- The stored user timezone setting

Use UTC as the default internal timezone. Parse local inputs using the resolved user timezone and serialize timestamps in that timezone using PHP-compatible ATOM formatting without fractional seconds.

Support the explicit input formats established during investigation:

- Digit-only Unix seconds.
- Thirteen-digit Unix milliseconds.
- ISO timestamps with offsets and supported fractional seconds.
- Supported local calendar dates and datetimes, including the existing year-first and day-first forms.

Do not implement arbitrary relative-language inputs such as “next Tuesday.”

Explicit formats still require compatibility handling:

- Epoch zero remains valid.
- Millisecond timestamp handling preserves PHP’s flooring behavior.
- Fractional ISO input may exist internally, while Doctrine-compatible writes truncate to whole seconds.
- Some impossible calendar dates normalize instead of failing.
- Daylight-saving gaps and overlaps require explicit fixtures; do not rely on an unverified Luxon default.

Required date fixtures include:

| Input and timezone | Observed result |
|---|---|
| `2026-02-30`, Europe/Riga | Normalizes to local March 2 |
| `2026-04-31`, Europe/Riga | Normalizes to local May 1 |
| `2026-03-29 03:30:00`, Europe/Riga | `2026-03-29T01:30:00Z` |
| `2026-10-25 03:30:00`, Europe/Riga | `2026-10-25T01:30:00Z` |
| `2026-03-08 02:30:00`, America/New_York | `2026-03-08T07:30:00Z` |
| `2026-11-01 01:30:00`, America/New_York | `2026-11-01T05:30:00Z` |

Investigate the PHP disambiguation behavior for the supported input forms and use a small compatibility resolver around timezone operations. Do not adopt a guessed universal daylight-saving rule.

Preserve different write paths:

- Ordinary Doctrine datetime writes use whole-second precision.
- Bulk timer stopping uses SQL `NOW()` and has different precision and update-timestamp behavior.

Jira work-log `start_time` remains SQL `DATE`. Preserve its current serialization through an internal-timezone midnight followed by user-timezone conversion. For example, under UTC internal time, `2026-06-06` can serialize as `2026-06-05T20:00:00-04:00` in New York.

### Reporting and totals

Preserve task-list filters:

- `tags`
- `name`
- `date`
- `startDate`
- `endDate`
- `hideUnreported`

Keep:

- A single `date` taking precedence over a range.
- The existing requirement for both range bounds.
- Tag matching with OR semantics.
- Existing case-insensitive SQL name matching.
- Inclusive overlap handling.
- Existing `hideUnreported` behavior.
- Integer durations and negative-duration clamping.

Report date ranges end at `23:59:59`; today’s-total calculations use their existing next-midnight boundary. Do not unify them.

Clipping is a response projection:

- Preserve original start/end values and modification indicators.
- Do not persist clipped timestamps.
- Compute `lastTimeLog` from the projected timer collection.
- Preserve running-timer preference and the existing start/creation ordering.
- Do not filter Jira work-log collections merely because timer data is date-filtered.

### Jira library decision

`jira.js` was investigated. The evaluated published version, **6.2.0**, is not selected for this rewrite.

Its published implementation does not provide the compatibility required here:

- The evaluated release targets Jira Cloud while the deployment requirement is both/unknown.
- Its plain-string work-log write path uses v2 and then reads through v3.
- That additional read can fail after a successful write and interact badly with the existing update-to-create fallback.
- The evaluated transport does not expose the required timeout/cancellation control.
- Capabilities described on the repository’s main branch must not be assumed to exist in the evaluated npm release.

Use a small Undici-based Jira module instead. Keep it limited to the operations this application already performs.

References:

- [Published jira.js 6.2.0 documentation](https://cdn.jsdelivr.net/npm/jira.js@6.2.0/README.md)
- [Published work-log implementation](https://cdn.jsdelivr.net/npm/jira.js@6.2.0/dist/cloud/api/issueWorklogs.js)
- [Published transport implementation](https://cdn.jsdelivr.net/npm/jira.js@6.2.0/dist/core/createClient.js)

A future SDK replacement is outside this rewrite. It would require the same compatibility tests to pass before adoption.

### Jira transport and work-log synchronization

Preserve:

- Configured host, including any context path.
- Personal-access-token bearer authentication.
- Existing REST API paths and headers.
- Existing null payload fields, not just the populated fields.
- Connect and overall request timeout behavior, including the 60-second limit.
- Existing upstream error-to-application-response mapping.
- No automatic retry of work-log writes.

Match the selected PHP TLS behavior using a Jira-specific Undici dispatcher with certificate verification disabled. Do not disable TLS verification globally.

Consume or cancel response bodies and close the dispatcher during shutdown. Redact credentials and sensitive payloads from logs.

For synchronization:

- Preserve task-name issue-key extraction using the existing `-#-` convention.
- Preserve the first suffix’s description override behavior.
- Preserve description ordering and comma joining.
- Reject durations below 60 seconds; do not round them up.
- Use 17:00 in the user timezone for the Jira work-log date.
- Preserve the `.000±HHMM` timestamp format.
- Locate existing local synchronization records by task and date.
- Preserve update-failure-to-create behavior for the same class of upstream errors.
- Perform the remote write before local persistence, as PHP does.
- Do not automatically copy a remote description into the local record when PHP does not.
- Distinguish an upstream Jira conflict from a local PostgreSQL failure.

Test remote-success/local-failure cases explicitly. Do not introduce automatic compensation or retries that can duplicate work logs.

### Jira missing-task search

Preserve the existing request fields:

- `assignedToMe`
- `reportedByMe`
- `resolution`
- `projects`
- `limit`

Keep default limit `50` and bounds `50–200`.

Preserve:

- Assignee/reporter OR semantics and effective-criteria validation.
- Project normalization, resolution handling, escaping, selected fields, and `updated DESC` ordering.
- Legacy POST search followed by `/search/jql` fallback on the existing `404`, `405`, and `410` responses.
- Offset-based and token-based pagination.
- Case-insensitive deduplication against local tasks and returned issues.
- Fetching sufficient results to determine whether more than the requested limit exists.
- Nullable/normalized update timestamps.
- Existing response metadata and empty-result behavior.

Do not assume that a successful Cloud request proves compatibility with the user’s Jira deployment.

## 4. Docker, migrations, maintenance, and launcher

### Docker arrangement

Keep the shared infrastructure and add separate backend selections:

- Shared Compose configuration for PostgreSQL, frontend assets, Nginx, and optional Traefik.
- A PHP backend overlay.
- A Node backend overlay.
- Exactly one selected backend overlay per application launch.

Preserve the Compose project identity and existing `dbData` and `assetsData` volumes. Selecting another backend must not create an empty parallel database or remove data.

Build Node using a multi-stage image:

- Builder installs locked dependencies and compiles TypeScript.
- Runtime contains compiled code and production dependencies.
- Runtime executes as a non-root user.
- Application HTTP is internal to the Compose network.
- Existing public ports and URLs continue through Nginx.
- Maintenance commands use the same selected backend image.

Node builds, startup, database preparation, migrations, seeds, and audits must not build or launch PHP.

Preserve `.docker/.env` as the existing configuration source. Parse compatible database URLs, accounting for Doctrine-specific query parameters such as `serverVersion` and `charset`.

### Frontend assets and Nginx

Preserve:

- Production assets under `/ng/`.
- The generated runtime configuration.
- JavaScript, CSS, manifests, service-worker assets, and their existing URLs.
- Angular deep links at the root.
- The current relationship between build base href `/ng/` and application base href `/`.
- Optional Traefik and HTTPS behavior.

Provide backend-specific Nginx site and upstream configuration together. Switching to Node must not leave references to PHP-FPM or stale PHP service names.

Node configuration must never expose PHP source files as static content.

Preserve the Angular fallback behavior described earlier, including unmatched GET/HEAD API paths. Existing API errors must remain API errors.

### Manager interface

Support:

```sh
# Default: Node backend
sh manager.sh -a start

# Explicit Node backend
sh manager.sh -a start --backend node

# Existing PHP backend
sh manager.sh -a start --backend php

# Short selector
sh manager.sh -a start -B php
```

Preserve `-b` as the background flag.

Rules:

- Default to Node independently on each invocation.
- Do not persist a hidden “last backend” selection.
- Reject unsupported backend values before taking action.
- Forward the selected backend consistently into builds, startup, initialization, migrations, seeds, and other backend-dependent commands.
- Preserve existing unrelated arguments and behavior.

### Manager action semantics

| Action | Required behavior |
|---|---|
| `start` | Start the selected backend; no implicit migration or seed |
| `start-with-init` | Prepare the database, then start; no implicit seed |
| `build` | Build, prepare the database, then seed |
| `rebuild` | Stop, build, prepare, and seed; do not implicitly start |
| `prepare-db` | Create the database if missing, then migrate |
| `migrate` | Run migrations using the selected backend |
| `seed` | Run setting and tag seeds using the selected backend |
| `upgrade` | Back up, stop, build, migrate, and start; preserve existing background default and do not implicitly seed |
| `down` | Stop application containers and relevant stale backend containers without removing persistent data |
| `db-dump` | Remain backend-independent |
| `db-remove` | Preserve the existing explicitly destructive behavior |

Do not use orphan-removal behavior in one-off maintenance commands that can accidentally remove the active backend.

For an actual backend switch:

1. Stop admitting new application requests through the existing ingress.
2. Drain and stop the previously active backend.
3. Preserve database and asset volumes.
4. Start the selected backend and verify readiness.
5. Start/reload the matching Nginx configuration.

If Node fails, report the failure. Do not silently launch PHP.

### Migration compatibility

Use the existing `doctrine_migration_versions` ledger as the shared source of migration state.

Port these migrations into Node:

- `Version20221216190644`
- `Version20250606180000`

Preserve their identifiers and compatible metadata. Node must recognize migrations already executed by PHP, and PHP must recognize migrations already executed by Node.

Do not replay the historical timezone conversion on an existing migrated database.

Use a shared PostgreSQL advisory lock around migration execution in both maintenance paths. Ensure lock lifetime covers the migration operation and release occurs on completion or failure.

Validate:

- An empty database initialized by Node.
- An existing database initialized by PHP.
- Repeated migration commands.
- Switching between implementations.
- A partially completed or failed migration.

Any later schema change introduced during implementation must remain readable and writable by both backends and use coordinated migration identifiers. Prefer no schema changes for this rewrite.

### Node maintenance commands

Provide Node CLI equivalents for:

- Database preparation.
- Migration execution and status.
- `seed:setting`.
- `seed:tag`.
- `seed:load setting|tag`.
- `seed:unload setting|tag`.
- The existing audit operation.

Preserve exit-code behavior, including unsupported seed selection returning exit code `2`. Audit findings themselves must not turn the existing successful audit completion into a failure.

Seeds insert missing records without overwriting existing values.

Setting seeds remain:

| Name | Initial value |
|---|---|
| `jira.enabled` | `false` |
| `jira.host` | `https://jira.com` |
| `jira.personal-access-token` | `jira_personal_access_token` |
| `jira.user-time-zone` | `Europe/Riga` |
| `jira.locale` | `lv-LV` |

Tag seeds remain `CAPEX`, `OPEX`, and `OTHER`.

Preserve unload-by-seed-name behavior, including removal of matching settings whose values have changed. Preserve the seed-unload path’s existing difference from the HTTP in-use-tag deletion guard.

### Logging and lifecycle

Preserve standard output logging by default and the existing optional host-log mode.

For host logs:

- Retain the expected `log-*.log` convention and mount behavior.
- Preserve non-root write permissions after creation and rotation.
- Preserve the current 50 MiB rotation threshold, periodic enforcement, and seven-day archive retention.
- Ensure Node reopens a rotated file rather than continuing to write to an unlinked or renamed descriptor.

Keep the public monitor response unchanged.

Add internal container readiness without changing the public monitor contract. Shutdown must stop accepting requests, drain in-flight work, and close PostgreSQL and Jira resources. Container shutdown allowances must accommodate the existing Jira timeout.

## 5. Implementation sequence and acceptance

### Phase 1 — Compatibility fixtures and investigation ledger

Before implementing application behavior:

- Record the inspected revision and any subsequent source changes.
- Create an operation matrix containing route, input normalization, validation, response, side effects, and transaction boundaries.
- Capture representative PHP responses and database effects using disposable data.
- Separate framework routing/error behavior from controller behavior.
- Establish fake Jira responses for deterministic comparisons.
- Record the known frontend timezone-dependent test baseline.

Apply the mandatory deeper-investigation process again for every later phase.

**Exit condition:** The first subsystem has verified fixtures, and the comparison harness can exercise both implementations without touching production data.

### Phase 2 — Node foundation and database maintenance

Implement:

- TypeScript build and Node runtime.
- Configuration parsing.
- PostgreSQL access.
- Compatible migrations and shared locking.
- Seeds and audit commands.
- Response envelopes, error handling, date compatibility helpers, and internal readiness.

**Exit condition:** Node can prepare a fresh database and use a PHP-initialized database without a PHP container.

### Phase 3 — Settings, tags, and task CRUD

Implement resource-specific validation, responses, relationships, uniqueness failures, redaction, and deletion behavior.

Verify the frontend’s list reloads and seeded-settings expectations.

**Exit condition:** CRUD compatibility fixtures pass, including malformed bodies, missing resources, association updates, and tag deletion conflicts.

### Phase 4 — Timers and reporting

Implement timer CRUD, start/stop operations, projections, filtering, totals, and timezone behavior.

Verify partial timer-edit saves and the separate timer stop/insert transaction boundary.

**Exit condition:** Database effects and frontend-visible results match PHP across normal, reversed, running, clipped, and daylight-saving cases.

### Phase 5 — Jira integration

Implement the small Undici transport, synchronization, local Jira work-log CRUD, and missing-task search.

Verify transport, request bodies, pagination, error mapping, and partial failures against a controlled Jira stub. Use real deployment checks only with an appropriate test environment; do not compare implementations by sending duplicate production writes.

**Exit condition:** Jira compatibility fixtures pass, including remote-success/local-failure and update-to-create cases.

### Phase 6 — Docker and manager integration

Implement:

- Node image and backend overlays.
- Matching Nginx configurations.
- Backend selection flags.
- Backend-aware maintenance actions.
- Asset access, logging, readiness, shutdown, and backend switching.

**Exit condition:** Default launch serves Node, explicit PHP launch serves PHP, and all manager actions preserve their documented semantics.

### Phase 7 — End-to-end validation and documentation

Run the unchanged frontend against each backend and perform bidirectional switching with the same database.

Update operating documentation with:

- Default Node startup.
- Explicit PHP selection.
- Maintenance commands.
- Migration compatibility.
- Log access.
- Troubleshooting and manual fallback.

**Exit condition:** Both backends remain usable, all required compatibility checks pass, and the final implementation notes explain any approved difference.

### Required acceptance scenarios

**HTTP and serialization**

- All 33 operations and `/api/doc`.
- HEAD, unsupported methods, invalid UUIDs, names containing slashes, and synchronization date constraints.
- Angular fallback versus legitimate API `404`.
- Controller and framework error bodies.
- JSON and HTML `Accept` negotiation.
- CORS preflight and non-preflight OPTIONS.
- Empty collections, omitted `data`, null properties, and exact field sets.

**Persistence and resource behavior**

- Fresh and PHP-initialized databases.
- Migration idempotency and lock contention.
- Uniqueness violations and missing associations.
- Task deletion with dependent data.
- Seed loading and unloading.
- Settings redaction and rejected placeholder writes.
- Local Jira work-log creation failure behavior.

**Timers, reports, and dates**

- Start, stop, edit, delete, and task scoping.
- Timer insertion failure after prior timers were stopped.
- Equal and reversed times.
- Partial frontend save failure and retry.
- Midnight boundaries, overlapping intervals, running timers, and clipped responses.
- Date-versus-range precedence, tag OR filters, and `hideUnreported`.
- UTC, Europe/Riga, and America/New_York.
- Explicit invalid-calendar normalization.
- Daylight-saving gaps and overlaps.
- Second precision, milliseconds, SQL `NOW()`, and Jira SQL `DATE` serialization.

**Jira**

- Configured context paths and bearer headers.
- Null payload fields and exact timestamp formatting.
- Jira-scoped TLS behavior.
- Timeout and upstream error mapping.
- Under-one-minute rejection.
- Work-log create/update and update-to-create fallback.
- Remote success followed by local persistence failure.
- Legacy and newer search endpoints.
- Offset/token pagination, deduplication, truncation metadata, and empty results.
- Frontend intake and synchronization partial failures.

**Docker and manager**

- Default Node launch and explicit PHP launch.
- Every action in the manager matrix.
- No PHP build/runtime dependency in Node mode.
- Same data before and after switching in both directions.
- No persistent-volume removal during ordinary operations.
- Static assets, runtime configuration, deep links, documentation, and Traefik modes.
- Non-root permissions, host-log rotation, graceful shutdown, and failed-start reporting.

### Investigation evidence and limits

The planning work included three investigation passes over backend, frontend, configuration, migrations, Docker, and launcher behavior.

Verification performed during investigation included:

- A backend baseline of 217 passing tests and 526 assertions.
- A later focused backend run of 65 passing tests and 210 assertions.
- A frontend baseline with 553 passing tests and one timezone-dependent failure.
- Verification that the isolated timezone-dependent case passes under Europe/Riga.
- A focused frontend run of 54 passing tests.
- A third-pass frontend run of 21 passing tests covering timer transactions and settings.
- Real Symfony routing, serialization, validation, HTTP-response, CORS, and date-parser probes.

The working tree remained clean. No backend rewrite, database migration, or deployed Node container was created during planning.

These checks do not establish live PostgreSQL, actual Jira-deployment, or Node-runtime parity. Those are implementation acceptance requirements.

### Implementation notes — compatibility baseline

- Inspected revision: `73b3cca2`; initial working tree clean. No repository-local
  AGENTS.md files were found; the supplied session instructions apply.
- Added a separate Compose project with PostgreSQL 13 on tmpfs and loopback port
  55439. Existing application containers and volumes are not test targets.
- Executed both PHP migrations successfully on that empty fixture database.
- Settings investigation: controller deserializes before validation; create/update
  validation groups omit NotNull. Missing typed fields therefore produce framework
  errors. Update first looks up the entity, then accesses request values. Unknown
  properties are ignored. Create maps unique violations to `Duplicate Setting name`;
  update uses its generic update error. Each write flushes before returning.
- Settings fixtures exercise create/read/update/delete, unknown properties,
  uniqueness, case-insensitive secret-name redaction, rejected redaction markers,
  null/numeric inputs, short strings, missing records, and the empty-object error.
  `node --test compatibility/settings.test.mjs`: 2 tests passed against PHP.
- Remaining phases and acceptance scenarios are not yet verified.

### Implementation notes — maintenance increment

- Read both migrations, Doctrine configuration, seed manager and commands, audit
  queries, datetime parser, timezone resolver, and timestamp lifecycle callbacks.
- Node preserves the historical SQL identifiers, UUID comments, constraints,
  migration versions, and Europe/Riga conversion. It uses one transaction per
  migration and a session advisory lock shared with PHP `app:migrate`.
- Seeds flush as one transaction; name-based unload does not use the HTTP tag
  guard. Existing values are retained. Unsupported seed selection exits 2.
- Strict TypeScript compilation passed. Three Node maintenance tests passed on
  the PHP-initialized disposable database, including repeated migration commands,
  seed idempotency, edited seed preservation, unload, and empty audit results.
- Built the non-root Node 24 multi-stage Docker image without PHP. Its `prepare-db`
  initialized a separate empty database; PHP `app:migrate` then recognized both
  ledger entries without replaying either migration. PHP shared-lock command also
  passed on the PHP-initialized database.
- The existing Docker context is an allowlist; Node paths were added explicitly.
- Lock contention, failed migrations, HTTP foundation, dates, and later phases
  remain to be validated; this increment does not establish phase 2 completion.

### Implementation notes — HTTP, settings, and date foundation

- Settings fixtures pass unchanged against PHP and Node (2 tests each). PHP probes
  confirm `{}`, `[]`, `null`, numeric and string roots yield framework 500; malformed
  JSON yields controller 400. Frontend Settings and SettingsChange were traced:
  values are stringified, writes finish before reload, and seeded records are
  needed for the skip-reload path. No frontend changes were made.
- Date helpers preserve epoch zero, millisecond flooring, invalid-calendar
  normalization, ATOM output, and whole-second persistence. Ten date fixtures pass.
  Additional PHP overlap probes in London and Lord Howe confirmed that the offset
  at the UTC interpretation of the wall clock selects the observed overlap branch.
- Task/tag/timer PHP fixtures pass (2 tests). Null descriptions and timer ends
  retain values; omitted tags retain associations, explicit empty tags clear them,
  unknown valid tag UUIDs are ignored, in-use tag deletion is 409. Reversed timers
  are accepted; start/stop use 204 and repeated stop uses 409.
- Framework HTML, complete routing/CORS parity, and remaining subsystem acceptance
  scenarios still require comparison. The HTTP foundation is not final acceptance.

### Implementation notes — tasks, tags, timers, and reports

- Read task/tag/timer controllers, DTOs, services, repositories, entities,
  ReportedTaskQuery/View, filter DTO and date-range resolver. Timer modification
  flags and originals are transient projection properties, not database columns.
- Task writes synchronize only supplied tag associations and preserve null
  descriptions. Task deletion removes dependent timers, Jira records, and joins.
  Tag isUsed is calculated from associations; seed unloading remains separate.
- Report queries preserve name LIKE behavior, tag OR semantics, inclusive overlap,
  date precedence, incomplete-range behavior, and 23:59:59 report boundaries.
  Clipping changes only response timestamps and recalculates lastTimeLog.
- Six HTTP fixtures now pass against each implementation: settings (2), resources
  (2), reports (1), and timer insertion failure (1). The failure test installs a
  temporary trigger in the disposable database and confirms old timers remain
  stopped with their original updated_at after the new insertion fails.
- The first failure-fixture execution exposed a fixture SQL parameter type error;
  corrected separate UUID/text parameters, then reran successfully on both backends.
- Remaining edge-case matrices, frontend execution, Jira, and operating integration
  remain pending. These tests are representative compatibility evidence, not a
  waiver of the full acceptance list.

### Implementation notes — Jira increment

- Read JiraApiService, JiraTaskSyncService, request DTO, local work-log service,
  controller, and installed PHP transport/work-log/search implementations.
- Executed a controlled HTTP stub with a context path and disposable settings.
  PHP and Node both pass the fixture covering exact null-bearing work-log payload,
  bearer authentication, first suffix override, 17:00 timestamp, update-to-create
  fallback, legacy 410 to enhanced search, local-key deduplication, and remote
  success followed by local failure (500, one remote write, no local record).
- Discovered stale pre-existing local prod route cache during the PHP search
  probe. The fixture now uses an isolated cache. All seven PHP fixtures were
  rerun successfully against the current source before accepting Jira results.
- Node closes the Jira-specific dispatcher on shutdown; TLS relaxation is scoped
  to that dispatcher. Timeout/error edge cases and pagination matrices remain
  pending, as do the Docker/manager and final acceptance phases.

### Implementation notes — HTTP edge cases and logging

- Executed a 152-case PHP/Node input and method matrix. Corrected task tag-element
  validation to aggregate Symfony-style field errors and removed extra HEAD from
  Allow headers. The matrix now passes against both isolated services.
- Eight CORS combinations confirmed that disallowed-origin preflight still returns
  200 with method/header metadata but without allowing the origin. Expose-Headers
  applies to ordinary allowed-origin responses, not preflight responses.
- Traced Symfony preferred-format selection and error rendering. Eight negotiated
  error fixtures now compare status, content type, Vary and full response content,
  including HTML, JSON and XML. These pass alongside the input and CORS matrix.
- Added local API documentation and file logging that reopens the path per record
  so manager rotation does not strand output on a renamed inode. Date, logging,
  manager and Docker acceptance validation continue below; full acceptance remains
  pending until the operational and remaining subsystem checks are complete.

### Implementation notes — Docker and backend selection

- Split backend-specific Compose services and ingress configuration into Node/PHP
  overlays. Shared project and volume identities remain unchanged. Node is the
  manager default on each invocation; explicit `-B php` / `--backend php` selects PHP.
- Manager fixtures exercise all eleven actions for both selections, background
  flag compatibility, invalid-backend rejection, default reset and readiness
  failure. They use a recording Docker stub, not a real engine.
- Built both real Docker backends in the separate `jira-logger-acceptance` project,
  with disposable volumes and localhost ports 18084/18443. Node reports v24.21.0,
  UID 1000. Node database preparation and both seed commands completed. An initial
  mistyped `seed:setting:load` probe correctly exited 2; supported `seed:setting`
  and `seed:tag` commands then succeeded.
- Real Node → PHP → Node switching kept the database and assets volumes. PHP
  `app:migrate` recognized the Node migration ledger without replay. A Node-created
  task remained readable in PHP and after returning to Node. Five HTTP fixtures
  (settings, task/tag, timer, report) passed through nginx on each backend.
- Verified Node API, documentation, frontend fallback, denied PHP paths and private
  readiness ingress. Actual manager action integration, broader operational failure
  scenarios and remaining compatibility cases still require completion.

### Implementation notes — migration contention and frontend verification

- Migration fixtures now create a unique disposable database, force an initial
  schema collision, verify transactional rollback and an empty ledger, load a
  legacy first-version schema, and verify winter/summer Riga-to-UTC conversion.
  Columns and indexes match the PHP-created fixture schema. Both Node and PHP
  migration commands were observed waiting on the same advisory lock and then
  completed without replay. The fixture initially assumed Date objects despite
  the configured pg string parser, then omitted Doctrine's serverVersion URL
  parameter; both fixture errors were corrected and the full test passed.
- Local Jira work-log parity covers existing records, unsupported create fields,
  null retention, zero/negative durations, strict integer input, missing tasks and
  aggregated validation. Corrected Node to include all validation field errors.
- Executed the unchanged frontend suite: 554 tests pass with TZ=Europe/Riga.
  With the host's Vienna timezone, one existing calendar-hour assertion fails.
  Browser checks against Docker Node verified task editing, timer start/stop,
  persisted timer history and daily report rendering.
- Operating documentation now describes backend selection, maintenance commands,
  shared data, ingress readiness and fixture execution. Full acceptance remains
  pending, including broader Jira transport/search cases and real manager actions.

### Implementation notes — Jira search and upstream response matrices

- Controlled search fixtures compare response bodies and outbound requests for
  offset/token pagination, duplicate issues, 51-result truncation, empty results,
  malformed/scalar/null responses and legacy 404/405/410 fallback. Corrected legacy
  empty/scalar/null response mapping from framework 500 to the PHP search 502.
- Work-log fixtures compare eight upstream status/body combinations, local writes,
  outbound call counts and rejection at 59 seconds without any remote call.
  Malformed work-log JSON now preserves PHP's framework 500 rather than incorrectly
  becoming a synchronization conflict. All three new Jira matrix suites pass.
- TLS scope, transport timeouts, additional frontend failure/retry workflows and
  operating acceptance remain under investigation; no live Jira writes were made.

### Implementation notes — operating matrix, transport and live Jira

- Real manager acceptance now passes in a copied temporary project with isolated
  identities, ports and volumes: build, start, dump, migrate, prepare, seed,
  start-with-init, upgrade, rebuild, down and explicit database removal. Both
  backends were exercised; a task written by Node survived PHP edits and the
  return switch to Node. The first run reused a stale HTTP keep-alive connection
  after synchronous container recreation; fresh fixture connections resolved it.
- Log checks verify startup and periodic 30-second enforcement of the 50 MiB cap,
  seven-day archive retention, preservation of rotated content and write permissions.
- Controlled self-signed Jira HTTPS succeeds for both backends while ordinary
  verified fetch rejects it. Actual stalled requests terminate around 60 seconds,
  make one upstream attempt, return 409 and leave no local work log. Node now
  retains the PHP timeout diagnostic, with measured milliseconds naturally varying.
  macOS PHP's built-in server terminated in its execution timer during this test;
  the successful PHP timeout measurement used the retained Linux Docker image.
- At the user's request, a one-day PAT was created on jira.demo.almworks.com.
  Both Docker backends created and updated labeled work logs on INI-1, verified
  the remote 120-second duration and 17:00 timestamp, and searched missing tasks.
  The fixture removed its remote work logs and revoked its PAT. The initial PAT
  name exceeded Jira's accepted length; shortening it resolved that fixture error.
- The report matrix passes across UTC, Europe/Riga and America/New_York, including
  tag OR filtering, running timers, equal boundaries, normalization and clipping.
  Repeated scalar query keys now use PHP's last-value semantics. Extended routing
  fixtures verify HEAD, invalid UUIDs and synchronization date constraints.

### Definition of done

Additional acceptance investigation:
- Switching without rebuilding exposed Compose's shared default nginx image tag:
  PHP could reuse an image without its front controller. Backend overlays now use
  distinct project-scoped nginx image names. The real manager matrix passes
  Node-to-PHP-to-Node switches without rebuilding, failed database readiness with
  ingress stopped, and isolated Traefik HTTPS monitor/assets/deep-link checks.
  Traefik provider discovery can lag process health; its fixture waits up to ten
  seconds for the route to appear. No deployed containers or volumes were touched.
- Combined timer validation failures revealed that Node returned only the
  description length error. PHP validates start, end, description and task together
  for both create and update. Node now preserves that aggregation; the extended
  input matrix passes against both running implementations.
- The unchanged browser timer editor was exercised with a disposable database
  trigger failing the second update once. The dialog stayed open on failure;
  retry succeeded and database audit rows confirmed each edit persisted once.

The rewrite is complete only when:

- PHP remains present and operational.
- Node runs in Docker and is the launcher default.
- Explicit PHP selection works.
- Both implementations use the same database and migration history safely.
- Node maintenance operations require no PHP container.
- The existing frontend works without application-code changes.
- Every rewritten subsystem has deeper-investigation notes and passing compatibility checks.
- No unexplained behavioral differences remain.
- Operational documentation describes both execution paths.
