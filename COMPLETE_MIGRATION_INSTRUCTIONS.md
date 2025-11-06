# Complete Migration Instructions

## Overview

This document provides comprehensive, step-by-step instructions for migrating the LipSync Automation codebase from its current monolithic structure to the new forked frontend/backend architecture.

## Prerequisites

### Before Starting
1. **Backup Current State**
   ```bash
   git tag v2.0.0-pre-migration
   git push origin v2.0.0-pre-migration
   tar -czf lipsync-backup-$(date +%Y%m%d).tar.gz .
   ```

2. **Ensure Clean Working Directory**
   ```bash
   git status
   git stash push -m "Migration backup stash"
   ```

3. **Verify Current Functionality**
   ```bash
   # Test current setup works
   cd web-ui/frontend && npm test
   cd ../backend && python -m pytest tests/
   docker-compose up -d && curl http://localhost:5000
   docker-compose down
   ```

4. **Prepare Environment**
   ```bash
   # Install required tools
   pip install pre-commit
   npm install -g @lhci/cli
   docker --version
   docker-compose --version
   ```

## Migration Steps

### Phase 1: Create New Directory Structure

#### Step 1.1: Create Forked Directories
```bash
# Create main forked directories
mkdir -p frontend backend shared deployment

# Create shared subdirectories
mkdir -p shared/{docs,scripts,tools,configs,templates,examples}
mkdir -p shared/docs/{development,deployment,user,api}
mkdir -p shared/docs/development/{blueprints,api,guides,style-guides}
mkdir -p shared/scripts/{setup,development,migration,maintenance,data,tools}
mkdir -p shared/configs/{development,ci-cd,quality}

# Create backend subdirectories
mkdir -p backend/{src,config,assets,profiles,cache,logs,output,tests}
mkdir -p backend/src/lipsync_automation
mkdir -p backend/src/lipsync_automation/{api,core,cinematography,utils,config}
mkdir -p backend/src/lipsync_automation/api/{endpoints,models,middleware}

# Create frontend subdirectories
mkdir -p frontend/{src,public,tests,cypress}
mkdir -p frontend/src/{components,contexts,hooks,services,stores,styles,types,utils,pages}

# Create deployment subdirectories
mkdir -p deployment/{docker,kubernetes,ci-cd}
mkdir -p deployment/docker/nginx
```

#### Step 1.2: Verify Structure
```bash
tree -L 3 -d
```

### Phase 2: Backend Migration

#### Step 2.1: Move Python Package
```bash
# Move main Python package
mv lipsync_automation/* backend/src/lipsync_automation/

# Move backend-specific configuration and assets
mv config/ backend/
mv assets/ backend/
mv profiles/ backend/
mv cache/ backend/
mv logs/ backend/
mv output/ backend/

# Preserve any empty directories
find backend/ -type d -empty -exec touch {}/.gitkeep \;
```

#### Step 2.2: Reorganize FastAPI Application
```bash
# Move FastAPI components to new structure
mv web-ui/backend/main.py backend/src/lipsync_automation/api/
mv web-ui/backend/start_backend.py backend/src/lipsync_automation/api/
mv web-ui/backend/demo_websocket_events.py backend/src/lipsync_automation/api/

# Move backend documentation
mv web-ui/backend/WEBSOCKET_ENHANCEMENTS.md shared/docs/development/api/
```

#### Step 2.3: Restructure Large main.py File
```bash
# Create the new main.py entry point
cat > backend/src/lipsync_automation/api/main.py << 'EOF'
"""
Main FastAPI application entry point for LipSyncAutomation
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .endpoints import profiles, cinematography, emotions, system
from .middleware.websocket import setup_websocket
from ..config.settings import get_settings

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    print("LipSyncAutomation API starting up...")
    yield
    # Shutdown
    print("LipSyncAutomation API shutting down...")

def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    app = FastAPI(
        title="LipSyncAutomation API",
        description="API for LipSyncAutomation v2.0 system",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Setup WebSocket
    setup_websocket(app)
    
    # Include routers
    app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])
    app.include_router(cinematography.router, prefix="/api/cinematography", tags=["cinematography"])
    app.include_router(emotions.router, prefix="/api/emotions", tags=["emotions"])
    app.include_router(system.router, prefix="/api/system", tags=["system"])
    
    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8500)
EOF
```

