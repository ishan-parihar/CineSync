# Shared Resources Management Strategy

## Overview

This document outlines the strategy for managing shared resources across the forked frontend and backend directories. Shared resources include documentation, scripts, tools, configurations, and CI/CD pipelines that benefit both parts of the application.

## Current Shared Resources Analysis

### Documentation (`docs/`)
```
docs/
├── development/
│   ├── 0_Completed/
│   │   ├── Blueprint_1.md
│   │   └── Blueprint_2.md
│   ├── Blueprint_3.md
│   ├── Blueprint_4.md
│   ├── api_standardization.md
│   ├── comprehensive_reorganization_plan.md
│   ├── REORGANIZATION_SUMMARY.md
│   └── structure_plan.md
├── api_standardization.md
├── comprehensive_reorganization_plan.md
├── REORGANIZATION_SUMMARY.md
└── structure_plan.md
```

### Scripts (`scripts/`)
```
scripts/
├── cleanup.sh
├── create_animation_structure.py
├── create_background_placeholders.py
├── create_placeholders.py
├── create_proper_preset_structure.py
├── create_side_placeholders.py
├── debug_preset.py
├── demonstrate_enhanced_manager.py
├── migrate_api_responses.py
├── mock_rhubarb.py
├── README.md
├── recreate_presets_structure.py
├── rhubarb_wrapper.sh
├── run_tests.sh
├── setup_dependencies.sh
├── start_web_ui_complex.sh
├── test_api_responses.py
├── test_standardized_responses.py
└── validate_implementation.py
```

### Tools (`tools/`)
```
tools/
└── rhubarb/
    ├── extras/
    ├── res/
    ├── tests/
    ├── CHANGELOG.md
    ├── LICENSE.md
    ├── README.adoc
    └── rhubarb.exe
```

### Configuration Files
```
.flake8
.gitattributes
.gitignore
.isort.cfg
.pre-commit-config.yaml
mypy.ini
pyproject.toml
requirements.txt
setup.py
AGENTS.md
API_STANDARDIZATION_SUMMARY.md
demo_structure_export.json
minimal_backend.py
output.json
plan.md
PROFILE_ENHANCEMENT_IMPLEMENTATION.md
README_SCRIPTS.md
STARTUP_GUIDE.md
STYLING_FIXES_SUMMARY.md
test_audio.wav
test_websocket.py
```

### CI/CD Configuration
```
.github/
└── workflows/
    └── frontend-performance-testing.yml
```

## Proposed Shared Resources Structure

```
shared/
├── README.md                       # Shared resources overview
│
├── docs/                           # 📚 Project Documentation
│   ├── README.md                   # Documentation index
│   ├── development/                # Development documentation
│   │   ├── README.md               # Development docs overview
│   │   ├── blueprints/             # Architecture blueprints
│   │   │   ├── Blueprint_1.md
│   │   │   ├── Blueprint_2.md
│   │   │   ├── Blueprint_3.md
│   │   │   └── Blueprint_4.md
│   │   ├── api/                    # API documentation
│   │   │   ├── api_standardization.md
│   │   │   └── API_STANDARDIZATION_SUMMARY.md
│   │   ├── guides/                 # Development guides
│   │   │   ├── comprehensive_reorganization_plan.md
│   │   │   ├── REORGANIZATION_SUMMARY.md
│   │   │   ├── PROFILE_ENHANCEMENT_IMPLEMENTATION.md
│   │   │   ├── STARTUP_GUIDE.md
│   │   │   └── structure_plan.md
│   │   └── style-guides/           # Code style guides
│   │       ├── STYLING_FIXES_SUMMARY.md
│   │       └── README_SCRIPTS.md
│   │
│   ├── deployment/                 # Deployment documentation
│   │   ├── README.md               # Deployment overview
│   │   ├── docker/                 # Docker deployment
│   │   ├── kubernetes/             # K8s deployment
│   │   └── cloud/                  # Cloud platform deployment
│   │
│   ├── user/                       # User documentation
│   │   ├── README.md               # User guide
│   │   ├── getting-started.md      # Getting started guide
│   │   ├── troubleshooting.md      # Troubleshooting guide
│   │   └── faq.md                  # Frequently asked questions
│   │
│   └── api/                        # API documentation
│       ├── README.md               # API overview
│       ├── openapi.yaml            # OpenAPI specification
│       └── endpoints/              # Endpoint documentation
│
├── scripts/                        # 🛠️ Utility Scripts
│   ├── README.md                   # Scripts overview
│   ├── setup/                      # Setup scripts
│   │   ├── setup_dependencies.sh   # Dependency installation
│   │   ├── setup_environment.sh    # Environment setup
│   │   └── setup_dev_env.sh        # Development environment
│   │
│   ├── development/                # Development scripts
│   │   ├── run_tests.sh            # Test runner
│   │   ├── start_dev.sh            # Development server starter
│   │   ├── validate_implementation.py
│   │   ├── test_api_responses.py
│   │   └── test_standardized_responses.py
│   │
│   ├── migration/                  # Migration scripts
│   │   ├── migrate_api_responses.py
│   │   ├── migrate_structure.py    # Structure migration helper
│   │   └── validate_migration.py   # Migration validation
│   │
│   ├── maintenance/                # Maintenance scripts
│   │   ├── cleanup.sh              # Cleanup utility
│   │   ├── backup.sh               # Backup utility
│   │   └── health_check.py         # System health check
│   │
│   ├── data/                       # Data management scripts
│   │   ├── create_animation_structure.py
│   │   ├── create_background_placeholders.py
│   │   ├── create_placeholders.py
│   │   ├── create_proper_preset_structure.py
│   │   ├── create_side_placeholders.py
│   │   ├── recreate_presets_structure.py
│   │   └── debug_preset.py
│   │
│   └── tools/                      # Tool wrappers
│       ├── rhubarb_wrapper.sh      # Rhubarb lip sync tool wrapper
│       ├── mock_rhubarb.py         # Mock rhubarb for testing
│       └── demonstrate_enhanced_manager.py
│
├── tools/                          # 🔧 External Tools
│   ├── README.md                   # Tools overview
│   ├── rhubarb/                    # Rhubarb lip sync tool
│   │   ├── README.md               # Tool documentation
│   │   ├── bin/                    # Executables
│   │   │   └── rhubarb.exe
│   │   ├── extras/                 # Tool extras
│   │   ├── res/                    # Tool resources
│   │   └── tests/                  # Tool tests
│   │
│   └── ffmpeg/                     # FFmpeg wrappers and configs
│       ├── README.md               # FFmpeg documentation
│       └── presets/                # Encoding presets
│
├── configs/                        # ⚙️ Shared Configurations
│   ├── README.md                   # Configurations overview
│   ├── development/                # Development configs
│   │   ├── .gitignore              # Git ignore rules
│   │   ├── .gitattributes          # Git attributes
│   │   ├── .flake8                 # Python linting
│   │   ├── .isort.cfg              # Import sorting
│   │   ├── mypy.ini                # Type checking
│   │   └── pre-commit-config.yaml  # Pre-commit hooks
│   │
│   ├── ci-cd/                      # CI/CD configurations
│   │   ├── .github/                # GitHub Actions
│   │   │   └── workflows/
│   │   │       ├── frontend-ci.yml
│   │   │       ├── backend-ci.yml
│   │   │       ├── integration-tests.yml
│   │   │       └── deploy.yml
│   │   │
│   │   └── gitlab-ci.yml           # GitLab CI configuration
│   │
│   └── quality/                    # Code quality configs
│       ├── sonar-project.properties # SonarQube configuration
│       ├── .codeclimate.yml        # Code Climate
│       └── .codecov.yml            # Codecov
│
├── templates/                      # 📄 Project Templates
│   ├── README.md                   # Templates overview
│   ├── frontend/                   # Frontend project templates
│   │   ├── component-template.tsx  # React component template
│   │   ├── hook-template.ts        # Custom hook template
│   │   └── test-template.test.tsx  # Test template
│   │
│   ├── backend/                    # Backend project templates
│   │   ├── endpoint-template.py    # FastAPI endpoint template
│   │   ├── model-template.py       # Pydantic model template
│   │   └── test-template.py        # Test template
│   │
│   └── documentation/              # Documentation templates
│       ├── api-endpoint.md         # API endpoint documentation
│       ├── component-docs.md       # Component documentation
│       └── deployment-guide.md     # Deployment guide template
│
└── examples/                       # 💡 Code Examples
    ├── README.md                   # Examples overview
    ├── frontend/                   # Frontend examples
    │   ├── websocket-connection.ts # WebSocket connection example
    │   ├── api-integration.tsx     # API integration example
    │   └── state-management.tsx    # State management example
    │
    ├── backend/                    # Backend examples
    │   ├── api-endpoint.py         # API endpoint example
    │   ├── database-model.py       # Database model example
    │   └── background-task.py      # Background task example
    │
    └── integration/                # Integration examples
        ├── full-workflow/          # Complete workflow examples
        └── testing/                # Testing examples
```

