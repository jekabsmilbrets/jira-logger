# JIRA-LOGGER

This is a JIRA time logger software for easy time logging.
Project consists of API and Angular PWA.

## Running docker mode

To run in docker mode you need to have Docker and Docker Compose installed.

## Setup

1) Prepare `./.docker/.env` from `./.docker/.env.example` (source of truth template).
2) Start containers: `sh manager.sh -a start`

Notes:
- `manager.sh` now runs with `./.docker/docker-compose.yml` and `./.docker/docker-compose.dev.yml` by default.
- On a fresh checkout, `manager.sh -a start` will trigger the required build flow automatically if the shared frontend assets volume is missing.
- Backend env variables are loaded from `./.docker/.env` via `docker-compose.yml`.
- Plain Docker Compose startup is self-contained for frontend assets now: `docker compose up --build` brings up `assets-init`, populates `assetsData`, and only then starts nginx.

## Basic Usage

1) To run with **console output**:
   `sh manager.sh -a start`
2) To run in **background**:
   `sh manager.sh -a start -b`
3) To run with **Traefik**:
   `sh manager.sh -a start -b`
   To disable Traefik:
   `sh manager.sh -a start -b -t off`
4) Runtime containers are copy-only (no backend/frontend bind mounts), so source code changes require image rebuild + restart (`sh manager.sh -a build` then `sh manager.sh -a start`), or `sh manager.sh -a rebuild`.
5) To fully **rebuild** the stack (down + build, including DB prepare and seed):
   `sh manager.sh -a rebuild`
6) To **remove all database data** (dangerous, deletes all data!):
   `sh manager.sh -a db-remove`
7) To **dump the database** to a single SQL file (`db_dump.sql`):
   `sh manager.sh -a db-dump`
8) To run DB migrations using the `release` profile:
   `sh manager.sh -a migrate`
9) To **upgrade an existing checkout** from the old stack layout to the new one:
   `sh manager.sh -a upgrade`

- Traefik is enabled by default. Use `-t off` to start without Traefik.
- The `traefik` Docker network is created automatically by `manager.sh` when needed.
- Traefik dashboard is exposed through HTTPS with basic auth:
  - set `TRAEFIK_DASHBOARD_HOST` and `TRAEFIK_DASHBOARD_AUTH` in `./.docker/.env`
  - generate a bcrypt auth value (`user:hash`) with:
    - `docker run --rm httpd:2.4-alpine htpasswd -nbB admin 'change-me'`
  - add host mapping in `/etc/hosts` for local setup (example): `127.0.0.1 traefik.jira-logger.io`
  - open: `https://traefik.jira-logger.io/dashboard/`
- Frontend assets are stored in a shared Docker volume populated by `assets-init`, which is part of the default stack startup.
- `assets-init` is the only container that writes `runtime-config.json` into the shared frontend assets volume.
- On `start`, assets marker preflight rules are enforced:
  - Missing marker: interactive mode prompts to run `build`; non-interactive mode runs `build` automatically.
  - Marker mismatch: interactive mode prompts to run `rebuild`; non-interactive mode fails fast with a rebuild command.
- All core runtime logs are available on host in `./.logs/jira-logger/`:
  - `log-php-fpm-error.log`
  - `log-php-fpm-access.log`
  - `log-php-fpm-slow.log`
  - `log-symfony-main.log`
  - `log-symfony-deprecation.log`
  - `log-symfony-jira-api-service.log`
  - `log-nginx-access.log`
  - `log-nginx-error.log`
  - `log-postgres.log`
  - `log-traefik.log`
  - `log-traefik-access.log`
  - `log-assets-init.log`
  - `log-migrate.log`
- `assets-init` output is appended to `log-assets-init.log` during `build`/`rebuild`.
- Migration output is appended to `log-migrate.log` during `prepare-db` and `migrate`.
- Runtime log cap is enforced by `log-governor` container:
  - per-file hard cap: `50MB` (`52428800` bytes)
  - behavior: keeps newest content by size-based trim when a file exceeds cap
  - applies to all `log-*.log` files listed above, including `log-assets-init.log` and `log-migrate.log`
- Log rotation/cleanup runs on every `start`/`start-with-init`:
  - active `log-*.log` files are rotated to `./.logs/jira-logger/archive/log-*.YYYY-MM-DD_HHMMSS.log`
  - archived logs older than 7 days are deleted

## Upgrading Older Checkouts

If you are updating from an older checkout that still used `backend/.env` or bind-mounted frontend assets, run:

`sh manager.sh -a upgrade`

What `upgrade` does:
- requires `./.docker/.env` to exist and treats it as the runtime config source of truth;
- warns if `./backend/.env` is still present, because it is now legacy;
- creates a timestamped pre-upgrade database backup such as `./db_dump.pre-upgrade.YYYY-MM-DD_HHMMSS.sql`;
- stops the old stack, rebuilds images, refreshes shared assets, runs DB migrations, and starts the new stack;
- does not run seed commands.
- starts the upgraded stack in background by default; use `docker compose logs -f` or `sh manager.sh -a start` if you want attached logs afterward.

After first start, a certificate will be generated at `.docker/nginx-selfsigned.crt`,
which should be imported into your system's root certificates to allow SSL for API calls and Angular PWA.

## Project Specification

### API
* Symfony 6.4
* Doctrine
* PostgreSQL
* PHP 8.4 / PHP-FPM
* Nginx

### FE
* Angular 20
* Material 20
* Node 22.17.0
* NPM 10.8.2
