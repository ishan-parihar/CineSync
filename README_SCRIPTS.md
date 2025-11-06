# Simple Web UI Scripts

Two focused scripts for managing the LipSyncAutomation Web UI:

## 🚀 Quick Start

### One-Time Setup (2-5 minutes)
```bash
./setup_web_ui.sh
```

### Daily Startup (5-10 seconds)
```bash
./start_web_ui.sh
```

---

## Scripts

### `setup_web_ui.sh` - One-Time Setup
Handles all installation and configuration.

**What it does:**
- Checks system requirements (Python 3, Node.js, npm)
- Creates Python virtual environment
- Installs Python dependencies
- Installs frontend Node.js dependencies
- Creates necessary directories

**Usage:**
```bash
./setup_web_ui.sh          # Full setup
./setup_web_ui.sh --skip-deps    # Skip dependency installation
./setup_web_ui.sh --verbose      # Verbose output
```

---

### `start_web_ui.sh` - Daily Startup
Simple script that just starts the servers.

**What it does:**
- Starts backend FastAPI server
- Starts frontend Next.js server
- Provides basic process management

**Usage:**
```bash
./start_web_ui.sh                 # Default ports (8001, 5000)
./start_web_ui.sh 8080 3000       # Custom ports
```

**Script simplicity:**
- ❌ No dependency checks
- ❌ No health checks  
- ❌ No port conflict detection
- ✅ Just starts servers fast
- ✅ Basic cleanup on Ctrl+C

---

## Why This Approach?

### Old Problems
- ❌ Complex script doing too much
- ❌ Installing dependencies every start
- ❌ 30-60 second startup times
- ❌ Over-engineered for daily use

### New Solution
- ✅ Setup once, install once
- ✅ Simple 5-10 second startup
- ✅ Clear separation of concerns
- ✅ Easy to understand and modify

---

## Daily Workflow

```bash
# Morning setup (run once)
./setup_web_ui.sh

# Start working (run multiple times daily)
./start_web_ui.sh

# Press Ctrl+C when done
```

---

## Access Points

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:8001  
- **API Docs**: http://localhost:8001/docs

---

## Troubleshooting

### Setup Issues
```bash
# Missing Python/Node.js? Install them first
# Then run:
./setup_web_ui.sh --verbose
```

### Port Conflicts
```bash
# Use different ports:
./start_web_ui.sh 8080 3000
```

### Environment Issues
```bash
# Fresh setup:
./setup_web_ui.sh --skip-deps
```

---

## File Structure

```
.
├── setup_web_ui.sh          # One-time setup (complex)
├── start_web_ui.sh          # Daily startup (simple)
├── scripts/                 # Other utility scripts
│   └── README_SIMPLE.md     # This documentation
├── web-ui/
│   ├── backend/             # FastAPI backend
│   └── frontend/            # Next.js frontend
├── venv/                    # Python venv (created by setup)
├── logs/                    # Log files (created by setup)
└── profiles/                # Profile data (created by setup)
```

---

## Performance Comparison

| Operation | Old Script | New Scripts |
|-----------|------------|-------------|
| First setup | 30-60s | 2-5 min (once) |
| Daily start | 30-60s | 5-10s |
| Dependency install | Every start | Once |
| Complexity | High | Low |

---

## Philosophy

**Setup script:** Can be complex, runs rarely, handles all edge cases
**Startup script:** Must be simple, runs daily, focused on speed

This separation gives you the best of both worlds - comprehensive setup when you need it, blazing fast startup for daily development.