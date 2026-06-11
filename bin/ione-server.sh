#!/bin/bash
# ione server launcher — bootstraps venv, starts server, opens browser
PORT=${1:-8080}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_ROOT/.venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install "markitdown[all]"
fi

echo "  ione running on http://localhost:$PORT"
"$VENV_DIR/bin/python" "$SCRIPT_DIR/ione_server.py" "$PORT" &
SERVER_PID=$!
sleep 0.8
xdg-open "http://localhost:$PORT" 2>/dev/null || true
wait "$SERVER_PID"
