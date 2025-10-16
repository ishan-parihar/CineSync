import json
import os
from pathlib import Path
from typing import Dict, List, Optional
import logging

logger = logging.getLogger('lip_sync.preset_manager')


class PresetManager:
    """Manages character presets and asset configurations"""
    
    def __init__(self, config_path: str = "config/settings.json"):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.preset_dir = Path(self.config['presets']['preset_directory'])
        self.presets_cache = {}
        self._scan_presets()
    
    def _scan_presets(self):
        """Discover all available presets in assets directory"""
        logger.info(f"Scanning presets in {self.preset_dir}")
        
        for character_dir in self.preset_dir.iterdir():
            if not character_dir.is_dir() or character_dir.name == 'preset_template':
                continue
            
            for angle_dir in character_dir.iterdir():
                if not angle_dir.is_dir():
                    continue
                
                config_file = angle_dir / 'preset_config.json'
                if config_file.exists():
                    preset_key = f"{character_dir.name}/{angle_dir.name}"
                    self.presets_cache[preset_key] = self._load_preset_config(config_file)
                    logger.debug(f"Loaded preset: {preset_key}")
    
    def _load_preset_config(self, config_path: Path) -> Dict:
        """Load preset configuration from JSON file"""
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def get_preset(self, preset_name: str) -> Dict:
        """Retrieve preset configuration by name"""
        if preset_name not in self.presets_cache:
            raise ValueError(f"Preset '{preset_name}' not found. Available: {self.list_presets()}")
        
        preset_config = self.presets_cache[preset_name].copy()
        preset_path = self.preset_dir / preset_name
        
        # Resolve absolute paths for all image assets
        preset_config['background']['image'] = str(preset_path / preset_config['background']['image'])
        
        for shape, filename in preset_config['mouth_shapes'].items():
            preset_config['mouth_shapes'][shape] = str(preset_path / filename)
        
        return preset_config
    
    def list_presets(self) -> List[str]:
        """Return list of all available preset identifiers"""
        return list(self.presets_cache.keys())
    
    def create_preset_from_template(self, character_id: str, angle: str, description: str = "") -> str:
        """Create new preset directory structure from template"""
        template_path = self.preset_dir / 'preset_template' / 'template_config.json'
        
        with open(template_path, 'r') as f:
            template_config = json.load(f)
        
        # Update configuration
        preset_name = f"{character_id}_{angle}"
        template_config['preset_name'] = preset_name
        template_config['character_id'] = character_id
        template_config['angle'] = angle
        template_config['description'] = description
        template_config['metadata']['created_date'] = str(Path(__file__).stat().st_mtime)
        
        # Create directory structure
        preset_path = self.preset_dir / character_id / angle
        preset_path.mkdir(parents=True, exist_ok=True)
        
        # Write configuration
        config_output = preset_path / 'preset_config.json'
        with open(config_output, 'w') as f:
            json.dump(template_config, f, indent=2)
        
        logger.info(f"Created new preset: {character_id}/{angle}")
        
        # Refresh preset cache
        self._scan_presets()
        
        return f"{character_id}/{angle}"
    
    def validate_preset(self, preset_name: str) -> bool:
        """Verify all required assets exist for preset"""
        try:
            preset_config = self.get_preset(preset_name)
            
            # Check background image
            if not os.path.exists(preset_config['background']['image']):
                logger.error(f"Background missing: {preset_config['background']['image']}")
                return False
            
            # Check all mouth shape images
            for shape, path in preset_config['mouth_shapes'].items():
                if not os.path.exists(path):
                    logger.error(f"Mouth shape {shape} missing: {path}")
                    return False
            
            logger.info(f"Preset '{preset_name}' validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Preset validation failed: {e}")
            return False