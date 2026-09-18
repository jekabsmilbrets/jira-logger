# PHP/Node operation matrix

Reference: PHP source at `73b3cca2`, plus the shared-lock wrapper introduced by this
rewrite. Current source and executable fixtures are authoritative. All requests
preserve unknown-property handling. Resource timestamps use the resolved user
timezone; secret settings are redacted. Unmatched GET/HEAD uses Angular fallback,
while handler-generated 404 remains JSON. Framework errors negotiate content;
controller errors use `errors`. See `matrix.test.mjs` and `cors.test.mjs`.

| # | Method and path | Input / validation | Response | Side effects and boundary |
|---|---|---|---|---|
| 1 | GET `/api/task` | Name LIKE, tag OR, date/range, hideUnreported; date precedence; last repeated scalar wins | 200 task projections; empty 404 | Read-only; clipping is transient |
| 2 | POST `/api/task` | Required name 3–255, optional description ≤255, tag IDs | 200 task; validation 406; duplicate 400 | Task and supplied joins in one transaction |
| 3 | GET `/api/task/{id}` | Constrained UUID | 200 task; missing 404 | Read-only |
| 4 | PATCH `/api/task/{id}` | Required name; omitted tags retain, empty tags clear; null description retains | 200 task; validation 406; missing 404 | Task and joins in one transaction |
| 5 | DELETE `/api/task/{id}` | Constrained UUID | 204; missing 404 | Remove task, timers, local Jira records and joins atomically |
| 6 | GET `/api/task/active` | No body | 200 task; none 404 | Latest running timer determines task |
| 7 | GET `/api/task/today/seconds` | Resolved timezone | 200 `data.totalSeconds` | Read-only; clip to current day and now |
| 8 | GET `/api/task/exist/{name}` | Trimmed name; slashes allowed | 409 exists; 204 absent | Exact-name read |
| 9 | GET `/api/task/jira/missing` | Boolean criteria, normalized projects, resolution, limit 50–200 | 200 candidates/meta; empty omits data; upstream 502 | Remote read with pagination and local-key deduplication |
| 10 | POST `/api/task/{id}/{date}` | Constrained UUID/calendar route; at least 60 seconds | 204; missing 404; Jira conflict 409; local failure 500 | Remote create/update precedes local write; update failure can create; no compensation |
| 11 | GET `/api/task/{taskId}/time-log` | Constrained task UUID | 200 timers; empty 404 | Read-only |
| 12 | POST `/api/task/{taskId}/time-log` | Unconstrained route task ID validated by DTO; required start, optional end; explicit date parser | 200 timer; validation 406 | One insert; reversed/equal intervals accepted |
| 13 | GET `/api/task/{taskId}/time-log/{id}` | Only timer ID constrained; scoped task lookup | 200 timer; missing 404 | Read-only |
| 14 | PATCH `/api/task/{taskId}/time-log/{id}` | Required start; null end/description retain; scoped lookup | 200 timer; validation 406 | One update; transient original fields are not stored |
| 15 | DELETE `/api/task/{taskId}/time-log/{id}` | Scoped lookup | 204; missing 404 | One delete |
| 16 | POST `/api/task/{taskId}/time-log/start` | Unconstrained route task ID; existing task required | 204; missing 404; write failure 409 | Commit bulk stop with SQL NOW, then separately insert new timer |
| 17 | POST `/api/task/{taskId}/time-log/stop` | Existing task; latest running timer | 204; none 409 | Update selected timer only |
| 18 | GET `/api/tag` | No body | 200 tags with isUsed; empty 404 | Read-only association checks |
| 19 | POST `/api/tag` | Name string, 3–255 | 200 tag; validation 406; duplicate 400 | One insert |
| 20 | GET `/api/tag/{id}` | Constrained UUID | 200 tag; missing 404 | Read-only |
| 21 | PATCH `/api/tag/{id}` | Name string, 3–255 | 200 tag; missing 404 | One update when changed |
| 22 | DELETE `/api/tag/{id}` | Constrained UUID; association guard | 204; in-use 409; missing 404 | One delete; unlike seed unload, rejects in-use tags |
| 23 | GET `/api/setting` | No body | 200 redacted settings; empty 404 | Read-only |
| 24 | POST `/api/setting` | Name 3–255/value 3–512 strings; strict types; reject redaction marker | 200 setting; validation 406; uniqueness 400 | One insert; name and value are unique |
| 25 | GET `/api/setting/{id}` | Constrained UUID | 200 redacted setting; missing 404 | Read-only |
| 26 | PATCH `/api/setting/{id}` | Same constraints; preserve absent properties as PHP permits | 200 redacted setting; missing 404 | One update when changed |
| 27 | DELETE `/api/setting/{id}` | Constrained UUID | 204; missing 404 | One delete |
| 28 | GET `/api/jira-work-log` | No body | 200 local logs; empty 404 | No remote Jira call |
| 29 | POST `/api/jira-work-log` | Task UUID, integer seconds, optional description ≤255 | Validation 406; missing task 404; valid create 400 | PHP DTO cannot populate mandatory work-log ID/date; no record persists |
| 30 | GET `/api/jira-work-log/{id}` | Constrained UUID | 200 local log; missing 404 | No remote Jira call |
| 31 | PATCH `/api/jira-work-log/{id}` | Required task and integer seconds; zero/negative accepted; null description retains | 200 local log; validation 406; missing 404 | Update local association, duration, description; remote identity/date ignored |
| 32 | DELETE `/api/jira-work-log/{id}` | Constrained UUID | 204; missing 404 | Local delete only |
| 33 | GET `/api/monitor` | Resolved user timezone | 200 time and welcome message | Public monitor; separate internal readiness checks PostgreSQL |

`GET /api/doc` is an additional documentation route. Node serves a self-contained
operation reference. The PHP documentation route remains intact.

## Evidence map

- Settings: `settings.test.mjs`, malformed-input matrix, unchanged frontend settings tests.
- Tasks/tags/timers: `resources.test.mjs`, `timer-failure.test.mjs`, malformed-input matrix.
- Reports/dates: `reports.test.mjs`, `report-matrix.test.mjs`, Node date tests.
- Local Jira: `jira-local.test.mjs`; remote Jira: `jira.test.mjs`, `jira-errors.test.mjs`,
  `jira-search.test.mjs`, `jira-transport.test.mjs`, opt-in `jira-demo.test.mjs`.
- Migrations/seeds: `migrations.test.mjs`, Node maintenance tests.
- Manager/logging: recording-stub `manager.test.mjs`, opt-in real Docker
  `manager-docker.test.mjs`, `log-governor.test.mjs`, Node logging tests.

The evidence map identifies relevant suites, not proof that every possible edge
case is covered. Remaining acceptance items are recorded in the rewrite plan.
