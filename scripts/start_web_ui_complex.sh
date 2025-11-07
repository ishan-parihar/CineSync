#!/bin/bash

# Streamlined LipSyncAutomation Web UI Startup Script
# Only starts the frontend and backend servers - no setup/installation

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ==============================================================================
# CONFIGURATION & GLOBALS
# ==============================================================================

# Script information
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
readonly DEFAULT_BACKEND_PORT=8001
readonly DEFAULT_FRONTEND_PORT=5000
readonly HEALTH_CHECK_TIMEOUT=60

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Global variables
BACKEND_PORT=""
FRONTEND_PORT=""
BACKEND_PID=""
FRONTEND_PID=""
VERBOSE=false

# ==============================================================================
# LOGGING FUNCTIONS
# ==============================================================================

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${PURPLE}🔍 DEBUG: $1${NC}"
    fi
}

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

show_usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

LipSyncAutomation Web UI Startup Script
Starts the frontend and backend servers (assumes setup is complete)

OPTIONS:
    -b, --backend-port PORT   Backend port (default: 8001)
    -f, --frontend-port PORT  Frontend port (default: 5000)
    -v, --verbose            Enable verbose logging
    -h, --help              Show this help message

EXAMPLES:
    $SCRIPT_NAME                           # Start with default ports
    $SCRIPT_NAME -b 8080 -f 3000          # Use custom ports
    $SCRIPT_NAME --verbose                 # Enable verbose output

NOTE: For initial setup, run: ./scripts/setup_web_ui.sh

EOF
}

cleanup() {
    log "Cleaning up processes..."
    
    # Kill backend process
    if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        info "Stopping backend server (PID: $BACKEND_PID)"
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    
    # Kill frontend process
    if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        info "Stopping frontend server (PID: $FRONTEND_PID)"
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    success "Cleanup completed"
}

# Set up signal handlers
trap cleanup INT TERM EXIT

# ==============================================================================
# PORT MANAGEMENT FUNCTIONS
# ==============================================================================

is_port_in_use() {
    local port=$1
    local host=${2:-localhost}
    
    if command -v nc &> /dev/null; then
        nc -z "$host" "$port" 2>/dev/null
    elif command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$port " 2>/dev/null
    elif command -v lsof &> /dev/null; then
        lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1
    else
        # If no tools available, assume port is in use (safer)
        return 0
    fi
}

find_available_port() {
    local base_port=$1
    local max_attempts=10
    
    for ((i=0; i<max_attempts; i++)); do
        local port=$((base_port + i))
        if ! is_port_in_use "$port"; then
            echo "$port"
            return 0
        fi
    done
    
    error "No available ports found starting from $base_port"
    return 1
}

# ==============================================================================
# HEALTH CHECK FUNCTIONS
# ==============================================================================

check_backend_health() {
    local port=$1
    local timeout=${2:-$HEALTH_CHECK_TIMEOUT}
    local url="http://localhost:$port/api/health"
    
    info "Checking backend health at $url"
    
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while (( $(date +%s) < end_time )); do
        if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
            success "Backend is healthy and responding"
            return 0
        fi
        
        local elapsed=$(( $(date +%s) - start_time ))
        debug "Backend health check attempt ($elapsed/${timeout}s)"
        sleep 2
    done
    
    error "Backend health check failed after ${timeout}s"
    return 1
}

check_frontend_health() {
    local port=$1
    local timeout=${2:-$HEALTH_CHECK_TIMEOUT}
    local url="http://localhost:$port"
    
    info "Checking frontend health at $url"
    
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    while (( $(date +%s) < end_time )); do
        if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
            success "Frontend is healthy and responding"
            return 0
        fi
        
        local elapsed=$(( $(date +%s) - start_time ))
        debug "Frontend health check attempt ($elapsed/${timeout}s)"
        sleep 2
    done
    
    error "Frontend health check failed after ${timeout}s"
    return 1
}

# ==============================================================================
# SERVER MANAGEMENT FUNCTIONS
# ==============================================================================

