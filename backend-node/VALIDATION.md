# OOP refactor validation

Executed on 2026-09-19 on `feature/BE-rewrite-to-node`. The refactor starts after
`eb7d326859e28b1e05e18ecfb24f9b3193b702b2`; the initial working tree was clean.
All refactor edits are confined to `backend-node/`. PHP, frontend, Compose,
manager and existing compatibility fixtures are unchanged.

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

```sh
TZ=UTC node --import ./backend-node/test/support/pg-text-timestamps.mjs --test compatibility/migrations.test.mjs
```

The preload restores that fixture assumption only in the test process;
application pools use instance-local parsers. Running that particular fixture
without the preload fails its JavaScript timestamp representation assertion.

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