#### Step 2.4: Split Original main.py into Modules
```bash
# Create endpoints directory structure
mkdir -p backend/src/lipsync_automation/api/endpoints

# Extract profiles endpoints
cat > backend/src/lipsync_automation/api/endpoints/profiles.py << 'EOF'
"""
Profile management endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import json
from pathlib import Path

from ...core.profile_manager import ProfileManager
from ..models.responses import StandardAPIResponse
from ..models.common import create_success_response, create_error_response

router = APIRouter()

@router.get("/profiles")
async def list_profiles():
    """List all available character profiles"""
    try:
        # Implementation will be moved from original main.py
        return {"message": "Profiles endpoint - to be implemented"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profiles")
async def create_profile(profile_data: Dict[str, Any]):
    """Create a new character profile"""
    try:
        # Implementation will be moved from original main.py
        return {"message": "Create profile endpoint - to be implemented"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
EOF

# Create other endpoint files (cinematography.py, emotions.py, system.py)
# Similar structure for each...

# Create models directory and files
mkdir -p backend/src/lipsync_automation/api/models

cat > backend/src/lipsync_automation/api/models/responses.py << 'EOF'
"""
API response models
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class ErrorDetail(BaseModel):
    """Detailed error information for API responses"""
    code: str = Field(..., description="Error code for programmatic handling")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

class ResponseMetadata(BaseModel):
    """Metadata for API responses"""
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    request_id: str = Field(..., description="Unique request identifier")
    version: str = Field(default="1.0.0", description="API version")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")

class StandardAPIResponse(BaseModel):
    """Standardized API response model"""
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[Any] = Field(None, description="Response data")
    error: Optional[ErrorDetail] = Field(None, description="Error information if failed")
    metadata: ResponseMetadata = Field(..., description="Response metadata")
EOF
```

#### Step 2.5: Update Backend Configuration
```bash
# Create settings management
cat > backend/src/lipsync_automation/config/settings.py << 'EOF'
"""
Application settings management
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseSettings

def get_project_root() -> Path:
    """Get the project root directory"""
    return Path(__file__).parent.parent.parent.parent

def get_config_path() -> Path:
    """Get the configuration file path"""
    return get_project_root() / "config" / "settings.json"

class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8500
    environment: str = "development"
    log_level: str = "INFO"
    
    # Paths
    project_root: Path = get_project_root()
    config_path: Path = get_config_path()
    profiles_directory: str = "profiles"
    cache_directory: str = "cache"
    output_directory: str = "output"
    uploads_directory: str = "uploads"
    
    # External Dependencies
    rhubarb_path: str = "/usr/local/bin/rhubarb"
    ffmpeg_path: str = "/usr/bin/ffmpeg"
    
    # Security
    secret_key: str = "dev-secret-key-change-in-production"
    jwt_secret: str = "dev-jwt-secret-change-in-production"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()

def get_settings() -> Settings:
    """Get application settings"""
    return settings
EOF
```

#### Step 2.6: Update pyproject.toml
```bash
cat > backend/pyproject.toml << 'EOF'
[build-system]
requires = ["setuptools>=45", "wheel", "setuptools_scm[toml]>=6.2"]
build-backend = "setuptools.build_meta"

[project]
name = "lipsync-automation-backend"
version = "2.0.0"
description = "Backend API for LipSync Automation system"
authors = [{name = "Ishan Lagesh", email = "ishan@example.com"}]
license = {text = "MIT"}
requires-python = ">=3.8"
dependencies = [
    "fastapi",
    "uvicorn[standard]",
    "websockets",
    "pydantic",
    "psutil",
    "python-multipart",
    "python-dotenv",
    "pillow",
    "numpy",
    "moviepy",
    "librosa",
    "soundfile",
]

[project.optional-dependencies]
dev = [
    "pytest>=6.0",
    "pytest-cov",
    "black",
    "flake8",
    "mypy",
    "isort",
    "pre-commit",
]

[project.scripts]
lipsync-api = "lipsync_automation.api.main:main"

[tool.setuptools.packages.find]
where = ["src"]
include = ["lipsync_automation*"]

[tool.setuptools.package-data]
lipsync_automation = ["config/*.json", "assets/**/*", "profiles/**/*"]

[tool.black]
line-length = 88
target-version = ['py311']

[tool.isort]
profile = "black"
multi_line_output = 3

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
EOF
```

#### Step 2.7: Update Backend Dockerfile
```bash
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .[dev]

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create necessary directories
RUN mkdir -p profiles cache output uploads logs

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8500/api/health || exit 1

# Expose port
EXPOSE 8500

# Run the application
CMD ["python", "-m", "lipsync_automation.api.main"]
EOF
```

### Phase 3: Frontend Migration

#### Step 3.1: Move Frontend Files
```bash
# Move all frontend contents to new location
mv web-ui/frontend/* frontend/
mv web-ui/frontend/.* frontend/

# Remove empty web-ui directories
rmdir web-ui/frontend web-ui
```

