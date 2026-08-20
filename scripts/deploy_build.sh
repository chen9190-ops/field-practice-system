#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "[deploy-build] Installing backend dependencies..."
cd backend

# Install to system python directly - venv is excluded from veFaaS packaging
python3 -m pip install -r requirements.txt -q

cd "$PROJECT_DIR"

echo "[deploy-build] Installing frontend dependencies..."
cd frontend
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "[deploy-build] Building frontend..."
VITE_API_BASE_URL=/ pnpm run build
cd "$PROJECT_DIR"

echo "[deploy-build] Build complete"
