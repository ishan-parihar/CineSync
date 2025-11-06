#!/bin/bash

# LipSyncAutomation Test Runner Script
# Comprehensive testing for backend, frontend, and integration tests

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

# Test configuration
TEST_BACKEND=true
TEST_FRONTEND=true
TEST_INTEGRATION=true
TEST_E2E=false
TEST_PERFORMANCE=false
TEST_COVERAGE=false
VERBOSE=false
STOP_ON_FAILURE=false
PARALLEL=false
SPECIFIC_TEST=""
REPORT_DIR="test-reports"

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
Usage: $SCRIPT_NAME [OPTIONS] [TEST_NAME]

Comprehensive test runner for LipSyncAutomation

OPTIONS:
    --backend-only          Run only backend tests
    --frontend-only         Run only frontend tests
    --integration-only      Run only integration tests
    --e2e                   Run end-to-end tests
    --performance           Run performance tests
    --coverage              Generate coverage reports
    --parallel              Run tests in parallel (where supported)
    --stop-on-failure       Stop testing on first failure
    -v, --verbose           Enable verbose output
    -h, --help             Show this help message

TEST CATEGORIES:
    Backend Tests:
        - unit              Unit tests for individual modules
        - api               API endpoint tests
        - websocket         WebSocket connection tests
        - integration       Backend integration tests

    Frontend Tests:
        - unit              Component unit tests
        - integration       Component integration tests
        - visual            Visual regression tests
        - accessibility     Accessibility tests

    E2E Tests:
        - cypress           Cypress end-to-end tests
        - playwright        Playwright tests

EXAMPLES:
    $SCRIPT_NAME                           # Run all tests
    $SCRIPT_NAME --backend-only            # Run only backend tests
    $SCRIPT_NAME --coverage --e2e          # Run E2E tests with coverage
    $SCRIPT_NAME unit                      # Run specific test category
    $SCRIPT_NAME test_shot_purpose         # Run specific test file

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                TEST_BACKEND=true
                TEST_FRONTEND=false
                TEST_INTEGRATION=false
                TEST_E2E=false
                shift
                ;;
            --frontend-only)
                TEST_BACKEND=false
                TEST_FRONTEND=true
                TEST_INTEGRATION=false
                TEST_E2E=false
                shift
                ;;
            --integration-only)
                TEST_BACKEND=false
                TEST_FRONTEND=false
                TEST_INTEGRATION=true
                TEST_E2E=false
                shift
                ;;
            --e2e)
                TEST_E2E=true
                shift
                ;;
            --performance)
                TEST_PERFORMANCE=true
                shift
                ;;
            --coverage)
                TEST_COVERAGE=true
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --stop-on-failure)
                STOP_ON_FAILURE=true
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
            unit|api|websocket|integration|visual|accessibility|cypress|playwright|performance)
                SPECIFIC_TEST="$1"
                shift
                ;;
            test_*.py)
                SPECIFIC_TEST="$1"
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

setup_test_environment() {
    log "Setting up test environment..."
    
    cd "$PROJECT_ROOT"
    
    # Create reports directory
    mkdir -p "$REPORT_DIR"
    mkdir -p "$REPORT_DIR/backend"
    mkdir -p "$REPORT_DIR/frontend"
    mkdir -p "$REPORT_DIR/coverage"
    mkdir -p "$REPORT_DIR/e2e"
    mkdir -p "$REPORT_DIR/performance"
    
    # Activate virtual environment
    if [[ -d "venv" ]]; then
        # shellcheck source=/dev/null
        source venv/bin/activate
        debug "Virtual environment activated"
    else
        warning "Virtual environment not found, using system Python"
    fi
    
    # Set test environment variables
    export NODE_ENV=test
    export LOG_LEVEL=debug
    export TESTING=true
    
    # Create test database if needed
    if [[ ! -f "test.db" ]]; then
        info "Creating test database..."
        touch test.db
    fi
    
    success "Test environment setup completed"
}

