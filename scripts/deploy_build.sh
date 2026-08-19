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
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "[deploy-build] Building frontend..."
VITE_API_BASE_URL=/ pnpm run build
cd "$PROJECT_DIR"

echo "[deploy-build] Build complete"
