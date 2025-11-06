# LipSync Automation - Forked Directory Structure Plan

## Executive Summary

This document outlines a comprehensive plan to reorganize the LipSync Automation codebase from its current monolithic structure into a clean, forked architecture with separate `frontend` and `backend` directories. This reorganization will improve developer experience, simplify deployment workflows, and create clear separation of concerns.

## Current State Analysis

### Current Structure Issues
- **Mixed Responsibilities**: Python backend modules and React frontend are intermingled
- **Complex Development Workflow**: Developers need to navigate multiple nested directories
- **Deployment Complexity**: Current Docker setup requires complex volume mappings
- **Unclear Boundaries**: No clear separation between frontend and backend concerns

### Key Components Identified
1. **Python Backend Core** (`lipsync_automation/`)
   - Core processing modules (cinematography, core, utils, etc.)
   - FastAPI web server (`web-ui/backend/`)
   - Configuration management (`config/`)
   - Profile and asset management (`profiles/`, `assets/`)

2. **React Frontend** (`web-ui/frontend/`)
   - Next.js application with TypeScript
   - Component library and UI elements
   - State management with Zustand
   - Comprehensive testing setup

3. **Shared Resources**
   - Docker configurations
   - Documentation (`docs/`)
   - Scripts (`scripts/`)
   - Test files (`tests/`)

## Proposed Forked Structure

