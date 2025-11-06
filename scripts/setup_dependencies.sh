#!/bin/bash

# LipSyncAutomation Setup Dependencies Script
# One-time setup for all project dependencies

set -euo pipefail

# ==============================================================================
# CONFIGURATION
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
readonly NC='\033[0m'

# Options
SKIP_SYSTEM_DEPS=false
FORCE_REINSTALL=false
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
    echo -e "${BLUE}ℹ️  $1${NC}"
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

One-time setup script for LipSyncAutomation dependencies

OPTIONS:
    --skip-system-deps     Skip system dependency installation
    --force-reinstall      Force reinstallation of all dependencies
    -v, --verbose          Enable verbose logging
    -h, --help            Show this help message

This script will install:
    • System dependencies (Python 3.8+, Node.js 18+, FFmpeg, etc.)
    • Python virtual environment and packages
    • Frontend Node.js dependencies
    • Development tools and testing frameworks
    • Optional AI/ML dependencies for enhanced features

EOF
}

# ==============================================================================
# SYSTEM DEPENDENCIES FUNCTIONS
# ==============================================================================

detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v brew &> /dev/null; then
        echo "brew"
    elif command -v pacman &> /dev/null; then
        echo "pacman"
    else
        echo "unknown"
    fi
}

install_system_dependencies() {
    if [[ "$SKIP_SYSTEM_DEPS" == "true" ]]; then
        info "Skipping system dependencies installation"
        return 0
    fi
    
    log "Installing system dependencies..."
    
    local pkg_manager
    pkg_manager=$(detect_package_manager)
    
    case "$pkg_manager" in
        "apt")
            info "Detected Debian/Ubuntu package manager"
            sudo apt-get update
            sudo apt-get install -y \
                python3.8 \
                python3.8-venv \
                python3.8-dev \
                python3-pip \
                nodejs \
                npm \
                git \
                curl \
                wget \
                build-essential \
                libsndfile1 \
                ffmpeg \
                libsox-dev \
                libsox-fmt-all \
                portaudio19-dev \
                python3-portaudio \
                || {
                    error "Failed to install system dependencies with apt"
                    return 1
                }
            ;;
        "yum")
            info "Detected RHEL/CentOS package manager"
            sudo yum update -y
            sudo yum install -y \
                python38 \
                python38-pip \
                python38-devel \
                nodejs \
                npm \
                git \
                curl \
                wget \
                gcc \
                gcc-c++ \
                make \
                libsndfile-devel \
                ffmpeg \
                sox-devel \
                portaudio-devel \
                || {
                    error "Failed to install system dependencies with yum"
                    return 1
                }
            ;;
        "brew")
            info "Detected Homebrew package manager"
            brew update
            brew install \
                python@3.8 \
                node \
                git \
                curl \
                wget \
                libsndfile \
                ffmpeg \
                sox \
                portaudio \
                || {
                    error "Failed to install system dependencies with brew"
                    return 1
                }
            ;;
        "pacman")
            info "Detected Arch Linux package manager"
            sudo pacman -Syu --noconfirm
            sudo pacman -S --noconfirm \
                python \
                python-pip \
                nodejs \
                npm \
                git \
                curl \
                wget \
                base-devel \
                libsndfile \
                ffmpeg \
                sox \
                portaudio \
                || {
                    error "Failed to install system dependencies with pacman"
                    return 1
                }
            ;;
        *)
            warning "Unknown package manager. Please install manually:"
            echo "  - Python 3.8+"
            echo "  - Node.js 18+"
            echo "  - FFmpeg"
            echo "  - libsndfile"
            echo "  - sox"
            echo "  - portaudio"
            echo "  - build tools (gcc, make)"
            return 0
            ;;
    esac
    
    success "System dependencies installed"
    return 0
}