# ==============================================================================
# BACKEND TEST FUNCTIONS
# ==============================================================================

run_backend_tests() {
    if [[ "$TEST_BACKEND" != "true" && -z "$SPECIFIC_TEST" ]]; then
        return 0
    fi
    
    log "Running backend tests..."
    
    cd "$PROJECT_ROOT"
    
    local backend_failed=false
    local pytest_args=()
    
    # Configure pytest arguments
    if [[ "$VERBOSE" == "true" ]]; then
        pytest_args+=("-v")
    fi
    
    if [[ "$TEST_COVERAGE" == "true" ]]; then
        pytest_args+=(
            "--cov=lipsync_automation"
            "--cov-report=html:$REPORT_DIR/coverage/backend"
            "--cov-report=xml:$REPORT_DIR/coverage/backend_coverage.xml"
            "--cov-report=term-missing"
        )
    fi
    
    if [[ "$PARALLEL" == "true" ]]; then
        pytest_args+=("-n" "auto")
    fi
    
    if [[ "$STOP_ON_FAILURE" == "true" ]]; then
        pytest_args+=("-x")
    fi
    
    # Add output files
    pytest_args+=(
        "--junit-xml=$REPORT_DIR/backend/junit.xml"
        "--html=$REPORT_DIR/backend/report.html"
        "--self-contained-html"
    )
    
    # Determine what tests to run
    local test_path="tests/"
    if [[ -n "$SPECIFIC_TEST" ]]; then
        case "$SPECIFIC_TEST" in
            unit)
                test_path="tests/test_*.py"
                ;;
            api)
                test_path="tests/test_*api*.py"
                ;;
            websocket)
                test_path="tests/test_*websocket*.py"
                ;;
            test_*.py)
                test_path="$SPECIFIC_TEST"
                ;;
        esac
    fi
    
    info "Running backend tests: $test_path"
    
    # Run the tests
    if python -m pytest "${pytest_args[@]}" "$test_path"; then
        success "Backend tests passed"
    else
        error "Backend tests failed"
        backend_failed=true
        
        if [[ "$STOP_ON_FAILURE" == "true" ]]; then
            exit 1
        fi
    fi
    
    # Run specific API tests if requested
    if [[ -z "$SPECIFIC_TEST" || "$SPECIFIC_TEST" == "api" ]]; then
        run_api_tests
    fi
    
    # Run WebSocket tests if requested
    if [[ -z "$SPECIFIC_TEST" || "$SPECIFIC_TEST" == "websocket" ]]; then
        run_websocket_tests
    fi
    
    if [[ "$backend_failed" == "true" ]]; then
        return 1
    fi
    
    return 0
}

run_api_tests() {
    log "Running API endpoint tests..."
    
    # Start test server
    local test_port=8002
    python -c "
import uvicorn
from web-ui.backend.main import app
uvicorn.run(app, host='localhost', port=$test_port, log_level='error')
" &
    local test_server_pid=$!
    
    # Wait for server to start
    sleep 3
    
    # Run API tests
    if python -m pytest tests/test_*api*.py -v --tb=short; then
        success "API tests passed"
    else
        warning "API tests failed"
    fi
    
    # Stop test server
    kill "$test_server_pid" 2>/dev/null || true
}

run_websocket_tests() {
    log "Running WebSocket tests..."
    
    # Start test server with WebSocket support
    local test_port=8003
    python -c "
import asyncio
import uvicorn
from web-ui.backend.main import app

class TestServer:
    def __init__(self):
        self.server = None
    
    async def start(self):
        config = uvicorn.Config(app, host='localhost', port=$test_port, log_level='error')
        self.server = uvicorn.Server(config)
        await self.server.serve()

if __name__ == '__main__':
    server = TestServer()
    asyncio.run(server.start())
" &
    local test_server_pid=$!
    
    # Wait for server to start
    sleep 3
    
    # Run WebSocket tests
    if python -m pytest tests/test_*websocket*.py -v --tb=short; then
        success "WebSocket tests passed"
    else
        warning "WebSocket tests failed"
    fi
    
    # Stop test server
    kill "$test_server_pid" 2>/dev/null || true
}

