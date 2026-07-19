#!/bin/sh
set -eu

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

APP_NAME_ESCAPED="$(escape_js "${APP_NAME:-AIMS}")"
APP_FULL_NAME_ESCAPED="$(escape_js "${APP_FULL_NAME:-Aset & Inventory Management System}")"
API_BASE_URL_ESCAPED="$(escape_js "${API_BASE_URL:-}")"
API_TIMEOUT_ESCAPED="$(escape_js "${API_TIMEOUT:-30000}")"
ENABLE_IDEMPOTENCY_HEADER_ESCAPED="$(escape_js "${ENABLE_IDEMPOTENCY_HEADER:-false}")"

cat > /usr/share/nginx/html/runtime-config.js <<CONFIG
window.__AIMS_CONFIG__ = {
  APP_NAME: "${APP_NAME_ESCAPED}",
  APP_FULL_NAME: "${APP_FULL_NAME_ESCAPED}",
  API_BASE_URL: "${API_BASE_URL_ESCAPED}",
  API_TIMEOUT: "${API_TIMEOUT_ESCAPED}",
  ENABLE_IDEMPOTENCY_HEADER: "${ENABLE_IDEMPOTENCY_HEADER_ESCAPED}"
};
CONFIG

exec "$@"
