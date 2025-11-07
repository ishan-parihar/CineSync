"""
Shared configuration module for backend to use shared resources.

This module provides centralized access to shared configuration files
and ensures consistent path resolution across the backend.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Get the project root directory (where shared/ is located)
PROJECT_ROOT = Path(__file__).parent.parent.parent
SHARED_CONFIG_DIR = PROJECT_ROOT / "shared" / "config"


def get_shared_config_path(config_file: str) -> Path:
    """
    Get the absolute path to a shared configuration file.
    
    Args:
        config_file: Name of the config file (e.g., "settings.json")
        
    Returns:
        Absolute path to the shared config file
    """
    return SHARED_CONFIG_DIR / config_file


def load_shared_config(config_file: str) -> Dict[str, Any]:
    """
    Load a shared configuration file.
    
    Args:
        config_file: Name of the config file (e.g., "settings.json")
        
    Returns:
        Configuration dictionary
        
    Raises:
        FileNotFoundError: If the config file doesn't exist
        json.JSONDecodeError: If the config file is invalid JSON
    """
    config_path = get_shared_config_path(config_file)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Shared config file not found: {config_path}")
    
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in shared config file {config_path}: {e}")
        raise


def get_settings() -> Dict[str, Any]:
    """
    Get the main settings configuration.
    
    Returns:
        Settings dictionary
    """
    return load_shared_config("settings.json")


def get_cinematography_rules() -> Dict[str, Any]:
    """
    Get the cinematography rules configuration.
    
    Returns:
        Cinematography rules dictionary
    """
    return load_shared_config("cinematography_rules.json")


def get_shot_purpose_profiles() -> Dict[str, Any]:
    """
    Get the shot purpose profiles configuration.
    
    Returns:
        Shot purpose profiles dictionary
    """
    return load_shared_config("shot_purpose_profiles.json")


def get_transform_presets() -> Dict[str, Any]:
    """
    Get the transform presets configuration.
    
    Returns:
        Transform presets dictionary
    """
    return load_shared_config("transform_presets.json")


def get_logging_config() -> Dict[str, Any]:
    """
    Get the logging configuration.
    
    Returns:
        Logging configuration dictionary
    """
    return load_shared_config("logging_config.json")


# Common config file paths for backward compatibility
SETTINGS_PATH = str(get_shared_config_path("settings.json"))
CINEMATOGRAPHY_RULES_PATH = str(get_shared_config_path("cinematography_rules.json"))
SHOT_PURPOSE_PROFILES_PATH = str(get_shared_config_path("shot_purpose_profiles.json"))
TRANSFORM_PRESETS_PATH = str(get_shared_config_path("transform_presets.json"))
LOGGING_CONFIG_PATH = str(get_shared_config_path("logging_config.json"))


def validate_shared_configs() -> bool:
    """
    Validate that all required shared config files exist.
    
    Returns:
        True if all configs exist, False otherwise
    """
    required_configs = [
        "settings.json",
        "cinematography_rules.json", 
        "shot_purpose_profiles.json",
        "transform_presets.json",
        "logging_config.json"
    ]
    
    missing_configs = []
    for config_file in required_configs:
        config_path = get_shared_config_path(config_file)
        if not config_path.exists():
            missing_configs.append(str(config_path))
    
    if missing_configs:
        logger.error(f"Missing shared config files: {missing_configs}")
        return False
    
    logger.info("All shared config files are present")
    return True


def setup_shared_logging(verbose: bool = False) -> logging.Logger:
    """
    Setup logging using shared configuration.
    
    Args:
        verbose: Enable debug logging
        
    Returns:
        Configured logger
    """
    import logging.config
    
    try:
        config = get_logging_config()
        
        if verbose:
            config["loggers"]["lip_sync"]["level"] = "DEBUG"
            config["handlers"]["console"]["level"] = "DEBUG"
        
        logging.config.dictConfig(config)
        return logging.getLogger("lip_sync")
        
    except Exception as e:
        # Fallback to basic logging if shared config fails
        logging.basicConfig(
            level=logging.DEBUG if verbose else logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger.warning(f"Failed to load shared logging config, using basic logging: {e}")
        return logging.getLogger("lip_sync")