# ==============================================================================
# FRONTEND TEST FUNCTIONS
# ==============================================================================

run_frontend_tests() {
    if [[ "$TEST_FRONTEND" != "true" && -z "$SPECIFIC_TEST" ]]; then
        return 0
    fi
    
    log "Running frontend tests..."
    
    cd "$PROJECT_ROOT/web-ui/frontend"
    
    local frontend_failed=false
    
    # Ensure dependencies are installed
    if [[ ! -d "node_modules" ]]; then
        info "Installing frontend dependencies..."
        npm install --silent
    fi
    
    # Determine what tests to run
    local npm_test_cmd="test"
    case "$SPECIFIC_TEST" in
        unit)
            npm_test_cmd="test:unit"
            ;;
        integration)
            npm_test_cmd="test:integration"
            ;;
        visual)
            npm_test_cmd="test:visual"
            ;;
        accessibility)
            npm_test_cmd="test:accessibility"
            ;;
    esac
    
    # Run tests with coverage if requested
    if [[ "$TEST_COVERAGE" == "true" ]]; then
        info "Running frontend tests with coverage..."
        if npm run test:coverage -- --ci --coverageReporters=text --coverageReporters=lcov --coverageDirectory=../../$REPORT_DIR/coverage/frontend; then
            success "Frontend tests with coverage passed"
        else
            error "Frontend tests with coverage failed"
            frontend_failed=true
        fi
    else
        info "Running frontend tests: $npm_test_cmd"
        if npm run "$npm_test_cmd" -- --ci --watchAll=false; then
            success "Frontend tests passed"
        else
            error "Frontend tests failed"
            frontend_failed=true
        fi
    fi
    
    # Run type checking
    info "Running TypeScript type checking..."
    if npm run type-check; then
        success "TypeScript type checking passed"
    else
        warning "TypeScript type checking failed"
    fi
    
    # Run linting
    info "Running ESLint..."
    if npm run lint; then
        success "ESLint passed"
    else
        warning "ESLint failed"
    fi
    
    if [[ "$frontend_failed" == "true" ]]; then
        return 1
    fi
    
    return 0
}

# ==============================================================================
# INTEGRATION TEST FUNCTIONS
# ==============================================================================

run_integration_tests() {
    if [[ "$TEST_INTEGRATION" != "true" && -z "$SPECIFIC_TEST" ]]; then
        return 0
    fi
    
    log "Running integration tests..."
    
    cd "$PROJECT_ROOT"
    
    # Start backend server
    local backend_port=8004
    python -c "
import uvicorn
from web-ui.backend.main import app
uvicorn.run(app, host='localhost', port=$backend_port, log_level='error')
" &
    local backend_pid=$!
    
    # Wait for backend to start
    sleep 5
    
    # Start frontend server
    cd "$PROJECT_ROOT/web-ui/frontend"
    local frontend_port=5001
    BACKEND_URL="http://localhost:$backend_port" npm run dev -- -p "$frontend_port" &
    local frontend_pid=$!
    
    # Wait for frontend to start
    sleep 10
    
    # Run integration tests
    local integration_failed=false
    cd "$PROJECT_ROOT"
    
    if python -m pytest tests/test_*integration*.py -v --tb=short; then
        success "Integration tests passed"
    else
        error "Integration tests failed"
        integration_failed=true
    fi
    
    # Cleanup
    kill "$backend_pid" 2>/dev/null || true
    kill "$frontend_pid" 2>/dev/null || true
    
    if [[ "$integration_failed" == "true" ]]; then
        return 1
    fi
    
    return 0
}

# ==============================================================================
# E2E TEST FUNCTIONS
# ==============================================================================

