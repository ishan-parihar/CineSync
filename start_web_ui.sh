#!/bin/bash

# LipSyncAutomation Web UI Startup Script
# Simple script that just starts the servers - assumes setup is complete

set -euo pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=${1:-8002}
FRONTEND_PORT=${2:-5002}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting LipSyncAutomation Web UI...${NC}"
echo "Backend: http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo

# Start backend
cd "$PROJECT_ROOT"
source venv/bin/activate
PROJECT_ROOT="$PROJECT_ROOT" PORT=$BACKEND_PORT BACKEND_PORT=$BACKEND_PORT python -m backend.app.main &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Start frontend
cd frontend
BACKEND_URL=http://localhost:$BACKEND_PORT NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT npx next dev -p $FRONTEND_PORT &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

echo
echo -e "${BLUE}🌐 Services are running!${NC}"
echo "Backend API: http://localhost:$BACKEND_PORT"
echo "Frontend UI: http://localhost:$FRONTEND_PORT"
echo "API Docs: http://localhost:$BACKEND_PORT/docs"
echo
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo
    echo -e "${BLUE}🛑 Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID