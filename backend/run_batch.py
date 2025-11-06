#!/usr/bin/env python3
"""
Batch processor startup script for LipSyncAutomation
Runs the batch processing with proper module path configuration
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import batch processor
from app.batch_processor import main

if __name__ == "__main__":
    main()