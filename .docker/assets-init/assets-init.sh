#!/bin/sh
set -eu

: "${ASSETS_VERSION:=unknown}"
: "${API_HOST:=https://jira-logger.io}"
: "${API_BASE:=/api}"

ASSETS_DIR="/assets"
MARKER_FILE="${ASSETS_DIR}/.assets-version"

mkdir -p "${ASSETS_DIR}"
rm -rf "${ASSETS_DIR:?}"/*
cp -R /work/ng/. "${ASSETS_DIR}/"

cat > "${ASSETS_DIR}/runtime-config.json" <<CONFIG
{
  "apiHost": "${API_HOST}",
  "apiBase": "${API_BASE}"
}
CONFIG

printf '%s\n' "${ASSETS_VERSION}" > "${MARKER_FILE}"
echo "Assets initialized with version: ${ASSETS_VERSION}"
