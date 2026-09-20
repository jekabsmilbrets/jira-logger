# OOP refactor validation

Executed on 2026-09-19 on `feature/BE-rewrite-to-node`. The refactor starts after
`eb7d326859e28b1e05e18ecfb24f9b3193b702b2`; the initial working tree was clean.
All refactor edits are confined to `backend-node/`. PHP, frontend, Compose,
manager files are unchanged.

## Executed checks

| Check | Result | Local evidence in `.validation/` |
| --- | --- | --- |
| Strict TypeScript build | Passed with all three additional strict flags | `build.log` |
| Additional unused-local/parameter audit | Passed | `type-audit-final.log` |
| Internal tests | 13 passed, zero failed/skipped | `unit-final.log` |
| Unchanged host HTTP fixtures | 7 passed | `full-http.log` |
| PHP/Node input, CORS, reports and Jira differential fixtures | 7 passed | `full-differential.log` |
| Shared migration fixture | Passed: schema/index parity, legacy winter/summer conversion, failed migration rollback, PHP and Node advisory locking | `migrations.log` |
| Manager command contracts | 3 passed, including default Node and explicit PHP selection | `manager-contract.log` |
| Real manager Docker acceptance | Passed for both backends; maintenance, dumps, upgrades, rebuilds, switching, failed readiness, HTTPS, archives and teardown | `manager-docker.log` |
| Final Docker build and readiness | Node, assets and nginx built; required services healthy | `docker-build.log`, `docker-start.log` |
| HTTP fixtures through Docker nginx | 5 passed | `docker-http.log` |
| Docker shutdown during a controlled Jira write | Passed: request drained and remote work-log ID persisted before shutdown completed | `docker-shutdown.log` |
| Jira TLS scope and header timeout | Passed on PHP and Node; 409 at 60.026s / 60.007s, no automatic write retries | `jira-transport-headers.log` |
| Jira interrupted-body timeout | Passed on PHP and Node; framework 500 at 60.040s / 60.008s, no local work-log persistence | `jira-transport-body.log` |
| Feature encapsulation cleanup checks | 5 HTTP tests passed after the final private-method cleanup | `cleanup-http.log` |

The internal suite exercises independent application instances with injected
resources, imports without client creation or runtime configuration access,
idempotent cleanup, cleanup when one resource fails, failed readiness without
connection-detail disclosure, and real socket draining. Database tests cover
transaction ordering, rollback/release, isolated timestamp parsers and maintenance.

Static source inspection found no application `any` annotations, no SQL outside
repositories/database infrastructure, and no application-owned global clients.
`git diff --check` and the changed-path scope check passed. No dependency,
database-schema or migration-SQL changes were introduced by this refactor.
Evaluated migration constants were also compared with the baseline: both version
strings, every SQL statement and the advisory lock value match exactly.

## Test harness detail

The unchanged migration fixture's own PostgreSQL clients expect timestamp
strings. It formerly relied on backend imports mutating global parsers. Its
explicit test-only setup is now:

Application pools use instance-local parsers.

All write probes used disposable databases and controlled Jira fixtures. The
real manager fixture operated in a temporary copy with isolated container names,
volumes and ports. The deployed `jira-logger` stack was not used for write tests.
Validation logs are intentionally ignored; they are local evidence, not required
runtime files. See [README.md](README.md) for architecture and operating commands.

## Implementation commits

| Commit | Independently reviewed increment |
| --- | --- |
| `f844e203` | Injectable database and configuration objects |
| `e83b7be1` | Settings and tags controller/service/repository separation |
| `25a30ce9` | Task persistence and report workflows |
| `f6ddb1d0` | Timer workflows and persistence |
| `f168fe00` | Injected Jira transport and work-log repositories |
| `4f91daf9` | Application lifecycle, maintenance and strict typing |
| `f6c82b2f` | Feature encapsulation and readiness failure test |

Architecture and final validation documentation are committed separately. No
commits were pushed.

## Follow-up: feature directories and remaining stateful closures

Executed on 2026-09-19 after the user's direct HTTPS, static assets and private
readiness changes. This increment starts at
`9668786fe20a5b04fe7e6314d4a25efdf9966b47`, with a clean working tree. Those user
changes were preserved. All subsequent edits remain inside `backend-node/`.

Before extracting each owner, the current source and its callers were checked:
Jira settings are read when a session is created, request failures retain their
status/body distinctions, file logging reopens on each append, public ingress
opens only after readiness, and private readiness binds only to loopback.
Existing task/tag transactions, the separate timer stop commit and Jira remote
write ordering were retained. Pure coercion, parsing and validation functions
remain stateless helpers.

| Check | Result | Local evidence in `.validation/` |
| --- | --- | --- |
| Clean build after relocation and HTTP extraction | Passed; root output contains only `server.js`, `cli.js`, `migrations.js` | `reorg-features-build.log`, `reorg-server-build.log` |
| Strict unused-local/parameter audit | Passed | `reorg-type-audit.log` |
| Internal suite | 19 passed, zero failed/skipped | `reorg-server-unit.log` |
| Unchanged host HTTP fixtures | 7 passed | `reorg-server-http.log` |
| Unchanged PHP/Node differential fixtures | 7 passed | `reorg-server-differential.log` |
| Shared migrations after relocation | Passed with the same explicit timestamp preload | `reorg-features-migrations.log` |
| Real manager Docker acceptance | Passed: builds, maintenance, upgrades/rebuilds, both switching directions, HTTPS/Traefik, failed readiness, logs and teardown | `reorg-manager-docker.log` |
| Refactored Docker image and private readiness | Built and healthy | `reorg-docker-build.log`, `reorg-docker-start.log` |
| HTTP fixtures through direct Docker Node | 5 passed | `reorg-docker-http.log` |
| Controlled Jira write during Docker shutdown | Passed; work-log persistence completed before shutdown | `reorg-docker-shutdown.log` |
| Jira TLS scope and header timeout | Passed on PHP and Node; 409 after 60.027s / 60.007s | `reorg-jira-transport-headers.log` |
| Jira interrupted-body timeout | Passed on PHP and Node; framework 500 after 60.038s / 60.006s, no local work-log persistence | `reorg-jira-transport-body.log` |

New internal checks exercise separate authenticated Jira sessions using an
injected Undici `MockAgent`, private readiness success/failure and port conflict,
draining an active private probe, and cleanup when a TLS file cannot be read
during server construction. Existing HTTPS, static asset, rotation, independent
application and public request-draining tests continue to pass.

The native-source audit found 36 classes across 67 TypeScript files, all declared
types/interfaces in `*.types.ts`, all module constants in `*.constants.ts`, no
application `any`, no SQL in controllers/services and no runtime import cycles.
Evaluated migration versions, SQL statements and advisory lock match the new
baseline exactly. Source files all have corresponding emitted JavaScript, and
the build no longer retains obsolete flat modules. No dependencies were added.

Validation used isolated Docker projects and disposable PostgreSQL/Jira fixtures.
One internal test invocation lacked sandbox socket access and the fixture
database URL; it failed and was rerun with approved local socket access and the
disposable URL. Only the successful complete rerun is counted above.
Disposable test resources were removed afterward. The deployed stack remains running.

| Commit | Increment |
| --- | --- |
| `74c2ba07` | Separate contracts and constants |
| `e10427a3` | Organize implementations and test imports by feature; clean generated output before builds |
| `78d1e65e` | Encapsulate authenticated Jira sessions and verify transport injection |
| `d7fbedad` | Own HTTP listeners and log streams; verify readiness and cleanup |

Architecture and final validation notes are committed separately. No commits
were pushed.