## Migration Strategy

### Phase 1: Documentation Migration

#### 1.1 Create Shared Documentation Structure
```bash
# Create shared docs structure
mkdir -p shared/docs/{development,deployment,user,api}
mkdir -p shared/docs/development/{blueprints,api,guides,style-guides}
```

#### 1.2 Migrate Documentation Files
```bash
# Move development documentation
mv docs/development/* shared/docs/development/

# Organize into subdirectories
mv shared/docs/development/Blueprint_*.md shared/docs/development/blueprints/
mv shared/docs/development/api_standardization.md shared/docs/development/api/
mv shared/docs/development/*_SUMMARY.md shared/docs/development/guides/
mv shared/docs/development/*_GUIDE.md shared/docs/development/guides/
```

#### 1.3 Create Documentation Index
```markdown
# shared/docs/README.md

# LipSync Automation Documentation

## Development Documentation
- [Blueprints](development/blueprints/) - Architecture and design documents
- [API Documentation](development/api/) - API standards and specifications
- [Development Guides](development/guides/) - Setup and development workflows
- [Style Guides](development/style-guides/) - Code style and standards

## Deployment Documentation
- [Docker Deployment](deployment/docker/) - Container-based deployment
- [Kubernetes Deployment](deployment/kubernetes/) - K8s deployment guides
- [Cloud Deployment](deployment/cloud/) - Cloud platform deployment

## User Documentation
- [Getting Started](user/getting-started.md) - User setup guide
- [User Guide](user/README.md) - Comprehensive user manual
- [Troubleshooting](user/troubleshooting.md) - Common issues and solutions
- [FAQ](user/faq.md) - Frequently asked questions

## API Reference
- [API Overview](api/README.md) - API introduction
- [OpenAPI Specification](api/openapi.yaml) - Complete API specification
- [Endpoint Documentation](api/endpoints/) - Detailed endpoint documentation
```

### Phase 2: Scripts Migration

#### 2.1 Categorize Scripts by Function
```bash
# Create script categories
mkdir -p shared/scripts/{setup,development,migration,maintenance,data,tools}
```

#### 2.2 Move Scripts to Appropriate Categories
```bash
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
```

#### 2.3 Update Script Paths
Scripts need to be updated to work with the new directory structure:

```bash
# shared/scripts/setup/setup_dependencies.sh
#!/bin/bash

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Setting up dependencies for LipSync Automation..."

# Setup backend dependencies
if [ -d "$BACKEND_DIR" ]; then
    echo "Setting up backend dependencies..."
    cd "$BACKEND_DIR"
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
fi

# Setup frontend dependencies
if [ -d "$FRONTEND_DIR" ]; then
    echo "Setting up frontend dependencies..."
    cd "$FRONTEND_DIR"
    if [ -f "package.json" ]; then
        npm install
    fi
fi

echo "Dependencies setup complete!"
```

### Phase 3: Tools Migration

#### 3.1 Move Tools Directory
```bash
# Move tools to shared location
mv tools/ shared/
```

#### 3.2 Create Tool Documentation
```markdown
# shared/tools/README.md

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

### Documentation
See `shared/tools/rhubarb/README.adoc` for complete documentation.
```

### Phase 4: Configuration Management