start_backend_server() {
    log "Starting backend server..."
    
    cd "$PROJECT_ROOT"
    
    # Find available port
    BACKEND_PORT=$(find_available_port "$DEFAULT_BACKEND_PORT")
    info "Using backend port: $BACKEND_PORT"
    
    # Start backend server
    info "Starting backend server..."
    debug "Environment: PORT=$BACKEND_PORT BACKEND_PORT=$BACKEND_PORT"
    
    # Start backend in background
    env PORT="$BACKEND_PORT" BACKEND_PORT="$BACKEND_PORT" PROJECT_ROOT="$PROJECT_ROOT" source venv/bin/activate && python -m backend.app.main &
    BACKEND_PID=$!
    
    info "Backend server started (PID: $BACKEND_PID)"
    
    # Wait a moment for startup
    sleep 3
    
    # Check if process is still running
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        error "Backend server failed to start"
        return 1
    fi
    
    # Health check
    if ! check_backend_health "$BACKEND_PORT"; then
        error "Backend server health check failed"
        kill "$BACKEND_PID" 2>/dev/null || true
        return 1
    fi
    
    success "Backend server is running on http://localhost:$BACKEND_PORT"
    return 0
}

start_frontend_server() {
    log "Starting frontend server..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Find available port
    FRONTEND_PORT=$(find_available_port "$DEFAULT_FRONTEND_PORT")
    info "Using frontend port: $FRONTEND_PORT"
    
    # Remove Next.js lock file if it exists
    rm -f .next/dev/lock 2>/dev/null || true
    
    # Set environment variables
    local env_vars=()
    env_vars+=("BACKEND_URL=http://localhost:$BACKEND_PORT")
    env_vars+=("NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT")
    env_vars+=("NODE_ENV=development")
    
    # Start frontend server
    info "Starting frontend server..."
    debug "Environment variables: ${env_vars[*]}"
    
    # Start frontend in background
    env "${env_vars[@]}" npx next dev -p "$FRONTEND_PORT" &
    FRONTEND_PID=$!
    
    info "Frontend server started (PID: $FRONTEND_PID)"
    
    # Wait for startup (Next.js needs time to compile)
    sleep 8
    
    # Check if process is still running
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        error "Frontend server failed to start"
        return 1
    fi
    
    # Health check
    if ! check_frontend_health "$FRONTEND_PORT"; then
        warning "Frontend health check failed, but server may still be starting"
        # Don't fail here as Next.js can take longer to compile first page
    fi
    
    success "Frontend server is running on http://localhost:$FRONTEND_PORT"
    return 0
}

# ==============================================================================
# MAIN FUNCTIONS
# ==============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--backend-port)
                DEFAULT_BACKEND_PORT="$2"
                shift 2
                ;;
            -f|--frontend-port)
                DEFAULT_FRONTEND_PORT="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

show_banner() {
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                    LipSyncAutomation Web UI Startup                            ║
║                           Fast Server Launch Only                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    info "Backend Port: $DEFAULT_BACKEND_PORT | Frontend Port: $DEFAULT_FRONTEND_PORT"
    info "Verbose: $VERBOSE"
}

show_status() {
    echo
    success "🚀 LipSyncAutomation Web UI is running!"
    echo
    echo "📊 Service Status:"
    echo "   └── Backend API:  http://localhost:$BACKEND_PORT"
    echo "   └── Frontend UI:  http://localhost:$FRONTEND_PORT"
    echo
    echo "🔧 Process Information:"
    echo "   └── Backend PID:  $BACKEND_PID"
    echo "   └── Frontend PID: $FRONTEND_PID"
    echo
    echo "📝 Useful Commands:"
    echo "   └── View logs:    tail -f logs/*.log"
    echo "   └── Stop services: Ctrl+C"
    echo "   └── Test API:     curl http://localhost:$BACKEND_PORT/api/health"
    echo
    echo "🌐 Development Tools:"
    echo "   └── API Docs:     http://localhost:$BACKEND_PORT/docs"
    echo "   └── WS Monitor:   http://localhost:$BACKEND_PORT/websocket"
    echo
}

main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Show banner
    show_banner
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Start servers
    if ! start_backend_server; then
        error "Failed to start backend server"
        exit 1
    fi
    
    if ! start_frontend_server; then
        error "Failed to start frontend server"
        exit 1
    fi
    
    # Show status
    show_status
    
    # Wait for processes
    log "Monitoring services... (Press Ctrl+C to stop)"
    wait "$BACKEND_PID" "$FRONTEND_PID"
}

# ==============================================================================
# SCRIPT ENTRY POINT
# ==============================================================================

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi