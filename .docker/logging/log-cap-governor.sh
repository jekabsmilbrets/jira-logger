#!/bin/sh
set -eu

LOG_DIR="${LOG_DIR:-/logs}"
LOG_CAP_BYTES="${LOG_CAP_BYTES:-52428800}"
LOG_SCAN_INTERVAL_SEC="${LOG_SCAN_INTERVAL_SEC:-5}"
LOG_FILES="${LOG_FILES:-}"

trim_file() {
  file_path="$1"

  if [ ! -f "$file_path" ]; then
    return 0
  fi

  size="$(wc -c < "$file_path" 2>/dev/null || echo 0)"
  if [ "$size" -le "$LOG_CAP_BYTES" ]; then
    return 0
  fi

  tmp_path="${file_path}.tmp.$$"
  if tail -c "$LOG_CAP_BYTES" "$file_path" > "$tmp_path"; then
    cat "$tmp_path" > "$file_path"
    rm -f "$tmp_path"
    printf '%s trimmed to %s bytes\n' "$file_path" "$LOG_CAP_BYTES"
  else
    rm -f "$tmp_path"
    printf '%s failed to trim\n' "$file_path" >&2
  fi
}

ensure_targets() {
  if [ -n "$LOG_FILES" ]; then
    for name in $LOG_FILES; do
      target="${LOG_DIR}/${name}"
      if [ ! -f "$target" ]; then
        touch "$target" 2>/dev/null || true
      fi
    done
  fi
}

scan_once() {
  if [ -n "$LOG_FILES" ]; then
    for name in $LOG_FILES; do
      trim_file "${LOG_DIR}/${name}"
    done
    return 0
  fi

  for path in "${LOG_DIR}"/log-*.log; do
    [ -e "$path" ] || continue
    trim_file "$path"
  done
}

mkdir -p "$LOG_DIR"
ensure_targets
scan_once

while true; do
  scan_once
  sleep "$LOG_SCAN_INTERVAL_SEC"
done
