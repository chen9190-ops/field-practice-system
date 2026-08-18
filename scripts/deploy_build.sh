#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "[deploy-build] Installing backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
deactivate
cd "$PROJECT_DIR"

echo "[deploy-build] Installing frontend dependencies..."
cd frontend
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
elif command -v npm >/dev/null 2>&1; then
  npm ci 2>/dev/null || npm install
fi

echo "[deploy-build] Building frontend..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm build
else
  npm run build
fi
cd "$PROJECT_DIR"

echo "[deploy-build] Build complete"