setup_python_environment() {
    log "Setting up Python environment..."
    
    cd "$PROJECT_ROOT"
    
    # Remove existing venv if force reinstall
    if [[ "$FORCE_REINSTALL" == "true" ]] && [[ -d "venv" ]]; then
        info "Removing existing virtual environment..."
        rm -rf venv
    fi
    
    # Create virtual environment
    if [[ ! -d "venv" ]]; then
        info "Creating Python virtual environment..."
        python3 -m venv venv || {
            error "Failed to create virtual environment"
            return 1
        }
        success "Virtual environment created"
    else
        info "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    # shellcheck source=/dev/null
    source venv/bin/activate || {
        error "Failed to activate virtual environment"
        return 1
    }
    
    # Upgrade pip
    info "Upgrading pip..."
    pip install --upgrade pip setuptools wheel || {
        warning "Failed to upgrade pip (continuing anyway)"
    }
    
    # Install base dependencies
    info "Installing base Python dependencies..."
    if [[ -f "pyproject.toml" ]]; then
        if [[ "$FORCE_REINSTALL" == "true" ]]; then
            pip install -e ".[dev]" --force-reinstall --upgrade
        else
            pip install -e ".[dev]"
        fi
    else
        # Fallback to manual installation
        local base_deps=(
            "fastapi"
            "uvicorn[standard]"
            "websockets"
            "pydantic"
            "python-multipart"
            "python-dotenv"
            "psutil"
            "requests"
            "pillow"
            "numpy"
            "scipy"
            "librosa"
            "soundfile"
            "moviepy"
            "tqdm"
        )
        
        for dep in "${base_deps[@]}"; do
            info "Installing $dep..."
            if [[ "$FORCE_REINSTALL" == "true" ]]; then
                pip install "$dep" --force-reinstall --upgrade
            else
                pip install "$dep"
            fi
        done
    fi
    
    # Install development dependencies
    info "Installing development dependencies..."
    local dev_deps=(
        "pytest>=6.0"
        "pytest-cov"
        "pytest-asyncio"
        "black"
        "flake8"
        "mypy"
        "isort"
        "pre-commit"
    )
    
    for dep in "${dev_deps[@]}"; do
        info "Installing $dep..."
        if [[ "$FORCE_REINSTALL" == "true" ]]; then
            pip install "$dep" --force-reinstall --upgrade
        else
            pip install "$dep"
        fi
    done
    
    # Install optional AI/ML dependencies
    info "Installing optional AI/ML dependencies..."
    local ml_deps=(
        "torch"
        "torchaudio"
        "transformers"
        "onnxruntime"
        "opencv-python"
    )
    
    for dep in "${ml_deps[@]}"; do
        info "Installing $dep (optional)..."
        if pip install "$dep" 2>/dev/null; then
            success "Installed $dep"
        else
            warning "Failed to install $dep (optional, continuing)"
        fi
    done
    
    success "Python environment setup completed"
    return 0
}

setup_frontend_environment() {
    log "Setting up frontend environment..."
    
    cd "$PROJECT_ROOT/web-ui/frontend"
    
    # Check package.json exists
    if [[ ! -f "package.json" ]]; then
        error "package.json not found in web-ui/frontend"
        return 1
    fi
    
    # Clear npm cache if force reinstall
    if [[ "$FORCE_REINSTALL" == "true" ]]; then
        info "Clearing npm cache..."
        npm cache clean --force
        rm -rf node_modules package-lock.json
    fi
    
    # Install dependencies
    info "Installing frontend dependencies..."
    if [[ "$FORCE_REINSTALL" == "true" ]]; then
        npm ci --force || npm install --force
    else
        npm ci || npm install
    fi
    
    # Verify installation
    if [[ ! -d "node_modules" ]]; then
        error "Frontend dependencies installation failed"
        return 1
    fi
    
    success "Frontend environment setup completed"
    return 0
}

setup_development_tools() {
    log "Setting up development tools..."
    
    cd "$PROJECT_ROOT"
    
    # Setup pre-commit hooks
    if [[ -f ".pre-commit-config.yaml" ]]; then
        info "Setting up pre-commit hooks..."
        if command -v pre-commit &> /dev/null; then
            pre-commit install || {
                warning "Failed to setup pre-commit hooks"
            }
        else
            warning "pre-commit not available, skipping hook setup"
        fi
    fi
    
    # Create necessary directories
    info "Creating necessary directories..."
    mkdir -p logs
    mkdir -p cache
    mkdir -p output
    mkdir -p temp
    
    # Set up configuration files
    setup_configuration_files
    
    success "Development tools setup completed"
    return 0
}

setup_configuration_files() {
    info "Setting up configuration files..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        cat > .env << 'EOF'
# LipSyncAutomation Environment Configuration
# Copy this file to .env.local and modify as needed

# Server Configuration
PORT=8001
BACKEND_PORT=8001
HOST=localhost

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Development Settings
RELOAD=true
DEBUG=false

# Database (if using)
DATABASE_URL=sqlite:///./lipsync.db

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# External Services
OPENAI_API_KEY=your-openai-api-key-here

# Performance
MAX_WORKERS=4
CACHE_TTL=3600

# Feature Flags
ENABLE_WEBSOCKETS=true
ENABLE_CACHING=true
ENABLE_MONITORING=true
EOF
        success "Created .env configuration file"
    fi
    
    # Create logging configuration
    if [[ ! -f "logs/.gitkeep" ]]; then
        touch logs/.gitkeep
    fi
    
    # Create cache directory structure
    mkdir -p cache/emotions cache/audio cache/video cache/temp
    touch cache/.gitkeep
}

