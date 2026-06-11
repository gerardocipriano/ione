#!/bin/bash
# ione server launcher — bootstraps venv, starts server, opens browser
PORT=${1:-8080}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_ROOT/.venv"

PDFCPU_VERSION="0.13.0"

if [ ! -d "$VENV_DIR" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/python" -m pip install "markitdown[all]" pypdf
fi

if [ ! -x "$VENV_DIR/bin/pdfcpu" ]; then
    echo "  Downloading pdfcpu v$PDFCPU_VERSION..."
    PDFCPU_ARCH=""
    case "$(uname -m)" in
        x86_64)        PDFCPU_ARCH="x86_64" ;;
        aarch64|arm64) PDFCPU_ARCH="arm64"  ;;
        *) echo "  Unsupported arch $(uname -m) — PDF compress/sign will be unavailable" ;;
    esac
    if [ -n "$PDFCPU_ARCH" ]; then
        TMP_TAR="$(mktemp -d)"
        URL="https://github.com/pdfcpu/pdfcpu/releases/download/v${PDFCPU_VERSION}/pdfcpu_${PDFCPU_VERSION}_Linux_${PDFCPU_ARCH}.tar.xz"
        if curl -sL "$URL" | tar -xJ -C "$TMP_TAR"; then
            mv "$TMP_TAR"/pdfcpu_*/pdfcpu "$VENV_DIR/bin/pdfcpu"
            chmod +x "$VENV_DIR/bin/pdfcpu"
        else
            echo "  pdfcpu download failed — PDF compress/sign will be unavailable"
        fi
        rm -rf "$TMP_TAR"
    fi
fi

echo "  ione running on http://localhost:$PORT"
"$VENV_DIR/bin/python" "$SCRIPT_DIR/ione_server.py" "$PORT" &
SERVER_PID=$!
sleep 0.8
xdg-open "http://localhost:$PORT" 2>/dev/null || true
wait "$SERVER_PID"
