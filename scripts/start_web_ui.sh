#!/bin/bash

# Script to start the LipSyncAutomation Web UI
# This script starts both the backend and frontend servers

# Save the current directory where the script was called from
ORIGINAL_DIR=$(pwd)

echo "Starting LipSyncAutomation Web UI..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to the project root directory
cd "$PROJECT_ROOT"

# Check if we're in the correct directory (web-ui/backend/main.py should exist)
if [ ! -f "web-ui/backend/main.py" ]; then
    echo "Error: web-ui/backend/main.py not found. This script may be in the wrong location."
    # Return to the original directory before exiting
    cd "$ORIGINAL_DIR"
    exit 1
fi

# Check if virtual environment exists in the project root
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if not already installed
pip install fastapi uvicorn python-multipart websockets pyjwt bcrypt python-slugify

# Function to check if a port is in use
is_port_in_use() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -Pi :$port -sTCP:LISTEN -t >/dev/null
        return $?
    elif command -v ss >/dev/null 2>&1; then
        ss -tuln | grep -q ":$port " >/dev/null
        return $?
    elif command -v netstat >/dev/null 2>&1; then
        netstat -tuln | grep -q ":$port " >/dev/null
        return $?
    else
        # If no port checking tools are available, return true (assume in use)
        return 0
    fi
}

# Check backend port availability and start server
if is_port_in_use 8001; then
    BACKEND_PORT=8002
    echo "Port 8001 is already in use. Starting backend server on port $BACKEND_PORT..."
    PORT=$BACKEND_PORT BACKEND_PORT=$BACKEND_PORT uvicorn web-ui.backend.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
else
    BACKEND_PORT=8001
    echo "Starting backend server on port $BACKEND_PORT..."
    PORT=$BACKEND_PORT BACKEND_PORT=$BACKEND_PORT uvicorn web-ui.backend.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
fi

BACKEND_PID=$!

# Check frontend port availability and start server
cd web-ui/frontend
npm install

# Check if nc is available and use it for port checking (it's more reliable)
if command -v nc >/dev/null 2>&1; then
    # nc returns 0 if connection succeeds (port is in use), 1 if it fails (port is free)
    if nc -z localhost 5000; then
        FRONTEND_PORT=5001
        if nc -z localhost 5001; then
            FRONTEND_PORT=5002  # Try yet another port
            echo "Port 5000 and 5001 are already in use. Starting frontend server on port $FRONTEND_PORT..."
        else
            echo "Port 5000 is already in use. Starting frontend server on port $FRONTEND_PORT..."
        fi
        # Remove Next.js lock file if it exists to prevent lock issues
        rm -f .next/dev/lock
        # Set BACKEND_URL to match our actual backend port
        BACKEND_URL="http://localhost:$BACKEND_PORT" npx next dev -p $FRONTEND_PORT &
    else
        FRONTEND_PORT=5000
        echo "Starting frontend server on port $FRONTEND_PORT..."
        # Remove Next.js lock file if it exists to prevent lock issues
        rm -f .next/dev/lock
        # Set BACKEND_URL to match our actual backend port
        BACKEND_URL="http://localhost:$BACKEND_PORT" npx next dev -p $FRONTEND_PORT &
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tuln | grep -q ":5000 "; then
        FRONTEND_PORT=5001
        echo "Port 5000 is already in use. Starting frontend server on port $FRONTEND_PORT..."
        npx next dev -p $FRONTEND_PORT &
    else
        FRONTEND_PORT=5000
        echo "Starting frontend server on port $FRONTEND_PORT..."
        npx next dev -p $FRONTEND_PORT &
    fi
elif command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | grep -q ":5000 "; then
        FRONTEND_PORT=5001
        echo "Port 5000 is already in use. Starting frontend server on port $FRONTEND_PORT..."
        npx next dev -p $FRONTEND_PORT &
    else
        FRONTEND_PORT=5000
        echo "Starting frontend server on port $FRONTEND_PORT..."
        npx next dev -p $FRONTEND_PORT &
    fi
elif command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null; then
        FRONTEND_PORT=5001
        echo "Port 5000 is already in use. Starting frontend server on port $FRONTEND_PORT..."
        npx next dev -p $FRONTEND_PORT &
    else
        FRONTEND_PORT=5000
        echo "Starting frontend server on port $FRONTEND_PORT..."
        npx next dev -p $FRONTEND_PORT &
    fi
else
    # If no port checking tools are available, just try port 5000
    FRONTEND_PORT=5000
    echo "Starting frontend server on port $FRONTEND_PORT (no port checking available)..."
    npx next dev -p $FRONTEND_PORT &
fi

FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo "Applications started:"
echo "  - Backend API: http://localhost:$BACKEND_PORT"
echo "  - Frontend UI: http://localhost:$FRONTEND_PORT"

# Function to handle script termination
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Return to the original directory where the script was called from
    cd "$ORIGINAL_DIR"
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

# Wait for processes to finish (this will keep the script running)
wait $BACKEND_PID $FRONTEND_PID