#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== Installing backend dependencies ==="
cd backend

# Install to system python directly - venv is excluded from packaging
python3 -m pip install -r requirements.txt -q

cd "$PROJECT_DIR"

echo "=== Installing student frontend dependencies ==="
cd frontend
pnpm install

echo "=== Building student frontend ==="
VITE_API_BASE_URL=/ pnpm run build
cd "$PROJECT_DIR"

echo "=== Build complete ==="