run_e2e_tests() {
    if [[ "$TEST_E2E" != "true" ]]; then
        return 0
    fi
    
    log "Running end-to-end tests..."
    
    cd "$PROJECT_ROOT/web-ui/frontend"
    
    # Start application for E2E testing
    local backend_port=8005
    local frontend_port=5002
    
    # Start backend
    cd "$PROJECT_ROOT"
    python -c "
import uvicorn
from web-ui.backend.main import app
uvicorn.run(app, host='localhost', port=$backend_port, log_level='error')
" &
    local backend_pid=$!
    
    # Wait for backend
    sleep 5
    
    # Start frontend
    cd "$PROJECT_ROOT/web-ui/frontend"
    BACKEND_URL="http://localhost:$backend_port" npm run build
    BACKEND_URL="http://localhost:$backend_port" npm start -- -p "$frontend_port" &
    local frontend_pid=$!
    
    # Wait for frontend
    sleep 10
    
    # Run E2E tests
    local e2e_failed=false
    
    # Cypress tests
    if command -v npx cypress &> /dev/null; then
        info "Running Cypress E2E tests..."
        if npx cypress run --config baseUrl=http://localhost:$frontend_port --reporter junit --reporter-options "mochaFile=../../$REPORT_DIR/e2e/cypress.xml"; then
            success "Cypress E2E tests passed"
        else
            error "Cypress E2E tests failed"
            e2e_failed=true
        fi
    else
        warning "Cypress not available, skipping Cypress tests"
    fi
    
    # Playwright tests
    if command -v npx playwright &> /dev/null; then
        info "Running Playwright E2E tests..."
        if npx playwright test --reporter=junit --output-dir=../../$REPORT_DIR/e2e/playwright; then
            success "Playwright E2E tests passed"
        else
            error "Playwright E2E tests failed"
            e2e_failed=true
        fi
    else
        warning "Playwright not available, skipping Playwright tests"
    fi
    
    # Cleanup
    kill "$backend_pid" 2>/dev/null || true
    kill "$frontend_pid" 2>/dev/null || true
    
    if [[ "$e2e_failed" == "true" ]]; then
        return 1
    fi
    
    return 0
}

# ==============================================================================
# PERFORMANCE TEST FUNCTIONS
# ==============================================================================

run_performance_tests() {
    if [[ "$TEST_PERFORMANCE" != "true" ]]; then
        return 0
    fi
    
    log "Running performance tests..."
    
    cd "$PROJECT_ROOT"
    
    # Start application for performance testing
    local backend_port=8006
    python -c "
import uvicorn
from web-ui.backend.main import app
uvicorn.run(app, host='localhost', port=$backend_port, log_level='error')
" &
    local backend_pid=$!
    
    # Wait for server
    sleep 5
    
    # Run performance tests
    info "Running API performance tests..."
    if python -m pytest tests/test_*performance*.py -v --tb=short; then
        success "Performance tests passed"
    else
        warning "Performance tests failed"
    fi
    
    # Run Lighthouse CI if available
    cd "$PROJECT_ROOT/web-ui/frontend"
    if command -v lhci &> /dev/null; then
        info "Running Lighthouse performance tests..."
        if lhci autorun --config=.lighthouserc.js; then
            success "Lighthouse tests passed"
        else
            warning "Lighthouse tests failed"
        fi
    else
        warning "Lighthouse CI not available, skipping Lighthouse tests"
    fi
    
    # Cleanup
    kill "$backend_pid" 2>/dev/null || true
    
    return 0
}

# ==============================================================================
# REPORTING FUNCTIONS
# ==============================================================================

