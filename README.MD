# Jira Logger

Jira Logger is a self-hosted time and task logger. It has an Angular PWA frontend, a Node.js/Fastify backend, PostgreSQL storage, and optional PHP/Nginx backend support.

## Requirements

- Docker and Docker Compose
- A local hostname for HTTPS, normally `jira-logger.io`
- Jira URL and personal access token if Jira integration is needed

## Setup

1. Copy the Docker environment template:

   ```sh
   cp .docker/.env.example .docker/.env
   ```

2. Review `.docker/.env` before starting. At minimum, confirm the database URL, application secret, time zones, CORS origin, and any Traefik dashboard settings. Keep real credentials and production secrets out of committed files.

3. Make the local application hostname resolve to this machine when using direct access or local Traefik routing:

   ```text
   127.0.0.1 jira-logger.io
   ```

   If the Traefik dashboard is enabled, add its configured hostname too, for example `traefik.jira-logger.io`.

4. Build the images. This also prepares the database and seeds default settings and tags:

   ```sh
   sh manager.sh -a build
   ```

5. Start the application:

   ```sh
   sh manager.sh -a start -b
   ```

The first start generates `.docker/certs/jira-logger.io.crt` and `.docker/certs/jira-logger.io.key`. Trust the certificate locally if your browser reports an untrusted HTTPS connection. The `assets-init` service populates the shared frontend asset volume before the selected backend starts.

## Run with Docker

Create the runtime configuration:

```sh
cp .docker/.env.example .docker/.env
```

Edit `.docker/.env`, then build and start the default Node stack:

```sh
sh manager.sh -a build
sh manager.sh -a start
```

The default backend is Node. Containers are copy-only, so source changes require a rebuild:

```sh
sh manager.sh -a build
sh manager.sh -a start
```

Start in the background with `-b`:

```sh
sh manager.sh -a start -b
```

Traefik is enabled by default and terminates HTTPS. For direct local access, disable it and map the hostname to localhost:

```sh
sh manager.sh -a start -b -t off
```

Add this entry to `/etc/hosts` when using direct access:

```text
127.0.0.1 jira-logger.io
```

