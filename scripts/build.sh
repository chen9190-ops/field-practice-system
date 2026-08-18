#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "=== Installing backend dependencies ==="
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
deactivate
cd "$PROJECT_DIR"

echo "=== Installing student frontend dependencies ==="
cd frontend
if [ ! -d "node_modules" ]; then
  npm install
fi
cd "$PROJECT_DIR"

echo "=== Build complete ==="
