#!/bin/bash
[ -n "${BASH_VERSION:-}" ] || exec bash "$0" "$@"
set -e
set -o pipefail

PROJECT_NAME="jira-logger"
HOST_LOG_DIR=".logs/${PROJECT_NAME}"
HOST_LOG_ARCHIVE_DIR="${HOST_LOG_DIR}/archive"
DOCKER_ENV_FILE="./.docker/.env"
DOCKER_ENV_TEMPLATE="./.docker/.env.example"
HOST_LOG_PERSISTENCE="false"
LOGGING_MODE="off"

show_help() {
  cat <<EOF
Docker compose manager.

Usage:
  manager.sh -a build
  manager.sh -a start -b
  manager.sh -a start -b -t off
  manager.sh -a start -l on
  manager.sh -a down
  manager.sh -a rebuild
  manager.sh -a db-remove
  manager.sh -a db-dump
  manager.sh -a migrate
  manager.sh -a migrate-postgres
  manager.sh -a prepare-db
  manager.sh -a seed
  manager.sh -a upgrade

Options:
  -a  Action [start|start-with-init|down|build|rebuild|db-remove|db-dump|migrate|migrate-postgres|prepare-db|seed|upgrade]
  -b  Run docker containers in background
  -l  Host log persistence [on|off] (default: off)
  -t  Traefik mode [on|off] (default: on)
  -h  Show help
EOF
}

generate_certificates() {
  echo "Generating certificates"
  (cd ./.docker/certs/ && bash cert.sh jira-logger.io)
}

# Default values
ACTION=""
BACKGROUND=""
COMPOSE_FILES=(./.docker/docker-compose.yml)
TRAEFIK_MODE="on"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -a)
      ACTION="${2:-}"
      shift 2
      ;;
    -b)
      BACKGROUND="-d"
      shift
      ;;
    -l)
      if [[ "${2:-}" == "on" || "${2:-}" == "off" ]]; then
        LOGGING_MODE="$2"
        shift 2
      else
        shift
      fi
      ;;
    -t)
      if [[ "${2:-}" == "on" || "${2:-}" == "off" ]]; then
        TRAEFIK_MODE="$2"
        shift 2
      else
        # If -t is provided without value, ignore and keep default.
        shift
      fi
      ;;
    -h)
      show_help
      exit 0
      ;;
    *)
      show_help
      exit 1
      ;;
  esac
done

COMPOSE_FILES+=(./.docker/docker-compose.node.yml)
BACKEND_SERVICE="node"

if [[ "$TRAEFIK_MODE" != "on" && "$TRAEFIK_MODE" != "off" ]]; then
  echo "Invalid value for -t: '$TRAEFIK_MODE' (allowed: on|off)"
  exit 1
fi

if [[ "$LOGGING_MODE" != "on" && "$LOGGING_MODE" != "off" ]]; then
  echo "Invalid value for -l: '$LOGGING_MODE' (allowed: on|off)"
  exit 1
fi

if [[ "${LOGGING_MODE}" == "on" ]]; then
  HOST_LOG_PERSISTENCE="true"
  COMPOSE_FILES+=(./.docker/docker-compose.host-logs.yml)
  COMPOSE_FILES+=("./.docker/docker-compose.node.host-logs.yml")
fi

if [[ "$TRAEFIK_MODE" == "on" ]]; then
  COMPOSE_FILES+=(./.docker/docker-compose-traefik.yml)
  COMPOSE_FILES+=("./.docker/docker-compose.node.traefik.yml")
  if [[ "${LOGGING_MODE}" == "on" ]]; then
    COMPOSE_FILES+=(./.docker/docker-compose-traefik.host-logs.yml)
  fi
else
  COMPOSE_FILES+=("./.docker/docker-compose.node.no-traefik.yml")
fi

compose_cmd() {
  ensure_docker_env_file
  if [[ "${TRAEFIK_MODE}" == "on" ]]; then
    ensure_traefik_network
  fi
  COMPOSE_PROJECT_NAME="${PROJECT_NAME}" docker compose --env-file "${DOCKER_ENV_FILE}" $(printf -- '-f %s ' "${COMPOSE_FILES[@]}") "$@"
}