```
LipSyncAutomation/
├── README.md                          # Main project README
├── docker-compose.yml                 # Root orchestration
├── .gitignore                         # Global gitignore
├── .env.example                       # Environment template
│
├── frontend/                          # 🎯 React Frontend Application
│   ├── README.md                      # Frontend-specific README
│   ├── package.json                   # Node.js dependencies
│   ├── next.config.js                 # Next.js configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── tailwind.config.js             # Tailwind CSS configuration
│   ├── Dockerfile                     # Frontend Docker configuration
│   ├── .env.local                     # Frontend environment variables
│   │
│   ├── public/                        # Static assets
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── ...
│   │
│   ├── src/                           # Source code
│   │   ├── components/                # React components
│   │   │   ├── processing/
│   │   │   ├── visualization/
│   │   │   ├── Dashboard.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── contexts/                  # React contexts
│   │   │   ├── ThemeContext.tsx
│   │   │   └── WebSocketContext.tsx
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── usePerformanceMonitoring.ts
│   │   │   └── useWebSocket.ts
│   │   │
│   │   ├── services/                  # API and business logic
│   │   │   ├── WebSocketManager.ts
│   │   │   ├── api.ts
│   │   │   └── ConnectionHealth.ts
│   │   │
│   │   ├── stores/                    # State management
│   │   │   ├── appStore.ts
│   │   │   ├── cinematographyStore.ts
│   │   │   └── processingStore.ts
│   │   │
│   │   ├── types/                     # TypeScript definitions
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── cn.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── styles/                    # Styling
│   │   │   ├── globals.css
│   │   │   └── theme.ts
│   │   │
│   │   └── pages/                     # Next.js pages
│   │       ├── _app.tsx
│   │       ├── index.tsx
│   │       └── api/
│   │
│   ├── tests/                         # Frontend tests
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── e2e/
│   │   └── setup.js
│   │
│   └── cypress/                       # E2E testing
│       ├── e2e/
│       ├── support/
│       └── cypress.config.js
│
├── backend/                           # 🚀 Python Backend Application
│   ├── README.md                      # Backend-specific README
│   ├── pyproject.toml                 # Python project configuration
│   ├── requirements.txt               # Python dependencies
│   ├── Dockerfile                     # Backend Docker configuration
│   ├── .env                           # Backend environment variables
│   │
│   ├── src/                           # Source code
│   │   └── lipsync_automation/        # Main Python package
│   │       ├── __init__.py
│   │       ├── main.py                # Application entry point
│   │       ├── cli.py                 # Command-line interface
│   │       │
│   │       ├── core/                  # Core processing modules
│   │       │   ├── __init__.py
│   │       │   ├── content_orchestrator.py
│   │       │   ├── emotion_analyzer.py
│   │       │   ├── lip_sync_generator.py
│   │       │   ├── preset_manager.py
│   │       │   ├── profile_manager.py
│   │       │   └── video_compositor.py
│   │       │
│   │       ├── cinematography/        # Cinematography engine
│   │       │   ├── __init__.py
│   │       │   ├── decision_engine.py
│   │       │   ├── grammar_machine.py
│   │       │   ├── override_manager.py
│   │       │   ├── psycho_mapper.py
│   │       │   ├── shot_purpose_selector.py
│   │       │   ├── tension_engine.py
│   │       │   └── transform_processor.py
│   │       │
│   │       ├── utils/                 # Utility modules
│   │       │   ├── __init__.py
│   │       │   ├── animation_structure_manager.py
│   │       │   ├── audio_processor.py
│   │       │   ├── cache_manager.py
│   │       │   └── validators.py
│   │       │
│   │       ├── api/                   # FastAPI web server
│   │       │   ├── __init__.py
│   │       │   ├── main.py            # FastAPI application
│   │       │   ├── endpoints/         # API endpoints
│   │       │   │   ├── __init__.py
│   │       │   │   ├── profiles.py
│   │       │   │   ├── cinematography.py
│   │       │   │   ├── emotions.py
│   │       │   │   └── system.py
│   │       │   │
│   │       │   ├── models/            # Pydantic models
│   │       │   │   ├── __init__.py
│   │       │   │   ├── responses.py
│   │       │   │   ├── requests.py
│   │       │   │   └── common.py
│   │       │   │
│   │       │   └── middleware/        # FastAPI middleware
│   │       │       ├── __init__.py
│   │       │       ├── cors.py
│   │       │       └── websocket.py
│   │       │
│   │       └── config/                # Configuration management
│   │           ├── __init__.py
│   │           ├── settings.py
│   │           └── logging_config.py
│   │
│   ├── config/                        # Configuration files
│   │   ├── settings.json              # Main application settings
│   │   ├── cinematography_rules.json  # Cinematography rules
│   │   ├── shot_purpose_profiles.json # Shot purpose profiles
│   │   ├── transform_presets.json     # Transform presets
│   │   └── logging_config.json        # Logging configuration
│   │
│   ├── assets/                        # Backend assets
│   │   ├── audio/                     # Audio files
│   │   ├── presets/                   # Character presets
│   │   └── demo_structure_export.json
│   │
│   ├── profiles/                      # Character profiles
│   │   ├── character_1/
│   │   ├── profile_manifest.json
│   │   └── ...
│   │
│   ├── cache/                         # Cache directory
│   ├── logs/                          # Log files
│   ├── output/                        # Generated output
│   │
│   └── tests/                         # Backend tests
│       ├── unit/
│       ├── integration/
│       └── conftest.py
│
├── shared/                            # 🤝 Shared Resources
│   ├── docs/                          # Documentation
│   │   ├── development/
│   │   ├── api/
│   │   ├── deployment/
│   │   └── README.md
│   │
│   ├── scripts/                       # Utility scripts
│   │   ├── setup/
│   │   ├── migration/
│   │   ├── development/
│   │   └── deployment/
│   │
│   ├── tools/                         # External tools
│   │   └── rhubarb/
│   │
│   └── configs/                       # Shared configurations
│       ├── .gitignore
│       ├── .eslintrc.json
│       ├── pre-commit-config.yaml
│       └── github/workflows/
│
└── deployment/                        # 🚢 Deployment Configurations
    ├── docker/
    │   ├── docker-compose.yml
    │   ├── docker-compose.prod.yml
    │   └── nginx.conf
    │
    ├── kubernetes/
    │   ├── backend-deployment.yaml
    │   ├── frontend-deployment.yaml
    │   └── ingress.yaml
    │
    └── ci-cd/
        ├── .github/
        │   └── workflows/
        │       ├── frontend-ci.yml
        │       ├── backend-ci.yml
        │       └── deploy.yml
        │
        └── gitlab-ci.yml
```

