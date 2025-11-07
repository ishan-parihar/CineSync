"""
Base service classes for dependency injection and service management
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)


class BaseService(ABC):
    """Base class for all services with common functionality"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logger
        self._validate_config()
    
    @abstractmethod
    def _validate_config(self) -> None:
        """Validate service-specific configuration"""
        pass
    
    @property
    def project_root(self) -> Path:
        """Get project root path"""
        return Path(__file__).parent.parent.parent.parent


class ConfigurableService(BaseService):
    """Base class for services that need configuration management"""
    
    def __init__(self, config: Dict[str, Any], config_file: Optional[str] = None):
        super().__init__(config)
        self.config_file = config_file
        self._load_config()
    
    def _load_config(self) -> None:
        """Load configuration from file if specified"""
        if self.config_file:
            config_path = self.project_root / self.config_file
            if config_path.exists():
                with open(config_path, 'r') as f:
                    file_config = json.load(f)
                    self.config.update(file_config)
            else:
                self.logger.warning(f"Config file not found: {config_path}")
    
    def save_config(self) -> None:
        """Save current configuration to file"""
        if self.config_file:
            config_path = self.project_root / self.config_file
            config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            self.logger.info(f"Configuration saved to {config_path}")


class ServiceManager:
    """Manages service instances and dependency injection"""
    
    def __init__(self):
        self._services: Dict[str, BaseService] = {}
        self._config: Dict[str, Any] = {}
    
    def load_config(self, config_path: Path) -> None:
        """Load main configuration"""
        if config_path.exists():
            with open(config_path, 'r') as f:
                self._config = json.load(f)
        else:
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    def register_service(self, name: str, service: BaseService) -> None:
        """Register a service instance"""
        self._services[name] = service
        logger.info(f"Service registered: {name}")
    
    def get_service(self, name: str) -> BaseService:
        """Get a service instance"""
        if name not in self._services:
            raise ValueError(f"Service not found: {name}")
        return self._services[name]
    
    def get_config(self) -> Dict[str, Any]:
        """Get the main configuration"""
        return self._config
    
    @property
    def project_root(self) -> Path:
        """Get project root path"""
        return Path(__file__).parent.parent.parent.parent


# Global service manager instance
service_manager = ServiceManager()