run_with_log() {
  local logfile="$1"
  shift

  if [[ "${HOST_LOG_PERSISTENCE}" != "true" ]]; then
    "$@"
    return $?
  fi

  ensure_host_log_dir
  "$@" 2>&1 | tee -a "${HOST_LOG_DIR}/${logfile}"
  return "${PIPESTATUS[0]}"
}

ensure_host_log_dir() {
  mkdir -p "${HOST_LOG_DIR}"
  mkdir -p "${HOST_LOG_ARCHIVE_DIR}"
  touch "${HOST_LOG_DIR}/log-node.log"
  chmod a+rw "${HOST_LOG_DIR}/log-node.log"
}

ensure_docker_env_file() {
  if [[ -f "${DOCKER_ENV_FILE}" ]]; then
    return 0
  fi

  echo "Missing ${DOCKER_ENV_FILE}."
  echo "Create it from ${DOCKER_ENV_TEMPLATE} and fill the required values before continuing."
  exit 1
}

ensure_traefik_network() {
  if docker network inspect traefik >/dev/null 2>&1; then
    return 0
  fi

  echo "Creating shared Docker network 'traefik'"
  docker network create traefik >/dev/null
}

append_compose_file_once() {
  local file="$1"
  local existing

  for existing in "${COMPOSE_FILES[@]}"; do
    if [[ "${existing}" == "${file}" ]]; then
      return 0
    fi
  done

  COMPOSE_FILES+=("${file}")
}

rotate_host_logs() {
  if [[ "${HOST_LOG_PERSISTENCE}" != "true" ]]; then
    return 0
  fi

  local stamp
  local file
  local active
  local base
  local rotated

  ensure_host_log_dir
  stamp="$(date +%F_%H%M%S)"

  # Migrate any legacy rotated files from root log dir into archive dir.
  find "${HOST_LOG_DIR}" -maxdepth 1 -type f \
    -name 'log-*.[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9].log' \
    -exec mv {} "${HOST_LOG_ARCHIVE_DIR}/" \; 2>/dev/null || true

  for active in "${HOST_LOG_DIR}"/log-*.log; do
    [[ -f "${active}" ]] || continue
    file="${active##*/}"
    base="${file%.log}"
    rotated="${HOST_LOG_ARCHIVE_DIR}/${base}.${stamp}.log"
    if [[ -f "${rotated}" ]]; then
      rotated="${HOST_LOG_ARCHIVE_DIR}/${base}.${stamp}.$$.log"
    fi
    mv "${active}" "${rotated}"
    touch "${active}"
    chmod a+rw "${active}"
  done

  find "${HOST_LOG_ARCHIVE_DIR}" -maxdepth 1 -type f -name 'log-*.*.log' -mtime +7 -delete
}

build_images() {
  echo "Building docker images"
  export COMPOSE_BAKE=true
  compose_cmd build
}

build_stack() {
  build_images
  ensure_postgres_migration
  stop_application_writers
  prepare_db
}

record_postgres_migration() (
  umask 077
  local temporary
  temporary=$(mktemp "${DOCKER_ENV_FILE}.migration.XXXXXXXX")
  trap 'rm -f "$temporary"' EXIT
  awk '!/^[[:space:]]*POSTGRES_MIGRATION_STATUS=/' "$DOCKER_ENV_FILE" > "$temporary"
  printf '\nPOSTGRES_MIGRATION_STATUS=%s\n' "$1" >> "$temporary"
  mv "$temporary" "$DOCKER_ENV_FILE"
)

check_sqlite() {
  compose_cmd run --rm --no-deps node node --input-type=module -e '
    import { existsSync } from "node:fs";
    import { DatabaseSync } from "node:sqlite";
    const path = process.env.SQLITE_PATH;
    if (!existsSync(path)) process.exit(10);
    const db = new DatabaseSync(path, {readOnly:true});
    try {
      if (db.prepare("PRAGMA user_version").get().user_version !== 1) throw Error("Unsupported schema");
      for (const table of ["task","tag","setting","tag_task","time_log","jira_work_log"]) db.prepare("SELECT 1 FROM " + table + " LIMIT 1").get();
      if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length) throw Error("Invalid database");
    } finally { db.close(); }
  '
}

