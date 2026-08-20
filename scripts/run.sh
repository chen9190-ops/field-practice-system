#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

EXPOSE_PORT=$(awk -F '[ =]+' '/^expose_port/ {gsub(/[^0-9]/, "", $2); print $2; exit}' .preview 2>/dev/null || echo "${DEPLOY_RUN_PORT:-5000}")

if [ ! -f "frontend/dist/index.html" ]; then
  echo "Student frontend build is missing: frontend/dist/index.html" >&2
  echo "Run bash scripts/build.sh before starting the preview." >&2
  exit 1
fi

export PORT="$EXPOSE_PORT"

echo "=== Starting FastAPI on port $PORT ==="
cd backend
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
