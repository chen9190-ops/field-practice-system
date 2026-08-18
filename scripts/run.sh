#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

EXPOSE_PORT=$(awk -F '[ =]+' '/^expose_port/ {gsub(/[^0-9]/, "", $2); print $2; exit}' .preview 2>/dev/null || echo 5000)

# Kill any existing processes on the ports we need
fuser -k "${EXPOSE_PORT}/tcp" 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
sleep 1

# Start backend in background
echo "=== Starting backend on port 8000 ==="
cd backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$PROJECT_DIR/scripts/backend.log" 2>&1 &
BACKEND_PID=$!
deactivate
cd "$PROJECT_DIR"

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '' http://localhost:8000/docs --max-time 2 2>/dev/null; then
    echo "Backend is ready"
    break
  fi
  sleep 1
done

# Start student frontend on expose_port
echo "=== Starting student frontend on port $EXPOSE_PORT ==="
cd frontend
export VITE_API_BASE_URL="http://localhost:8000"
export PORT="$EXPOSE_PORT"
exec npx vite --host 0.0.0.0 --port "$EXPOSE_PORT"
