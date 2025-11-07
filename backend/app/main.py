"""
Main FastAPI application for LipSyncAutomation Web UI - Refactored Version

This is the new modular main.py after the critical refactoring.
Reduced from 5,708 lines to ~200 lines while maintaining all functionality.
"""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import services and router
from .services import (
    SystemMonitoringService,
    ProfileService, 
    SettingsService,
    WebSocketService,
    EmotionAnalysisService,
    CinematographyService,
    ProcessingService,
    service_manager
)
from .api.router import APIRouter

# Define project root for config file access
project_root = Path(os.environ.get('PROJECT_ROOT', Path(__file__).parent.parent.parent))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    print("LipSyncAutomation Web API starting up...")
    yield
    # Shutdown
    print("LipSyncAutomation Web API shutting down..." )


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    
    # Initialize FastAPI app
    app = FastAPI(
        title="LipSyncAutomation Web API",
        description="Web API for LipSyncAutomation v2.0 system - Refactored",
        version="2.0.0",
        lifespan=lifespan,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify exact origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Load configuration from shared/config/
    config_path = project_root / "shared" / "config" / "settings.json"
    service_manager.load_config(config_path)
    config = service_manager.get_config()
    
    # Initialize services
    services = {
        "system_monitoring": SystemMonitoringService(config),
        "profile": ProfileService(config),
        "settings": SettingsService(config),
        "websocket": WebSocketService(config),
        "emotion": EmotionAnalysisService(config),
        "cinematography": CinematographyService(config),
        "processing": ProcessingService(config),
    }
    
    # Register services with service manager
    for name, service in services.items():
        service_manager.register_service(name, service)
    
    # Register API routes
    APIRouter(app, services)
    
    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)