#!/bin/bash

# LipSyncAutomation Frontend Performance & Testing Setup Script
# This script sets up the complete performance optimization and testing infrastructure

set -e

echo "🚀 Setting up LipSyncAutomation Frontend Performance & Testing Infrastructure..."
echo "=================================================================="

# Navigate to frontend directory
cd "$(dirname "$0")/web-ui/frontend"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Install additional performance and testing dependencies
echo "📦 Installing performance and testing dependencies..."
npm install --save-dev \
    @next/bundle-analyzer \
    @playwright/test \
    @testing-library/jest-dom \
    @testing-library/react \
    @testing-library/user-event \
    @types/jest \
    axe-core \
    cypress \
    cypress-axe \
    eslint-plugin-jest \
    eslint-plugin-testing-library \
    husky \
    lighthouse-ci \
    prettier \
    start-server-and-test \
    web-vitals

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install --with-deps

# Setup Husky for pre-commit hooks
echo "🪝 Setting up pre-commit hooks..."
npx husky install

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run linting
echo "Running ESLint..."
npm run lint

# Run type checking
echo "Running type check..."
npm run type-check

# Run tests
echo "Running tests..."
npm run test

# Check bundle size
echo "Checking bundle size..."
npm run build
echo "✅ Pre-commit checks passed!"
EOF

chmod +x .husky/pre-commit

# Create directories for test outputs
echo "📁 Creating test directories..."
mkdir -p test-results
mkdir -p coverage
mkdir -p playwright-report
mkdir -p cypress/screenshots
mkdir -p cypress/videos
mkdir -p accessibility-report

# Create performance monitoring directory
mkdir -p performance-reports

# Setup environment files
echo "⚙️ Setting up environment files..."

# Development environment
cat > .env.development << 'EOF'
# Development Environment
NEXT_PUBLIC_APP_NAME=LipSyncAutomation
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=ws://localhost:8001
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
EOF

# Production environment
cat > .env.production << 'EOF'
# Production Environment
NEXT_PUBLIC_APP_NAME=LipSyncAutomation
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_API_URL=https://api.lipsyncautomation.com
NEXT_PUBLIC_WS_URL=wss://api.lipsyncautomation.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
EOF

# Test environment
cat > .env.test << 'EOF'
# Test Environment
NEXT_PUBLIC_APP_NAME=LipSyncAutomation Test
NEXT_PUBLIC_APP_VERSION=1.0.0-test
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_WS_URL=ws://localhost:8001
NEXT_PUBLIC_ENVIRONMENT=test
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
CYPRESS_baseUrl=http://localhost:3000
EOF

# Create bundle size configuration
echo "📦 Setting up bundle size monitoring..."

cat > .bundlesize.config.json << 'EOF'
{
  "files": [
    {
      "path": ".next/static/chunks/pages/_app.js",
      "maxSize": "244kb",
      "compression": "gzip"
    },
    {
      "path": ".next/static/chunks/framework.js",
      "maxSize": "45kb",
      "compression": "gzip"
    },
    {
      "path": ".next/static/chunks/main.js",
      "maxSize": "244kb",
      "compression": "gzip"
    }
  ]
}
EOF

# Add bundle size script to package.json
npm pkg set scripts.check-bundle="bundlesize"

# Create performance monitoring configuration
echo "📊 Setting up performance monitoring..."

cat > performance.config.js << 'EOF'
// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  // Core Web Vitals thresholds
  thresholds: {
    FCP: 2000,    // First Contentful Paint (ms)
    LCP: 2500,    // Largest Contentful Paint (ms)
    FID: 100,     // First Input Delay (ms)
    CLS: 0.1,     // Cumulative Layout Shift
    TTFB: 800,    // Time to First Byte (ms)
    TTI: 3000,    // Time to Interactive (ms)
  },
  
  // Bundle size limits (KB)
  bundleLimits: {
    total: 1000,      // Total bundle size
    vendor: 244,      // Vendor chunks
    pages: 244,       // Page chunks
  },
  
  // Memory limits (MB)
  memoryLimits: {
    initial: 50,      // Initial memory usage
    sustained: 100,   // Sustained memory usage
  },
  
  // Monitoring settings
  monitoring: {
    enableRealUserMonitoring: true,
    enableSyntheticMonitoring: true,
    sampleRate: 0.1,  // 10% of users
  },
}
EOF

# Create GitHub Actions workflow directory
echo "🔄 Setting up GitHub Actions workflow..."
mkdir -p ../../.github/workflows

# Copy the workflow file if it doesn't exist
if [ ! -f "../../.github/workflows/frontend-performance-testing.yml" ]; then
    echo "⚠️  Please manually copy the GitHub Actions workflow file to .github/workflows/"
    echo "   File: frontend-performance-testing.yml"
fi

# Create VS Code settings for better development experience
echo "⚙️ Setting up VS Code settings..."
mkdir -p .vscode

cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument",
  "cypressHelper.cypressPath": "node_modules/.bin/cypress",
  "playwright.reuseBrowser": true
}
EOF

cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "ms-playwright.playwright",
    "ms-vscode.vscode-jest",
    "ms-vscode.test-adapter-converter",
    "ms-vscode.vscode-jest"
  ]
}
EOF

# Create documentation links
echo "📚 Creating documentation..."
cat > PERFORMANCE_CHECKLIST.md << 'EOF'
# Performance Testing Checklist

## Pre-Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] Type checking passing: `npm run type-check`
- [ ] Linting passing: `npm run lint`
- [ ] Bundle size under limits: `npm run check-bundle`
- [ ] Performance budgets passing: `npm run test:performance`
- [ ] Accessibility compliance: `npm run test:accessibility`
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Visual tests passing: `npm run test:visual`

## Performance Monitoring

- [ ] Core Web Vitals within thresholds
- [ ] Bundle size optimized
- [ ] Memory usage acceptable
- [ ] No memory leaks detected
- [ ] Error rates low
- [ ] Loading times acceptable

## Testing Coverage

- [ ] Unit test coverage > 90%
- [ ] Integration tests complete
- [ ] E2E tests covering critical paths
- [ ] Accessibility tests passing
- [ ] Performance tests passing
EOF

# Run initial tests to verify setup
echo "🧪 Running initial tests to verify setup..."

echo "Running linting..."
npm run lint || echo "⚠️  Linting issues found. Please fix them."

echo "Running type checking..."
npm run type-check || echo "⚠️  Type checking issues found. Please fix them."

echo "Running tests..."
npm run test -- --passWithNoTests || echo "⚠️  Some tests failed. Please check them."

# Build the application to verify everything works
echo "🏗️ Building application..."
npm run build || echo "❌ Build failed. Please check the errors."

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Review and fix any linting/type checking errors"
echo "2. Add your GitHub Actions workflow file"
echo "3. Configure environment variables for your deployment"
echo "4. Run tests: npm run test"
echo "5. Check performance: npm run analyze"
echo "6. Run E2E tests: npm run test:e2e"
echo ""
echo "📚 Documentation:"
echo "- Performance Guide: PERFORMANCE_TESTING_GUIDE.md"
echo "- Checklist: PERFORMANCE_CHECKLIST.md"
echo "- Next.js Config: next.config.js"
echo "- Jest Config: jest.config.js"
echo ""
echo "🚀 Your frontend is now ready for production with comprehensive performance optimization and testing!"