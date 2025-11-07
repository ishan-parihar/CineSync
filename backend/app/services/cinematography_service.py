"""
Cinematography service for camera decision management
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import BaseService
from ..cinematography import (
    CinematographicDecisionEngine,
    OverrideManager,
    PsychoCinematicMapper,
    TensionEngine,
)


class CinematographyService(BaseService):
    """Service for cinematographic decision management and overrides"""
    
    def _validate_config(self) -> None:
        """Validate cinematography service configuration"""
        required_keys = ["system"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.decision_engine = CinematographicDecisionEngine(config)
        self.override_manager = OverrideManager(config)
        self.psycho_mapper = PsychoCinematicMapper(config)
        self.tension_engine = TensionEngine(config)
    
    def get_cinematography_config(self) -> Dict[str, Any]:
        """Get current cinematography configuration and decision parameters"""
        try:
            # Get current configuration with descriptions
            cinematography_config = {
                "weights": self.decision_engine.rules,
                "descriptions": {
                    "emotion_weight": "Influence of emotional analysis on shot selection (0.0-1.0)",
                    "tension_weight": "Influence of tension analysis on shot selection (0.0-1.0)",
                    "grammar_weight": "Influence of film grammar rules on shot selection (0.0-1.0)",
                    "temporal_smoothing": "Smoothing factor for temporal continuity (0.0-1.0)",
                    "shot_duration_range": "Allowed range for shot durations in seconds",
                    "angle_stability_window": "Number of shots to maintain angle consistency",
                    "distance_progression_preference": "Preference for logical distance progression",
                },
                "metadata": {
                    "last_updated": datetime.now().isoformat(),
                    "config_source": "shared/config/cinematography_rules.json",
                    "engine_version": "1.0.0",
                },
            }
            
            return cinematography_config
            
        except Exception as e:
            return {"error": f"Failed to get cinematography config: {str(e)}"}
    
    def update_cinematography_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update cinematography configuration and decision parameters"""
        try:
            config_path = self.project_root / "shared" / "config" / "cinematography_rules.json"
            
            # Load existing configuration
            try:
                with open(config_path, "r") as f:
                    existing_config = json.load(f)
            except FileNotFoundError:
                # Create default config if it doesn't exist
                existing_config = {
                    "cinematography_weights": {},
                    "tension_weights": {},
                    "override_rules": {},
                }
            
            # Update cinematography weights
            if "weights" in config_data:
                if "cinematography_weights" not in existing_config:
                    existing_config["cinematography_weights"] = {}
                existing_config["cinematography_weights"].update(config_data["weights"])
            
            # Update tension weights if provided
            if "tension_weights" in config_data:
                if "tension_weights" not in existing_config:
                    existing_config["tension_weights"] = {}
                existing_config["tension_weights"].update(config_data["tension_weights"])
            
            # Validate updated configuration
            validation_errors = []
            weights = existing_config.get("cinematography_weights", {})
            
            # Validate weight ranges
            for key, value in weights.items():
                if key.endswith("_weight") and not isinstance(value, (int, float)):
                    validation_errors.append(f"{key} must be a number")
                elif key.endswith("_weight") and not (0.0 <= value <= 1.0):
                    validation_errors.append(f"{key} must be between 0.0 and 1.0")
            
            if validation_errors:
                return {"error": "Validation failed", "details": validation_errors}
            
            # Save updated configuration
            with open(config_path, "w") as f:
                json.dump(existing_config, f, indent=2)
            
            return {
                "message": "Cinematography configuration updated successfully",
                "updated_fields": list(config_data.keys()),
                "timestamp": datetime.now().isoformat(),
            }
            
        except Exception as e:
            return {"error": f"Failed to update cinematography config: {str(e)}"}
    
    def get_cinematography_rules(self) -> Dict[str, Any]:
        """Retrieve all cinematography rules with metadata and psycho-mapping explanations"""
        try:
            # Load cinematography rules configuration
            rules_config_path = self.project_root / "shared" / "config" / "cinematography_rules.json"
            with open(rules_config_path, "r") as f:
                rules_config = json.load(f)
            
            # Format rules with metadata
            cinematography_rules = {
                "emotion_mappings": {
                    "description": "Psychological mapping of emotions to camera shots and angles",
                    "rules": self.psycho_mapper.emotion_shot_mappings,
                    "activation_status": {
                        emotion: "active" for emotion in self.psycho_mapper.emotion_shot_mappings.keys()
                    },
                    "psycho_mapping_explanations": {
                        "joy": "Close-ups for intimacy and connection, eye-level for approachability",
                        "anger": "Extreme close-ups for intensity, low angles for aggression/power",
                        "fear": "Close-ups for vulnerability, high angles for helplessness or low angles for threat",
                        "surprise": "Close-ups for reaction, Dutch angles for disorientation",
                        "sadness": "Medium shots for emotional distance, high angles for vulnerability",
                        "disgust": "Close-ups for reaction, high angles for judgment or Dutch for unease",
                        "trust": "Medium shots for comfort, eye-level for neutrality and reliability",
                        "anticipation": "Close-ups for focus, slight low angles for forward momentum",
                    },
                },
                "tension_mappings": {
                    "description": "Tension-based shot selection for dramatic impact",
                    "rules": self.tension_engine.tension_weights,
                    "activation_status": {
                        category: "active" for category in ["low", "medium", "high", "critical"]
                    },
                    "explanations": {
                        "low": "Wide shots (MS, MLS, LS) for calm, establishing moments",
                        "medium": "Medium shots (MCU, CU) for building tension",
                        "high": "Close-ups (CU, ECU) for intense emotional moments",
                        "critical": "Extreme close-ups and over-the-shoulder for peak tension",
                    },
                },
                "grammar_rules": {
                    "description": "Film grammar rules for shot continuity and progression",
                    "rules": rules_config.get("grammar_rules", {}),
                    "activation_status": {
                        "distance_progression": "active",
                        "angle_consistency": "active",
                        "emotional_rhythm": "active",
                    },
                    "explanations": {
                        "distance_progression": "Ensures logical progression between shot distances",
                        "angle_consistency": "Maintains 180-degree rule and smooth angle transitions",
                        "emotional_rhythm": "Matches shot pacing to emotional tempo and intensity",
                    },
                },
                "metadata": {
                    "total_rules": len(rules_config.get("emotion_mappings", {})) + len(rules_config.get("grammar_rules", {})),
                    "last_updated": datetime.now().isoformat(),
                    "config_version": "1.0.0",
                },
            }
            
            return cinematography_rules
            
        except Exception as e:
            return {"error": f"Failed to get cinematography rules: {str(e)}"}
    
    def create_cinematography_override(self, override_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create manual shot selection overrides with validation and compatibility checks"""
        try:
            # Extract required override parameters
            override_id = override_data.get("override_id")
            override_type = override_data.get("override_type")
            override_value = override_data.get("value")
            target_segment = override_data.get("target_segment")
            conditions = override_data.get("conditions", {})
            is_permanent = override_data.get("permanent", False)
            
            # Validate required parameters
            if not all([override_id, override_type, override_value]):
                return {
                    "error": "Missing required parameters",
                    "required": ["override_id", "override_type", "value"],
                }
            
            # Type casting for safety
            override_id = str(override_id)
            override_type = str(override_type)
            
            # Validate override compatibility
            compatibility_check = self._validate_override_compatibility(
                override_type, override_value, target_segment, conditions
            )
            if not compatibility_check["compatible"]:
                return {
                    "error": "Override compatibility check failed",
                    "issues": compatibility_check["issues"],
                }
            
            # Add the override
            success = self.override_manager.add_override(
                override_id=override_id,
                override_type=override_type,
                value=override_value,
                target_segment=target_segment,
                conditions=conditions,
            )
            
            if not success:
                return {"error": "Failed to create override"}
            
            # If permanent, save to file
            if is_permanent:
                overrides_dir = self.project_root / "shared" / "config" / "overrides"
                overrides_dir.mkdir(exist_ok=True)
                override_file = overrides_dir / f"{override_id}.json"
                self.override_manager.save_overrides_to_file(str(override_file))
            
            result = {
                "message": f"Override '{override_id}' created successfully",
                "override_id": override_id,
                "override_type": override_type,
                "override_value": override_value,
                "target_segment": target_segment,
                "permanent": is_permanent,
                "timestamp": datetime.now().isoformat(),
                "compatibility_notes": compatibility_check["notes"],
            }
            
            return result
            
        except Exception as e:
            return {"error": f"Failed to create cinematography override: {str(e)}"}
    
    def get_cinematography_overrides(self) -> Dict[str, Any]:
        """Get all active cinematography overrides"""
        try:
            active_overrides = self.override_manager.get_active_overrides()
            
            return {
                "active_overrides": active_overrides,
                "total_active": len(active_overrides),
                "override_types": list(
                    set(override["type"] for override in active_overrides.values())
                ),
                "timestamp": datetime.now().isoformat(),
            }
            
        except Exception as e:
            return {"error": f"Failed to get cinematography overrides: {str(e)}"}
    
    def delete_cinematography_override(self, override_id: str) -> Dict[str, Any]:
        """Delete a specific cinematography override"""
        try:
            success = self.override_manager.remove_override(override_id)
            
            if success:
                return {
                    "message": f"Override '{override_id}' deleted successfully",
                    "override_id": override_id,
                    "timestamp": datetime.now().isoformat(),
                }
            else:
                return {"error": f"Override '{override_id}' not found"}
                
        except Exception as e:
            return {"error": f"Failed to delete cinematography override: {str(e)}"}
    
    def _validate_override_compatibility(
        self,
        override_type: str,
        override_value: Any,
        target_segment: Optional[str],
        conditions: Dict,
    ) -> Dict[str, Any]:
        """Validate override compatibility and return compatibility check results"""
        issues = []
        notes = []
        
        # Define allowed values for different override types
        allowed_values = {
            "shot_distance_override": ["ECU", "CU", "MCU", "MS", "MLS", "LS"],
            "shot_angle_override": ["high_angle", "eye_level", "low_angle", "dutch"],
            "transition_override": ["cut", "dissolve", "fade", "wipe", "slide"],
            "duration_override": (0.1, 10.0),  # min, max
            "emotion_intensity_override": (0.0, 1.0),  # min, max
        }
        
        # Check override type validity
        if override_type not in allowed_values:
            issues.append(f"Invalid override type: {override_type}")
            return {"compatible": False, "issues": issues, "notes": notes}
        
        # Check value validity
        if override_type in [
            "shot_distance_override",
            "shot_angle_override",
            "transition_override",
        ]:
            if override_value not in allowed_values[override_type]:
                issues.append(f"Invalid value for {override_type}: {override_value}")
        
        elif override_type in ["duration_override", "emotion_intensity_override"]:
            min_val, max_val = allowed_values[override_type]
            if not isinstance(override_value, (int, float)) or not (
                min_val <= override_value <= max_val
            ):
                issues.append(
                    f"Value for {override_type} must be between {min_val} and {max_val}"
                )
        
        # Check specific compatibility scenarios
        if override_type == "shot_distance_override":
            if override_value == "ECU" and conditions.get("min_duration", 0) < 1.0:
                notes.append("ECU shots typically work best with longer durations (1.0s+)")
            elif override_value == "LS" and conditions.get("max_duration", 10.0) > 8.0:
                notes.append("Long shots may become static with very long durations")
        
        elif override_type == "shot_angle_override":
            if override_value == "dutch" and conditions.get("emotion") in [
                "calm",
                "peaceful",
            ]:
                notes.append(
                    "Dutch angles may create unnecessary tension for calm emotions"
                )
        
        # Check target segment compatibility
        if target_segment and not target_segment.startswith("segment_"):
            notes.append("Target segment should follow format 'segment_XXX'")
        
        return {"compatible": len(issues) == 0, "issues": issues, "notes": notes}