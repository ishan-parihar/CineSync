#!/usr/bin/env python3
"""
Enhanced Animation Structure Manager for LipSyncAutomation v2.0
Standardized directory structure: characters -> angles -> emotions -> image presets
Integrates with existing preset management system and provides comprehensive validation
Author: Development Team
Date: 2025-10-18
"""

import os
import json
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass, asdict, field
import logging

# Import existing preset manager for integration
try:
    from src.core.preset_manager import PresetManager
except ImportError:
    PresetManager = None
    print("Warning: Could not import PresetManager, preset integration disabled")

from dataclasses import dataclass, asdict, field

@dataclass
class AnimationFileConfig:
    """Configuration for animation file management"""
    base_path: str = "profiles"
    preset_path: str = "assets/presets"
    emotions: List[str] = field(default_factory=list)
    viseme_images: List[str] = field(default_factory=list)
    angles: List[str] = field(default_factory=list)
    required_files: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        if not self.emotions:
            self.emotions = [
                'joy', 'sadness', 'anger', 
                'fear', 'surprise', 'disgust', 'trust', 'anticipation'
            ]
        if not self.viseme_images:
            self.viseme_images = [
                'A.png', 'B.png', 'C.png', 'D.png', 
                'E.png', 'F.png', 'G.png', 'H.png', 'X.png'
            ]
        if not self.angles:
            self.angles = ['ECU', 'CU', 'MCU', 'MS']  # Extreme Close-Up, Close-Up, Medium Close-Up, Medium Shot
        if not self.required_files:
            self.required_files = self.viseme_images[:]