Then open [https://jira-logger.io](https://jira-logger.io). The local certificate is generated under `.docker/certs/` and may need to be trusted by your operating system.

## Common operations

```sh
sh manager.sh -a rebuild   # stop, rebuild, prepare the database and seed defaults
sh manager.sh -a migrate   # apply migrations
sh manager.sh -a db-dump   # write db_dump.sql
sh manager.sh -a db-remove # delete database data
docker compose logs -f     # follow container logs
```

`db-remove` is destructive. Normal stop, rebuild, and backend switching preserve database volumes.

Persist host logs only when debugging:

```sh
sh manager.sh -a start -b -l on
```

Without `-l on`, use Docker logs. Persisted logs are written under `.logs/jira-logger/` and rotated by the stack.

## `manager.sh` reference

`manager.sh` is the supported wrapper for starting and maintaining the Docker stack. Its general form is:

```sh
sh manager.sh -a ACTION [OPTIONS]
```

Options:

| Option | Values | Default | Purpose |
| --- | --- | --- | --- |
| `-a` | action name | — | Selects the operation to run. Required for normal use. |
| `-b` | flag | off | Starts containers in the background. Without it, `start` attaches to container output. |
| `-B`, `--backend` | `node`, `php` | `node` | Selects the backend for this invocation only. |
| `-l` | `on`, `off` | `off` | Enables or disables persisted host logs in `.logs/jira-logger/`. |
| `-t` | `on`, `off` | `on` | Enables or disables the Traefik ingress container. |
| `-h` | flag | — | Prints the built-in help. |

Actions:

| Action | Purpose |
| --- | --- |
| `start` | Generate certificates, start the selected backend and ingress, and wait for services to become ready. |
| `start-with-init` | Prepare the database, then start the selected stack. Does not seed default records. |
| `down` | Stop and remove the project containers and Compose network while preserving database volumes. |
| `build` | Build images, prepare the database, and seed default settings and tags. |
| `rebuild` | Stop the stack, then perform `build`. Existing database volumes are preserved. |
| `db-remove` | Remove the `jira-logger_dbData` Docker volume. This permanently deletes database data. |
| `db-dump` | Write a PostgreSQL dump to `./db_dump.sql`, starting the database temporarily if needed. |
| `migrate` | Run database migrations using the selected backend. |
| `prepare-db` | Start or prepare the database without seeding default settings and tags. |
| `seed` | Seed the selected backend's default settings and tags. |
| `upgrade` | Back up the database, stop the old stack, rebuild images, migrate, and start the upgraded stack. |

Examples:

```sh
# Show all built-in options
sh manager.sh -h

# Start Node with Traefik in the background
sh manager.sh -a start -b

# Start Node directly without Traefik and persist logs
sh manager.sh -a start -b -t off -l on

# Run a database migration with PHP
sh manager.sh -a migrate --backend php

# Prepare the database without seed data
sh manager.sh -a prepare-db

# Seed defaults explicitly
sh manager.sh -a seed

# Upgrade an older checkout; creates db_dump.pre-upgrade.YYYY-MM-DD_HHMMSS.sql
sh manager.sh -a upgrade
```

Backend selection is not persisted between invocations. Pass `--backend php` again for every PHP action. The wrapper also creates the shared `traefik` Docker network when it is missing and removes obsolete backend containers when switching between Node and PHP.

## Jira import

Configure the Jira host and personal access token from the Settings page. The Jira import action then appears in the Tasks toolbar.

The importer can filter by assignee, reporter, resolution, project keys, and result limit. Select issues to create local tasks, and use the tag action to adjust tags before importing.

## Backend selection

Node is the default backend. PHP remains available for deployments that explicitly select it:

```sh
# Node
sh manager.sh -a build
sh manager.sh -a start -b

# PHP
sh manager.sh --backend php -a build
sh manager.sh --backend php -a start -b
```

Backend selection applies per `manager.sh` invocation; it is not persisted. Both backends use the same PostgreSQL database and frontend assets.

## Node development

The Node backend lives in `backend-node/` and uses TypeScript, Fastify, Vitest, and ESLint.

```sh
npm ci --prefix backend-node
npm run build --prefix backend-node
npm test --prefix backend-node
npm run lint --prefix backend-node
npm start --prefix backend-node
```

The frontend lives in `frontend/` and uses Angular.

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npm test --prefix frontend -- --watch=false
```

## Repository layout

- `backend-node/` — default Node API, CLI, migrations, and tests
- `backend/` — PHP/Symfony backend retained for explicit PHP mode
- `frontend/` — Angular PWA
- `.docker/` — Dockerfiles, Compose files, certificates, and environment templates
- `manager.sh` — Docker lifecycle and backend-selection wrapper

## Project specification

### Backend

- Node.js 24, TypeScript, Fastify 5, and Vitest — default runtime
- Symfony 8, Doctrine, PHP-FPM, and Nginx — optional PHP runtime
- PostgreSQL database shared by both backends
- CLI maintenance commands for migrations, seed data, and Jira-sync audits

### Frontend

- Angular 22 PWA
- Angular Material 22
- Node.js 22.22.3 or newer for frontend development
- npm 10.9.8 or newer for frontend development

### Infrastructure

- Docker Compose for local and production-like orchestration
- Traefik for optional HTTPS ingress and routing
- Nginx only in PHP mode
- Shared frontend asset volume initialized before the selected backend starts
- Optional persisted log files with size caps and seven-day archive cleanup

## Configuration

Runtime configuration is read from `.docker/.env`. Important settings include:

- `DATABASE_URL`
- `APP_INTERNAL_TIMEZONE`
- `APP_DEFAULT_USER_TIMEZONE`
- `CORS_ALLOW_ORIGIN`
- Jira connection settings stored through the application Settings page

The public API exposes `/api/monitor` and `/api/doc`. Node's readiness endpoint is internal to its container.