#### Step 3.2: Update Frontend Configuration
```bash
# Update package.json with new API URLs
sed -i 's|http://backend:8500|http://localhost:8500|g' frontend/.env.local

# Update Next.js configuration for new structure
cat > frontend/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Enable experimental features if needed
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8500',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8500',
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
EOF
```

#### Step 3.3: Update Frontend Dockerfile
```bash
cat > frontend/Dockerfile << 'EOF'
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

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
EOF
```

### Phase 4: Shared Resources Migration

#### Step 4.1: Migrate Documentation
```bash
# Move and organize documentation
mv docs/* shared/docs/development/

# Organize into subdirectories
mv shared/docs/development/Blueprint_*.md shared/docs/development/blueprints/
mv shared/docs/development/api_standardization.md shared/docs/development/api/
mv shared/docs/development/*_SUMMARY.md shared/docs/development/guides/
mv shared/docs/development/*_GUIDE.md shared/docs/development/guides/

# Create documentation index
cat > shared/docs/README.md << 'EOF'
# LipSync Automation Documentation

## Development Documentation
- [Blueprints](development/blueprints/) - Architecture and design documents
- [API Documentation](development/api/) - API standards and specifications
- [Development Guides](development/guides/) - Setup and development workflows
- [Style Guides](development/style-guides/) - Code style and standards

## Deployment Documentation
- [Docker Deployment](deployment/docker/) - Container-based deployment
- [Kubernetes Deployment](deployment/kubernetes/) - K8s deployment guides

## User Documentation
- [Getting Started](user/getting-started.md) - User setup guide
- [User Guide](user/README.md) - Comprehensive user manual
- [Troubleshooting](user/troubleshooting.md) - Common issues and solutions

## API Reference
- [API Overview](api/README.md) - API introduction
- [OpenAPI Specification](api/openapi.yaml) - Complete API specification
EOF
```

#### Step 4.2: Migrate Scripts
```bash
# Categorize and move scripts
mkdir -p shared/scripts/{setup,development,migration,maintenance,data,tools}

# Setup scripts
mv scripts/setup_dependencies.sh shared/scripts/setup/
mv scripts/start_web_ui_complex.sh shared/scripts/setup/

# Development scripts
mv scripts/run_tests.sh shared/scripts/development/
mv scripts/test_api_responses.py shared/scripts/development/
mv scripts/test_standardized_responses.py shared/scripts/development/
mv scripts/validate_implementation.py shared/scripts/development/

# Migration scripts
mv scripts/migrate_api_responses.py shared/scripts/migration/

# Maintenance scripts
mv scripts/cleanup.sh shared/scripts/maintenance/

# Data management scripts
mv scripts/create_animation_structure.py shared/scripts/data/
mv scripts/create_background_placeholders.py shared/scripts/data/
mv scripts/create_placeholders.py shared/scripts/data/
mv scripts/create_proper_preset_structure.py shared/scripts/data/
mv scripts/create_side_placeholders.py shared/scripts/data/
mv scripts/recreate_presets_structure.py shared/scripts/data/
mv scripts/debug_preset.py shared/scripts/data/

# Tool wrappers
mv scripts/rhubarb_wrapper.sh shared/scripts/tools/
mv scripts/mock_rhubarb.py shared/scripts/tools/
mv scripts/demonstrate_enhanced_manager.py shared/scripts/tools/

# Update script paths
sed -i 's|../../config|../config|g' shared/scripts/setup/setup_dependencies.sh
```

#### Step 4.3: Migrate Tools
```bash
# Move tools directory
mv tools/ shared/

# Create tools documentation
cat > shared/tools/README.md << 'EOF'
# External Tools

This directory contains external tools used by the LipSync Automation system.

## Rhubarb Lip Sync Tool
Location: `rhubarb/`

Rhubarb is a command-line tool that creates lip sync data from audio files.

### Usage
```bash
# Shared script wrapper
./shared/scripts/tools/rhubarb_wrapper.sh input.wav output.json

# Direct tool usage
./shared/tools/rhubarb/bin/rhubarb.exe input.wav -o output.json
```
EOF
```

