#!/bin/bash

# LipSyncAutomation Cleanup Script
# Comprehensive cleanup utility for processes, cache, and temporary files

set -euo pipefail

# ==============================================================================
# CONFIGURATION & GLOBALS
# ==============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly ORIGINAL_DIR="$(pwd)"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Cleanup options
CLEAN_PROCESSES=true
CLEAN_CACHE=true
CLEAN_LOGS=false
CLEAN_BUILD=false
CLEAN_DEPS=false
CLEAN_REPORTS=false
CLEAN_DATABASE=false
DRY_RUN=false
VERBOSE=false
FORCE=false

# Common ports to check
readonly BACKEND_PORTS=(8001 8002 8003 8004 8005 8006)
readonly FRONTEND_PORTS=(5000 5001 5002 5003)

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

Comprehensive cleanup utility for LipSyncAutomation

OPTIONS:
    --processes             Cleanup running processes (default: true)
    --cache                 Cleanup cache files (default: true)
    --logs                  Cleanup log files (default: false)
    --build                 Cleanup build artifacts (default: false)
    --deps                  Remove node_modules and venv (default: false)
    --reports               Cleanup test reports (default: false)
    --database              Cleanup test databases (default: false)
    --dry-run               Show what would be deleted without actually deleting
    -f, --force             Skip confirmation prompts
    -v, --verbose           Enable verbose output
    -h, --help             Show this help message

EXAMPLES:
    $SCRIPT_NAME                           # Cleanup processes and cache
    $SCRIPT_NAME --logs --build            # Cleanup logs and build artifacts
    $SCRIPT_NAME --deps --force            # Remove all dependencies
    $SCRIPT_NAME --dry-run -v              # Show what would be cleaned

PROCESS TARGETS:
• Backend servers on ports 8001-8006
• Frontend servers on ports 5000-5003
• Python processes running main.py
• Node.js processes running Next.js

FILE TARGETS:
• Cache directories (cache/, temp/, .next/cache)
• Log files (logs/*.log)
• Build artifacts (build/, dist/, .next/)
• Test reports (test-reports/)
• Test databases (test.db, *.sqlite)

EOF
}

confirm_action() {
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    local message="$1"
    local default="${2:-n}"
    
    read -p "$message [y/N]: " -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

execute_command() {
    local cmd="$1"
    local description="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY RUN] Would $description: $cmd"
        return 0
    fi
    
    debug "Executing: $cmd"
    if eval "$cmd"; then
        success "$description"
    else
        warning "Failed to $description"
    fi
}

# ==============================================================================
# PROCESS CLEANUP FUNCTIONS
# ==============================================================================

find_and_kill_processes() {
    local process_name="$1"
    local ports=("${@:2}")
    
    debug "Looking for processes: $process_name"
    
    # Find processes by name
    local pids
    pids=$(pgrep -f "$process_name" 2>/dev/null || true)
    
    if [[ -n "$pids" ]]; then
        info "Found $process_name processes: $pids"
        for pid in $pids; do
            local cmd
            cmd=$(ps -p "$pid" -o cmd= 2>/dev/null || echo "unknown")
            debug "Process $pid: $cmd"
            
            if confirm_action "Kill process $pid ($cmd)?"; then
                execute_command "kill $pid" "Killed process $pid"
                
                # Wait a moment and check if it's still running
                sleep 1
                if kill -0 "$pid" 2>/dev/null; then
                    warning "Process $pid still running, force killing..."
                    execute_command "kill -9 $pid" "Force killed process $pid"
                fi
            fi
        done
    else
        debug "No $process_name processes found"
    fi
    
    # Check ports
    for port in "${ports[@]}"; do
        if is_port_in_use "$port"; then
            local port_pid
            port_pid=$(get_port_pid "$port")
            info "Port $port is in use by PID $port_pid"
            
            if confirm_action "Kill process using port $port?"; then
                if [[ -n "$port_pid" ]]; then
                    execute_command "kill $port_pid" "Killed process $port_pid using port $port"
                fi
            fi
        else
            debug "Port $port is free"
        fi
    done
}

is_port_in_use() {
    local port=$1
    
    if command -v nc &> /dev/null; then
        nc -z localhost "$port" 2>/dev/null
    elif command -v lsof &> /dev/null; then
        lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1
    elif command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$port " 2>/dev/null
    else
        return 1
    fi
}

get_port_pid() {
    local port=$1
    
    if command -v lsof &> /dev/null; then
        lsof -ti ":$port" 2>/dev/null
    elif command -v ss &> /dev/null; then
        ss -tulnp | grep ":$port " | head -1 | grep -o 'pid=[0-9]*' | cut -d'=' -f2
    else
        echo ""
    fi
}

cleanup_processes() {
    if [[ "$CLEAN_PROCESSES" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up running processes..."
    
    # Kill backend servers
    find_and_kill_processes "web-ui/backend/main.py" "${BACKEND_PORTS[@]}"
    
    # Kill frontend servers
    find_and_kill_processes "next dev" "${FRONTEND_PORTS[@]}"
    find_and_kill_processes "next-server.js" "${FRONTEND_PORTS[@]}"
    
    # Kill any remaining Python processes related to the project
    local python_pids
    python_pids=$(pgrep -f "lipsync_automation" 2>/dev/null || true)
    if [[ -n "$python_pids" ]]; then
        info "Found related Python processes: $python_pids"
        for pid in $python_pids; do
            if confirm_action "Kill Python process $pid?"; then
                execute_command "kill $pid" "Killed Python process $pid"
            fi
        done
    fi
    
    # Kill any remaining Node.js processes
    local node_pids
    node_pids=$(pgrep -f "node.*lipsync" 2>/dev/null || true)
    if [[ -n "$node_pids" ]]; then
        info "Found related Node.js processes: $node_pids"
        for pid in $node_pids; do
            if confirm_action "Kill Node.js process $pid?"; then
                execute_command "kill $pid" "Killed Node.js process $pid"
            fi
        done
    fi
    
    success "Process cleanup completed"
}

# ==============================================================================
# FILE CLEANUP FUNCTIONS
# ==============================================================================

cleanup_cache_files() {
    if [[ "$CLEAN_CACHE" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up cache files..."
    
    cd "$PROJECT_ROOT"
    
    # Python cache
    local cache_dirs=(
        "__pycache__"
        ".pytest_cache"
        ".mypy_cache"
        ".coverage"
        "htmlcov"
        ".tox"
    )
    
    for dir in "${cache_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            execute_command "rm -rf $dir" "Removed cache directory: $dir"
        fi
    done
    
    # Find and remove all __pycache__ directories recursively
    local pycache_dirs
    pycache_dirs=$(find . -type d -name "__pycache__" 2>/dev/null || true)
    if [[ -n "$pycache_dirs" ]]; then
        echo "$pycache_dirs" | while read -r dir; do
            execute_command "rm -rf $dir" "Removed __pycache__: $dir"
        done
    fi
    
    # Remove .pyc files
    local pyc_files
    pyc_files=$(find . -name "*.pyc" -type f 2>/dev/null || true)
    if [[ -n "$pyc_files" ]]; then
        echo "$pyc_files" | while read -r file; do
            execute_command "rm -f $file" "Removed .pyc file: $file"
        done
    fi
    
    # Project-specific cache
    local project_cache_dirs=(
        "cache"
        "temp"
        "output"
        ".next/cache"
        "node_modules/.cache"
    )
    
    for dir in "${project_cache_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            if confirm_action "Clear cache directory: $dir?"; then
                # Remove contents but keep directory
                execute_command "find $dir -type f -delete 2>/dev/null || true" "Cleared files in $dir"
                execute_command "find $dir -type d -empty -delete 2>/dev/null || true" "Removed empty dirs in $dir"
            fi
        fi
    done
    
    # Remove temporary files
    local temp_patterns=(
        "*.tmp"
        "*.temp"
        "*.log.*"
        "*.swp"
        "*.swo"
        "*~"
        ".DS_Store"
        "Thumbs.db"
    )
    
    for pattern in "${temp_patterns[@]}"; do
        local files
        files=$(find . -name "$pattern" -type f 2>/dev/null || true)
        if [[ -n "$files" ]]; then
            echo "$files" | while read -r file; do
                execute_command "rm -f $file" "Removed temp file: $file"
            done
        fi
    done
    
    success "Cache cleanup completed"
}

cleanup_log_files() {
    if [[ "$CLEAN_LOGS" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up log files..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -d "logs" ]]; then
        local log_files
        log_files=$(find logs -name "*.log" -type f 2>/dev/null || true)
        if [[ -n "$log_files" ]]; then
            echo "$log_files" | while read -r file; do
                execute_command "rm -f $file" "Removed log file: $file"
            done
        fi
    fi
    
    # Remove old log archives
    local log_archives
    log_archives=$(find . -name "*.log.*" -type f 2>/dev/null || true)
    if [[ -n "$log_archives" ]]; then
        echo "$log_archives" | while read -r file; do
            execute_command "rm -f $file" "Removed log archive: $file"
        done
    fi
    
    success "Log cleanup completed"
}

cleanup_build_artifacts() {
    if [[ "$CLEAN_BUILD" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up build artifacts..."
    
    cd "$PROJECT_ROOT"
    
    # Frontend build artifacts
    local frontend_build_dirs=(
        "web-ui/frontend/.next"
        "web-ui/frontend/out"
        "web-ui/frontend/build"
        "web-ui/frontend/dist"
    )
    
    for dir in "${frontend_build_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            execute_command "rm -rf $dir" "Removed build directory: $dir"
        fi
    done
    
    # Python build artifacts
    local python_build_dirs=(
        "build"
        "dist"
        "*.egg-info"
    )
    
    for pattern in "${python_build_dirs[@]}"; do
        local dirs
        dirs=$(find . -name "$pattern" -type d 2>/dev/null || true)
        if [[ -n "$dirs" ]]; then
            echo "$dirs" | while read -r dir; do
                execute_command "rm -rf $dir" "Removed build directory: $dir"
            done
        fi
    done
    
    success "Build artifact cleanup completed"
}

cleanup_dependencies() {
    if [[ "$CLEAN_DEPS" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Python virtual environment
    if [[ -d "venv" ]]; then
        if confirm_action "Remove Python virtual environment (venv)?"; then
            execute_command "rm -rf venv" "Removed virtual environment"
        fi
    fi
    
    # Frontend dependencies
    if [[ -d "web-ui/frontend/node_modules" ]]; then
        if confirm_action "Remove frontend node_modules?"; then
            execute_command "rm -rf web-ui/frontend/node_modules" "Removed node_modules"
        fi
    fi
    
    # Package lock files
    local lock_files=(
        "package-lock.json"
        "yarn.lock"
        "pnpm-lock.yaml"
    )
    
    for file in "${lock_files[@]}"; do
        if [[ -f "web-ui/frontend/$file" ]]; then
            if confirm_action "Remove lock file: $file?"; then
                execute_command "rm -f web-ui/frontend/$file" "Removed lock file: $file"
            fi
        fi
    done
    
    success "Dependency cleanup completed"
}

cleanup_test_reports() {
    if [[ "$CLEAN_REPORTS" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up test reports..."
    
    cd "$PROJECT_ROOT"
    
    # Test report directories
    local report_dirs=(
        "test-reports"
        "coverage"
        ".nyc_output"
        "playwright-report"
        "cypress/videos"
        "cypress/screenshots"
    )
    
    for dir in "${report_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            execute_command "rm -rf $dir" "Removed report directory: $dir"
        fi
    done
    
    # JUnit XML files
    local junit_files
    junit_files=$(find . -name "junit*.xml" -type f 2>/dev/null || true)
    if [[ -n "$junit_files" ]]; then
        echo "$junit_files" | while read -r file; do
            execute_command "rm -f $file" "Removed JUnit file: $file"
        done
    fi
    
    success "Test report cleanup completed"
}

cleanup_database_files() {
    if [[ "$CLEAN_DATABASE" != "true" ]]; then
        return 0
    fi
    
    log "Cleaning up database files..."
    
    cd "$PROJECT_ROOT"
    
    # Test databases
    local db_files=(
        "test.db"
        "*.sqlite"
        "*.sqlite3"
        "*.db"
    )
    
    for pattern in "${db_files[@]}"; do
        local files
        files=$(find . -name "$pattern" -type f 2>/dev/null || true)
        if [[ -n "$files" ]]; then
            echo "$files" | while read -r file; do
                # Skip main database if it exists
                if [[ "$file" != "./lipsync.db" ]] && [[ "$file" != "./database.db" ]]; then
                    if confirm_action "Remove database file: $file?"; then
                        execute_command "rm -f $file" "Removed database file: $file"
                    fi
                fi
            done
        fi
    done
    
    success "Database cleanup completed"
}

# ==============================================================================
# SYSTEM CLEANUP FUNCTIONS
# ==============================================================================

cleanup_system_temp() {
    log "Cleaning up system temporary files..."
    
    # Clean npm cache
    if command -v npm &> /dev/null; then
        if confirm_action "Clean npm cache?"; then
            execute_command "npm cache clean --force" "Cleaned npm cache"
        fi
    fi
    
    # Clean pip cache
    if command -v pip &> /dev/null; then
        if confirm_action "Clean pip cache?"; then
            execute_command "pip cache purge" "Cleaned pip cache"
        fi
    fi
    
    # Clean Docker if available
    if command -v docker &> /dev/null; then
        if confirm_action "Clean Docker containers and images?"; then
            execute_command "docker system prune -f" "Cleaned Docker system"
        fi
    fi
    
    success "System temporary cleanup completed"
}

show_cleanup_summary() {
    echo
    success "🧹 Cleanup completed!"
    echo
    echo "📊 Cleanup Summary:"
    echo "   └── Processes: $CLEAN_PROCESSES"
    echo "   └── Cache: $CLEAN_CACHE"
    echo "   └── Logs: $CLEAN_LOGS"
    echo "   └── Build: $CLEAN_BUILD"
    echo "   └── Dependencies: $CLEAN_DEPS"
    echo "   └── Reports: $CLEAN_REPORTS"
    echo "   └── Database: $CLEAN_DATABASE"
    echo
    echo "💡 Next Steps:"
    if [[ "$CLEAN_DEPS" == "true" ]]; then
        echo "   └── Run setup: ./scripts/setup_dependencies.sh"
    fi
    echo "   └── Start fresh: ./scripts/start_web_ui.sh"
    echo
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "This was a dry run. No files were actually deleted."
        info "Run without --dry-run to perform the actual cleanup."
    fi
}

# ==============================================================================
# MAIN FUNCTIONS
# ==============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --processes)
                CLEAN_PROCESSES=true
                shift
                ;;
            --cache)
                CLEAN_CACHE=true
                shift
                ;;
            --logs)
                CLEAN_LOGS=true
                shift
                ;;
            --build)
                CLEAN_BUILD=true
                shift
                ;;
            --deps)
                CLEAN_DEPS=true
                shift
                ;;
            --reports)
                CLEAN_REPORTS=true
                shift
                ;;
            --database)
                CLEAN_DATABASE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
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
║                    LipSyncAutomation Cleanup Utility                         ║
║                      Comprehensive System Cleaner v2.0                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    
    info "Cleanup Configuration:"
    info "  - Processes: $CLEAN_PROCESSES"
    info "  - Cache: $CLEAN_CACHE"
    info "  - Logs: $CLEAN_LOGS"
    info "  - Build: $CLEAN_BUILD"
    info "  - Dependencies: $CLEAN_DEPS"
    info "  - Reports: $CLEAN_REPORTS"
    info "  - Database: $CLEAN_DATABASE"
    info "  - Dry Run: $DRY_RUN"
    info "  - Force: $FORCE"
}

main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Show banner
    show_banner
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Warning for destructive operations
    if [[ "$CLEAN_DEPS" == "true" ]] || [[ "$FORCE" == "false" ]]; then
        warning "This will permanently delete files and stop processes."
        if ! confirm_action "Continue with cleanup?"; then
            info "Cleanup cancelled."
            exit 0
        fi
    fi
    
    # Run cleanup operations
    cleanup_processes
    cleanup_cache_files
    cleanup_log_files
    cleanup_build_artifacts
    cleanup_dependencies
    cleanup_test_reports
    cleanup_database_files
    cleanup_system_temp
    
    # Show summary
    show_cleanup_summary
    
    success "Cleanup completed successfully!"
    return 0
}

# ==============================================================================
# SCRIPT ENTRY POINT
# ==============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi