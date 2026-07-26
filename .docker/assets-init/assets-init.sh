#!/bin/sh
set -eu

: "${API_HOST:=https://jira-logger.io}"
: "${API_BASE:=/api}"

ASSETS_DIR="/assets"

mkdir -p "${ASSETS_DIR}"
rm -rf "${ASSETS_DIR:?}"/*
cp -R /work/ng/. "${ASSETS_DIR}/"

cat > "${ASSETS_DIR}/runtime-config.json" <<CONFIG
{
  "apiHost": "${API_HOST}",
  "apiBase": "${API_BASE}"
}
CONFIG

echo "Assets initialized"
