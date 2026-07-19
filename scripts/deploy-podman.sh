#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:?IMAGE wajib diisi}"
CONTAINER_NAME="${CONTAINER_NAME:-aims-frontend}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
APP_NAME="${APP_NAME:-AIMS}"
APP_FULL_NAME="${APP_FULL_NAME:-Aset & Inventory Management System}"
API_BASE_URL="${API_BASE_URL:?API_BASE_URL wajib diisi}"
API_TIMEOUT="${API_TIMEOUT:-30000}"
ENABLE_IDEMPOTENCY_HEADER="${ENABLE_IDEMPOTENCY_HEADER:-false}"

podman pull "$IMAGE"
podman rm -f "$CONTAINER_NAME" 2>/dev/null || true
podman run -d \
  --name "$CONTAINER_NAME" \
  --restart=always \
  -p "127.0.0.1:${FRONTEND_PORT}:80" \
  -e APP_NAME="$APP_NAME" \
  -e APP_FULL_NAME="$APP_FULL_NAME" \
  -e API_BASE_URL="$API_BASE_URL" \
  -e API_TIMEOUT="$API_TIMEOUT" \
  -e ENABLE_IDEMPOTENCY_HEADER="$ENABLE_IDEMPOTENCY_HEADER" \
  "$IMAGE"

sleep 3
curl --fail --silent "http://127.0.0.1:${FRONTEND_PORT}/healthz"
echo
echo "AIMS frontend berhasil dijalankan."
