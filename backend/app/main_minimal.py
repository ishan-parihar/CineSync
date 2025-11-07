"""
Minimal test version of main.py to test basic FastAPI startup
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import only essential services for basic startup
from .services import service_manager
from .services.system_monitoring import SystemMonitoringService
from .services.settings_service import SettingsService
from .services.websocket_service import WebSocketService
from .api.router import APIRouter

# Define project root for config file access
project_root = Path(__file__).parent.parent.parent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    print("LipSyncAutomation Web API starting up...")
    yield
    # Shutdown
    print("LipSyncAutomation Web API shutting down..." )


def create_minimal_app() -> FastAPI:
    """Create and configure a minimal FastAPI application for testing"""
    
    # Initialize FastAPI app
    app = FastAPI(
        title="LipSyncAutomation Web API - Minimal Test",
        description="Web API for LipSyncAutomation v2.0 system - Minimal Test Version",
        version="2.0.0-test",
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
    
    # Load configuration
    config_path = Path(__file__).parent.parent.parent / "shared" / "config" / "settings.json"
    service_manager.load_config(config_path)
    config = service_manager.get_config()
    
    # Initialize only core services that work without external dependencies
    services = {
        "system_monitoring": SystemMonitoringService(config),
        "settings": SettingsService(config),
        "websocket": WebSocketService(config),
    }
    
    # Register services with service manager
    for name, service in services.items():
        service_manager.register_service(name, service)
    
    # Register API routes
    APIRouter(app, services)
    
    return app


# Create the application instance
app = create_minimal_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)