run_verification_tests() {
    log "Running verification tests..."
    
    cd "$PROJECT_ROOT"
    
    # Test Python imports
    info "Testing Python imports..."
    # shellcheck source=/dev/null
    source venv/bin/activate
    
    python -c "
import sys
import importlib

# Test core modules
core_modules = [
    'fastapi',
    'uvicorn', 
    'pydantic',
    'psutil',
    'numpy',
    'PIL',
    'librosa',
    'soundfile'
]

# Test optional modules
optional_modules = [
    'torch',
    'onnxruntime',
    'cv2'
]

print('Testing core modules...')
failed_modules = []
for module in core_modules:
    try:
        importlib.import_module(module)
        print(f'✅ {module}')
    except ImportError as e:
        print(f'❌ {module}: {e}')
        failed_modules.append(module)

print('\\nTesting optional modules...')
for module in optional_modules:
    try:
        importlib.import_module(module)
        print(f'✅ {module} (optional)')
    except ImportError:
        print(f'⚠️  {module} (optional - not installed)')

if failed_modules:
    print(f'\\n❌ Failed modules: {failed_modules}')
    sys.exit(1)
else:
    print('\\n✅ All core modules imported successfully')
" || {
        error "Python import verification failed"
        return 1
    }
    
    # Test frontend build
    info "Testing frontend build..."
    cd "$PROJECT_ROOT/web-ui/frontend"
    if npm run build 2>/dev/null; then
        success "Frontend build verification passed"
    else
        warning "Frontend build verification failed (may be due to missing dependencies)"
    fi
    
    # Test backend startup
    info "Testing backend startup..."
    cd "$PROJECT_ROOT"
    # shellcheck source=/dev/null
    source venv/bin/activate
    
    timeout 10s python -c "
import sys
import os
sys.path.insert(0, '.')

# Test importing the main application
try:
    from web-ui.backend.main import app
    print('✅ Backend application imports successfully')
except ImportError as e:
    print(f'❌ Backend import failed: {e}')
    sys.exit(1)
except Exception as e:
    print(f'⚠️  Backend import warning: {e}')
" 2>/dev/null || {
        warning "Backend startup verification failed (may need additional setup)"
    }
    
    success "Verification tests completed"
    return 0
}

show_completion_message() {
    cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                    🎉 Setup Completed Successfully!                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

Next Steps:
1. Review and customize the .env file
2. Run the application: ./scripts/start_web_ui.sh
3. Open your browser to http://localhost:5000

Useful Commands:
• Start development server:  ./scripts/start_web_ui.sh
• Run tests:               ./scripts/run_tests.sh
• Cleanup processes:       ./scripts/cleanup.sh

Configuration Files:
• .env                     - Environment variables
• pyproject.toml          - Python dependencies
• web-ui/frontend/package.json - Frontend dependencies

For more information, see the documentation in the docs/ directory.

EOF
}

# ==============================================================================
# MAIN FUNCTIONS
# ==============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-system-deps)
                SKIP_SYSTEM_DEPS=true
                shift
                ;;
            --force-reinstall)
                FORCE_REINSTALL=true
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

main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    log "Starting LipSyncAutomation dependency setup..."
    info "Force reinstall: $FORCE_REINSTALL | Skip system deps: $SKIP_SYSTEM_DEPS"
    
    # Install system dependencies
    if ! install_system_dependencies; then
        error "System dependencies installation failed"
        exit 1
    fi
    
    # Setup Python environment
    if ! setup_python_environment; then
        error "Python environment setup failed"
        exit 1
    fi
    
    # Setup frontend environment
    if ! setup_frontend_environment; then
        error "Frontend environment setup failed"
        exit 1
    fi
    
    # Setup development tools
    if ! setup_development_tools; then
        error "Development tools setup failed"
        exit 1
    fi
    
    # Run verification tests
    if ! run_verification_tests; then
        error "Verification tests failed"
        exit 1
    fi
    
    # Show completion message
    show_completion_message
    
    success "Setup completed successfully!"
    return 0
}

# ==============================================================================
# SCRIPT ENTRY POINT
# ==============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi