"""
Profile management service for character profiles and visemes
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import BaseService
from ..core.profile_manager import ProfileManager
from ..utils.validators import validate_audio_file


class ProfileService(BaseService):
    """Service for managing character profiles, angles, emotions, and visemes"""
    
    def _validate_config(self) -> None:
        """Validate profile service configuration"""
        required_keys = ["system"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.profile_manager = ProfileManager(config)
    
    def list_profiles(self) -> Dict[str, Any]:
        """List all available character profiles with validation status"""
        # Sync manifest with actual profile configs to ensure consistency
        self._sync_profile_manifest()
        
        profiles = self.profile_manager.list_profiles()
        
        # Add validation status for each profile
        for profile in profiles:
            validation_result = self.profile_manager.validate_profile(profile["profile_name"])
            profile["validation"] = validation_result
        
        return {"profiles": profiles}
    
    def create_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new character profile"""
        profile_name = profile_data.get("profile_name")
        angles = profile_data.get("supported_angles", [])
        emotions = profile_data.get("supported_emotions", [])
        
        if not profile_name:
            raise ValueError("profile_name is required")
        
        profile_path = self.profile_manager.create_profile_template(
            profile_name, angles, emotions
        )
        
        return {
            "message": f"Profile '{profile_name}' created successfully",
            "profile_path": str(profile_path),
            "profile_name": profile_name,
        }
    
    def get_profile(self, profile_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific profile"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            
            profile_info = self.profile_manager.get_profile_info(profile_name)
            
            return {"profile_info": profile_info, "validation": validation_result}
        except Exception as e:
            return {"error": str(e)}
    
    def get_profile_angles(self, profile_name: str) -> Dict[str, Any]:
        """Get all available angles for a specific profile"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Get profile info to retrieve supported angles
            profile_info = self.profile_manager.get_profile_info(profile_name)
            supported_angles = profile_info.get("supported_angles", [])
            
            # Check which angles actually have directories
            profile_path = Path(self.config["system"]["profiles_directory"]) / profile_name
            angles_dir = profile_path / "angles"
            
            if angles_dir.exists():
                available_angles = [d.name for d in angles_dir.iterdir() if d.is_dir()]
            else:
                available_angles = []
            
            return {
                "profile_name": profile_name,
                "supported_angles": supported_angles,
                "available_angles": available_angles,
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_profile_angle_emotions(self, profile_name: str, angle_name: str) -> Dict[str, Any]:
        """Get all available emotions for a specific profile angle"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Get profile info to retrieve supported emotions
            profile_info = self.profile_manager.get_profile_info(profile_name)
            supported_emotions = profile_info.get("supported_emotions", {}).get("core", [])
            
            # Check which emotions actually have directories
            profile_path = Path(self.config["system"]["profiles_directory"]) / profile_name
            emotions_dir = profile_path / "angles" / angle_name / "emotions"
            
            if emotions_dir.exists():
                available_emotions = [d.name for d in emotions_dir.iterdir() if d.is_dir()]
            else:
                available_emotions = []
            
            return {
                "profile_name": profile_name,
                "angle_name": angle_name,
                "supported_emotions": supported_emotions,
                "available_emotions": available_emotions,
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_visemes(self, profile_name: str, angle_name: str, emotion_name: str) -> Dict[str, Any]:
        """Get all visemes for a specific profile angle emotion"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Define standard visemes
            standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
            
            # Check which visemes exist
            profile_path = Path(self.config["system"]["profiles_directory"]) / profile_name
            emotion_dir = profile_path / "angles" / angle_name / "emotions" / emotion_name
            
            visemes = []
            for viseme in standard_visemes:
                viseme_path = emotion_dir / f"{viseme}.png"
                viseme_info = {
                    "viseme": viseme,
                    "path": str(viseme_path),
                    "exists": viseme_path.exists(),
                    "valid": viseme_path.exists(),
                }
                visemes.append(viseme_info)
            
            return {
                "profile_name": profile_name,
                "angle_name": angle_name,
                "emotion_name": emotion_name,
                "visemes": visemes,
            }
        except Exception as e:
            return {"error": str(e)}
    
    def upload_viseme(
        self, 
        profile_name: str, 
        angle_name: str, 
        emotion_name: str, 
        viseme_name: str,
        file_content: bytes,
        content_type: str
    ) -> Dict[str, Any]:
        """Upload a viseme image for a specific profile angle emotion"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Validate viseme name
            if viseme_name.upper() not in ["A", "B", "C", "D", "E", "F", "G", "H", "X"]:
                return {"error": f"Invalid viseme name: {viseme_name}"}
            
            # Validate file type is an image
            if not content_type or not content_type.startswith("image/"):
                return {"error": "Only image files are allowed"}
            
            # Create the target directory if it doesn't exist
            profile_path = Path(self.config["system"]["profiles_directory"]) / profile_name
            emotion_dir = profile_path / "angles" / angle_name / "emotions" / emotion_name
            emotion_dir.mkdir(parents=True, exist_ok=True)
            
            # Save the uploaded file
            viseme_path = emotion_dir / f"{viseme_name.upper()}.png"
            with open(viseme_path, "wb") as buffer:
                buffer.write(file_content)
            
            return {
                "message": f"Viseme {viseme_name} uploaded successfully for {profile_name}/{angle_name}/{emotion_name}",
                "viseme_path": str(viseme_path),
            }
        except Exception as e:
            return {"error": str(e)}
    
    def delete_viseme(
        self, 
        profile_name: str, 
        angle_name: str, 
        emotion_name: str, 
        viseme_name: str
    ) -> Dict[str, Any]:
        """Delete a viseme image for a specific profile angle emotion"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Validate viseme name
            if viseme_name.upper() not in ["A", "B", "C", "D", "E", "F", "G", "H", "X"]:
                return {"error": f"Invalid viseme name: {viseme_name}"}
            
            # Get the viseme file path
            profile_path = Path(self.config["system"]["profiles_directory"]) / profile_name
            viseme_path = (
                profile_path / "angles" / angle_name / "emotions" / emotion_name / f"{viseme_name.upper()}.png"
            )
            
            # Check if the file exists
            if not viseme_path.exists():
                return {
                    "error": f"Viseme {viseme_name} does not exist for {profile_name}/{angle_name}/{emotion_name}"
                }
            
            # Delete the file
            viseme_path.unlink()
            
            return {
                "message": f"Viseme {viseme_name} deleted successfully for {profile_name}/{angle_name}/{emotion_name}"
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_viseme_image(self, profile_name: str, angle_name: str, emotion_name: str, viseme_name: str) -> Path:
        """Get the image file path for a specific viseme"""
        # Validate profile exists
        validation_result = self.profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            raise ValueError(f"Profile '{profile_name}' does not exist or is invalid")
        
        # Validate viseme name
        if viseme_name.upper() not in ["A", "B", "C", "D", "E", "F", "G", "H", "X"]:
            raise ValueError(f"Invalid viseme name: {viseme_name}")
        
        # Get the viseme file path
        profile_path = Path(self.config["system"]["profiles_directory"]) / profile_name
        viseme_path = (
            profile_path / "angles" / angle_name / "emotions" / emotion_name / f"{viseme_name.upper()}.png"
        )
        
        # Check if the file exists
        if not viseme_path.exists():
            raise FileNotFoundError(
                f"Viseme {viseme_name} does not exist for {profile_name}/{angle_name}/{emotion_name}"
            )
        
        return viseme_path
    
    def get_profile_structure(self, profile_name: str) -> Dict[str, Any]:
        """Get comprehensive structure analysis for a profile"""
        try:
            analysis = self.profile_manager.get_profile_structure_analysis(profile_name)
            return {"structure_analysis": analysis}
        except Exception as e:
            return {"error": str(e)}
    
    def repair_profile_structure(self, profile_name: str, repair_data: Dict[str, Any]) -> Dict[str, Any]:
        """Repair and create missing structure for a profile"""
        try:
            create_placeholders = repair_data.get("create_placeholders", True)
            results = self.profile_manager.create_missing_structure(
                profile_name, create_placeholders
            )
            return results
        except Exception as e:
            return {"error": str(e)}
    
    def create_angle(self, profile_name: str, angle_name: str, angle_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new angle for a profile"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Get profile config to add angle to supported angles
            profiles_directory = self.config["system"]["profiles_directory"]
            if profiles_directory is None:
                return {"error": "profiles_directory not configured in settings"}
            
            profile_path = Path(profiles_directory) / profile_name
            profile_config_path = profile_path / "profile_config.json"
            
            with open(profile_config_path, "r") as f:
                profile_config = json.load(f)
            
            # Add angle to supported angles if not already present
            if angle_name not in profile_config["supported_angles"]:
                profile_config["supported_angles"].append(angle_name)
                profile_config["last_modified"] = datetime.now().isoformat()
                
                with open(profile_config_path, "w") as f:
                    json.dump(profile_config, f, indent=2)
            
            # Create angle directory structure
            angle_path = profile_path / "angles" / angle_name
            angle_path.mkdir(parents=True, exist_ok=True)
            
            # Create base directory
            base_path = angle_path / "base"
            base_path.mkdir(exist_ok=True)
            
            # Create emotions directory
            emotions_path = angle_path / "emotions"
            emotions_path.mkdir(exist_ok=True)
            
            # Create base head.png placeholder
            from PIL import Image
            
            head_placeholder = base_path / "head.png"
            if not head_placeholder.exists():
                img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
                img.save(head_placeholder)
            
            return {
                "message": f"Angle '{angle_name}' created successfully for profile '{profile_name}'",
                "angle_path": str(angle_path),
            }
        except Exception as e:
            return {"error": str(e)}
    
    def create_emotion(
        self, 
        profile_name: str, 
        angle_name: str, 
        emotion_name: str, 
        emotion_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new emotion for a profile angle"""
        try:
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Create emotion directory
            profiles_directory = self.config["system"]["profiles_directory"]
            if profiles_directory is None:
                return {"error": "profiles_directory not configured in settings"}
            
            profile_path = Path(profiles_directory) / profile_name
            emotion_path = profile_path / "angles" / angle_name / "emotions" / emotion_name
            emotion_path.mkdir(parents=True, exist_ok=True)
            
            # Create placeholder visemes
            standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
            from PIL import Image
            
            for viseme in standard_visemes:
                viseme_path = emotion_path / f"{viseme}.png"
                if not viseme_path.exists():
                    img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                    img.save(viseme_path)
            
            # Create preset_config.json
            preset_config = {
                "preset_name": f"{profile_name}_{angle_name}_{emotion_name}",
                "character_id": profile_name,
                "angle": angle_name,
                "emotion": emotion_name,
                "description": f"{emotion_name.capitalize()} expression for {angle_name} view",
                "mouth_position": {"x": 960, "y": 700, "anchor": "center"},
                "background": {"image": "background.png", "type": "static"},
                "mouth_shapes": {viseme: f"{viseme}.png" for viseme in standard_visemes},
                "image_specifications": {
                    "format": "PNG",
                    "bit_depth": 32,
                    "alpha_channel": True,
                    "dimensions": [512, 512],
                    "dpi": 300,
                },
                "metadata": {
                    "created_date": datetime.now().isoformat(),
                    "version": "1.0",
                    "author": "Auto-generated",
                },
            }
            
            config_path = emotion_path / "preset_config.json"
            with open(config_path, "w") as f:
                json.dump(preset_config, f, indent=2)
            
            return {
                "message": f"Emotion '{emotion_name}' created successfully for {profile_name}/{angle_name}",
                "emotion_path": str(emotion_path),
            }
        except Exception as e:
            return {"error": str(e)}
    
    def copy_emotion(self, profile_name: str, copy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Copy an emotion from one angle to another"""
        try:
            source_angle = copy_data.get("source_angle")
            target_angle = copy_data.get("target_angle")
            emotion_name = copy_data.get("emotion_name")
            
            if not all([source_angle, target_angle, emotion_name]):
                return {
                    "error": "source_angle, target_angle, and emotion_name are required"
                }
            
            # Validate profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            profiles_directory = self.config["system"]["profiles_directory"]
            if profiles_directory is None:
                return {"error": "profiles_directory not configured in settings"}
            
            profile_path = Path(str(profiles_directory)) / profile_name
            source_emotion_path = (
                profile_path / "angles" / str(source_angle) / "emotions" / str(emotion_name)
            )
            target_emotion_path = (
                profile_path / "angles" / str(target_angle) / "emotions" / str(emotion_name)
            )
            
            if not source_emotion_path.exists():
                return {
                    "error": f"Source emotion {emotion_name} does not exist in {source_angle}"
                }
            
            # Create target emotion directory
            target_emotion_path.mkdir(parents=True, exist_ok=True)
            
            # Copy all viseme files
            standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
            copied_files = []
            
            for viseme in standard_visemes:
                source_viseme = source_emotion_path / f"{viseme}.png"
                target_viseme = target_emotion_path / f"{viseme}.png"
                
                if source_viseme.exists():
                    shutil.copy2(source_viseme, target_viseme)
                    copied_files.append(str(target_viseme))
            
            # Copy preset_config.json and update angle
            source_config = source_emotion_path / "preset_config.json"
            target_config = target_emotion_path / "preset_config.json"
            
            if source_config.exists():
                with open(source_config, "r") as f:
                    config_data = json.load(f)
                
                # Update the angle in the config
                config_data["angle"] = target_angle
                config_data["preset_name"] = f"{profile_name}_{target_angle}_{emotion_name}"
                config_data["metadata"]["created_date"] = datetime.now().isoformat()
                
                with open(target_config, "w") as f:
                    json.dump(config_data, f, indent=2)
                copied_files.append(str(target_config))
            
            return {
                "message": f"Emotion '{emotion_name}' copied from {source_angle} to {target_angle}",
                "copied_files": copied_files,
            }
        except Exception as e:
            return {"error": str(e)}
    
    def update_profile(self, profile_name: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing character profile"""
        try:
            # Check if profile exists
            validation_result = self.profile_manager.validate_profile(profile_name)
            if not validation_result["valid"]:
                return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
            
            # Load existing profile config
            profiles_dir_config = self.config["system"]["profiles_directory"]
            if profiles_dir_config is None:
                return {"error": "profiles_directory not configured in settings"}
            
            profiles_dir_str = str(profiles_dir_config)
            
            # Use string concatenation to avoid path type issues
            if profiles_dir_str.startswith("./"):
                profile_path = (
                    self.project_root / profiles_dir_str[2:] / profile_name / "profile_config.json"
                )
            else:
                profile_path = Path(profiles_dir_str) / profile_name / "profile_config.json"
            
            with open(profile_path, "r") as f:
                existing_config = json.load(f)
            
            # Update provided fields while preserving others
            if "supported_angles" in profile_data:
                existing_config["supported_angles"] = profile_data["supported_angles"]
            
            if "supported_emotions" in profile_data:
                if (
                    isinstance(existing_config["supported_emotions"], dict)
                    and "core" in existing_config["supported_emotions"]
                ):
                    existing_config["supported_emotions"]["core"] = profile_data["supported_emotions"]
                else:
                    existing_config["supported_emotions"] = profile_data["supported_emotions"]
            
            if "character_metadata" in profile_data:
                if "character_metadata" in existing_config:
                    existing_config["character_metadata"].update(profile_data["character_metadata"])
                else:
                    existing_config["character_metadata"] = profile_data["character_metadata"]
            
            if "default_settings" in profile_data:
                if "default_settings" in existing_config:
                    existing_config["default_settings"].update(profile_data["default_settings"])
                else:
                    existing_config["default_settings"] = profile_data["default_settings"]
            
            # Update last modified timestamp
            existing_config["last_modified"] = datetime.now().isoformat()
            
            # Save updated config
            with open(profile_path, "w") as f:
                json.dump(existing_config, f, indent=2)
            
            # Update manifest if needed
            for profile in self.profile_manager.manifest["profiles"]:
                if profile["profile_name"] == profile_name:
                    profile["supported_angles"] = existing_config["supported_angles"]
                    if (
                        isinstance(existing_config["supported_emotions"], dict)
                        and "core" in existing_config["supported_emotions"]
                    ):
                        profile["supported_emotions"] = existing_config["supported_emotions"]["core"]
                    else:
                        profile["supported_emotions"] = existing_config["supported_emotions"]
                    profile["modified_date"] = datetime.now().isoformat()
                    break
            
            # Save updated manifest
            self.profile_manager._save_manifest(self.profile_manager.manifest)
            
            return {
                "message": f"Profile '{profile_name}' updated successfully",
                "profile_name": profile_name,
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _sync_profile_manifest(self) -> None:
        """Sync the profile manifest with actual profile configurations"""
        manifest_path = self.profile_manager.profiles_dir / "profile_manifest.json"
        
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        
        updated = False
        
        for profile_entry in manifest["profiles"]:
            profile_name = profile_entry["profile_name"]
            profile_config_path = (
                self.profile_manager.profiles_dir / profile_name / "profile_config.json"
            )
            
            if profile_config_path.exists():
                with open(profile_config_path, "r") as f:
                    actual_config = json.load(f)
                
                # Update supported angles if different
                if profile_entry.get("supported_angles") != actual_config.get("supported_angles"):
                    profile_entry["supported_angles"] = actual_config["supported_angles"]
                    updated = True
                
                # Update supported emotions if different
                if profile_entry.get("supported_emotions") != actual_config.get("supported_emotions"):
                    profile_entry["supported_emotions"] = actual_config["supported_emotions"]
                    updated = True
        
        if updated:
            manifest["last_updated"] = datetime.now().isoformat()
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
            
            # Reload the manifest in the profile manager
            self.profile_manager.manifest = manifest