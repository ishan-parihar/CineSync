#!/usr/bin/env python3
"""
Backend startup script for LipSyncAutomation
Runs the FastAPI application with proper module path configuration
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set project root for config access
project_root = backend_dir.parent
os.environ['PROJECT_ROOT'] = str(project_root)

# Set port before importing main
os.environ['PORT'] = '8500'

# Import and run main
try:
    from app.main import app
    import uvicorn
    
    if __name__ == "__main__":
        port = int(os.getenv("PORT", 8500))
        print(f"Starting LipSyncAutomation backend server on port {port}")
        print(f"Project root: {project_root}")
        print(f"Config path: {project_root / 'shared' / 'config' / 'settings.json'}")
        uvicorn.run(app, host="0.0.0.0", port=port)
except Exception as e:
    print(f"Error starting backend: {e}")
    print(f"Current working directory: {Path.cwd()}")
    print(f"Python path: {sys.path}")
    sys.exit(1)