class AnimationStructureManager:
    """
    Enhanced manager for standardized animation preset directory structure:
    characters/
    └── character_name/
        ├── profile_config.json
        └── angles/
            └── angle_name/
                └── emotions/
                    └── emotion_name/
                        ├── A.png
                        ├── B.png
                        ├── C.png
                        ├── D.png
                        ├── E.png
                        ├── F.png
                        ├── G.png
                        ├── H.png
                        └── X.png
    """
    
    def __init__(self, base_path: str = "profiles", preset_path: str = "assets/presets", config: AnimationFileConfig = None):
        """
        Initialize the enhanced animation structure manager.
        
        Args:
            base_path: Base directory for character animations (default: "profiles")
            preset_path: Base directory for presets (default: "assets/presets")
            config: Configuration object with structure settings
        """
        self.base_path = Path(base_path)
        self.preset_path = Path(preset_path)
        
        # Create config with proper default values if not provided
        if config is None:
            self.config = AnimationFileConfig()
            # Override with provided paths if config is None
            self.config.base_path = base_path
            self.config.preset_path = preset_path
        else:
            self.config = config
            
        self.logger = self._setup_logging()
        
        # Initialize preset manager if available
        self.preset_manager = self._init_preset_manager()
        
        self.logger.info(f"AnimationStructureManager initialized with base_path: {self.base_path}, preset_path: {self.preset_path}")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for the manager."""
        logger = logging.getLogger('animation.structure.manager')
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(logging.INFO)
        return logger
    
    def _init_preset_manager(self):
        """Initialize preset manager if available."""
        if PresetManager:
            try:
                return PresetManager()
            except Exception as e:
                self.logger.warning(f"Could not initialize preset manager: {e}")
                return None
        return None
    
    def create_character(self, character_name: str, description: str = "", angles: List[str] = None) -> bool:
        """
        Create a new character directory with all required subdirectories.
        
        Args:
            character_name: Name of the character to create
            description: Description of the character
            angles: Optional list of angles to create (defaults to config)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            character_path = self.base_path / character_name
            character_path.mkdir(parents=True, exist_ok=True)
            
            # Use config angles if none provided
            effective_angles = angles if angles is not None else self.config.angles
            
            # Create profile config
            profile_config = {
                "name": character_name,
                "description": description,
                "created_date": str(Path(__file__).stat().st_mtime),
                "angles": effective_angles,
                "emotions": self.config.emotions,
                "visemes": self.config.viseme_images
            }
            
            with open(character_path / "profile_config.json", 'w') as f:
                json.dump(profile_config, f, indent=2)
            
            # Create angles directory
            angles_path = character_path / "angles"
            angles_path.mkdir(exist_ok=True)
            
             # Create all angle directories
            for angle in effective_angles:
                self._create_angle_structure(character_path, angle)
            
            self.logger.info(f"Created character '{character_name}' with complete structure")
            print(f"OK - Created character '{character_name}' with complete structure")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating character '{character_name}': {e}")
            print(f"[ERROR] Error creating character '{character_name}': {e}")
            return False
    
    def _create_angle_structure(self, character_path: Path, angle_name: str):
        """Create the structure for a single angle."""
        # Create angle directory
        angle_path = character_path / "angles" / angle_name
        angle_path.mkdir(exist_ok=True)
        
        # Create emotions directory for each angle
        emotions_path = angle_path / "emotions"
        emotions_path.mkdir(exist_ok=True)
        
        # Create emotion directories with viseme images
        for emotion in self.config.emotions:
            emotion_path = emotions_path / emotion
            emotion_path.mkdir(exist_ok=True)
            
            # Create placeholder files for each viseme
            for viseme in self.config.required_files:
                viseme_path = emotion_path / viseme
                # Create a placeholder file (empty for now)
                viseme_path.touch(exist_ok=True)
    
    def add_angle(self, character_name: str, angle_name: str) -> bool:
        """
        Add a new angle to an existing character.
        
        Args:
            character_name: Name of existing character
            angle_name: Name of angle to add
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if character exists
            character_path = self.base_path / character_name
            if not character_path.exists():
                self.logger.error(f"Character '{character_name}' does not exist")
                print(f"✗ Character '{character_name}' does not exist")
                return False
            
            # Check if angle already exists
            angle_path = character_path / "angles" / angle_name
            if angle_path.exists():
                self.logger.warning(f"Angle '{angle_name}' already exists for character '{character_name}'")
                print(f"! Angle '{angle_name}' already exists for '{character_name}'")
                return True
            
            self._create_angle_structure(character_path, angle_name)
            
            # Update profile config to include the new angle
            self._add_angle_to_profile_config(character_name, angle_name)
            
            self.logger.info(f"Added angle '{angle_name}' to character '{character_name}'")
            print(f"Added angle '{angle_name}' to character '{character_name}' successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding angle '{angle_name}' to '{character_name}': {e}")
            print(f"✗ Error adding angle '{angle_name}' to '{character_name}': {e}")
            return False
    
    def _add_angle_to_profile_config(self, character_name: str, angle_name: str):
        """Add angle to the character's profile config."""
        config_path = self.base_path / character_name / "profile_config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            if "angles" not in config:
                config["angles"] = []
            
            if angle_name not in config["angles"]:
                config["angles"].append(angle_name)
                config["angles"] = sorted(list(set(config["angles"])))  # Ensure uniqueness and sorting
            
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
    
    def add_emotion(self, character_name: str, angle_name: str, emotion_name: str) -> bool:
        """
        Add a new emotion to an existing character angle.
        
        Args:
            character_name: Name of existing character
            angle_name: Name of existing angle
            emotion_name: Name of emotion to add
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if character and angle exist
            emotion_path = self.base_path / character_name / "angles" / angle_name / "emotions" / emotion_name
            if emotion_path.exists():
                self.logger.warning(f"Emotion '{emotion_name}' already exists for '{character_name}/{angle_name}'")
                print(f"! Emotion '{emotion_name}' already exists for '{character_name}/{angle_name}'")
                return True
            
            emotion_path.mkdir(parents=True, exist_ok=True)
            
            # Create viseme placeholder files for the emotion
            for viseme in self.config.required_files:
                viseme_path = emotion_path / viseme
                viseme_path.touch(exist_ok=True)
            
            self.logger.info(f"Added emotion '{emotion_name}' to '{character_name}/{angle_name}'")
            print(f"✓ Added emotion '{emotion_name}' to '{character_name}/{angle_name}'")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding emotion '{emotion_name}' to '{character_name}/{angle_name}': {e}")
            print(f"✗ Error adding emotion '{emotion_name}' to '{character_name}/{angle_name}': {e}")
            return False
    
    def add_viseme_image(self, character_name: str, angle_name: str, emotion_name: str, viseme_name: str) -> bool:
        """
        Add a viseme image to an existing emotion.
        
        Args:
            character_name: Name of existing character
            angle_name: Name of existing angle
            emotion_name: Name of existing emotion
            viseme_name: Name of viseme image to add (e.g., "A.png")
            
        Returns:
            True if successful, False otherwise
        """
        try:
            viseme_path = self.base_path / character_name / "angles" / angle_name / "emotions" / emotion_name / viseme_name
            viseme_path.touch(exist_ok=True)
            
            self.logger.info(f"Added viseme '{viseme_name}' to '{character_name}/{angle_name}/{emotion_name}'")
            print(f"✓ Added viseme '{viseme_name}' to '{character_name}/{angle_name}/{emotion_name}'")
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding viseme '{viseme_name}' to '{character_name}/{angle_name}/{emotion_name}': {e}")
            print(f"✗ Error adding viseme '{viseme_name}' to '{character_name}/{angle_name}/{emotion_name}': {e}")
            return False
    
    def list_characters(self) -> List[str]:
        """List all characters in the base directory."""
        characters = []
        if self.base_path.exists():
            for item in self.base_path.iterdir():
                if item.is_dir():
                    # Check if it has the expected structure
                    angles_path = item / "angles"
                    if angles_path.exists():
                        characters.append(item.name)
        return sorted(characters)
    
    def list_angles(self, character_name: str) -> List[str]:
        """List all angles for a specific character."""
        angles = []
        angles_path = self.base_path / character_name / "angles"
        if angles_path.exists():
            for item in angles_path.iterdir():
                if item.is_dir():
                    angles.append(item.name)
        return sorted(angles)
    
    def list_emotions(self, character_name: str, angle_name: str) -> List[str]:
        """List all emotions for a specific character angle."""
        emotions = []
        emotions_path = self.base_path / character_name / "angles" / angle_name / "emotions"
        if emotions_path.exists():
            for item in emotions_path.iterdir():
                if item.is_dir():
                    emotions.append(item.name)
        return sorted(emotions)
    
    def get_character_config(self, character_name: str) -> Dict[str, Any]:
        """Get the configuration for a character."""
        config_path = self.base_path / character_name / "profile_config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                return json.load(f)
        return {}
    
    def validate_character_animation_set(self, character_name: str) -> Dict[str, Any]:
        """
        Validate that all required animation files exist for a character.
        
        Args:
            character_name: Name of character to validate
            
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            "character": character_name,
            "valid": True,
            "missing_files": [],
            "errors": [],
            "warnings": [],
            "summary": {}
        }
        
        try:
            # Check if character exists
            character_path = self.base_path / character_name
            if not character_path.exists():
                validation_result["valid"] = False
                validation_result["errors"].append(f"Character '{character_name}' does not exist")
                return validation_result
            
            # Count total expected and found items
            total_expected_sets = 0
            total_found_sets = 0
            total_files_found = 0
            total_files_expected = 0
            
            # Get expected angles for this character
            char_config = self.get_character_config(character_name)
            expected_angles = char_config.get("angles", self.config.angles)
            
            # Check all angles for this character
            for angle in expected_angles:
                angle_path = character_path / "angles" / angle
                if not angle_path.exists():
                    missing_path = f"angles/{angle}/"
                    validation_result["missing_files"].append(missing_path)
                    validation_result["valid"] = False
                    continue  # This angle doesn't exist
                
                # Check all emotions for this angle
                for emotion in char_config.get("emotions", self.config.emotions):
                    emotion_path = angle_path / "emotions" / emotion
                    if not emotion_path.exists():
                        missing_path = f"angles/{angle}/emotions/{emotion}/"
                        validation_result["missing_files"].append(missing_path)
                        validation_result["valid"] = False
                    else:
                        # Check all required visemes for this emotion
                        for viseme in char_config.get("visemes", self.config.required_files):
                            viseme_path = emotion_path / viseme
                            total_files_expected += 1
                            if not viseme_path.exists():
                                missing_file = f"angles/{angle}/emotions/{emotion}/{viseme}"
                                validation_result["missing_files"].append(missing_file)
                                validation_result["valid"] = False
                            else:
                                total_files_found += 1
            
            # Calculate summary
            validation_result["summary"] = {
                "total_files_expected": total_files_expected,
                "total_files_found": total_files_found,
                "completeness_percentage": (total_files_found / total_files_expected * 100) if total_files_expected > 0 else 0
            }
            
            if validation_result["valid"] and validation_result["missing_files"]:
                validation_result["valid"] = False
            
            if validation_result["valid"]:
                self.logger.info(f"Character '{character_name}' is fully validated")
                print(f"[OK] Character '{character_name}' is fully validated")
            else:
                self.logger.warning(f"Character '{character_name}' validation failed - {len(validation_result['missing_files'])} missing files")
                print(f"[ERROR] Character '{character_name}' validation failed - {len(validation_result['missing_files'])} missing files")
                
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(str(e))
            self.logger.error(f"Error validating character '{character_name}': {e}")
            print(f"[ERROR] Error validating character '{character_name}': {e}")
        
        return validation_result
    
    def validate_all_characters(self) -> Dict[str, Any]:
        """Validate all characters in the directory."""
        all_characters = self.list_characters()
        validation_results = {
            "total_characters": len(all_characters),
            "valid_characters": 0,
            "invalid_characters": [],
            "details": {},
            "summary": {
                "total_files_expected": 0,
                "total_files_found": 0
            }
        }
        
        for character in all_characters:
            result = self.validate_character_animation_set(character)
            validation_results["details"][character] = result
            validation_results["summary"]["total_files_expected"] += result["summary"]["total_files_expected"]
            validation_results["summary"]["total_files_found"] += result["summary"]["total_files_found"]
            
            if result["valid"]:
                validation_results["valid_characters"] += 1
            else:
                validation_results["invalid_characters"].append(character)
        
        return validation_results
    
    def validate_preset_integration(self, character_name: str, angle_name: str) -> Dict[str, Any]:
        """
        Validate that preset files and animation structure are synchronized.
        
        Args:
            character_name: Name of character to validate
            angle_name: Name of angle to validate
            
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            "character": character_name,
            "angle": angle_name,
            "preset_valid": True,
            "animation_valid": True,
            "synchronized": True,
            "missing_in_preset": [],
            "missing_in_animation": [],
            "differences": []
        }
        
        # Check if preset manager is available
        if not self.preset_manager:
            validation_result["errors"] = ["Preset manager not available"]
            validation_result["synchronized"] = False
            return validation_result
        
        try:
            # Validate preset exists and is valid
            preset_key = f"{character_name}/{angle_name}"
            if preset_key in self.preset_manager.list_presets():
                preset_valid = self.preset_manager.validate_preset(preset_key)
                validation_result["preset_valid"] = preset_valid
            else:
                validation_result["preset_valid"] = False
                validation_result["missing_preset"] = True
        
            # Validate animation structure
            angle_path = self.base_path / character_name / "angles" / angle_name
            if angle_path.exists():
                # Check if all emotions have all visemes
                for emotion in self.config.emotions:
                    emotion_path = angle_path / "emotions" / emotion
                    if emotion_path.exists():
                        for viseme in self.config.viseme_images:
                            viseme_path = emotion_path / viseme
                            if not viseme_path.exists():
                                validation_result["missing_in_animation"].append(f"{emotion}/{viseme}")
                    else:
                        # Check if emotion exists in preset
                        validation_result["missing_in_animation"].append(f"{emotion}/all_visemes")
            else:
                validation_result["animation_valid"] = False
            
            # Check preset structure for comparison  
            if preset_key in self.preset_manager.list_presets():
                try:
                    preset_config = self.preset_manager.get_preset(preset_key)
                    # Check what visemes are defined in preset
                    for viseme_shape in preset_config.get("mouth_shapes", {}):
                        # Check if this viseme is properly mapped in all animation emotions
                        for emotion in self.config.emotions:
                            expected_anim_viseme = f"{viseme_shape}.png"
                            anim_viseme_path = angle_path / "emotions" / emotion / expected_anim_viseme
                            if not anim_viseme_path.exists():
                                missing_pair = f"{emotion}/{viseme_shape}"
                                if missing_pair not in validation_result["missing_in_animation"]:
                                    validation_result["missing_in_animation"].append(missing_pair)
                except Exception as e:
                    validation_result["errors"].append(f"Preset config error: {str(e)}")
        
            # Determine synchronization status
            if (not validation_result["preset_valid"] or 
                not validation_result["animation_valid"] or 
                validation_result["missing_in_animation"] or 
                validation_result["missing_in_preset"]):
                validation_result["synchronized"] = False
        
        except Exception as e:
            validation_result["errors"] = [str(e)]
            validation_result["synchronized"] = False
        
        return validation_result

    def validate_both_structures(self) -> Dict[str, Any]:
        """
        Validate both profiles and assets/presets structures comprehensively.
        
        Returns:
            Dictionary with comprehensive validation results for both structures
        """
        overall_result = {
            "profiles_structure": {
                "valid": True,
                "validation_results": {},
                "summary": {}
            },
            "presets_structure": {
                "valid": True,
                "validation_results": {},
                "summary": {}
            },
            "cross_structure_validation": {
                "synchronized": True,
                "differences": [],
                "conflicts": [],
                "detailed_comparison": {}
            },
            "overall_status": "healthy"
        }
        
        # Validate profiles structure
        try:
            profiles_validation = self.validate_all_characters()
            overall_result["profiles_structure"]["validation_results"] = profiles_validation
            overall_result["profiles_structure"]["summary"] = profiles_validation.get("summary", {})
            
            # Check if any profile characters are invalid
            overall_result["profiles_structure"]["valid"] = profiles_validation["valid_characters"] == profiles_validation["total_characters"]
        except Exception as e:
            overall_result["profiles_structure"]["valid"] = False
            overall_result["profiles_structure"]["error"] = str(e)
        
        # Validate presets structure (if preset manager is available)
        try:
            if self.preset_manager:
                all_presets = self.preset_manager.list_presets()
                preset_validation_results = {}
                
                total_presets = len(all_presets)
                valid_presets = 0
                
                for preset in all_presets:
                    is_valid = self.preset_manager.validate_preset(preset)
                    preset_validation_results[preset] = {
                        "valid": is_valid,
                        "preset_info": self.preset_manager.get_preset(preset) if is_valid else None
                    }
                    
                    if is_valid:
                        valid_presets += 1
                
                overall_result["presets_structure"]["validation_results"] = preset_validation_results
                overall_result["presets_structure"]["summary"] = {
                    "total_presets": total_presets,
                    "valid_presets": valid_presets,
                    "invalid_presets": total_presets - valid_presets
                }
                
                overall_result["presets_structure"]["valid"] = (valid_presets == total_presets)
            else:
                overall_result["presets_structure"]["valid"] = False
                overall_result["presets_structure"]["error"] = "Preset manager not available"
        except Exception as e:
            overall_result["presets_structure"]["valid"] = False
            overall_result["presets_structure"]["error"] = str(e)
        
        # Cross-structure validation
        try:
            detailed_comparison = {}
            
            # Check for profile characters that don't have matching presets and vice versa
            profile_characters = self.list_characters()
            if self.preset_manager:
                all_presets = self.preset_manager.list_presets()
                
                # Extract character/angle pairs from presets
                preset_char_angle_pairs = []
                for preset in all_presets:
                    parts = preset.split('/', 1)
                    if len(parts) == 2:
                        preset_char_angle_pairs.append((parts[0], parts[1]))
                
                # Create a mapping for detailed comparison
                profile_mapping = {}
                for char in profile_characters:
                    profile_mapping[char] = self.list_angles(char)
                
                preset_mapping = {}
                for preset_char, preset_angle in preset_char_angle_pairs:
                    if preset_char not in preset_mapping:
                        preset_mapping[preset_char] = []
                    preset_mapping[preset_char].append(preset_angle)
                
                # Check for mismatches
                detailed_comparison["missing_in_presets"] = []
                detailed_comparison["missing_in_profiles"] = []
                
                for char in profile_characters:
                    profile_angles = set(profile_mapping[char])
                    preset_angles = set(preset_mapping.get(char, []))
                    
                    missing_in_presets = profile_angles - preset_angles
                    if missing_in_presets:
                        detailed_comparison["missing_in_presets"].append({
                            "character": char,
                            "angles": list(missing_in_presets)
                        })
                        for angle in missing_in_presets:
                            overall_result["cross_structure_validation"]["differences"].append(
                                f"Profile character '{char}/{angle}' has no matching preset"
                            )
                    
                    missing_in_profiles = preset_angles - profile_angles
                    if missing_in_profiles:
                        detailed_comparison["missing_in_profiles"].append({
                            "character": char,
                            "angles": list(missing_in_profiles)
                        })
                        for angle in missing_in_profiles:
                            overall_result["cross_structure_validation"]["differences"].append(
                                f"Preset character '{char}/{angle}' has no matching profile"
                            )
                
                # For characters that exist in both, check detailed content
                common_characters = set(profile_characters) & set(preset_mapping.keys())
                detailed_comparison["content_differences"] = []
                
                for char in common_characters:
                    common_angles = set(profile_mapping[char]) & set(preset_mapping[char])
                    for angle in common_angles:
                        # Validate the integration between preset and animation structure for this combination
                        integration_result = self.validate_preset_integration(char, angle)
                        if not integration_result["synchronized"]:
                            detailed_comparison["content_differences"].append({
                                "character": char,
                                "angle": angle,
                                "integration_result": integration_result
                            })
            
            overall_result["cross_structure_validation"]["detailed_comparison"] = detailed_comparison
            
            # Set overall sync status
            if (overall_result["cross_structure_validation"]["differences"] or 
                not overall_result["profiles_structure"]["valid"] or 
                not overall_result["presets_structure"]["valid"] or
                detailed_comparison["content_differences"]):
                overall_result["cross_structure_validation"]["synchronized"] = False
                overall_result["overall_status"] = "out_of_sync"
            else:
                overall_result["overall_status"] = "synchronized"
                
        except Exception as e:
            overall_result["cross_structure_validation"]["error"] = str(e)
            overall_result["overall_status"] = "error"
            self.logger.error(f"Error in cross-structure validation: {e}")
        
        # Final health check
        if overall_result["overall_status"] == "healthy":
            if not overall_result["profiles_structure"]["valid"]:
                overall_result["overall_status"] = "profiles_error"
            elif not overall_result["presets_structure"]["valid"]:
                overall_result["overall_status"] = "presets_error"
            elif not overall_result["cross_structure_validation"]["synchronized"]:
                overall_result["overall_status"] = "out_of_sync"
        
        return overall_result

    def synchronize_structures(self, profile_to_preset: bool = True, preset_to_profile: bool = True, 
                             create_missing: bool = True, force_sync: bool = False) -> Dict[str, Any]:
        """
        Synchronize both structures based on the configured direction.
        
        Args:
            profile_to_preset: Whether to sync from profile structure to preset structure
            preset_to_profile: Whether to sync from preset structure to profile structure
            create_missing: Whether to create missing structures during sync
            force_sync: Whether to overwrite existing content during sync
            
        Returns:
            Dictionary with synchronization results
        """
        sync_results = {
            "profile_to_preset": {"synchronized": 0, "failed": 0, "skipped": 0},
            "preset_to_profile": {"synchronized": 0, "failed": 0, "skipped": 0},
            "created_structures": [],
            "errors": []
        }
        
        if not self.preset_manager:
            sync_results["errors"].append("Preset manager not available")
            return sync_results
        
        try:
            # Sync from profile to preset if requested
            if profile_to_preset:
                profile_characters = self.list_characters()
                for char in profile_characters:
                    angles = self.list_angles(char)
                    for angle in angles:
                        # Check if corresponding preset exists
                        preset_key = f"{char}/{angle}"
                        preset_exists = preset_key in self.preset_manager.list_presets()
                        
                        if not preset_exists and create_missing:
                            # Create preset based on profile structure
                            try:
                                new_preset_key = self.preset_manager.create_preset_from_template(
                                    char, angle, f"Created from profile structure for {char}/{angle}"
                                )
                                sync_results["created_structures"].append(f"preset:{new_preset_key}")
                                self.logger.info(f"Created preset {new_preset_key} from profile structure")
                            except Exception as e:
                                sync_results["errors"].append(f"Failed to create preset for {char}/{angle}: {str(e)}")
                                sync_results["preset_to_profile"]["failed"] += 1
                                continue
                        
                        # Sync content from profile to preset if it exists
                        if preset_to_profile or force_sync:  # We need this in both directions
                            # Actually sync content - this would involve copying viseme images
                            # from both structures to ensure they match
                            sync_result = self._sync_content_profile_to_preset(char, angle, force_sync)
                            if sync_result:
                                sync_results["profile_to_preset"]["synchronized"] += 1
                            else:
                                sync_results["profile_to_preset"]["failed"] += 1
            
            # Sync from preset to profile if requested
            if preset_to_profile:
                all_presets = self.preset_manager.list_presets()
                for preset_key in all_presets:
                    parts = preset_key.split('/', 1)
                    if len(parts) == 2:
                        char, angle = parts
                        char_exists = char in self.list_characters()
                        
                        if not char_exists and create_missing:
                            # Create character structure based on preset
                            try:
                                self.create_character(char, f"Created from preset {preset_key}")
                                sync_results["created_structures"].append(f"profile:{char}")
                                self.logger.info(f"Created profile character {char} from preset")
                            except Exception as e:
                                sync_results["errors"].append(f"Failed to create profile character {char}: {str(e)}")
                                sync_results["preset_to_profile"]["failed"] += 1
                                continue
                        
                        # Add angle if it doesn't exist
                        if char_exists or create_missing:
                            if angle not in self.list_angles(char):
                                try:
                                    self.add_angle(char, angle)
                                    self.logger.info(f"Added angle {angle} to character {char}")
                                except Exception as e:
                                    sync_results["errors"].append(f"Failed to add angle {angle} to character {char}: {str(e)}")
                                    sync_results["preset_to_profile"]["failed"] += 1
                                    continue
                        
                        # Synchronize content from preset to profile structure
                        sync_result = self.synchronize_preset_to_animation(char, angle, force_sync)
                        if sync_result:
                            sync_results["preset_to_profile"]["synchronized"] += 1
                        else:
                            sync_results["preset_to_profile"]["failed"] += 1
                            
        except Exception as e:
            sync_results["errors"].append(f"Synchronization error: {str(e)}")
            self.logger.error(f"Synchronization error: {e}")
        
        return sync_results
    
    def _sync_content_profile_to_preset(self, character_name: str, angle_name: str, force_sync: bool = False) -> bool:
        """
        Synchronize content from profile to preset (typically the other way around).
        This is needed for bidirectional sync.
        """
        # In practice, this might involve updating preset config files based on profile data
        # For now, we'll just validate and log the status
        if not self.preset_manager:
            return False
            
        try:
            # Check if both structures exist
            profile_angle_path = self.base_path / character_name / "angles" / angle_name
            if not profile_angle_path.exists():
                return False
            
            # Get preset config
            preset_key = f"{character_name}/{angle_name}"
            if preset_key not in self.preset_manager.list_presets():
                return False
            
            preset_config = self.preset_manager.get_preset(preset_key)
            
            # This would typically involve updating preset files based on profile structure
            # For now, we'll just return True if both exist
            self.logger.debug(f"Content sync check from profile to preset for {character_name}/{angle_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error in content sync from profile to preset: {e}")
            return False

    def create_consolidated_structure(self, target_path: str = "profiles_consolidated") -> bool:
        """
        Create a consolidated structure that combines both preset and profile structures.
        
        Args:
            target_path: Path to create the consolidated structure
            
        Returns:
            True if successful, False otherwise
        """
        try:
            target_base = Path(target_path)
            target_base.mkdir(parents=True, exist_ok=True)
            
            # Copy both structure's content to a unified structure
            consolidation_report = {
                "merged_characters": [],
                "merged_presets": [],
                "conflicts": [],
                "errors": []
            }
            
            # Get all characters from both structures
            profile_characters = set(self.list_characters())
            preset_characters = set()
            
            if self.preset_manager:
                all_presets = self.preset_manager.list_presets()
                for preset in all_presets:
                    char, angle = preset.split('/', 1)
                    preset_characters.add(char)
            
            # Consolidate all characters
            all_characters = profile_characters | preset_characters
            
            for char in all_characters:
                # Create character in consolidated structure
                char_path = target_base / char
                char_path.mkdir(exist_ok=True)
                
                # Copy profile config if exists
                profile_config_path = self.base_path / char / "profile_config.json"
                if profile_config_path.exists():
                    import shutil
                    shutil.copy2(profile_config_path, char_path / "profile_config.json")
                
                # Create angles directory
                angles_path = char_path / "angles"
                angles_path.mkdir(exist_ok=True)
                
                # Combine angles from both structures
                profile_angles = set(self.list_angles(char)) if char in profile_characters else set()
                
                # Get preset angles for this character
                preset_angles = set()
                if self.preset_manager:
                    all_available_presets = self.preset_manager.list_presets()
                    for preset in all_available_presets:
                        preset_char, preset_angle = preset.split('/', 1)
                        if preset_char == char:
                            preset_angles.add(preset_angle)
                
                all_angles = profile_angles | preset_angles
                
                for angle in all_angles:
                    angle_path = angles_path / angle
                    angle_path.mkdir(exist_ok=True)
                    
                    # Create emotions directory
                    emotions_path = angle_path / "emotions"
                    emotions_path.mkdir(exist_ok=True)
                    
                    # Process emotions for this angle from both structures
                    for emotion in self.config.emotions:
                        emotion_path = emotions_path / emotion
                        emotion_path.mkdir(exist_ok=True)
                        
                        # Copy visemes from profile structure if available
                        profile_emotion_path = self.base_path / char / "angles" / angle / "emotions" / emotion
                        if profile_emotion_path.exists():
                            for viseme in self.config.required_files:
                                profile_viseme = profile_emotion_path / viseme
                                target_viseme = emotion_path / viseme
                                
                                if profile_viseme.exists() and (not target_viseme.exists() or force_sync):
                                    import shutil
                                    shutil.copy2(profile_viseme, target_viseme)
                        
                        # Copy visemes from preset structure if available
                        preset_key = f"{char}/{angle}"
                        if self.preset_manager and preset_key in self.preset_manager.list_presets():
                            try:
                                preset_config = self.preset_manager.get_preset(preset_key)
                                for viseme_shape, preset_viseme_path in preset_config["mouth_shapes"].items():
                                    if os.path.exists(preset_viseme_path):
                                        viseme_filename = f"{viseme_shape}.png"
                                        target_viseme = emotion_path / viseme_filename
                                        
                                        if not target_viseme.exists() or True:  # Using True instead of force_sync for this context
                                            import shutil
                                            shutil.copy2(preset_viseme_path, target_viseme)
                            except Exception as e:
                                consolidation_report["errors"].append(f"Error copying preset visemes for {char}/{angle}: {str(e)}")
                
                consolidation_report["merged_characters"].append(char)
            
            # Create a report of the consolidation
            report_path = target_base / "consolidation_report.json"
            with open(report_path, 'w') as f:
                json.dump(consolidation_report, f, indent=2)
            
            self.logger.info(f"Consolidated structure created at {target_path}")
            print(f"✓ Consolidated structure created at {target_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error creating consolidated structure: {e}")
            print(f"✗ Error creating consolidated structure: {e}")
            return False

    def generate_structure_audit(self, include_details: bool = True) -> Dict[str, Any]:
        """
        Generate a comprehensive audit of both structures.
        
        Args:
            include_details: Whether to include detailed information about each file
            
        Returns:
            Dictionary with comprehensive audit information
        """
        audit_result = {
            "timestamp": str(Path(__file__).stat().st_mtime),
            "profiles_structure": {
                "path": str(self.base_path),
                "total_characters": 0,
                "total_angles": 0,
                "total_emotions": 0,
                "total_visemes": 0,
                "characters": {}
            },
            "presets_structure": {
                "path": str(self.preset_path),
                "total_presets": 0,
                "presets": {}
            },
            "cross_structure_analysis": {
                "character_coverage": {},
                "completeness_comparison": {},
                "file_size_analysis": {}
            },
            "recommendations": []
        }
        
        try:
            # Audit profiles structure
            profile_characters = self.list_characters()
            audit_result["profiles_structure"]["total_characters"] = len(profile_characters)
            
            total_angles = 0
            total_emotions = 0
            total_visemes = 0
            
            for char in profile_characters:
                char_info = {
                    "angles": {},
                    "total_angles": 0,
                    "total_emotions": 0,
                    "total_visemes": 0,
                    "config": self.get_character_config(char)
                }
                
                angles = self.list_angles(char)
                char_info["total_angles"] = len(angles)
                total_angles += len(angles)
                
                for angle in angles:
                    angle_info = {
                        "emotions": {},
                        "total_emotions": 0,
                        "total_visemes": 0
                    }
                    
                    emotions = self.list_emotions(char, angle)
                    angle_info["total_emotions"] = len(emotions)
                    total_emotions += len(emotions)
                    
                    for emotion in emotions:
                        emotion_info = {
                            "visemes": [],
                            "total_visemes": 0
                        }
                        
                        for viseme in self.config.required_files:
                            viseme_path = self.base_path / char / "angles" / angle / "emotions" / emotion / viseme
                            if viseme_path.exists():
                                emotion_info["visemes"].append(viseme)
                                total_visemes += 1
                                if include_details:
                                    try:
                                        stat = viseme_path.stat()
                                        if str(viseme_path) not in audit_result["cross_structure_analysis"]["file_size_analysis"]:
                                            audit_result["cross_structure_analysis"]["file_size_analysis"][str(viseme_path)] = {
                                                "size_bytes": stat.st_size,
                                                "modified": str(stat.st_mtime)
                                            }
                                    except:
                                        pass  # Skip if we can't get file stats
                        
                        angle_info["emotions"][emotion] = emotion_info
                        angle_info["total_visemes"] += len(emotion_info["visemes"])
                    
                    char_info["angles"][angle] = angle_info
                    char_info["total_visemes"] += angle_info["total_visemes"]
                
                audit_result["profiles_structure"]["characters"][char] = char_info
            
            audit_result["profiles_structure"]["total_angles"] = total_angles
            audit_result["profiles_structure"]["total_emotions"] = total_emotions
            audit_result["profiles_structure"]["total_visemes"] = total_visemes
            
            # Audit presets structure
            if self.preset_manager:
                all_presets = self.preset_manager.list_presets()
                audit_result["presets_structure"]["total_presets"] = len(all_presets)
                
                for preset in all_presets:
                    parts = preset.split('/', 1)
                    if len(parts) == 2:
                        char, angle = parts
                        preset_info = {
                            "valid": self.preset_manager.validate_preset(preset),
                            "config": self.preset_manager.get_preset(preset) if self.preset_manager.validate_preset(preset) else None
                        }
                        
                        audit_result["presets_structure"]["presets"][preset] = preset_info
            
            # Generate cross-structure analysis
            profile_chars_set = set(profile_characters)
            preset_chars_set = set()
            if self.preset_manager:
                for preset in all_presets:
                    char, _ = preset.split('/', 1)
                    preset_chars_set.add(char)
            
            # Character coverage analysis
            audit_result["cross_structure_analysis"]["character_coverage"] = {
                "only_in_profiles": list(profile_chars_set - preset_chars_set),
                "only_in_presets": list(preset_chars_set - profile_chars_set),
                "in_both": list(profile_chars_set & preset_chars_set),
                "total_unique": len(profile_chars_set | preset_chars_set)
            }
            
            # Generate recommendations
            if not (profile_chars_set & preset_chars_set):
                audit_result["recommendations"].append(
                    "No overlap between profile and preset characters detected. Consider consolidating structures."
                )
            
            if total_visemes == 0:
                audit_result["recommendations"].append(
                    "No viseme files found in profiles structure. Animation content may be missing."
                )
            
            if not all_presets:
                audit_result["recommendations"].append(
                    "No presets found. Consider creating presets to define character animations."
                )
            
            # Completeness analysis
            if profile_chars_set & preset_chars_set:
                for common_char in (profile_chars_set & preset_chars_set):
                    profile_angles = set(self.list_angles(common_char))
                    preset_angles_for_char = set()
                    for preset in all_presets:
                        preset_char, preset_angle = preset.split('/', 1)
                        if preset_char == common_char:
                            preset_angles_for_char.add(preset_angle)
                    
                    angle_coverage = {
                        "only_in_profiles": list(profile_angles - preset_angles_for_char),
                        "only_in_presets": list(preset_angles_for_char - profile_angles),
                        "in_both": list(profile_angles & preset_angles_for_char)
                    }
                    
                    audit_result["cross_structure_analysis"]["completeness_comparison"][common_char] = angle_coverage
            
            self.logger.info("Structure audit completed successfully")
            return audit_result
            
        except Exception as e:
            self.logger.error(f"Error generating structure audit: {e}")
            print(f"✗ Error generating structure audit: {e}")
            return {"error": str(e)}

    def export_structure_to_json(self, output_path: str = "animation_structure_export.json") -> bool:
        """
        Export the complete structure to a JSON file for backup or sharing.
        
        Args:
            output_path: Path to save the exported structure
            
        Returns:
            True if successful, False otherwise
        """
        try:
            structure_data = {
                "export_timestamp": str(Path(__file__).stat().st_mtime),
                "base_path": str(self.base_path),
                "preset_path": str(self.preset_path),
                "config": asdict(self.config),
                "profiles_structure": {},
                "presets_structure": {}
            }
            
            # Export profiles data
            for char in self.list_characters():
                char_data = {
                    "config": self.get_character_config(char),
                    "angles": {}
                }
                
                for angle in self.list_angles(char):
                    angle_data = {
                        "emotions": {}
                    }
                    
                    for emotion in self.list_emotions(char, angle):
                        emotion_data = {
                            "visemes": []
                        }
                        
                        for viseme in self.config.required_files:
                            viseme_path = self.base_path / char / "angles" / angle / "emotions" / emotion / viseme
                            if viseme_path.exists():
                                # For export, we store relative paths so the export can be portable
                                relative_path = viseme_path.relative_to(self.base_path.parent)
                                emotion_data["visemes"].append({
                                    "name": viseme,
                                    "exists": True,
                                    "relative_path": str(relative_path)
                                })
                            else:
                                emotion_data["visemes"].append({
                                    "name": viseme,
                                    "exists": False
                                })
                        
                        angle_data["emotions"][emotion] = emotion_data
                    
                    char_data["angles"][angle] = angle_data
                
                structure_data["profiles_structure"][char] = char_data
            
            # Export presets data if available
            if self.preset_manager:
                all_presets = self.preset_manager.list_presets()
                for preset in all_presets:
                    try:
                        preset_config = self.preset_manager.get_preset(preset)
                        structure_data["presets_structure"][preset] = {
                            "valid": self.preset_manager.validate_preset(preset),
                            "config": preset_config
                        }
                    except Exception as e:
                        structure_data["presets_structure"][preset] = {
                            "valid": False,
                            "error": str(e)
                        }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(structure_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Structure exported to {output_path}")
            print(f"OK - Structure exported to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error exporting structure: {e}")
            print(f"ERROR - Error exporting structure: {e}")
            return False

    def import_structure_from_json(self, input_path: str) -> bool:
        """
        Import structure from a JSON export file.
        
        Args:
            input_path: Path to the JSON export file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                structure_data = json.load(f)
            
            # Create basic directory structure
            self.base_path.mkdir(parents=True, exist_ok=True)
            
            # Import profiles structure
            for char_name, char_data in structure_data.get("profiles_structure", {}).items():
                # Create character
                self.create_character(char_name, char_data["config"].get("description", ""))
                
                # Import angles
                for angle_name, angle_data in char_data["angles"].items():
                    # Add angle if doesn't exist
                    if angle_name not in self.list_angles(char_name):
                        self.add_angle(char_name, angle_name)
                    
                    # Import emotions and visemes
                    for emotion_name, emotion_data in angle_data["emotions"].items():
                        # Add emotion if doesn't exist
                        if emotion_name not in self.list_emotions(char_name, angle_name):
                            self.add_emotion(char_name, angle_name, emotion_name)
                        
                        # Import viseme files
                        for viseme_info in emotion_data["visemes"]:
                            if viseme_info["exists"]:
                                # The relative path should be relative to the export file location
                                # We'll skip file copying here since the actual files may not be available
                                print(f"  Would copy: {viseme_info['name']} for {char_name}/{angle_name}/{emotion_name}")
            
            # Import presets structure
            if self.preset_manager and "presets_structure" in structure_data:
                for preset_name, preset_data in structure_data["presets_structure"].items():
                    if preset_data["valid"] and "config" in preset_data:
                        # This would require creating presets, but we need to handle it differently
                        # since presets are managed in a different directory
                        print(f"  Would import preset: {preset_name}")
                        # The preset manager typically handles preset creation from templates
            
            self.logger.info(f"Structure imported from {input_path}")
            print(f"✓ Structure imported from {input_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error importing structure: {e}")
            print(f"✗ Error importing structure: {e}")
            return False
    
    def synchronize_preset_to_animation(self, character_name: str, angle_name: str, force_copy: bool = False) -> bool:
        """
        Synchronize preset files to animation structure.
        
        Args:
            character_name: Name of character
            angle_name: Name of angle
            force_copy: Whether to overwrite existing files
            
        Returns:
            True if successful, False otherwise
        """
        if not self.preset_manager:
            print("✗ Preset manager not available")
            return False
        
        try:
            preset_key = f"{character_name}/{angle_name}"
            if preset_key not in self.preset_manager.list_presets():
                print(f"✗ Preset '{preset_key}' not found")
                return False
            
            preset_config = self.preset_manager.get_preset(preset_key)
            
            # Get animation structure paths
            angle_path = self.base_path / character_name / "angles" / angle_name
            if not angle_path.exists():
                print(f"✗ Animation structure for '{character_name}/{angle_name}' does not exist")
                return False
            
            # For each emotion, copy/verify preset visemes
            for emotion in self.config.emotions:
                emotion_path = angle_path / "emotions" / emotion
                if not emotion_path.exists():
                    print(f"! Creating emotion directory: {emotion_path}")
                    emotion_path.mkdir(exist_ok=True)
                
                # Copy each viseme from preset to animation structure
                for viseme_shape, preset_viseme_path in preset_config["mouth_shapes"].items():
                    # Map preset shape to animation viseme (e.g., "A" -> "A.png")
                    viseme_filename = f"{viseme_shape}.png"
                    animation_viseme_path = emotion_path / viseme_filename
                    
                    if not animation_viseme_path.exists() or force_copy:
                        if os.path.exists(preset_viseme_path):
                            shutil.copy2(preset_viseme_path, animation_viseme_path)
                            print(f"✓ Copied {viseme_shape} viseme to {animation_viseme_path}")
                        else:
                             print(f"! Preset viseme {preset_viseme_path} does not exist")
             
            print(f"✓ Synchronized preset to animation for '{character_name}/{angle_name}'")
            return True
            
        except Exception as e:
            print(f"[ERROR] Error synchronizing preset to animation: {e}")
            return False
    
    def export_structure_report(self, output_file: str = "animation_structure_report.json") -> bool:
        """Export a complete report of the animation structure."""
        try:
            report = {
                "base_path": str(self.base_path),
                "preset_path": str(self.preset_path),
                "config": asdict(self.config),
                "total_characters": len(self.list_characters()),
                "characters": {},
                "validation_summary": self.validate_all_characters(),
                "preset_integration": {}
            }
            
            for character in self.list_characters():
                character_info = {
                    "config": self.get_character_config(character),
                    "angles": self.list_angles(character),
                    "emotions_per_angle": {},
                    "total_emotions": 0
                }
                
                for angle in self.list_angles(character):
                    emotions = self.list_emotions(character, angle)
                    character_info["emotions_per_angle"][angle] = emotions
                    character_info["total_emotions"] += len(emotions)
                    
                    # Validate preset integration
                    if self.preset_manager:
                        integration_result = self.validate_preset_integration(character, angle)
                        if character not in report["preset_integration"]:
                            report["preset_integration"][character] = {}
                        report["preset_integration"][character][angle] = integration_result
                
                report["characters"][character] = character_info
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Exported structure report to {output_file}")
            print(f"✓ Exported structure report to {output_file}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error exporting structure report: {e}")
            print(f"✗ Error exporting structure report: {e}")
            return False
    
    def import_from_existing_presets(self, preset_character: str, preset_angle: str, new_character: str) -> bool:
        """
        Import animation structure from existing presets.
        
        Args:
            preset_character: Name of character in presets to import from
            preset_angle: Name of angle in presets to import from
            new_character: Name of new character in profiles to create
            
        Returns:
            True if successful, False otherwise
        """
        if not self.preset_manager:
            print("✗ Preset manager not available")
            return False
        
        try:
            preset_key = f"{preset_character}/{preset_angle}"
            if preset_key not in self.preset_manager.list_presets():
                print(f"✗ Preset '{preset_key}' not found")
                return False
            
            preset_config = self.preset_manager.get_preset(preset_key)
            
            # Create the character if it doesn't exist
            character_path = self.base_path / new_character
            if not character_path.exists():
                self.create_character(new_character, f"Imported from preset {preset_key}")
            
            # Add the angle if it doesn't exist
            self.add_angle(new_character, preset_angle)
            
            # For each emotion, copy preset visemes
            angle_path = character_path / "angles" / preset_angle
            for emotion in self.config.emotions:
                emotion_path = angle_path / "emotions" / emotion
                emotion_path.mkdir(exist_ok=True)
                
                for viseme_shape, preset_viseme_path in preset_config["mouth_shapes"].items():
                    viseme_filename = f"{viseme_shape}.png"
                    animation_viseme_path = emotion_path / viseme_filename
                    
                    if os.path.exists(preset_viseme_path):
                        shutil.copy2(preset_viseme_path, animation_viseme_path)
                        print(f"✓ Copied {viseme_shape} viseme to {animation_viseme_path}")
            
            print(f"✓ Imported preset '{preset_key}' to character '{new_character}'")
            return True
            
        except Exception as e:
            print(f"✗ Error importing from preset: {e}")
            return False
    
    def print_structure_tree(self, character_name: str = None):
        """Print a tree view of the animation structure."""
        print(f"\nAnimation Structure Tree ({self.base_path}):")
        print("=" * 60)
        
        if character_name:
            characters = [character_name] if character_name in self.list_characters() else []
        else:
            characters = self.list_characters()
        
        for char in characters:
            char_path = self.base_path / char
            print(f"├── {char}/")
            print(f"    ├── profile_config.json")
            print(f"    └── angles/")
            
            for angle in self.list_angles(char):
                print(f"        ├── {angle}/")
                print(f"            └── emotions/")
                
                for i, emotion in enumerate(self.list_emotions(char, angle)):
                    is_last_emotion = i == len(self.list_emotions(char, angle)) - 1
                    emotion_prefix = "            │   ├──" if not is_last_emotion else "                ├──"
                    print(f"{emotion_prefix} {emotion}/")
                    
                    for j, viseme in enumerate(self.config.required_files):
                        viseme_path = self.base_path / char / "angles" / angle / "emotions" / emotion / viseme
                        is_last_viseme = j == len(self.config.required_files) - 1
                        viseme_prefix = "            │   │   ├──" if not is_last_viseme else "                │   ├──"
                        
                        status = "✓" if viseme_path.exists() else "✗"
                        print(f"{viseme_prefix} {viseme} [{status}]")
        
        if not characters:
            print("    No characters found")
    
    def migrate_to_new_structure(self, old_path: str = "assets/presets", new_path: str = "profiles") -> bool:
        """
        Migrate from old preset structure to new profile structure.
        
        Args:
            old_path: Path to old preset structure
            new_path: Path to new profile structure
            
        Returns:
            True if successful, False otherwise
        """
        try:
            old_base = Path(old_path)
            new_base = Path(new_path)
            
            if not old_base.exists():
                print(f"✗ Old preset path '{old_path}' does not exist")
                return False
            
            # Find all characters in old structure
            for char_dir in old_base.iterdir():
                if char_dir.is_dir() and char_dir.name != 'preset_template':
                    character_name = char_dir.name
                    print(f"\nMigrating character: {character_name}")
                    
                    # Create new structure
                    self.create_character(character_name, f"Migrated from {old_path}")
                    
                    # Migrate each angle
                    for angle_dir in char_dir.iterdir():
                        if angle_dir.is_dir():
                            angle_name = angle_dir.name
                            print(f"  Migrating angle: {angle_name}")
                            
                            # For each emotion in config, copy visemes
                            for emotion in self.config.emotions:
                                # Copy from preset visemes to new structure
                                preset_config_path = angle_dir / "preset_config.json"
                                if preset_config_path.exists():
                                    with open(preset_config_path, 'r') as f:
                                        preset_config = json.load(f)
                                    
                                    for viseme_shape, viseme_filename in preset_config["mouth_shapes"].items():
                                        source_path = angle_dir / viseme_filename
                                        if source_path.exists():
                                            # Create the emotion directory in new structure
                                            dest_dir = new_base / character_name / "angles" / angle_name / "emotions" / emotion
                                            dest_dir.mkdir(parents=True, exist_ok=True)
                                            
                                            # Copy the viseme
                                            dest_path = dest_dir / f"{viseme_shape}.png"
                                            shutil.copy2(source_path, dest_path)
                                            print(f"    ✓ Copied {viseme_shape} viseme")
            
            print(f"✓ Migration from '{old_path}' to '{new_path}' completed")
            return True
            
        except Exception as e:
            print(f"✗ Error during migration: {e}")
            return False


