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
pip install fastapi uvicorn python-multipart python-socketio websockets pyjwt bcrypt python-slugify fastapi-socketio

echo "Starting backend server on port 8001..."
python web-ui/backend/main.py &

BACKEND_PID=$!

echo "Starting frontend server on port 3000..."
cd web-ui/frontend
npm install
npm run dev &

FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo "Applications started:"
echo "  - Backend API: http://localhost:8001"
echo "  - Frontend UI: http://localhost:3000"

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
wait $BACKEND_PID
wait $FRONTEND_PID