# Backend Migration Strategy

## Overview

This document details the migration strategy for the Python backend components from the current monolithic structure to the new forked `backend/` directory.

## Current Backend Components

### Core Python Package (`lipsync_automation/`)
```
lipsync_automation/
├── __init__.py
├── main.py
├── cli.py
├── batch_processor.py
├── core/
│   ├── __init__.py
│   ├── content_orchestrator.py
│   ├── emotion_analyzer.py
│   ├── lip_sync_generator.py
│   ├── preset_manager.py
│   ├── profile_manager.py
│   ├── video_compositor.py
│   └── video_compositor_v2.py
├── cinematography/
│   ├── __init__.py
│   ├── decision_engine.py
│   ├── grammar_machine.py
│   ├── override_manager.py
│   ├── psycho_mapper.py
│   ├── shot_purpose_selector.py
│   ├── tension_engine.py
│   └── transform_processor.py
├── utils/
│   ├── __init__.py
│   ├── animation_structure_manager.py
│   ├── audio_processor.py
│   ├── cache_manager.py
│   └── validators.py
├── config/
│   ├── __init__.py
│   ├── logging_config.py
│   ├── settings.json
│   ├── shot_purpose_profiles.json
│   ├── transform_presets.json
│   └── cinematography_rules.json
├── presets/
│   └── __init__.py
└── profiles/
    └── __init__.py
```

### FastAPI Web Server (`web-ui/backend/`)
```
web-ui/backend/
├── main.py                    # 2000+ lines FastAPI application
├── start_backend.py
├── demo_websocket_events.py
└── WEBSOCKET_ENHANCEMENTS.md
```

### Configuration & Assets
```
config/
├── settings.json
├── cinematography_rules.json
├── logging_config.json
├── shot_purpose_profiles.json
└── transform_presets.json

assets/
├── audio/
├── presets/
└── demo_structure_export.json

profiles/
├── character_1/
└── profile_manifest.json

cache/
logs/
output/
```

## Migration Plan

### Phase 1: Package Structure Reorganization

#### 1.1 Create New Backend Directory Structure
```bash
mkdir -p backend/src/lipsync_automation
mkdir -p backend/src/lipsync_automation/api/{endpoints,models,middleware}
mkdir -p backend/{config,assets,profiles,cache,logs,output,tests}
```

#### 1.2 Move Core Package
```bash
# Move the main package
mv lipsync_automation/ backend/src/

# Move configuration files
mv config/ backend/

# Move assets and profiles
mv assets/ backend/
mv profiles/ backend/
mv cache/ backend/
mv logs/ backend/
mv output/ backend/
```

#### 1.3 Reorganize FastAPI Application
```bash
# Move FastAPI components to new structure
mv web-ui/backend/main.py backend/src/lipsync_automation/api/
mv web-ui/backend/start_backend.py backend/src/lipsync_automation/api/
mv web-ui/backend/demo_websocket_events.py backend/src/lipsync_automation/api/
mv web-ui/backend/WEBSOCKET_ENHANCEMENTS.md backend/docs/
```

### Phase 2: API Module Restructuring

#### 2.1 Break Down Large main.py
The current `main.py` (2000+ lines) needs to be split into focused modules:

```python
# backend/src/lipsync_automation/api/main.py (new entry point)
from fastapi import FastAPI
from .endpoints import profiles, cinematography, emotions, system
from .middleware.cors import add_cors_middleware
from .middleware.websocket import setup_websocket

def create_app() -> FastAPI:
    app = FastAPI(title="LipSyncAutomation API")
    add_cors_middleware(app)
    setup_websocket(app)
    
    # Include routers
    app.include_router(profiles.router, prefix="/api/profiles")
    app.include_router(cinematography.router, prefix="/api/cinematography")
    app.include_router(emotions.router, prefix="/api/emotions")
    app.include_router(system.router, prefix="/api/system")
    
    return app

app = create_app()
```

#### 2.2 Endpoint Modules
```python
# backend/src/lipsync_automation/api/endpoints/profiles.py
from fastapi import APIRouter
from ..models.responses import StandardAPIResponse
from ...core.profile_manager import ProfileManager

router = APIRouter()

@router.get("/profiles")
async def list_profiles():
    # Implementation from original main.py
    pass

@router.post("/profiles")
async def create_profile(profile_data: dict):
    # Implementation from original main.py
    pass
```

#### 2.3 Pydantic Models
```python
# backend/src/lipsync_automation/api/models/responses.py
from pydantic import BaseModel
from typing import Optional, Dict, Any

class StandardAPIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any]
```

### Phase 3: Import Path Updates

#### 3.1 Update Python Imports
Current imports like:
```python
from lipsync_automation.core.content_orchestrator import ContentOrchestrator
from lipsync_automation.cinematography import CinematographicDecisionEngine
```