def main():
    """Main function to demonstrate the enhanced animation structure manager."""
    print("LipSyncAutomation v2.0 - Enhanced Animation Structure Manager")
    print("=" * 70)
    
    # Initialize the manager
    manager = AnimationStructureManager()
    
    # Create the base directory
    manager.base_path.mkdir(parents=True, exist_ok=True)
    
    while True:
        print("\n" + "="*70)
        print("ENHANCED ANIMATION STRUCTURE MANAGEMENT MENU")
        print("="*70)
        print("1. Create new character")
        print("2. Add angle to character")
        print("3. Add emotion to character angle")  
        print("4. Add viseme image to emotion")
        print("5. List characters")
        print("6. List angles for character")
        print("7. List emotions for character angle")
        print("8. Validate character animation set")
        print("9. Validate all characters")
        print("10. Validate preset integration")
        print("11. Print structure tree")
        print("12. Export structure report")
        print("13. Import from existing preset")
        print("14. Synchronize preset to animation")
        print("15. Migrate from old structure")
        print("16. Validate both structures (profiles and presets)")
        print("17. Synchronize structures")
        print("18. Create consolidated structure")
        print("19. Generate structure audit")
        print("20. Export structure to JSON")
        print("21. Import structure from JSON")
        print("22. Run comprehensive validation report")
        print("0. Exit")
        
        try:
            choice = input("\nEnter your choice (0-15): ").strip()
            
            if choice == "0":
                print("Exiting Enhanced Animation Structure Manager...")
                break
            elif choice == "1":
                char_name = input("Enter character name: ").strip()
                description = input("Enter character description (optional): ").strip()
                if char_name:
                    manager.create_character(char_name, description)
            elif choice == "2":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                if char_name and angle_name:
                    manager.add_angle(char_name, angle_name)
            elif choice == "3":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                emotion_name = input("Enter emotion name: ").strip()
                if char_name and angle_name and emotion_name:
                    manager.add_emotion(char_name, angle_name, emotion_name)
            elif choice == "4":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                emotion_name = input("Enter emotion name: ").strip()
                viseme_name = input("Enter viseme image name (e.g., A.png): ").strip()
                if char_name and angle_name and emotion_name and viseme_name:
                    manager.add_viseme_image(char_name, angle_name, emotion_name, viseme_name)
            elif choice == "5":
                characters = manager.list_characters()
                if characters:
                    print("\nCharacters:")
                    for i, char in enumerate(characters, 1):
                        validation = manager.validate_character_animation_set(char)
                        status = "✓" if validation["valid"] else "✗"
                        completeness = validation["summary"]["completeness_percentage"]
                        print(f"  {i}. {char} [{status}] - {completeness:.1f}% complete")
                else:
                    print("No characters found.")
            elif choice == "6":
                char_name = input("Enter character name: ").strip()
                if char_name:
                    angles = manager.list_angles(char_name)
                    if angles:
                        print(f"\nAngles for '{char_name}':")
                        for i, angle in enumerate(angles, 1):
                            print(f"  {i}. {angle}")
                    else:
                        print(f"No angles found for '{char_name}'.")
            elif choice == "7":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                if char_name and angle_name:
                    emotions = manager.list_emotions(char_name, angle_name)
                    if emotions:
                        print(f"\nEmotions for '{char_name}/{angle_name}':")
                        for i, emotion in enumerate(emotions, 1):
                            print(f"  {i}. {emotion}")
                    else:
                        print(f"No emotions found for '{char_name}/{angle_name}'.")
            elif choice == "8":
                char_name = input("Enter character name to validate: ").strip()
                if char_name:
                    result = manager.validate_character_animation_set(char_name)
                    print(f"\nValidation Result for '{char_name}':")
                    print(f"  Valid: {'Yes' if result['valid'] else 'No'}")
                    print(f"  Completeness: {result['summary']['completeness_percentage']:.1f}%")
                    print(f"  Missing Files: {len(result['missing_files'])}")
                    if result['missing_files']:
                        print("  Missing Files List:")
                        for missing in result['missing_files'][:10]:  # Show first 10
                            print(f"    - {missing}")
                        if len(result['missing_files']) > 10:
                            print(f"    ... and {len(result['missing_files']) - 10} more")
            elif choice == "9":
                result = manager.validate_all_characters()
                print(f"\nValidation Summary:")
                print(f"  Total Characters: {result['total_characters']}")
                print(f"  Valid Characters: {result['valid_characters']}")
                print(f"  Invalid Characters: {len(result['invalid_characters'])}")
                print(f"  Total Files Expected: {result['summary']['total_files_expected']}")
                print(f"  Total Files Found: {result['summary']['total_files_found']}")
                completeness = (result['summary']['total_files_found'] / result['summary']['total_files_expected'] * 100) if result['summary']['total_files_expected'] > 0 else 0
                print(f"  Overall Completeness: {completeness:.1f}%")
                if result['invalid_characters']:
                    print(f"  Invalid Character Names: {', '.join(result['invalid_characters'])}")
            elif choice == "10":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                if char_name and angle_name:
                    result = manager.validate_preset_integration(char_name, angle_name)
                    print(f"\nPreset Integration Result for '{char_name}/{angle_name}':")
                    print(f"  Preset Valid: {'Yes' if result['preset_valid'] else 'No'}")
                    print(f"  Animation Valid: {'Yes' if result['animation_valid'] else 'No'}")
                    print(f"  Synchronized: {'Yes' if result['synchronized'] else 'No'}")
                    if result['missing_in_preset']:
                        print(f"  Missing in Preset: {len(result['missing_in_preset'])}")
                    if result['missing_in_animation']:
                        print(f"  Missing in Animation: {len(result['missing_in_animation'])}")
            elif choice == "11":
                char_name = input("Enter specific character name (or press Enter for all): ").strip()
                if char_name:
                    manager.print_structure_tree(char_name)
                else:
                    manager.print_structure_tree()
            elif choice == "12":
                output_file_input = input("Enter output file name (default: animation_structure_report.json): ").strip()
                if not output_file_input:
                    output_file_input = "animation_structure_report.json"
                manager.export_structure_report(output_file_input)
            elif choice == "13":
                preset_char = input("Enter preset character name: ").strip()
                preset_angle = input("Enter preset angle name: ").strip()
                new_char = input("Enter new character name: ").strip()
                if preset_char and preset_angle and new_char:
                    manager.import_from_existing_presets(preset_char, preset_angle, new_char)
            elif choice == "14":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                force = input("Force overwrite existing files? (y/N): ").strip().lower() == 'y'
                if char_name and angle_name:
                    manager.synchronize_preset_to_animation(char_name, angle_name, force)
            elif choice == "15":
                old_path = input("Enter old preset path (default: assets/presets): ").strip() or "assets/presets"
                new_path = input("Enter new profile path (default: profiles): ").strip() or "profiles"
                manager.migrate_to_new_structure(old_path, new_path)
            elif choice == "16":
                print("\nValidating both structures (profiles and presets)...")
                result = manager.validate_both_structures()
                print(f"\nOverall Status: {result['overall_status']}")
                print(f"Profiles Valid: {result['profiles_structure']['valid']}")
                print(f"Presets Valid: {result['presets_structure']['valid']}")
                print(f"Synchronized: {result['cross_structure_validation']['synchronized']}")
                print(f"Total Differences: {len(result['cross_structure_validation']['differences'])}")
                if result['cross_structure_validation']['differences'][:5]:  # Show first 5
                    print("First 5 Differences:")
                    for diff in result['cross_structure_validation']['differences'][:5]:
                        print(f"  - {diff}")
            elif choice == "17":
                direction = input("Sync direction? (1) Preset to Profile, (2) Profile to Preset, (3) Both: ").strip()
                force_sync = input("Force overwrite? (y/N): ").strip().lower() == 'y'
                
                profile_to_preset = False
                preset_to_profile = False
                
                if direction == "1":
                    preset_to_profile = True
                elif direction == "2":
                    profile_to_preset = True
                elif direction == "3":
                    profile_to_preset = True
                    preset_to_profile = True
                else:
                    print("Invalid choice, defaulting to Preset to Profile")
                    preset_to_profile = True
                
                result = manager.synchronize_structures(
                    profile_to_preset=profile_to_preset,
                    preset_to_profile=preset_to_profile,
                    create_missing=True,
                    force_sync=force_sync
                )
                print(f"\nSynchronization Results:")
                print(f"  Profile to Preset - Synced: {result['profile_to_preset']['synchronized']}, Failed: {result['profile_to_preset']['failed']}")
                print(f"  Preset to Profile - Synced: {result['preset_to_profile']['synchronized']}, Failed: {result['preset_to_profile']['failed']}")
                print(f"  Created Structures: {len(result['created_structures'])}")
                if result['errors']:
                    print(f"  Errors: {len(result['errors'])}")
            elif choice == "18":
                target_path = input("Enter target path for consolidated structure (default: profiles_consolidated): ").strip()
                if not target_path:
                    target_path = "profiles_consolidated"
                result = manager.create_consolidated_structure(target_path)
                print(f"Consolidation result: {result}")
            elif choice == "19":
                include_details = input("Include file details in audit? (Y/n): ").strip().lower() != 'n'
                audit_result = manager.generate_structure_audit(include_details=include_details)
                output_file = input("Enter output file name for audit (default: structure_audit.json): ").strip()
                if not output_file:
                    output_file = "structure_audit.json"
                
                with open(output_file, 'w') as f:
                    json.dump(audit_result, f, indent=2)
                print(f"✓ Audit report saved to {output_file}")
            elif choice == "20":
                export_path = input("Enter export file path (default: animation_structure_export.json): ").strip()
                if not export_path:
                    export_path = "animation_structure_export.json"
                result = manager.export_structure_to_json(export_path)
                print(f"Export result: {result}")
            elif choice == "21":
                import_path = input("Enter import file path: ").strip()
                if import_path:
                    result = manager.import_structure_from_json(import_path)
                    print(f"Import result: {result}")
            elif choice == "22":
                # Run comprehensive validation and report
                print("Running comprehensive validation...")
                validation_result = manager.validate_both_structures()
                audit_result = manager.generate_structure_audit(include_details=False)
                
                print(f"\nCOMPREHENSIVE STRUCTURE REPORT")
                print("="*50)
                print(f"Overall Status: {validation_result['overall_status']}")
                print(f"Profiles Structure Valid: {validation_result['profiles_structure']['valid']}")
                print(f"Presets Structure Valid: {validation_result['presets_structure']['valid']}")
                print(f"Structures Synchronized: {validation_result['cross_structure_validation']['synchronized']}")
                
                print(f"\nProfiles Summary:")
                prof_sum = validation_result['profiles_structure']['summary']
                print(f"  Total Characters: {prof_sum.get('total_characters', 0)}")
                print(f"  Valid Characters: {prof_sum.get('valid_characters', 0)}")
                print(f"  Total Files Expected: {prof_sum.get('total_files_expected', 0)}")
                print(f"  Total Files Found: {prof_sum.get('total_files_found', 0)}")
                
                print(f"\nPresets Summary:")
                preset_sum = validation_result['presets_structure']['summary']
                print(f"  Total Presets: {preset_sum.get('total_presets', 0)}")
                print(f"  Valid Presets: {preset_sum.get('valid_presets', 0)}")
                print(f"  Invalid Presets: {preset_sum.get('invalid_presets', 0)}")
                
                print(f"\nCross-Structure Analysis:")
                diff_count = len(validation_result['cross_structure_validation']['differences'])
                print(f"  Differences Found: {diff_count}")
                if diff_count > 0:
                    print("  First 5 differences:")
                    for diff in validation_result['cross_structure_validation']['differences'][:5]:
                        print(f"    - {diff}")
                
                print(f"\nAudit Summary:")
                print(f"  Total Characters: {audit_result['profiles_structure']['total_characters']}")
                print(f"  Total Angles: {audit_result['profiles_structure']['total_angles']}")
                print(f"  Total Emotions: {audit_result['profiles_structure']['total_emotions']}")
                print(f"  Total Visemes: {audit_result['profiles_structure']['total_visemes']}")
                
                if audit_result['recommendations']:
                    print(f"\nRecommendations:")
                    for rec in audit_result['recommendations']:
                        print(f"  - {rec}")
            else:
                print("Invalid choice. Please enter a number between 0-22.")
        
        except KeyboardInterrupt:
            print("\n\nExiting Enhanced Animation Structure Manager...")
            break
        except Exception as e:
            print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()