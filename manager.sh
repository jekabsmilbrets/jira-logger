#!/bin/bash
set -e

show_help() {
  cat <<EOF
Docker compose manager.

Usage:
  manager.sh -a build
  manager.sh -a start -b
  manager.sh -a start -b -t
  manager.sh -a ng-build
  manager.sh -a down
  manager.sh -a rebuild
  manager.sh -a db-remove
  manager.sh -a db-dump

Options:
  -a  Action [start|down|build|ng-build|ng-build-dev|rebuild|db-remove|db-dump]
  -m  Mode [ng-build|ng-build-dev] (only for build)
  -b  Run docker containers in background
  -t  Run with Traefik
  -h  Show help
EOF
}

copy_environment() {
  echo "Copying environment"
  cp ./backend/.env ./.docker/.env
}

generate_certificates() {
  echo "Generating certificates"
  (cd ./.docker/certs/ && bash cert.sh jira-logger.io)
}

ng_build() {
  local build_cmd=${1:-build}
  echo "Starting ng-${build_cmd}"
  COMPOSE_PROJECT_NAME=jira-logger docker compose -f ./.docker/docker-compose.yml run node npm ci
  COMPOSE_PROJECT_NAME=jira-logger docker compose -f ./.docker/docker-compose.yml run node npm run "${build_cmd}"
}

# Default values
ACTION=""
MODE=""
BACKGROUND=""
COMPOSE_FILES=(./.docker/docker-compose.yml)

while getopts "hibtm:a:" opt; do
  case "$opt" in
    a) ACTION=$OPTARG ;;
    m) MODE=$OPTARG ;;
    b) BACKGROUND="-d" ;;
    t) COMPOSE_FILES+=(./.docker/docker-compose-traefik.yml) ;;
    h) show_help; exit 0 ;;
    *) show_help; exit 1 ;;
  esac
done

compose_cmd() {
  COMPOSE_PROJECT_NAME=jira-logger docker compose $(printf -- '-f %s ' "${COMPOSE_FILES[@]}") "$@"
}

case "$ACTION" in
  build)
    echo "Running action $ACTION"
    copy_environment
    generate_certificates
    export COMPOSE_BAKE=true
    compose_cmd build
    [[ $MODE == "ng-build-dev" ]] && ng_build build-dev
    [[ $MODE == "ng-build" ]] && ng_build build
    ;;
  start)
    echo "Running action $ACTION"
    copy_environment
    generate_certificates
    compose_cmd up $BACKGROUND --remove-orphans
    ;;
  down)
    echo "Running action $ACTION"
    COMPOSE_FILES+=(./.docker/docker-compose-traefik.yml)
    compose_cmd down --remove-orphans
    ;;
  ng-build)
    ng_build build
    ;;
  ng-build-dev)
    ng_build build-dev
    ;;
  rebuild)
    echo "Running action $ACTION"
    bash "$0" -a down
    bash "$0" -a build -m ng-build
    ;;
  db-remove)
    echo "Removing database data volume 'jira-logger_dbData'..."
    docker volume rm jira-logger_dbData || echo "Volume not found or already removed."
    ;;
  db-dump)
    echo "Dumping database to ./db_dump.sql"
    DB_CONTAINER="jira-logger-db"
    # Get credentials from running container
    DB_USER=$(docker exec "$DB_CONTAINER" printenv POSTGRES_USER)
    DB_NAME=$(docker exec "$DB_CONTAINER" printenv POSTGRES_DB)
    DB_PASS=$(docker exec "$DB_CONTAINER" printenv POSTGRES_PASSWORD)
    if [[ -z "$DB_USER" || -z "$DB_NAME" || -z "$DB_PASS" ]]; then
      echo "Could not fetch DB credentials from container. Is it running?"
      exit 1
    fi
    export PGPASSWORD="$DB_PASS"
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > ./db_dump.sql
    unset PGPASSWORD
    echo "Database dump saved to ./db_dump.sql"
    ;;
  *)
    show_help
    exit 1
    ;;
esac
