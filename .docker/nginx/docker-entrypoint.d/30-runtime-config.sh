#!/bin/sh
set -eu

: "${API_HOST:=https://jira-logger.io}"
: "${API_BASE:=/api}"

if ! sh -c 'echo test > /var/www/public/ng/.runtime-config-write-test' >/dev/null 2>&1; then
  echo "runtime-config: /var/www/public/ng is read-only, skipping runtime-config generation"
  exit 0
fi
rm -f /var/www/public/ng/.runtime-config-write-test

cat > /var/www/public/ng/runtime-config.json <<CONFIG
{
  "apiHost": "${API_HOST}",
  "apiBase": "${API_BASE}"
}
CONFIG