#### 4.1 Create Shared Config Structure
```bash
mkdir -p shared/configs/{development,ci-cd,quality}
```

#### 4.2 Move Configuration Files
```bash
# Development configurations
mv .flake8 shared/configs/development/
mv .isort.cfg shared/configs/development/
mv mypy.ini shared/configs/development/
mv .pre-commit-config.yaml shared/configs/development/

# CI/CD configurations
mv .github/ shared/configs/ci-cd/

# Git configurations (keep in root)
# .gitignore, .gitattributes stay in project root
```

#### 4.3 Create Configuration Symlinks
```bash
# Create symlinks in project root for backward compatibility
ln -s shared/configs/development/.flake8 .flake8
ln -s shared/configs/development/.isort.cfg .isort.cfg
ln -s shared/configs/development/mypy.ini mypy.ini
ln -s shared/configs/development/.pre-commit-config.yaml .pre-commit-config.yaml
ln -s shared/configs/ci-cd/.github .github
```

### Phase 5: CI/CD Pipeline Updates

#### 5.1 Create Separate CI/CD Workflows
```yaml
# shared/configs/ci-cd/.github/workflows/frontend-ci.yml
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
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
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
          
      - name: Build
        run: |
          cd frontend
          npm run build
```

```yaml
# shared/configs/ci-cd/.github/workflows/backend-ci.yml
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
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v
          
      - name: Lint
        run: |
          cd backend
          flake8 src/
          mypy src/
```

#### 5.2 Integration Testing Workflow
```yaml
# shared/configs/ci-cd/.github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Docker Compose
        run: |
          docker-compose -f docker-compose.yml up -d
          
      - name: Wait for services
        run: |
          sleep 30
          
      - name: Run integration tests
        run: |
          # Run integration test suite
          docker-compose exec backend pytest tests/integration/ -v
          
      - name: Cleanup
        run: |
          docker-compose down
```

## Usage Guidelines

### 1. Accessing Shared Resources

#### From Frontend
```typescript
// Import shared types or utilities
import { ApiError } from '../../../shared/types/api';
```

#### From Backend
```python
# Import shared utilities
import sys
from pathlib import Path

# Add shared scripts to path
shared_path = Path(__file__).parent.parent.parent / 'shared' / 'scripts'
sys.path.insert(0, str(shared_path))

from utils.common import setup_logging
```

### 2. Running Shared Scripts

```bash
# From project root
./shared/scripts/setup/setup_dependencies.sh
./shared/scripts/development/run_tests.sh

# From any directory
./shared/configs/development/pre-commit-config.yaml
```

### 3. Documentation Access

All documentation is accessible through the main `shared/docs/README.md` index file, which provides organized access to all project documentation.

## Benefits of Shared Resources Structure

1. **Single Source of Truth**: Centralized location for all shared resources
2. **Reduced Duplication**: Avoid copying the same files to multiple locations
3. **Easier Maintenance**: Update once, benefit both frontend and backend
4. **Clear Organization**: Logical categorization of resources by function
5. **Version Control**: Track changes to shared resources in one place
6. **Documentation**: Comprehensive documentation for all shared components

## Migration Checklist

### Pre-Migration
- [ ] Inventory all shared resources
- [ ] Document current usage patterns
- [ ] Create backup of existing resources

### Migration Execution
- [ ] Create shared directory structure
- [ ] Move and categorize documentation
- [ ] Organize scripts by function
- [ ] Migrate tools and external dependencies
- [ ] Set up configuration management
- [ ] Create CI/CD pipelines
- [ ] Set up symlinks for backward compatibility

### Post-Migration Validation
- [ ] All scripts execute correctly
- [ ] Documentation is accessible
- [ ] CI/CD pipelines work
- [ ] Development workflows function
- [ ] Tools are accessible from both frontend and backend

### Documentation Updates
- [ ] Update main README with shared resources section
- [ ] Create shared resources documentation
- [ ] Update development setup instructions
- [ ] Document new workflow processes

This shared resources management strategy ensures that common components are properly organized, maintained, and accessible to both frontend and backend teams while reducing duplication and improving maintainability.