## Migration Strategy

### Phase 1: Preparation
1. **Backup Current State**
   - Create git tag: `v2.0.0-pre-restructure`
   - Full project backup

2. **Create New Directory Structure**
   - Create `frontend/`, `backend/`, `shared/`, `deployment/` directories
   - Set up initial README files

### Phase 2: Backend Migration
1. **Move Python Components**
   - Move `lipsync_automation/` to `backend/src/`
   - Move `config/` to `backend/config/`
   - Move `assets/`, `profiles/`, `cache/`, `logs/`, `output/` to `backend/`
   - Move `web-ui/backend/` contents to `backend/src/lipsync_automation/api/`

2. **Update Backend Configuration**
   - Update `pyproject.toml` with new paths
   - Update import statements
   - Adjust Dockerfile

### Phase 3: Frontend Migration
1. **Move React Components**
   - Move `web-ui/frontend/` contents to `frontend/`
   - Update package.json paths
   - Adjust Dockerfile

2. **Update Frontend Configuration**
   - Update API endpoints to point to new backend structure
   - Update environment variables

### Phase 4: Shared Resources
1. **Move Documentation**
   - Move `docs/` to `shared/docs/`
   - Update documentation references

2. **Move Scripts and Tools**
   - Move `scripts/` to `shared/scripts/`
   - Move `tools/` to `shared/tools/`
   - Update script paths

### Phase 5: Deployment Configuration
1. **Update Docker Configuration**
   - Rewrite `docker-compose.yml` for new structure
   - Update Dockerfiles
   - Create environment-specific configurations

2. **Update CI/CD**
   - Restructure GitHub Actions workflows
   - Update deployment scripts

## Benefits of New Structure

### 1. **Clear Separation of Concerns**
- Frontend and backend are completely isolated
- Independent development and deployment
- Technology-specific optimization

### 2. **Improved Developer Experience**
- Simplified onboarding for frontend/backend developers
- Clear ownership boundaries
- Easier dependency management

### 3. **Better Deployment Flexibility**
- Independent scaling of frontend and backend
- Separate CI/CD pipelines
- Environment-specific optimizations

### 4. **Enhanced Maintainability**
- Reduced coupling between components
- Clearer dependency relationships
- Easier testing and debugging

## Implementation Considerations

### 1. **Import Path Updates**
- Python imports need to be updated for new package structure
- Frontend API calls need to be updated

### 2. **Configuration Management**
- Environment variables need to be reorganized
- Path references in config files need updates

### 3. **Docker Networking**
- Service names in docker-compose need updates
- Volume mappings need adjustment

### 4. **Development Workflow**
- New scripts for starting development environment
- Updated documentation

## Risk Mitigation

### 1. **Incremental Migration**
- Phase-by-phase approach reduces risk
- Each phase can be tested independently

### 2. **Backward Compatibility**
- Maintain existing API contracts
- Gradual transition of development workflows

### 3. **Testing Strategy**
- Comprehensive testing at each phase
- Automated tests to verify functionality

### 4. **Rollback Plan**
- Git tags for each phase
- Documented rollback procedures

## Next Steps

1. **Stakeholder Approval**
   - Review and approve the proposed structure
   - Address any concerns or modifications

2. **Timeline Planning**
   - Create detailed timeline for each phase
   - Assign responsibilities

3. **Preparation**
   - Set up backup procedures
   - Prepare communication plan

4. **Execution**
   - Begin Phase 1 implementation
   - Monitor and adjust as needed

---

This plan provides a comprehensive roadmap for transforming the LipSync Automation codebase into a modern, forked architecture that will significantly improve developer experience and maintainability.