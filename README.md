# LipSync Automation

🎬 **A psycho-cinematic automation system for intelligent lip-sync video generation with emotion-driven cinematography**

---

## 🚀 Quick Start

Get LipSync Automation running in under 5 minutes with our automated setup:

```bash
# Clone and start everything automatically
git clone <repository-url>
cd LipSyncAutomation
chmod +x start_web_ui.sh
./start_web_ui.sh
```

✅ **What the script does:**
- Sets up Python virtual environment
- Installs all dependencies (Python + Node.js)
- Starts backend server (port 8002)
- Starts frontend server (port 5002)
- Verifies system health

### Prerequisites
- **Python 3.8+** (verified with Python 3.13)
- **Node.js 18+** (verified with Node.js v25.1.0)
- **Git**

### Access Points
Once started, access:
- **🎨 Frontend UI**: `http://localhost:5002` (primary interface)
- **🔧 Backend API**: `http://localhost:8002` (RESTful API)
- **📊 API Documentation**: `http://localhost:8002/docs` (Swagger UI)

---

## 🏗️ Architecture Overview

LipSync Automation uses a clean, forked architecture with clear separation of concerns:

```
LipSyncAutomation/
├── frontend/          # 🎨 React/Next.js Web Application
├── backend/           # 🚀 Python FastAPI Backend
├── shared/            # 🤝 Common Configurations & Utilities
├── tools/             # 🔧 External Dependencies (Rhubarb)
├── docs/              # 📚 Documentation & Migration Records
└── scripts/           # ⚙️ Development & Deployment Scripts
```

### Frontend (`frontend/`)
- **Stack**: React 19, Next.js 16, TypeScript, Tailwind CSS
- **State Management**: Zustand with persistent storage
- **Real-time**: WebSocket integration for live updates
- **Testing**: Jest, Cypress, Playwright

### Backend (`backend/`)
- **Stack**: Python 3.8+, FastAPI, Uvicorn, WebSockets
- **Core**: Lip-sync generation, emotion analysis, cinematography engine
- **API**: RESTful endpoints with OpenAPI documentation
- **Processing**: Real-time emotion-to-shot mapping

### Shared (`shared/`)
- Configuration files and environment variables
- Common utilities and validation functions
- Centralized settings management

---

## 📁 Directory Structure

```
LipSyncAutomation/
├── frontend/                 # React web application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Next.js pages
│   │   ├── services/       # API services
│   │   └── stores/         # State management
│   └── tests/              # Frontend tests
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── cinematography/ # Psycho-cinematic engine
│   │   ├── core/          # Core processing modules
│   │   └── api/           # API endpoints
│   └── tests/             # Backend tests
├── shared/                 # Shared configurations
│   └── config/            # Common settings
├── tools/                  # External tools
│   └── rhubarb/          # Lip-sync processor
└── scripts/               # Development scripts
```

---

## 🛠️ Development Commands

### Backend Development
```bash
# Setup environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -e ".[dev]"

# Start development server
python app/main.py

# Code quality
flake8                    # Linting
black --check             # Formatting check
isort --check-only        # Import sorting
mypy lipsync_automation/   # Type checking

# Testing
pytest tests/ -v          # Run all tests
pytest tests/test_file.py::test_method -v  # Specific test

# Apply formatting
black
isort
```

### Frontend Development
```bash
# Setup and start
cd frontend
npm install
npm run dev

# Code quality
npm run lint              # ESLint
npm run lint:fix          # Fix linting issues
npm run type-check        # TypeScript checking

# Testing
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:performance  # Performance tests

# Build
npm run build             # Production build
```

### Pre-commit Hooks
```bash
# Install hooks
pre-commit install

# Run all hooks
pre-commit run --all-files
```

---

## 🎯 Key Features

### 🎭 Cinematography Control
- **Psycho-cinematic Decision Engine**: Real-time emotion-to-shot mapping
- **8 Emotion Profiles**: Comprehensive emotion analysis system
- **4 Tension Levels**: Dynamic shot selection based on emotional intensity
- **Film Grammar Rules**: 180-degree rule, progression logic enforcement

### 📊 Emotion Analysis
- **Real-time Processing**: Live emotion segment analysis
- **Manual Adjustments**: Override automatic emotion detection
- **Timeline Visualization**: Interactive emotion timeline
- **Multi-dimensional Analysis**: Arousal, valence, intensity metrics

### 🔌 Real-time Features
- **WebSocket Streaming**: Live processing events
- **Stage Updates**: Real-time progress indicators
- **Decision Notifications**: Shot selection broadcasts
- **System Monitoring**: Performance metrics and health checks

---

## 🧪 Testing

### Backend Tests
```bash
# Run comprehensive test suite
pytest tests/ -v --cov=reports

# Key test categories:
- ✅ Shot Purpose Selection
- ✅ Transform Processing  
- ✅ API Health Checks
- ✅ System Monitoring
- ✅ WebSocket Connections
```

### Frontend Tests
```bash
cd frontend

# Unit and integration tests
npm run test

# End-to-end testing
npm run test:e2e

# Performance testing
npm run test:performance
```

### API Testing
```bash
# Health check
curl http://localhost:8001/api/health

# System performance
curl http://localhost:8001/api/system/performance

# Cinematography rules
curl http://localhost:8001/api/cinematography/rules
```

---

## 🚢 Deployment

### Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Production Setup
```bash
# Backend (with Gunicorn)
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend (build and serve)
cd frontend
npm run build
# Serve build/ directory with Nginx or similar
```

---

## 📚 Documentation

For detailed information, see:

- **📖 [ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture and design decisions
- **🔧 [AGENTS.md](./AGENTS.md)** - Development guidelines and coding standards
- **📋 [STARTUP_GUIDE.md](./STARTUP_GUIDE.md)** - Detailed startup instructions
- **📁 [docs/](./docs/)** - Additional documentation and migration records

---

## 🐛 Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Use custom ports
./start_web_ui.sh 8080 3000
```

**Dependency Issues**
```bash
# Backend
source venv/bin/activate
pip install -e ".[dev]"

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Permission Issues**
```bash
chmod +x start_web_ui.sh
chmod +x setup_web_ui.sh
```

### Log Locations
- **Backend**: Terminal output or `backend/logs/`
- **Frontend**: Browser console and `frontend/logs/`
- **System**: Check terminal output for detailed errors

---

## 🤝 Contributing

### Development Guidelines
- Follow the forked architecture principles
- Use TypeScript strict mode in frontend
- Implement comprehensive tests for new features
- Update documentation for API changes
- Follow code style guidelines (Black, isort, ESLint)

### Code Quality Standards
- **Line Length**: 88 characters (Black standard)
- **Imports**: isort with Black profile
- **Types**: Use typing hints, mypy strict mode
- **Naming**: snake_case (Python), PascalCase (classes)
- **Error Handling**: Structured logging, graceful failures

---

## 🎉 Project Status

**LipSync Automation is production-ready!**

The system has been transformed from a basic lip-sync processing tool into a professional-grade cinematographic automation platform with:
- Real-time psycho-cinematic decision engine
- Comprehensive emotion analysis system  
- Professional web-based interface
- System monitoring and performance optimization
- Complete API documentation
- Real-time event streaming

**🚀 Enjoy your fully operational LipSync Automation system!**

---

*For detailed architecture information, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).*