Will need to be updated to work with the new structure. Since the package structure remains the same internally, most imports should work, but we need to update the module path in pyproject.toml.

#### 3.2 Update pyproject.toml
```toml
[tool.setuptools.packages.find]
where = ["src"]
include = ["lipsync_automation*"]

[tool.setuptools.package-data]
lipsync_automation = ["config/*.json", "assets/**/*", "profiles/**/*"]
```

#### 3.3 Update Entry Points
```toml
[project.scripts]
lipsync = "lipsync_automation.cli:main"
lipsync-api = "lipsync_automation.api.main:main"
```

### Phase 4: Configuration Management

#### 4.1 Update Configuration Paths
The main.py currently uses:
```python
project_root = Path(__file__).parent.parent.parent
config_path = project_root / "config" / "settings.json"
```

This needs to be updated to:
```python
# backend/src/lipsync_automation/config/settings.py
import os
from pathlib import Path

def get_project_root() -> Path:
    # Get backend root directory
    return Path(__file__).parent.parent.parent

def get_config_path() -> Path:
    return get_project_root() / "config" / "settings.json"
```

#### 4.2 Environment-Specific Configuration
```python
# backend/src/lipsync_automation/config/settings.py
from pydantic import BaseSettings

class Settings(BaseSettings):
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8500
    
    # Paths
    profiles_directory: str = "profiles"
    cache_directory: str = "cache"
    output_directory: str = "output"
    
    # External Dependencies
    rhubarb_path: str = "/usr/local/bin/rhubarb"
    ffmpeg_path: str = "/usr/bin/ffmpeg"
    
    class Config:
        env_file = ".env"
```

### Phase 5: Docker Configuration

#### 5.1 New Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY config/ ./config/
COPY assets/ ./assets/
COPY profiles/ ./profiles/

# Create necessary directories
RUN mkdir -p cache logs output

# Set Python path
ENV PYTHONPATH=/app/src

# Expose port
EXPOSE 8500

# Run the API server
CMD ["python", "-m", "lipsync_automation.api.main"]
```

#### 5.2 Update Docker Compose
```yaml
# docker-compose.yml
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
    environment:
      - PYTHONPATH=/app/src
      - PYTHONUNBUFFERED=1
    networks:
      - lipsync_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lipsync_frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8500
    networks:
      - lipsync_network
    restart: unless-stopped
```

### Phase 6: Testing Strategy

#### 6.1 Update Test Structure
```bash
# Move backend tests
mv tests/ backend/tests/

# Create new test structure
mkdir -p backend/tests/{unit,integration,e2e}
```

#### 6.2 Update Test Configuration
```python
# backend/tests/conftest.py
import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

import pytest
from lipsync_automation.config.settings import Settings

@pytest.fixture
def test_settings():
    return Settings(
        profiles_directory="test_profiles",
        cache_directory="test_cache",
        output_directory="test_output"
    )
```

### Phase 7: Documentation Updates

#### 7.1 Backend-Specific README
```markdown
# backend/README.md

## Development Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python -m lipsync_automation.api.main
```

## Running Tests

```bash
pytest tests/ -v
```

## API Documentation

Visit http://localhost:8500/docs for interactive API documentation.
```

## Migration Checklist

### Pre-Migration
- [ ] Create backup of current state
- [ ] Tag repository with `v2.0.0-pre-backend-migration`
- [ ] Document current API contracts

### Migration Execution
- [ ] Create new directory structure
- [ ] Move Python package to `backend/src/`
- [ ] Move configuration and assets
- [ ] Restructure FastAPI application
- [ ] Update import statements
- [ ] Update pyproject.toml
- [ ] Create new Dockerfile
- [ ] Move tests to new location

### Post-Migration Validation
- [ ] All tests pass
- [ ] API endpoints work correctly
- [ ] Docker containers start successfully
- [ ] Frontend can connect to backend
- [ ] Documentation is updated

### Cleanup
- [ ] Remove old directories
- [ ] Update CI/CD pipelines
- [ ] Update development scripts
- [ ] Communicate changes to team

## Risk Mitigation

### 1. Import Path Issues
- **Risk**: Broken import statements after migration
- **Mitigation**: Automated script to update imports, comprehensive testing

### 2. Configuration Path Issues
- **Risk**: Hardcoded paths breaking after migration
- **Mitigation**: Centralized path management, environment-specific configs

### 3. Docker Networking
- **Risk**: Container communication issues
- **Mitigation**: Updated docker-compose, testing in isolated environment

### 4. API Contract Changes
- **Risk**: Unintentional API changes
- **Mitigation**: API contract tests, backward compatibility checks

## Rollback Plan

If critical issues arise:
1. Revert to tagged pre-migration state
2. Identify and fix issues
3. Re-attempt migration
4. Document lessons learned

This comprehensive migration strategy ensures a smooth transition of the Python backend to the new forked structure while maintaining functionality and minimizing risks.