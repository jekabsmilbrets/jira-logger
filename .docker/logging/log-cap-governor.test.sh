#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TEST_DIR="$(mktemp -d)"
GOVERNOR_PID=""

cleanup() {
  if [ -n "$GOVERNOR_PID" ]; then
    kill "$GOVERNOR_PID" 2>/dev/null || true
    wait "$GOVERNOR_PID" 2>/dev/null || true
  fi
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT HUP INT TERM

printf 'unchanged' > "$TEST_DIR/not-managed.txt"

LOG_DIR="$TEST_DIR" LOG_CAP_BYTES=5 LOG_SCAN_INTERVAL_SEC=1 \
  sh "$SCRIPT_DIR/log-cap-governor.sh" >/dev/null &
GOVERNOR_PID=$!

sleep 1
printf '0123456789' > "$TEST_DIR/log-new-producer.log"
printf 'abcdefghij' > "$TEST_DIR/log-with space.log"

for attempt in 1 2 3 4 5; do
  if [ "$(wc -c < "$TEST_DIR/log-new-producer.log")" -le 5 ] \
    && [ "$(wc -c < "$TEST_DIR/log-with space.log")" -le 5 ]; then
    break
  fi
  sleep 1
done

[ "$(cat "$TEST_DIR/log-new-producer.log")" = "56789" ]
[ "$(cat "$TEST_DIR/log-with space.log")" = "fghij" ]
[ "$(cat "$TEST_DIR/not-managed.txt")" = "unchanged" ]

printf 'log-cap-governor discovery test passed\n'
