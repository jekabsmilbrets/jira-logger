#!/bin/sh
set -eu

# Stage the bind-mounted private key without making the host key world-readable.
# Only this initialization runs as root; the server and maintenance run as node.
if [ "${1:-}" = node ] && [ "${2:-}" = dist/server.js ] && [ -n "${TLS_KEY_FILE:-}" ]; then
  mkdir -p /run/node-tls
  chmod 700 /run/node-tls
  cp /certs/jira-logger.io.crt "$TLS_CERT_FILE"
  cp /certs/jira-logger.io.key "$TLS_KEY_FILE"
  chmod 400 "$TLS_CERT_FILE" "$TLS_KEY_FILE"
  chown -R node:node /run/node-tls
fi
exec su-exec node:node "$@"
