#!/bin/bash
set -e
set -o pipefail

PROJECT_NAME="jira-logger"
ASSETS_VOLUME_NAME="${PROJECT_NAME}_assetsData"
ASSETS_MARKER_PATH="/assets/.assets-version"
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
  manager.sh -a start -b
  manager.sh -a start -b -t off
  manager.sh -a start -l on
  manager.sh -a down
  manager.sh -a rebuild
  manager.sh -a db-remove
  manager.sh -a db-dump
  manager.sh -a migrate
  manager.sh -a prepare-db
  manager.sh -a seed
  manager.sh -a upgrade

Options:
  -a  Action [start|start-with-init|down|build|rebuild|db-remove|db-dump|migrate|prepare-db|seed|upgrade]
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

ensure_traefik_network() {
  if ! docker network inspect traefik >/dev/null 2>&1; then
    echo "Creating Docker network 'traefik'"
    docker network create traefik >/dev/null
  fi
}

# Default values
ACTION=""
BACKGROUND=""
COMPOSE_FILES=(./.docker/docker-compose.yml)
COMPOSE_FILES+=(./.docker/docker-compose.dev.yml)
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
fi

if [[ "$TRAEFIK_MODE" == "on" ]]; then
  COMPOSE_FILES+=(./.docker/docker-compose-traefik.yml)
  if [[ "${LOGGING_MODE}" == "on" ]]; then
    COMPOSE_FILES+=(./.docker/docker-compose-traefik.host-logs.yml)
  fi
fi

TRAEFIK_ARGS=()
if [[ "$TRAEFIK_MODE" == "off" ]]; then
  TRAEFIK_ARGS=(-t off)
fi

LOGGING_ARGS=()
if [[ "$LOGGING_MODE" == "on" ]]; then
  LOGGING_ARGS=(-l on)
fi

compose_cmd() {
  ensure_traefik_network
  ensure_docker_env_file
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
}

ensure_docker_env_file() {
  if [[ -f "${DOCKER_ENV_FILE}" ]]; then
    return 0
  fi

  echo "Missing ${DOCKER_ENV_FILE}."
  echo "Create it from ${DOCKER_ENV_TEMPLATE} and fill the required values before continuing."
  exit 1
}

warn_legacy_backend_env() {
  if [[ -s "./backend/.env" ]]; then
    echo "Warning: ./backend/.env is legacy and is no longer used as the runtime config source."
    echo "Use ${DOCKER_ENV_FILE} instead."
  fi
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
  local -a files=(
    "log-php-fpm-error.log"
    "log-php-fpm-access.log"
    "log-php-fpm-slow.log"
    "log-symfony-main.log"
    "log-symfony-deprecation.log"
    "log-symfony-jira-api-service.log"
    "log-nginx-access.log"
    "log-nginx-error.log"
    "log-postgres.log"
    "log-traefik.log"
    "log-traefik-access.log"
    "log-assets-init.log"
    "log-migrate.log"
  )

  ensure_host_log_dir
  stamp="$(date +%F_%H%M%S)"

  # Migrate any legacy rotated files from root log dir into archive dir.
  find "${HOST_LOG_DIR}" -maxdepth 1 -type f -name 'log-*.*.log' -exec mv {} "${HOST_LOG_ARCHIVE_DIR}/" \; 2>/dev/null || true

  for file in "${files[@]}"; do
    active="${HOST_LOG_DIR}/${file}"
    if [[ ! -f "${active}" ]]; then
      touch "${active}"
      continue
    fi

    base="${file%.log}"
    rotated="${HOST_LOG_ARCHIVE_DIR}/${base}.${stamp}.log"
    if [[ -f "${rotated}" ]]; then
      rotated="${HOST_LOG_ARCHIVE_DIR}/${base}.${stamp}.$$.log"
    fi
    mv "${active}" "${rotated}"
    touch "${active}"
  done

  find "${HOST_LOG_ARCHIVE_DIR}" -maxdepth 1 -type f -name 'log-*.*.log' -mtime +7 -delete
}

is_interactive_tty() {
  [[ -t 0 && -t 1 ]]
}

