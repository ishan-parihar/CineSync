"""
Settings management service for application configuration
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from .base import BaseService


class SettingsService(BaseService):
    """Service for managing application settings"""
    
    def _validate_config(self) -> None:
        """Validate settings service configuration"""
        # Settings service doesn't require specific config validation
        pass
    
    def get_settings(self) -> Dict[str, Any]:
        """Get the main application settings"""
        config_path = self.project_root / "shared" / "config" / "settings.json"
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
            return {"settings": config}
        except Exception as e:
            return {"error": str(e)}
    
    def update_settings(self, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update the main application settings"""
        config_path = self.project_root / "shared" / "config" / "settings.json"
        try:
            # Load existing settings
            with open(config_path, "r") as f:
                config = json.load(f)
            
            # Update with provided settings data
            # Only update fields that exist in the current config to avoid overwriting important settings
            for key, value in settings_data.items():
                if key in config:
                    config[key] = value
                # Also check nested objects
                elif "." in key:
                    # Handle nested keys like 'profiles.default_profile'
                    keys = key.split(".")
                    temp_config = config
                    for k in keys[:-1]:
                        if k in temp_config and isinstance(temp_config[k], dict):
                            temp_config = temp_config[k]
                        else:
                            break
                    else:
                        if keys[-1] in temp_config:
                            temp_config[keys[-1]] = value
            
            # Save updated settings
            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)
            
            return {"message": "Settings updated successfully"}
        except Exception as e:
            return {"error": str(e)}