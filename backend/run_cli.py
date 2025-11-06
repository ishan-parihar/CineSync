#!/usr/bin/env python3
"""
CLI startup script for LipSyncAutomation
Runs the CLI with proper module path configuration
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import CLI
from app.cli import main

if __name__ == "__main__":
    main()