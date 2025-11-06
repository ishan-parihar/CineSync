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

# Set port before importing main
os.environ['PORT'] = '8002'

# Import and run main
from app.main import app
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting LipSyncAutomation backend server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)