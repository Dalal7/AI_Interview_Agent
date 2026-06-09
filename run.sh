#!/bin/bash

# Port declarations
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo "=== Starting Autonomous Interview Agent Platform ==="

# Check virtual environment
if [ ! -d ".venv" ]; then
    echo "Error: .venv folder not found. Please run ./setup.sh first."
    exit 1
fi

# Check local node
if [ ! -d ".node" ]; then
    echo "Error: Local .node folder not found. Please run ./setup.sh first."
    exit 1
fi

# Export Node path
export PATH="$(pwd)/.node/bin:$PATH"

# Trap CTRL+C to cleanly kill both processes on exit
cleanup() {
    echo ""
    echo "=== Shutting down services ==="
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Killing FastAPI Backend (PID: $BACKEND_PID)..."
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Killing Next.js Frontend (PID: $FRONTEND_PID)..."
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}
trap cleanup INT TERM EXIT

# 1. Start FastAPI Backend
echo "Launching FastAPI Backend on http://localhost:$BACKEND_PORT..."
.venv/bin/python3 -m uvicorn backend.main:app --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!
sleep 2

# Verify if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Error: Backend failed to start. Check your configurations."
    exit 1
fi
echo "Backend running (PID: $BACKEND_PID)."

# 2. Start Next.js Frontend
echo "Launching Next.js Frontend on http://localhost:$FRONTEND_PORT..."
npm --prefix frontend run dev -- -p $FRONTEND_PORT &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