prompt_yes_no_default_yes() {
  local prompt="$1"
  local answer
  read -r -p "${prompt} [Y/n] " answer
  case "${answer:-Y}" in
    [Yy]|[Yy][Ee][Ss]) return 0 ;;
    *) return 1 ;;
  esac
}

get_expected_assets_version() {
  local digest
  local commit

  digest="$(docker image inspect jira-logger-php-fpm:latest --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
  if [[ -n "$digest" ]]; then
    echo "$digest"
    return 0
  fi

  commit="$(git rev-parse HEAD 2>/dev/null || true)"
  if [[ -n "$commit" ]]; then
    echo "commit:${commit}"
    return 0
  fi

  echo "unknown"
}

get_assets_marker() {
  if ! docker volume inspect "${ASSETS_VOLUME_NAME}" >/dev/null 2>&1; then
    return 2
  fi

  docker run --rm -v "${ASSETS_VOLUME_NAME}:/assets:ro" alpine:3.20 sh -lc "cat ${ASSETS_MARKER_PATH} 2>/dev/null || true"
}

run_assets_init() {
  local assets_version="$1"
  echo "Initializing shared assets volume (${ASSETS_VOLUME_NAME}) with version: ${assets_version}"
  run_with_log "log-assets-init.log" compose_cmd build assets-init
  run_with_log "log-assets-init.log" compose_cmd run --rm -e "ASSETS_VERSION=${assets_version}" assets-init
}

build_images() {
  echo "Building docker images"
  generate_certificates
  export COMPOSE_BAKE=true
  compose_cmd build
}

build_runtime_artifacts() {
  build_images
  run_assets_init "$(get_expected_assets_version)"
}

preflight_assets_marker_for_start() {
  local expected marker

  expected="$(get_expected_assets_version)"
  marker="$(get_assets_marker || true)"

  if [[ -z "$marker" ]]; then
    if is_interactive_tty; then
      echo "Assets marker is missing."
      if prompt_yes_no_default_yes "Run build now?"; then
        bash "$0" -a build "${TRAEFIK_ARGS[@]}" "${LOGGING_ARGS[@]}"
      else
        echo "Start aborted. Run: sh manager.sh -a build"
        exit 1
      fi
    else
      echo "Assets marker is missing. Running build automatically before start."
      bash "$0" -a build "${TRAEFIK_ARGS[@]}" "${LOGGING_ARGS[@]}"
    fi
    return 0
  fi

  if [[ "$marker" != "$expected" ]]; then
    if is_interactive_tty; then
      echo "Assets version mismatch."
      echo "  marker:   $marker"
      echo "  expected: $expected"
      if prompt_yes_no_default_yes "Run rebuild now?"; then
        bash "$0" -a rebuild "${TRAEFIK_ARGS[@]}" "${LOGGING_ARGS[@]}"
      else
        echo "Start aborted. Run: sh manager.sh -a rebuild"
        exit 1
      fi
    else
      echo "Assets version mismatch in non-interactive mode."
      echo "  marker:   $marker"
      echo "  expected: $expected"
      echo "Run: sh manager.sh -a rebuild"
      exit 1
    fi
  fi
}

prepare_db() {
  echo "Preparing database (create if missing + migrations)"
  # Drop stale migration container/network bindings from previous compose runs.
  compose_cmd rm -fsv migrate >/dev/null 2>&1 || true
  run_with_log "log-migrate.log" compose_cmd --profile release up --force-recreate --remove-orphans migrate
}

migrate_db() {
  echo "Running database migrations"
  run_with_log "log-migrate.log" compose_cmd run --rm php-fpm php bin/console doctrine:migrations:migrate --no-interaction
}

seed_db() {
  echo "Seeding database"
  compose_cmd run --rm php-fpm php bin/console seed:setting
  compose_cmd run --rm php-fpm php bin/console seed:tag
}

cleanup_compose_residuals() {
  # Clean up profile/one-off containers that may remain after compose down.
  docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter "label=com.docker.compose.service=migrate" | xargs -r docker rm -f >/dev/null 2>&1 || true
  docker ps -aq --filter "label=com.docker.compose.project=${PROJECT_NAME}" --filter "label=com.docker.compose.oneoff=True" | xargs -r docker rm -f >/dev/null 2>&1 || true
}