#### Step 4.4: Migrate Configuration Files
```bash
# Create shared config structure
mkdir -p shared/configs/{development,ci-cd,quality}

# Move development configurations
mv .flake8 shared/configs/development/
mv .isort.cfg shared/configs/development/
mv mypy.ini shared/configs/development/
mv .pre-commit-config.yaml shared/configs/development/

# Move CI/CD configurations
mv .github/ shared/configs/ci-cd/

# Create symlinks for backward compatibility
ln -s shared/configs/development/.flake8 .flake8
ln -s shared/configs/development/.isort.cfg .isort.cfg
ln -s shared/configs/development/mypy.ini mypy.ini
ln -s shared/configs/development/.pre-commit-config.yaml .pre-commit-config.yaml
ln -s shared/configs/ci-cd/.github .github
```

### Phase 5: Deployment Configuration

#### Step 5.1: Create New Docker Compose
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: lipsync_backend
    ports:
      - "8500:8500"
    volumes:
      - ./backend:/app
      - profiles_data:/app/profiles
      - cache_data:/app/cache
      - output_data:/app/output
      - uploads_data:/app/uploads
    environment:
      - PYTHONPATH=/app/src
      - PYTHONUNBUFFERED=1
      - ENVIRONMENT=development
    networks:
      - lipsync_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8500/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lipsync_frontend
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8500
      - NEXT_PUBLIC_WS_URL=ws://localhost:8500
    networks:
      - lipsync_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  lipsync_network:
    driver: bridge

volumes:
  profiles_data:
  cache_data:
  output_data:
  uploads_data:
