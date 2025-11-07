"""
Services package for LipSyncAutomation
"""

from .base import BaseService, ConfigurableService, ServiceManager, service_manager
from .system_monitoring import SystemMonitoringService
from .profile_service import ProfileService
from .settings_service import SettingsService
from .websocket_service import WebSocketService
from .emotion_service import EmotionAnalysisService
from .cinematography_service import CinematographyService
from .processing_service import ProcessingService

__all__ = [
    "BaseService",
    "ConfigurableService", 
    "ServiceManager",
    "service_manager",
    "SystemMonitoringService",
    "ProfileService",
    "SettingsService", 
    "WebSocketService",
    "EmotionAnalysisService",
    "CinematographyService",
    "ProcessingService"
]