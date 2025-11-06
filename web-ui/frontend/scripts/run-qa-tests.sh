#!/bin/bash

# Comprehensive QA Test Runner for LipSync Automation Web-UI
# This script runs the complete test suite with proper error handling and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="$PROJECT_DIR/test-reports"
COVERAGE_DIR="$PROJECT_DIR/coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create directories
mkdir -p "$REPORTS_DIR"
mkdir -p "$COVERAGE_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    
    # Check if node_modules exists
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        log "Installing dependencies..."
        cd "$PROJECT_DIR"
        npm ci || error "Failed to install dependencies"
    fi
    
    success "Prerequisites check completed"
}

# Clean previous test results
clean_test_results() {
    log "Cleaning previous test results..."
    
    rm -rf "$COVERAGE_DIR"
    rm -rf "$REPORTS_DIR"
    rm -rf "$PROJECT_DIR/cypress/videos"
    rm -rf "$PROJECT_DIR/cypress/screenshots"
    rm -rf "$PROJECT_DIR/playwright-report"
    
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$COVERAGE_DIR"
    
    success "Test results cleaned"
}

# Start application in test mode
start_test_app() {
    log "Starting application in test mode..."
    
    cd "$PROJECT_DIR"
    
    # Build the application first
    npm run build || error "Failed to build application"
    
    # Start the application
    npm run start:test &
    APP_PID=$!
    
    # Wait for application to start
    log "Waiting for application to start..."
    for i in {1..60}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            success "Application started successfully (PID: $APP_PID)"
            return
        fi
        sleep 1
    done
    
    error "Application failed to start within 60 seconds"
}

# Stop test application
stop_test_app() {
    if [ ! -z "$APP_PID" ]; then
        log "Stopping test application (PID: $APP_PID)..."
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
        success "Test application stopped"
    fi
}

# Run unit tests
run_unit_tests() {
    log "Running unit tests..."
    
    cd "$PROJECT_DIR"
    
    if npm run test:unit -- --coverage --coverageReporters=html --coverageReporters=text --coverageReporters=lcov --watchAll=false; then
        success "Unit tests passed"
    else
        error "Unit tests failed"
    fi
}

# Run integration tests
run_integration_tests() {
    log "Running integration tests..."
    
    cd "$PROJECT_DIR"
    
    if npm run test:integration -- --watchAll=false; then
        success "Integration tests passed"
    else
        error "Integration tests failed"
    fi
}

# Run E2E tests
run_e2e_tests() {
    log "Running E2E tests..."
    
    cd "$PROJECT_DIR"
    
    # Run Cypress tests
    if npm run test:e2e; then
        success "E2E tests passed"
    else
        error "E2E tests failed"
    fi
    
    # Copy Cypress reports
    if [ -d "$PROJECT_DIR/cypress/videos" ]; then
        cp -r "$PROJECT_DIR/cypress/videos" "$REPORTS_DIR/cypress-videos"
    fi
    
    if [ -d "$PROJECT_DIR/cypress/screenshots" ]; then
        cp -r "$PROJECT_DIR/cypress/screenshots" "$REPORTS_DIR/cypress-screenshots"
    fi
}

# Run performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    cd "$PROJECT_DIR"
    
    if npm run test:performance; then
        success "Performance tests passed"
    else
        error "Performance tests failed"
    fi
}

# Run accessibility tests
run_accessibility_tests() {
    log "Running accessibility tests..."
    
    cd "$PROJECT_DIR"
    
    if npm run test:accessibility; then
        success "Accessibility tests passed"
    else
        error "Accessibility tests failed"
    fi
}

# Run security tests
run_security_tests() {
    log "Running security tests..."
    
    cd "$PROJECT_DIR"
    
    if npm run test:security; then
        success "Security tests passed"
    else
        error "Security tests failed"
    fi
}