stop_application_writers() {
  local service container
  for service in node php-fpm nginx; do
    for container in $(docker ps -q --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter "label=com.docker.compose.service=${service}"); do
      docker stop -t 135 "$container"
    done
  done
}

ensure_postgres_migration() (
  set -e
  ensure_docker_env_file
  docker info >/dev/null
  local state source sqlite_status legacy_volumes work attempt ready=false
  state=$(awk -F= '/^POSTGRES_MIGRATION_STATUS=/{value=$2} END{print value}' "$DOCKER_ENV_FILE")
  source=$(docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter 'label=com.docker.compose.service=db')
  legacy_volumes=$(docker volume ls -q --filter "name=^${PROJECT_NAME}_dbData$")
  sqlite_status=0
  check_sqlite || sqlite_status=$?
  if [[ "$sqlite_status" != 0 && "$sqlite_status" != 10 ]]; then
    echo 'SQLite validation failed; refusing migration or initialization.' >&2
    exit 1
  fi
  if [[ "$sqlite_status" == 0 ]]; then
    if [[ -n "$source$legacy_volumes" && "$state" != migrated ]]; then
      echo 'Both PostgreSQL and SQLite exist without a completed migration marker. Resolve this explicitly before continuing.' >&2
      exit 1
    fi
    if [[ "$state" != migrated ]]; then record_postgres_migration not-required; fi
    echo 'SQLite verified; no PostgreSQL migration required.'
    exit 0
  fi
  if [[ "$state" == migrated ]]; then
    echo 'Previously migrated SQLite database is missing. Restore its backup before continuing.' >&2
    exit 1
  fi
  if [[ -z "$source" ]]; then
    if [[ -n "$legacy_volumes" ]]; then
      echo 'Legacy PostgreSQL volume exists without its container. Recover the old database container before migrating.' >&2
      exit 1
    fi
    prepare_db
    check_sqlite
    record_postgres_migration not-required
    exit 0
  fi
  if [[ "$source" == *$'\n'* ]]; then
    echo 'Multiple legacy PostgreSQL containers found; refusing to guess.' >&2
    exit 1
  fi
  stop_application_writers
  docker start "$source" >/dev/null
  for attempt in {1..15}; do
    if docker exec "$source" sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 2
  done
  if [[ "$ready" != true ]]; then
    echo 'Legacy PostgreSQL did not become ready; migration has not completed.' >&2
    exit 1
  fi
  umask 077
  mkdir -p .migration-backups
  work=$(mktemp -d .migration-backups/postgres.XXXXXXXX)
  echo "Preserving PostgreSQL recovery artifacts in $work"
  docker exec "$source" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$work/recovery.dump"
  docker exec -i "$source" sh -c 'psql -X -q -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < tools/export-postgres.sql > "$work/postgres-snapshot.json"
  # Root reads private host-owned exports; hand the published database to Node.
  compose_cmd run --rm --no-deps --user 0 --entrypoint sh -v "$(pwd)/${work}:/migration:ro" node -c 'node dist/db-tools.js import-postgres /migration/postgres-snapshot.json /data/jira-logger.sqlite && chown node:node /data/jira-logger.sqlite'
  check_sqlite
  record_postgres_migration migrated
  echo 'PostgreSQL migration validated and recorded. Original PostgreSQL data and backup are preserved.'
)

start_stack() {
  ensure_postgres_migration
  generate_certificates
  # Drain the existing application before replacing containers.
  ensure_docker_env_file
  local container service
  # Discover old services by project label: they may not exist in the new overlay.
  for service in nginx traefik node php-fpm; do
    # Shared Traefik may serve other projects; stop it only to release direct ports.
    if [[ "$service" == "traefik" && "$TRAEFIK_MODE" == "on" ]]; then continue; fi
    for container in $(docker ps -q --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter "label=com.docker.compose.service=${service}"); do
      docker stop -t 135 "$container"
    done
  done
  rotate_host_logs
  compose_cmd up -d --wait "$BACKEND_SERVICE"
  compose_cmd up -d --wait --remove-orphans
  if [[ "${1:-}" != "-d" ]]; then compose_cmd up; fi
}

prepare_db() {
  echo "Preparing SQLite database and applying migrations"
  run_with_log "log-migrate.log" compose_cmd run --rm --no-deps node node dist/cli.js prepare-db
}

migrate_db() {
  run_with_log "log-migrate.log" compose_cmd run --rm --no-deps node node dist/cli.js migrate
}

seed_db() {
  compose_cmd run --rm --no-deps node node dist/cli.js seed:setting
  compose_cmd run --rm --no-deps node node dist/cli.js seed:tag
}

cleanup_compose_residuals() {
  # Clean up profile/one-off containers that may remain after compose down.
  docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter "label=com.docker.compose.service=migrate" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter "label=com.docker.compose.oneoff=True" | xargs -r docker rm -f >/dev/null 2>&1 || true
}

stop_stack() (
  append_compose_file_once "./.docker/docker-compose-traefik.yml"
  compose_cmd down --remove-orphans
  cleanup_compose_residuals
)

dump_db_to_file() (
  set -e
  local output_path="$1"
  local container="${PROJECT_NAME}-backup-$$"
  local backup_path="/tmp/db-backup-$$.sqlite"
  local staged_path="${output_path}.tmp.$$"
  if [[ -e "$output_path" || -e "$staged_path" ]]; then
    echo "Backup destination already exists: $output_path" >&2
    return 1
  fi
  trap 'docker rm "$container" >/dev/null 2>&1 || true; rm -f "$staged_path"' EXIT
  echo "Backing up SQLite to $output_path"
  compose_cmd run --name "$container" --no-deps node node dist/cli.js db:backup "$backup_path"
  docker cp "${container}:${backup_path}" "$staged_path"
  chmod 600 "$staged_path"
  # Hard-link publication refuses an existing destination, including a concurrent backup.
  ln "$staged_path" "$output_path"
  echo "Backup saved to $output_path"
)

upgrade_stack() {
  local dump_path
  local upgrade_background="${BACKGROUND:--d}"

  ensure_docker_env_file
  build_images
  ensure_postgres_migration

  dump_path="./db_backup.pre-upgrade.$(date +%F_%H%M%S).sqlite"
  dump_db_to_file "${dump_path}"

  echo "Stopping existing stack before upgrade"
  stop_stack

  build_images
  migrate_db

  echo "Starting upgraded stack"
  start_stack ${upgrade_background}

  if [[ -z "${BACKGROUND}" ]]; then
    echo "Upgrade finished. Stack started in background by default."
  fi
}

case "$ACTION" in
  build)
    echo "Running action $ACTION"
    build_stack
    ;;
  start|start-with-init)
    echo "Running action $ACTION"
    ensure_postgres_migration
    if [[ "$ACTION" == "start-with-init" ]]; then
      echo "Preparing the database before start."
      prepare_db
    fi
    start_stack $BACKGROUND
    ;;
  down)
    echo "Running action $ACTION"
    stop_stack
    ;;
  rebuild)
    echo "Running action $ACTION"
    build_images
    ensure_postgres_migration
    stop_stack
    prepare_db
    ;;
  db-remove)
    echo "Removing SQLite data volume 'jira-logger_sqliteData'..."
    docker volume rm jira-logger_sqliteData
    ;;
  db-dump)
    dump_db_to_file "./db_backup.sqlite"
    ;;
  migrate)
    ensure_postgres_migration
    migrate_db
    ;;
  migrate-postgres)
    build_images
    ensure_postgres_migration
    ;;
  prepare-db)
    ensure_postgres_migration
    prepare_db
    ;;
  seed)
    seed_db
    ;;
  upgrade)
    echo "Running action $ACTION"
    upgrade_stack
    ;;
  *)
    show_help
    exit 1
    ;;
esac
