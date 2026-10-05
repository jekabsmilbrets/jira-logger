#!/bin/sh
# Configure the source with libpq PGHOST/PGPORT/PGDATABASE/PGUSER and PGPASSFILE.
# Credentials are never arguments or printed. The database remains read-only.
set -eu
if [ "$#" -ne 1 ]; then
  echo 'Usage: tools/export-postgres.sh OUTPUT.json (source configured through libpq environment)' >&2
  exit 2
fi
output=$1
umask 077
work=$(mktemp -d "${output}.export.XXXXXXXX")
trap 'rm -f "$work/snapshot.json"; rmdir "$work"' EXIT HUP INT TERM
psql -X -q -A -t -v ON_ERROR_STOP=1 -f "$(dirname "$0")/export-postgres.sql" > "$work/snapshot.json"
# A hard link publishes atomically and refuses any existing output.
ln "$work/snapshot.json" "$output"
