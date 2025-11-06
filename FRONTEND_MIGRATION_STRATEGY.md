# Frontend Migration Strategy

## Overview

This document details the migration strategy for the React frontend components from the current `web-ui/frontend/` directory to the new forked `frontend/` directory.

## Current Frontend Structure

### Main Application (`web-ui/frontend/`)
```
web-ui/frontend/
├── package.json                    # Dependencies and scripts
├── next.config.js                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── .env.local                      # Environment variables
├── .babelrc                        # Babel configuration
├── .eslintrc.json                  # ESLint configuration
├── jest.config.js                  # Jest testing configuration
├── cypress.config.js               # Cypress E2E testing
├── playwright.config.ts            # Playwright testing
├── postcss.config.js               # PostCSS configuration
├── lighthouserc.json               # Lighthouse CI configuration
├── eslint.config.js                # ESLint configuration
├── jest.mocks.js                   # Jest mocks
├── jest.setup.js                   # Jest setup
├── setup-performance-testing.sh    # Performance testing setup
├── COMPONENT_LIBRARY_SUMMARY.md    # Component documentation
├── PERFORMANCE_TESTING_GUIDE.md    # Performance testing guide
├── QA_IMPLEMENTATION_SUMMARY.md    # QA implementation summary
├── tsconfig.tsbuildinfo            # TypeScript build info
├── package-lock.json               # Dependency lock file
│
├── public/                         # Static assets
│   ├── manifest.json
│   ├── sw.js
│   └── ...
│
├── src/                            # Source code
│   ├── components/                 # React components
│   │   ├── processing/             # Processing-related components
│   │   │   ├── BatchQueueManager.tsx
│   │   │   ├── EmotionAnalysisViewer.tsx
│   │   │   ├── InteractiveTimeline.tsx
│   │   │   ├── ProcessingStagesIndicator.tsx
│   │   │   ├── ShotDecisionPreview.tsx
│   │   │   └── index.ts
│   │   ├── visualization/          # Visualization components
│   │   │   ├── EmotionHeatmap.tsx
│   │   │   └── index.ts
│   │   ├── Dashboard.tsx           # Main dashboard
│   │   ├── LazyComponents.tsx      # Lazy loading
│   │   ├── Navigation.tsx          # Navigation component
│   │   ├── PerformanceDashboard.tsx # Performance monitoring
│   │   ├── WebSocketStatus.tsx     # WebSocket status
│   │   └── index.ts                # Component exports
│   │
│   ├── contexts/                   # React contexts
│   │   ├── ThemeContext.tsx        # Theme management
│   │   └── WebSocketContext.tsx    # WebSocket management
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── usePerformanceMonitoring.ts
│   │   └── useWebSocket.ts
│   │
│   ├── services/                   # API and business logic
│   │   ├── ConnectionHealth.ts     # Connection monitoring
│   │   ├── EventBuffer.ts          # Event buffering
│   │   ├── WebSocketManager.ts     # WebSocket management
│   │   ├── api.ts                  # API client
│   │   ├── index.ts                # Service exports
│   │   └── README.md               # Service documentation
│   │
│   ├── stores/                     # State management (Zustand)
│   │   ├── __tests__/              # Store tests
│   │   ├── MIGRATION_GUIDE.md      # Migration guide
│   │   ├── README.md               # Store documentation
│   │   ├── appStore.ts             # Application state
│   │   ├── cinematographyStore.ts  # Cinematography state
│   │   ├── index.ts                # Store exports
│   │   ├── processingStore.ts      # Processing state
│   │   ├── profilesStore.ts        # Profile management state
│   │   ├── systemStore.ts          # System state
│   │   └── uiStore.ts              # UI state
│   │
│   ├── styles/                     # Styling
│   │   ├── global.css.backup       # Backup of global styles
│   │   ├── theme.ts                # Theme configuration
│   │   └── tokens.css              # Design tokens
│   │
│   ├── types/                      # TypeScript definitions
│   │   └── index.ts                # Type exports
│   │
│   ├── utils/                      # Utility functions
│   │   ├── api.ts                  # API utilities
│   │   └── cn.ts                   # Class name utility
│   │
│   └── pages/                      # Next.js pages
│       ├── _app.tsx                # App component
│       ├── _document.tsx           # Document component
│       ├── _error.tsx              # Error page
│       ├── index.tsx               # Home page
│       └── api/                    # API routes
│
├── tests/                          # Test files
│   ├── accessibility/              # Accessibility tests
│   ├── deployment/                 # Deployment tests
│   ├── integration/                # Integration tests
│   ├── performance/                # Performance tests
│   ├── security/                   # Security tests
│   ├── unit/                       # Unit tests
│   ├── visual/                     # Visual regression tests
│   ├── global-setup.ts             # Test setup
│   └── global-teardown.ts          # Test teardown
│
└── cypress/                        # Cypress E2E testing
    ├── e2e/                        # E2E test specs
    ├── support/                    # Support files
    └── ...
```

## Migration Plan

### Phase 1: Directory Structure Migration

#### 1.1 Create New Frontend Directory
```bash
# Create the new frontend directory
mkdir -p frontend

# Move all frontend contents
mv web-ui/frontend/* frontend/
mv web-ui/frontend/.* frontend/  # Include hidden files
```

#### 1.2 Verify Structure
```bash
# Verify the new structure
tree frontend/ -L 2
```

### Phase 2: Configuration Updates

#### 2.1 Update Package.json
Current package.json references may need updates:

```json
{
  "name": "lipsyncautomation-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:performance": "lhci autorun",
    "test:accessibility": "axe src",
    "test:visual": "playwright test",
    "analyze": "ANALYZE=true next build",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    // ... existing dependencies
  },
  "devDependencies": {
    // ... existing dev dependencies
  }
}
```

#### 2.2 Update Next.js Configuration
```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Enable experimental features if needed
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8500',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8500'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

#### 2.3 Update Environment Variables
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8500
NEXT_PUBLIC_WS_URL=ws://localhost:8500
NEXT_PUBLIC_APP_NAME=LipSync Automation
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### Phase 3: API Client Updates

#### 3.1 Update API Base URL
```typescript
// frontend/src/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8500';

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },
  
  post: async <T>(endpoint: string, data: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  },
};
```

#### 3.2 Update WebSocket Connection
```typescript
// frontend/src/services/WebSocketManager.ts
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  
  constructor() {
    this.wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8500';
  }
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          resolve();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        // ... other event handlers
      } catch (error) {
        reject(error);
      }
    });
  }
}
```

### Phase 4: Docker Configuration

#### 4.1 New Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 4.2 Development Dockerfile
```dockerfile
# frontend/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

### Phase 5: Testing Configuration Updates

#### 5.1 Update Jest Configuration
```javascript
// frontend/jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

#### 5.2 Update Cypress Configuration
```javascript
// frontend/cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
```

### Phase 6: Development Workflow Updates

#### 6.1 Update Development Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:debug": "NODE_OPTIONS='--inspect' next dev",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:performance": "lhci autorun",
    "test:accessibility": "axe src",
    "test:visual": "playwright test",
    "prepare": "husky install",
    "pre-commit": "lint-staged"
  }
}
```

#### 6.2 Update Husky Configuration
```json
// frontend/package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test && npm run type-check"
    }
  },
  "lint-staged": {
    "src/**/*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{css,scss}": [
      "prettier --write"
    ]
  }
}
```

### Phase 7: Documentation Updates

#### 7.1 Frontend-Specific README
```markdown
# frontend/README.md

## LipSync Automation Frontend

A modern React application built with Next.js, TypeScript, and Tailwind CSS for the LipSync Automation system.

### Features

- 🎭 Real-time emotion analysis visualization
- 🎬 Cinematographic decision preview
- 📊 Performance monitoring dashboard
- 🔄 WebSocket real-time updates
- 🎨 Modern UI with Tailwind CSS
- 🧪 Comprehensive testing setup

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

### Technology Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Testing**: Jest, Cypress, Playwright
- **Code Quality**: ESLint, Prettier, Husky

### Project Structure

```
src/
├── components/          # React components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── services/           # API and business logic
├── stores/             # State management
├── styles/             # Styling
├── types/              # TypeScript definitions
├── utils/              # Utility functions
└── pages/              # Next.js pages
```

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8500
NEXT_PUBLIC_WS_URL=ws://localhost:8500
```

### Testing

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Cypress
- **Visual Tests**: Playwright
- **Performance**: Lighthouse CI
- **Accessibility**: axe-core

### Deployment

The frontend is built as a standalone application and can be deployed to any static hosting service or served with Node.js.
```

## Migration Checklist

### Pre-Migration
- [ ] Create backup of current frontend
- [ ] Document current API contracts
- [ ] Verify all tests pass in current setup
- [ ] Tag repository with `v2.0.0-pre-frontend-migration`

### Migration Execution
- [ ] Create new frontend directory
- [ ] Move all frontend files
- [ ] Update package.json
- [ ] Update configuration files
- [ ] Update API client URLs
- [ ] Update WebSocket connections
- [ ] Create new Dockerfiles
- [ ] Update test configurations
- [ ] Update development scripts

### Post-Migration Validation
- [ ] All tests pass
- [ ] Development server starts
- [ ] Build process works
- [ ] Can connect to backend API
- [ ] WebSocket connections work
- [ ] E2E tests pass
- [ ] Docker containers build and run

### Integration Testing
- [ ] Test full frontend-backend integration
- [ ] Verify WebSocket real-time updates
- [ ] Test file upload functionality
- [ ] Verify all API endpoints work
- [ ] Test error handling

### Documentation Updates
- [ ] Update frontend README
- [ ] Update development setup instructions
- [ ] Update deployment documentation
- [ ] Update API documentation

## Risk Mitigation

### 1. API Connection Issues
- **Risk**: Frontend cannot connect to backend after migration
- **Mitigation**: Environment variable configuration, connection testing

### 2. Build Process Failures
- **Risk**: Build process breaks due to path changes
- **Mitigation**: Comprehensive testing, CI/CD pipeline validation

### 3. WebSocket Connection Issues
- **Risk**: Real-time features stop working
- **Mitigation**: Updated WebSocket URL configuration, connection testing

### 4. Test Configuration Issues
- **Risk**: Test suite fails after migration
- **Mitigation**: Updated test configurations, path mappings

## Rollback Plan

If critical issues arise:
1. Revert to tagged pre-migration state
2. Identify and fix issues
3. Re-attempt migration
4. Update documentation with lessons learned

## Post-Migration Benefits

1. **Simplified Structure**: Clear frontend-only directory
2. **Independent Development**: Frontend team can work independently
3. **Better CI/CD**: Separate pipelines for frontend
4. **Easier Deployment**: Independent deployment options
5. **Clearer Ownership**: Unambiguous frontend responsibility

This migration strategy ensures a smooth transition of the React frontend to the new forked structure while maintaining all functionality and improving the development experience.