generate_test_report() {
    log "Generating test report..."
    
    cd "$PROJECT_ROOT"
    
    # Create summary report
    cat > "$REPORT_DIR/test_summary.md" << EOF
# LipSyncAutomation Test Report

Generated: $(date)

## Test Categories Run
- Backend Tests: $TEST_BACKEND
- Frontend Tests: $TEST_FRONTEND  
- Integration Tests: $TEST_INTEGRATION
- E2E Tests: $TEST_E2E
- Performance Tests: $TEST_PERFORMANCE
- Coverage Generated: $TEST_COVERAGE

## Test Results
$(find "$REPORT_DIR" -name "*.xml" -exec echo "- {}" \;)

## Coverage Reports
- Backend Coverage: $REPORT_DIR/coverage/backend/index.html
- Frontend Coverage: $REPORT_DIR/coverage/frontend/lcov-report/index.html

## Detailed Reports
- Backend HTML: $REPORT_DIR/backend/report.html
- Frontend HTML: Check Jest output
- E2E Reports: $REPORT_DIR/e2e/

## Next Steps
1. Review any failed tests
2. Check coverage reports for areas needing improvement
3. Address performance bottlenecks if any
4. Update tests as needed

EOF
    
    success "Test report generated: $REPORT_DIR/test_summary.md"
    
    # Show summary
    if [[ "$VERBOSE" == "true" ]]; then
        echo
        cat "$REPORT_DIR/test_summary.md"
    fi
}

show_test_summary() {
    echo
    success "🧪 Test execution completed!"
    echo
    echo "📊 Test Results Summary:"
    echo "   └── Reports Directory: $REPORT_DIR/"
    echo "   └── Summary Report:   $REPORT_DIR/test_summary.md"
    echo
    echo "📈 Coverage Reports:"
    if [[ "$TEST_COVERAGE" == "true" ]]; then
        echo "   └── Backend Coverage:  $REPORT_DIR/coverage/backend/index.html"
        echo "   └── Frontend Coverage: $REPORT_DIR/coverage/frontend/lcov-report/index.html"
    else
        echo "   └── Run with --coverage to generate coverage reports"
    fi
    echo
    echo "🔍 Detailed Reports:"
    echo "   └── Backend HTML:      $REPORT_DIR/backend/report.html"
    echo "   └── E2E Reports:       $REPORT_DIR/e2e/"
    echo "   └── Performance:       $REPORT_DIR/performance/"
    echo
    echo "📝 View reports:"
    echo "   └── Open summary:      cat $REPORT_DIR/test_summary.md"
    echo "   └── Open in browser:   open $REPORT_DIR/coverage/backend/index.html"
    echo
}

# ==============================================================================
# MAIN FUNCTIONS
# ==============================================================================

main() {
    # Parse arguments
    parse_arguments "$@"
    
    # Show banner
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                    LipSyncAutomation Test Runner v2.0                        ║
║                      Comprehensive Testing Framework                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    
    info "Test Configuration:"
    info "  - Backend: $TEST_BACKEND"
    info "  - Frontend: $TEST_FRONTEND"
    info "  - Integration: $TEST_INTEGRATION"
    info "  - E2E: $TEST_E2E"
    info "  - Performance: $TEST_PERFORMANCE"
    info "  - Coverage: $TEST_COVERAGE"
    info "  - Specific Test: $SPECIFIC_TEST"
    
    # Setup test environment
    setup_test_environment
    
    # Run tests
    local overall_failed=false
    
    if ! run_backend_tests; then
        overall_failed=true
    fi
    
    if ! run_frontend_tests; then
        overall_failed=true
    fi
    
    if ! run_integration_tests; then
        overall_failed=true
    fi
    
    if ! run_e2e_tests; then
        overall_failed=true
    fi
    
    if ! run_performance_tests; then
        overall_failed=true
    fi
    
    # Generate reports
    generate_test_report
    
    # Show summary
    show_test_summary
    
    # Return appropriate exit code
    if [[ "$overall_failed" == "true" ]]; then
        error "Some tests failed. Check the reports for details."
        exit 1
    else
        success "All tests passed successfully!"
        exit 0
    fi
}

# ==============================================================================
# SCRIPT ENTRY POINT
# ==============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi