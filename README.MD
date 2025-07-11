# JIRA-LOGGER

This is a JIRA time logger software for easy time logging.
Project consists of API and Angular PWA.

## Running docker mode

To run in docker mode you need to have Docker and Docker Compose installed.

## Setup

1) Run: `sh manager.sh -a build -m ng-build`
    - For development build: `sh manager.sh -a build -m ng-build-dev`

## Basic Usage

1) To run with **console output**:
   `sh manager.sh -a start`
2) To run in **background**:
   `sh manager.sh -a start -b`
3) To run with **Traefik**:
   `sh manager.sh -a start -b -t`
4) To rebuild Angular:
   `sh manager.sh -a ng-build`
   or for dev build:
   `sh manager.sh -a ng-build-dev`
   Then rerun the start command.
5) To fully **rebuild** the stack (down + build + Angular build):
   `sh manager.sh -a rebuild`
6) To **remove all database data** (dangerous, deletes all data!):
   `sh manager.sh -a db-remove`
7) To **dump the database** to a single SQL file (`db_dump.sql`):
   `sh manager.sh -a db-dump`

- The `-m` flag can be used **only with `build`** to specify Angular build mode (`ng-build` or `ng-build-dev`).
- The `rebuild` action always uses `ng-build` (production build) and does **not** accept `-m`.
- The `-t` flag adds Traefik to the Docker Compose stack.

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