EOF
```

#### Step 5.2: Create CI/CD Workflows
```bash
# Create backend CI workflow
cat > .github/workflows/backend-ci.yml << 'EOF'
name: Backend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
      - 'shared/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'backend/**'
      - 'shared/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          cd backend
          pip install -e .[dev]
          
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v
          
      - name: Lint
        run: |
          cd backend
          flake8 src/
          black --check src/
          mypy src/
EOF

# Create frontend CI workflow
cat > .github/workflows/frontend-ci.yml << 'EOF'
name: Frontend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/**'
      - 'shared/**'
  pull_request:
    branches: [ main ]
    paths:
      - 'frontend/**'
      - 'shared/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm run test
          
      - name: Lint
        run: |
          cd frontend
          npm run lint
          npm run type-check
EOF
```

### Phase 6: Testing and Validation

#### Step 6.1: Test Backend Independently
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -e .[dev]

# Run tests
pytest tests/ -v

# Start backend server
python -m lipsync_automation.api.main &

# Test API endpoints
curl http://localhost:8500/api/health
curl http://localhost:8500/api/profiles

# Stop server
pkill -f "lipsync_automation.api.main"
```

#### Step 6.2: Test Frontend Independently
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Build application
npm run build

# Start development server
npm run dev &

# Test frontend
curl http://localhost:3000

# Stop server
pkill -f "next dev"
```

#### Step 6.3: Test Integration with Docker
```bash
# Return to project root
cd ..

# Build and start containers
docker-compose up -d

# Wait for services to be ready
sleep 30

# Test backend through Docker
curl http://localhost:8500/api/health

# Test frontend through Docker
curl http://localhost:3000

# Test integration
curl -X POST http://localhost:8500/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"profile_name": "test_profile", "supported_angles": ["front"], "supported_emotions": ["neutral"]}'

# Check logs
docker-compose logs backend
docker-compose logs frontend

# Stop containers
docker-compose down
```

### Phase 7: Cleanup and Finalization

#### Step 7.1: Remove Old Directories
```bash
# Remove empty old directories
find . -type d -empty -delete

# Remove old test files if they exist in wrong locations
rm -f tests/test_*.py

# Clean up any remaining web-ui references
find . -name "*.py" -exec grep -l "web-ui" {} \;
# Manually update any remaining references
```

#### Step 7.2: Update Root Configuration
```bash
# Update root README
cat > README.md << 'EOF'
# LipSync Automation

A psycho-cinematic automation system for lip-sync video generation.

## Quick Start

### Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8500
# API Documentation: http://localhost:8500/docs
```

### Manual Development Setup

#### Backend
```bash
cd backend
pip install -e .[dev]
python -m lipsync_automation.api.main
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
LipSyncAutomation/
├── frontend/          # React frontend application
├── backend/           # Python backend API
├── shared/            # Shared resources (docs, scripts, tools)
├── deployment/        # Deployment configurations
└── docker-compose.yml # Development orchestration
```

## Documentation

- [Development Documentation](shared/docs/README.md)
- [API Documentation](shared/docs/api/README.md)
- [Deployment Guide](deployment/README.md)

## Contributing

Please see [shared/docs/development/CONTRIBUTING.md](shared/docs/development/CONTRIBUTING.md) for contribution guidelines.
EOF

# Create environment template
cat > .env.example << 'EOF'
# Backend Configuration
PYTHONPATH=/app/src
ENVIRONMENT=development
LOG_LEVEL=INFO
API_HOST=0.0.0.0
API_PORT=8500

# External Services
RHUBARB_PATH=/usr/local/bin/rhubarb
FFMPEG_PATH=/usr/bin/ffmpeg

# Frontend Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8500
NEXT_PUBLIC_WS_URL=ws://localhost:8500
NEXT_PUBLIC_APP_NAME=LipSync Automation
NEXT_PUBLIC_APP_VERSION=2.0.0
EOF
```

#### Step 6.4: Create Development Scripts
```bash
# Create development setup script
cat > shared/scripts/setup/setup_dev_env.sh << 'EOF'
#!/bin/bash

# Development environment setup script
set -e

echo "Setting up LipSync Automation development environment..."

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Setup backend
echo "Setting up backend..."
cd backend
if [ -f "pyproject.toml" ]; then
    pip install -e .[dev]
fi

# Setup frontend
echo "Setting up frontend..."
cd ../frontend
if [ -f "package.json" ]; then
    npm install
fi

# Setup pre-commit hooks
echo "Setting up pre-commit hooks..."
cd ..
if [ -f ".pre-commit-config.yaml" ]; then
    pre-commit install
fi

echo "Development environment setup complete!"
echo ""
echo "To start development:"
echo "  Backend: cd backend && python -m lipsync_automation.api.main"
echo "  Frontend: cd frontend && npm run dev"
echo "  Docker: docker-compose up -d"
EOF

chmod +x shared/scripts/setup/setup_dev_env.sh

# Create comprehensive test runner
cat > shared/scripts/development/run_all_tests.sh << 'EOF'
#!/bin/bash

# Comprehensive test runner
set -e

echo "Running all tests..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Backend tests
echo "Running backend tests..."
cd backend
if command -v pytest &> /dev/null; then
    pytest tests/ -v
else
    echo "Backend tests not available"
fi

# Frontend tests
echo "Running frontend tests..."
cd ../frontend
if [ -f "package.json" ]; then
    npm test
else
    echo "Frontend tests not available"
fi

# Integration tests
echo "Running integration tests..."
cd ..
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.test.yml up --abort-on-container-exit
else
    echo "Docker not available for integration tests"
fi

echo "All tests completed!"
EOF

chmod +x shared/scripts/development/run_all_tests.sh
```

## Post-Migration Validation Checklist

### Functionality Tests
- [ ] Backend starts independently
- [ ] Frontend starts independently
- [ ] Docker containers build and run
- [ ] API endpoints respond correctly
- [ ] Frontend can connect to backend
- [ ] WebSocket connections work
- [ ] File uploads work
- [ ] Profile management functions

### Code Quality Tests
- [ ] All tests pass
- [ ] Code linting passes
- [ ] Type checking passes
- [ ] No security vulnerabilities
- [ ] Documentation is accessible

### Development Workflow Tests
- [ ] New developer can onboard
- [ ] Development environment setup works
- [ ] Hot reloading works
- [ ] Git hooks function
- [ ] CI/CD pipelines run

### Deployment Tests
- [ ] Production Docker images build
- [ ] Production configuration works
- [ ] Environment variables work
- [ ] Health checks pass
- [ ] Monitoring and logging work

## Rollback Procedures

If critical issues arise during migration:

### Quick Rollback
```bash
# Restore from git tag
git checkout v2.0.0-pre-migration
git checkout -b rollback-branch
```

### Partial Rollback
```bash
# Restore specific components
git checkout v2.0.0-pre-migration -- lipsync_automation/
git checkout v2.0.0-pre-migration -- web-ui/
```

### Data Recovery
```bash
# Extract backup if needed
tar -xzf lipsync-backup-YYYYMMDD.tar.gz
```

## Success Criteria

Migration is considered successful when:

1. ✅ All tests pass in new structure
2. ✅ Development environment works with `docker-compose up`
3. ✅ Both frontend and backend can be developed independently
4. ✅ CI/CD pipelines function correctly
5. ✅ Documentation is updated and accessible
6. ✅ Team can onboard and work with new structure
7. ✅ Performance is maintained or improved
8. ✅ No functionality regression

## Next Steps After Migration

1. **Team Training**: Conduct training session on new structure
2. **Documentation**: Complete any missing documentation
3. **Monitoring**: Set up monitoring and alerting
4. **Optimization**: Optimize build times and deployment
5. **Feedback**: Collect team feedback and iterate

This comprehensive migration guide ensures a smooth transition to the forked frontend/backend architecture while maintaining functionality and improving developer experience.