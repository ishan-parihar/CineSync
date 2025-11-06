#!/usr/bin/env python3
"""
Script to start the backend server with correct port configuration
"""
import os
import sys

# Set port before importing main
os.environ["PORT"] = "8002"

import uvicorn

# Import and run main
from .main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting backend server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