# Generate combined test report
generate_test_report() {
    log "Generating combined test report..."
    
    cd "$PROJECT_DIR"
    
    # Create HTML report
    cat > "$REPORTS_DIR/test-report-$TIMESTAMP.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>LipSync Automation - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LipSync Automation - Test Report</h1>
        <p>Generated on: $(date)</p>
        <p>Test Suite: Full QA Pipeline</p>
    </div>
    
    <div class="section">
        <h2>Test Results Summary</h2>
        <table>
            <tr>
                <th>Test Category</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Coverage</th>
            </tr>
            <tr>
                <td>Unit Tests</td>
                <td class="success">Passed</td>
                <td>$(grep -o "Tests:.*s" "$PROJECT_DIR/test-results/unit-tests.log" || echo "N/A")</td>
                <td>$(grep -o "All files.*%" "$PROJECT_DIR/coverage/lcov-report/index.html" || echo "N/A")</td>
            </tr>
            <tr>
                <td>Integration Tests</td>
                <td class="success">Passed</td>
                <td>$(grep -o "Tests:.*s" "$PROJECT_DIR/test-results/integration-tests.log" || echo "N/A")</td>
                <td>N/A</td>
            </tr>
            <tr>
                <td>E2E Tests</td>
                <td class="success">Passed</td>
                <td>$(grep -o "Duration:.*s" "$PROJECT_DIR/test-results/e2e-tests.log" || echo "N/A")</td>
                <td>N/A</td>
            </tr>
            <tr>
                <td>Performance Tests</td>
                <td class="success">Passed</td>
                <td>$(grep -o "Duration:.*s" "$PROJECT_DIR/test-results/performance-tests.log" || echo "N/A")</td>
                <td>N/A</td>
            </tr>
            <tr>
                <td>Accessibility Tests</td>
                <td class="success">Passed</td>
                <td>$(grep -o "Duration:.*s" "$PROJECT_DIR/test-results/accessibility-tests.log" || echo "N/A")</td>
                <td>N/A</td>
            </tr>
            <tr>
                <td>Security Tests</td>
                <td class="success">Passed</td>
                <td>$(grep -o "Duration:.*s" "$PROJECT_DIR/test-results/security-tests.log" || echo "N/A")</td>
                <td>N/A</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <h2>Quality Metrics</h2>
        <ul>
            <li>Code Coverage: $(grep -o "All files.*%" "$PROJECT_DIR/coverage/lcov-report/index.html" || echo "N/A")</li>
            <li>Performance Score: $(grep -o "performance:.*" "$PROJECT_DIR/test-results/lighthouse-report.json" || echo "N/A")</li>
            <li>Accessibility Score: $(grep -o "accessibility:.*" "$PROJECT_DIR/test-results/lighthouse-report.json" || echo "N/A")</li>
            <li>Security Vulnerabilities: $(npm audit --json | grep -o '"vulnerabilities":[0-9]*' || echo "0")</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Artifacts</h2>
        <ul>
            <li><a href="coverage/lcov-report/index.html">Coverage Report</a></li>
            <li><a href="cypress-videos/">E2E Test Videos</a></li>
            <li><a href="cypress-screenshots/">E2E Test Screenshots</a></li>
            <li><a href="lighthouse-report.html">Lighthouse Report</a></li>
            <li><a href="accessibility-report.html">Accessibility Report</a></li>
        </ul>
    </div>
</body>
</html>
EOF
    
    success "Test report generated: $REPORTS_DIR/test-report-$TIMESTAMP.html"
}

# Run specific test category
run_test_category() {
    local category="$1"
    
    case "$category" in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "accessibility")
            run_accessibility_tests
            ;;
        "security")
            run_security_tests
            ;;
        *)
            error "Unknown test category: $category"
            ;;
    esac
}

# Main execution function
main() {
    local test_category="$1"
    
    log "Starting LipSync Automation QA Test Runner"
    log "Project directory: $PROJECT_DIR"
    log "Reports directory: $REPORTS_DIR"
    
    # Trap to ensure cleanup
    trap stop_test_app EXIT
    
    check_prerequisites
    clean_test_results
    
    if [ -n "$test_category" ]; then
        log "Running specific test category: $test_category"
        check_prerequisites
        
        if [ "$test_category" = "e2e" ] || [ "$test_category" = "performance" ] || [ "$test_category" = "accessibility" ] || [ "$test_category" = "security" ]; then
            start_test_app
        fi
        
        run_test_category "$test_category"
        
        if [ "$test_category" = "e2e" ] || [ "$test_category" = "performance" ] || [ "$test_category" = "accessibility" ] || [ "$test_category" = "security" ]; then
            stop_test_app
        fi
    else
        log "Running full test suite"
        start_test_app
        
        run_unit_tests
        run_integration_tests
        run_e2e_tests
        run_performance_tests
        run_accessibility_tests
        run_security_tests
        
        stop_test_app
        generate_test_report
    fi
    
    success "All tests completed successfully!"
    log "Test reports available in: $REPORTS_DIR"
}

# Handle script arguments
case "$1" in
    "unit"|"integration"|"e2e"|"performance"|"accessibility"|"security")
        main "$1"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [test_category]"
        echo ""
        echo "Test categories:"
        echo "  unit          - Run unit tests only"
        echo "  integration   - Run integration tests only"
        echo "  e2e           - Run E2E tests only"
        echo "  performance   - Run performance tests only"
        echo "  accessibility - Run accessibility tests only"
        echo "  security      - Run security tests only"
        echo ""
        echo "If no category is specified, all tests will be run."
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Invalid argument: $1. Use '$0 help' for usage information."
        ;;
esac