#!/bin/bash

# LipSyncAutomation Web UI Setup Script
# Handles installation, environment setup, and one-time configuration

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ==============================================================================
# CONFIGURATION & GLOBALS
# ==============================================================================

# Script information
readonly SCRIPT_NAME="$(basename "$0")"
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Global variables
VERBOSE=false
SKIP_DEPS=false
SKIP_VENV=false

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

LipSyncAutomation Web UI Setup Script
Handles installation, environment setup, and one-time configuration

OPTIONS:
    -v, --verbose          Enable verbose logging
    -s, --skip-deps        Skip dependency installation (faster for re-setup)
    --skip-venv           Skip virtual environment creation
    -h, --help            Show this help message

EXAMPLES:
    $SCRIPT_NAME                           # Full setup (recommended for first time)
    $SCRIPT_NAME --skip-deps               # Re-setup without installing dependencies
    $SCRIPT_NAME --verbose                 # Enable verbose output

EOF
}

# ==============================================================================
# SETUP FUNCTIONS
# ==============================================================================

check_system_requirements() {
    log "Checking system requirements..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is required but not installed"
        return 1
    fi
    
    local python_version
    python_version=$(python3 --version | cut -d' ' -f2)
    info "Python version: $python_version"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed"
        return 1
    fi
    
    local node_version
    node_version=$(node --version)
    info "Node.js version: $node_version"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is required but not installed"
        return 1
    fi
    
    local npm_version
    npm_version=$(npm --version)
    info "npm version: $npm_version"
    
    success "System requirements check passed"
}

setup_python_environment() {
    if [[ "$SKIP_VENV" == "true" ]]; then
        info "Skipping virtual environment creation as requested"
        return 0
    fi
    
    log "Setting up Python virtual environment..."
    
    cd "$PROJECT_ROOT"
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        info "Creating Python virtual environment..."
        python3 -m venv venv
        success "Virtual environment created"
    else
        info "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    info "Upgrading pip..."
    pip install --upgrade pip
    
    # Install Python dependencies
    if [[ "$SKIP_DEPS" == "false" ]]; then
        log "Installing Python dependencies..."
        
        # Install the package in development mode
        if [[ -f "requirements.txt" ]]; then
            pip install -r requirements.txt
        fi
        
        if [[ -f "pyproject.toml" ]]; then
            pip install -e ".[dev]"
        fi
        
        success "Python dependencies installed"
    else
        info "Skipping Python dependency installation as requested"
    fi
}

setup_frontend_dependencies() {
    if [[ "$SKIP_DEPS" == "true" ]]; then
        info "Skipping frontend dependency installation as requested"
        return 0
    fi
    
    log "Setting up frontend dependencies..."
    
    cd "$PROJECT_ROOT/web-ui/frontend"
    
    # Install Node.js dependencies
    info "Installing Node.js dependencies..."
    npm install
    
    success "Frontend dependencies installed"
}

create_directories() {
    log "Creating necessary directories..."
    
    cd "$PROJECT_ROOT"
    
    # Create logs directory
    mkdir -p logs
    
    # Create profiles directory if it doesn't exist
    mkdir -p profiles
    
    success "Directories created"
}

validate_setup() {
    log "Validating setup..."
    
    cd "$PROJECT_ROOT"
    
    # Check virtual environment
    if [[ ! -d "venv" ]]; then
        error "Virtual environment not found"
        return 1
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check Python dependencies
    if ! python -c "import fastapi" &> /dev/null; then
        error "FastAPI not installed in virtual environment"
        return 1
    fi
    
    # Check frontend dependencies
    if [[ ! -d "web-ui/frontend/node_modules" ]]; then
        error "Frontend dependencies not installed"
        return 1
    fi
    
    # Check if main files exist
    if [[ ! -f "web-ui/backend/main.py" ]]; then
        error "Backend main file not found"
        return 1
    fi
    
    if [[ ! -f "web-ui/frontend/package.json" ]]; then
        error "Frontend package.json not found"
        return 1
    fi
    
    success "Setup validation passed"
}

show_completion_info() {
    echo
    success "🎉 LipSyncAutomation Web UI setup completed!"
    echo
    echo "📋 What was set up:"
    echo "   └── Python virtual environment with dependencies"
    echo "   └── Frontend Node.js dependencies"
    echo "   └── Necessary directories (logs/, profiles/)"
    echo
    echo "🚀 Next steps:"
    echo "   └── Start the servers: ./scripts/start_web_ui.sh"
    echo "   └── Or run with custom ports: ./scripts/start_web_ui.sh -b 8080 -f 3000"
    echo
    echo "📁 Useful directories:"
    echo "   └── Backend: web-ui/backend/"
    echo "   └── Frontend: web-ui/frontend/"
    echo "   └── Logs: logs/"
    echo "   └── Profiles: profiles/"
    echo
}

# ==============================================================================
# MAIN FUNCTIONS
# ==============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -s|--skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-venv)
                SKIP_VENV=true
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
║                    LipSyncAutomation Web UI Setup                            ║
║                         Installation & Configuration                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    info "Skip Dependencies: $SKIP_DEPS | Skip VEnv: $SKIP_VENV | Verbose: $VERBOSE"
}

main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Show banner
    show_banner
    
    # Check system requirements
    if ! check_system_requirements; then
        error "System requirements check failed"
        exit 1
    fi
    
    # Setup Python environment
    if ! setup_python_environment; then
        error "Python environment setup failed"
        exit 1
    fi
    
    # Setup frontend dependencies
    if ! setup_frontend_dependencies; then
        error "Frontend setup failed"
        exit 1
    fi
    
    # Create directories
    if ! create_directories; then
        error "Directory creation failed"
        exit 1
    fi
    
    # Validate setup
    if ! validate_setup; then
        error "Setup validation failed"
        exit 1
    fi
    
    # Show completion info
    show_completion_info
}

# ==============================================================================
# SCRIPT ENTRY POINT
# ==============================================================================

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi