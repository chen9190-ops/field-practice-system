#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

PORT="${DEPLOY_RUN_PORT:-5000}"

usage() {
  echo "Usage: $0 -p <port>"
}

while getopts "p:h" opt; do
  case "$opt" in
    p)
      PORT="$OPTARG"
      ;;
    h)
      usage
      exit 0
      ;;
    \?)
      echo "Invalid option: -$OPTARG"
      usage
      exit 1
      ;;
  esac
done

export PORT

echo "[deploy-run] Starting backend on port $PORT..."
cd backend

if [ ! -f "venv/bin/uvicorn" ]; then
  echo "[deploy-run] venv missing, creating and installing dependencies..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt -q
  deactivate
fi

exec venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