stop_stack() {
  compose_cmd down --remove-orphans
  cleanup_compose_residuals
}

wait_for_db_ready() {
  local db_container="$1"
  local db_user="$2"
  local db_name="$3"
  local attempt

  for attempt in $(seq 1 30); do
    if docker exec "${db_container}" pg_isready -U "${db_user}" -d "${db_name}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Database container '${db_container}' did not become ready in time."
  exit 1
}

dump_db_to_file() {
  local output_path="$1"
  local db_container="${PROJECT_NAME}-db"
  local started_db=0
  local db_user
  local db_name
  local db_pass

  ensure_docker_env_file

  if ! docker ps --format '{{.Names}}' | grep -Fxq "${db_container}"; then
    echo "Database container is not running. Starting db service for backup."
    compose_cmd up -d db
    started_db=1
  fi

  db_user="$(docker exec "${db_container}" printenv POSTGRES_USER 2>/dev/null || true)"
  db_name="$(docker exec "${db_container}" printenv POSTGRES_DB 2>/dev/null || true)"
  db_pass="$(docker exec "${db_container}" printenv POSTGRES_PASSWORD 2>/dev/null || true)"
  if [[ -z "${db_user}" || -z "${db_name}" || -z "${db_pass}" ]]; then
    echo "Could not fetch DB credentials from container '${db_container}'."
    echo "Make sure the database service can start with ${DOCKER_ENV_FILE}."
    exit 1
  fi

  wait_for_db_ready "${db_container}" "${db_user}" "${db_name}"

  echo "Dumping database to ${output_path}"
  export PGPASSWORD="${db_pass}"
  docker exec "${db_container}" pg_dump -U "${db_user}" "${db_name}" > "${output_path}"
  unset PGPASSWORD
  echo "Database dump saved to ${output_path}"

  if [[ "${started_db}" -eq 1 ]]; then
    echo "Database service was started temporarily to create the backup."
  fi
}

upgrade_stack() {
  local dump_path
  local upgrade_background="${BACKGROUND:--d}"

  ensure_docker_env_file
  warn_legacy_backend_env

  dump_path="./db_dump.pre-upgrade.$(date +%F_%H%M%S).sql"
  dump_db_to_file "${dump_path}"

  echo "Stopping existing stack before upgrade"
  append_compose_file_once "./.docker/docker-compose-traefik.yml"
  stop_stack

  build_runtime_artifacts
  prepare_db

  echo "Starting upgraded stack"
  rotate_host_logs
  compose_cmd up ${upgrade_background} --remove-orphans

  if [[ -z "${BACKGROUND}" ]]; then
    echo "Upgrade finished. Stack started in background by default."
  fi
}

run_post_build_sequence() {
  prepare_db
  seed_db
}

case "$ACTION" in
  build)
    echo "Running action $ACTION"
    build_runtime_artifacts
    run_post_build_sequence
    ;;
  start)
    echo "Running action $ACTION"
    generate_certificates
    rotate_host_logs
    preflight_assets_marker_for_start
    compose_cmd up $BACKGROUND --remove-orphans
    ;;
  start-with-init)
    echo "Running action $ACTION"
    echo "Action 'start-with-init' is now an alias for 'start'."
    prepare_db
    generate_certificates
    rotate_host_logs
    preflight_assets_marker_for_start
    compose_cmd up $BACKGROUND --remove-orphans
    ;;
  down)
    echo "Running action $ACTION"
    append_compose_file_once "./.docker/docker-compose-traefik.yml"
    stop_stack
    ;;
  rebuild)
    echo "Running action $ACTION"
    bash "$0" -a down "${TRAEFIK_ARGS[@]}" "${LOGGING_ARGS[@]}"
    bash "$0" -a build "${TRAEFIK_ARGS[@]}" "${LOGGING_ARGS[@]}"
    ;;
  db-remove)
    echo "Removing database data volume 'jira-logger_dbData'..."
    docker volume rm jira-logger_dbData || echo "Volume not found or already removed."
    ;;
  db-dump)
    dump_db_to_file "./db_dump.sql"
    ;;
  migrate)
    migrate_db
    ;;
  prepare-db)
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
