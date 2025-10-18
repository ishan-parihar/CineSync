"""
OverrideManager: Manages manual overrides for cinematographic decisions
to allow user control and fine-tuning of shot selections.

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, List, Optional, Any
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class OverrideManager:
    """
    Manages manual overrides for cinematographic decisions.
    
    This component allows users to:
    - Override automatic shot decisions
    - Apply custom cinematographic preferences
    - Maintain consistency in specific scenarios
    - Integrate user feedback into the decision process
    """
    
    def __init__(self, config: Dict):
        """
        Initialize override manager.
        
        Args:
            config: System configuration containing override settings
        """
        self.config = config
        self.override_rules = self._load_override_rules()
        self.active_overrides = {}
        self.override_history = []
        
        logger.info("OverrideManager initialized")
    
    def _load_override_rules(self) -> Dict:
        """
        Load predefined override rules and constraints.
        
        Returns:
            Dictionary of override rules
        """
        # Try to load from config file, fall back to defaults
        try:
            config_path = self.config.get('cinematography_config', 'config/cinematography_rules.json')
            with open(config_path, 'r') as f:
                rules = json.load(f)
            return rules.get('override_rules', {
                # Shot-level overrides
                'shot_distance_override': {
                    'allowed_values': ['ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS'],
                    'validation_required': True,
                    'priority': 10  # High priority for distance overrides
                },
                'shot_angle_override': {
                    'allowed_values': ['high_angle', 'eye_level', 'low_angle', 'dutch'],
                    'validation_required': True,
                    'priority': 10
                },
                # Emotional overrides
                'emotion_intensity_override': {
                    'range': [0.0, 1.0],
                    'validation_required': True,
                    'priority': 5  # Medium priority
                },
                # Timing overrides
                'duration_override': {
                    'range': [0.1, 10.0],  # 0.1 to 10 seconds
                    'validation_required': True,
                    'priority': 7  # Medium-high priority
                },
                # Transition overrides
                'transition_override': {
                    'allowed_values': ['cut', 'dissolve', 'fade', 'wipe', 'slide'],
                    'validation_required': True,
                    'priority': 8  # High priority for transitions
                }
            })
        except FileNotFoundError:
            logger.warning(f"Override rules config file not found: {config_path}, using defaults")
            return {
                # Shot-level overrides
                'shot_distance_override': {
                    'allowed_values': ['ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS'],
                    'validation_required': True,
                    'priority': 10  # High priority for distance overrides
                },
                'shot_angle_override': {
                    'allowed_values': ['high_angle', 'eye_level', 'low_angle', 'dutch'],
                    'validation_required': True,
                    'priority': 10
                },
                # Emotional overrides
                'emotion_intensity_override': {
                    'range': [0.0, 1.0],
                    'validation_required': True,
                    'priority': 5  # Medium priority
                },
                # Timing overrides
                'duration_override': {
                    'range': [0.1, 10.0],  # 0.1 to 10 seconds
                    'validation_required': True,
                    'priority': 7  # Medium-high priority
                },
                # Transition overrides
                'transition_override': {
                    'allowed_values': ['cut', 'dissolve', 'fade', 'wipe', 'slide'],
                    'validation_required': True,
                    'priority': 8  # High priority for transitions
                }
            }
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in override rules file: {config_path}, using defaults")
            return {
                # Shot-level overrides
                'shot_distance_override': {
                    'allowed_values': ['ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS'],
                    'validation_required': True,
                    'priority': 10  # High priority for distance overrides
                },
                'shot_angle_override': {
                    'allowed_values': ['high_angle', 'eye_level', 'low_angle', 'dutch'],
                    'validation_required': True,
                    'priority': 10
                },
                # Emotional overrides
                'emotion_intensity_override': {
                    'range': [0.0, 1.0],
                    'validation_required': True,
                    'priority': 5  # Medium priority
                },
                # Timing overrides
                'duration_override': {
                    'range': [0.1, 10.0],  # 0.1 to 10 seconds
                    'validation_required': True,
                    'priority': 7  # Medium-high priority
                },
                # Transition overrides
                'transition_override': {
                    'allowed_values': ['cut', 'dissolve', 'fade', 'wipe', 'slide'],
                    'validation_required': True,
                    'priority': 8  # High priority for transitions
                }
            }
    
    def add_override(self, 
                    override_id: str, 
                    override_type: str, 
                    value: Any, 
                    target_segment: str = None,
                    conditions: Dict = None) -> bool:
        """
        Add a manual override for cinematographic decisions.
        
        Args:
            override_id: Unique identifier for this override
            override_type: Type of override (shot_distance, emotion_intensity, etc.)
            value: Value to override with
            target_segment: Specific segment to apply override to (optional)
            conditions: Conditions under which override should apply (optional)
            
        Returns:
            True if override was successfully added
        """
        # Validate override type
        if override_type not in self.override_rules:
            logger.error(f"Invalid override type: {override_type}")
            return False
        
        # Validate value for this override type
        if not self._validate_override_value(override_type, value):
            logger.error(f"Invalid value for {override_type}: {value}")
            return False
        
        # Create override specification
        override_spec = {
            'id': override_id,
            'type': override_type,
            'value': value,
            'target_segment': target_segment,
            'conditions': conditions or {},
            'applied': False,
            'timestamp': self._get_timestamp()
        }
        
        # Store the override
        self.active_overrides[override_id] = override_spec
        self.override_history.append(override_spec.copy())
        
        logger.info(f"Added override: {override_id} ({override_type} = {value})")
        return True
    
    def _validate_override_value(self, override_type: str, value: Any) -> bool:
        """
        Validate that an override value is acceptable for its type.
        
        Args:
            override_type: Type of override
            value: Value to validate
            
        Returns:
            True if value is valid for this override type
        """
        rules = self.override_rules.get(override_type, {})
        
        # Check if validation is required
        if not rules.get('validation_required', False):
            return True
        
        # Validate based on override type
        if override_type == 'shot_distance_override':
            return value in rules['allowed_values']
        elif override_type == 'shot_angle_override':
            return value in rules['allowed_values']
        elif override_type == 'emotion_intensity_override':
            min_val, max_val = rules['range']
            return isinstance(value, (int, float)) and min_val <= value <= max_val
        elif override_type == 'duration_override':
            min_val, max_val = rules['range']
            return isinstance(value, (int, float)) and min_val <= value <= max_val
        elif override_type == 'transition_override':
            return value in rules['allowed_values']
        
        return False
    
    def apply_overrides(self, shot_sequence: List[Dict], 
                       emotion_analysis: Dict = None) -> List[Dict]:
        """
        Apply active overrides to a shot sequence.
        
        Args:
            shot_sequence: Original shot sequence to modify
            emotion_analysis: Optional emotion analysis for context
            
        Returns:
            Modified shot sequence with overrides applied
        """
        if not self.active_overrides:
            logger.info("No active overrides to apply")
            return shot_sequence
        
        modified_sequence = []
        
        for i, shot in enumerate(shot_sequence):
            modified_shot = shot.copy()
            
            # Check each active override
            for override_id, override in self.active_overrides.items():
                if override['applied']:  # Skip if already applied
                    continue
                
                # Check if this override applies to this shot
                if self._override_applies(override, shot, i, emotion_analysis):
                    # Apply the override
                    if self._apply_single_override(modified_shot, override):
                        # Mark as applied
                        self.active_overrides[override_id]['applied'] = True
                        logger.info(f"Applied override {override_id} to shot {i}")
            
            modified_sequence.append(modified_shot)
        
        # Reset applied flags for future use
        for override_id in self.active_overrides:
            self.active_overrides[override_id]['applied'] = False
        
        logger.info(f"Applied {len([o for o in self.active_overrides.values() if o['applied']])} overrides")
        return modified_sequence
    
    def _override_applies(self, override: Dict, shot: Dict, 
                         shot_index: int, emotion_analysis: Dict = None) -> bool:
        """
        Determine if an override should be applied to this shot.
        
        Args:
            override: Override specification
            shot: Current shot to evaluate
            shot_index: Index of shot in sequence
            emotion_analysis: Optional emotion analysis for context
            
        Returns:
            True if override should be applied to this shot
        """
        # Check target segment
        target_segment = override['target_segment']
        if target_segment and target_segment != shot.get('segment_id'):
            return False
        
        # Check conditions
        conditions = override['conditions']
        if conditions:
            for condition, expected_value in conditions.items():
                if condition == 'shot_index':
                    if shot_index != expected_value:
                        return False
                elif condition == 'shot_distance':
                    if shot['shot_specification'].get('distance') != expected_value:
                        return False
                elif condition == 'shot_angle':
                    if shot['shot_specification'].get('angle') != expected_value:
                        return False
                elif condition == 'emotion':
                    if shot.get('emotion') != expected_value:
                        return False
                elif condition == 'emotion_intensity':
                    # Would check against emotion analysis if available
                    pass
                elif condition == 'min_duration':
                    if shot['shot_specification'].get('duration', 0) < expected_value:
                        return False
                elif condition == 'max_duration':
                    if shot['shot_specification'].get('duration', 0) > expected_value:
                        return False
        
        return True
    
    def _apply_single_override(self, shot: Dict, override: Dict) -> bool:
        """
        Apply a single override to a shot.
        
        Args:
            shot: Shot to modify
            override: Override specification
            
        Returns:
            True if override was successfully applied
        """
        override_type = override['type']
        override_value = override['value']
        
        # Initialize shot_specification if it doesn't exist
        if 'shot_specification' not in shot:
            shot['shot_specification'] = {}
        
        try:
            if override_type == 'shot_distance_override':
                shot['shot_specification']['distance'] = override_value
            elif override_type == 'shot_angle_override':
                shot['shot_specification']['angle'] = override_value
            elif override_type == 'duration_override':
                shot['shot_specification']['duration'] = override_value
            elif override_type == 'transition_override':
                if 'transition' not in shot:
                    shot['transition'] = {}
                shot['transition']['type'] = override_value
            elif override_type == 'emotion_intensity_override':
                # This would modify the emotion data, not directly the shot
                # For now, store as metadata
                shot['emotion_intensity_override'] = override_value
            else:
                logger.warning(f"Unknown override type: {override_type}")
                return False
            
            logger.debug(f"Applied {override_type} = {override_value}")
            return True
        except Exception as e:
            logger.error(f"Failed to apply override {override['id']}: {str(e)}")
            return False
    
    def get_active_overrides(self) -> Dict[str, Dict]:
        """
        Get all currently active overrides.
        
        Returns:
            Dictionary of active overrides
        """
        return self.active_overrides.copy()
    
    def clear_overrides(self):
        """Clear all active overrides."""
        self.active_overrides = {}
        logger.info("All overrides cleared")
    
    def remove_override(self, override_id: str) -> bool:
        """
        Remove a specific override.
        
        Args:
            override_id: ID of override to remove
            
        Returns:
            True if override was removed
        """
        if override_id in self.active_overrides:
            del self.active_overrides[override_id]
            logger.info(f"Removed override: {override_id}")
            return True
        else:
            logger.warning(f"Override not found: {override_id}")
            return False
    
    def save_overrides_to_file(self, file_path: str):
        """
        Save current overrides to a file for later use.
        
        Args:
            file_path: Path to save overrides to
        """
        with open(file_path, 'w') as f:
            json.dump(self.active_overrides, f, indent=2, default=str)
        logger.info(f"Overrides saved to {file_path}")
    
    def load_overrides_from_file(self, file_path: str) -> bool:
        """
        Load overrides from a file.
        
        Args:
            file_path: Path to load overrides from
            
        Returns:
            True if overrides were successfully loaded
        """
        try:
            with open(file_path, 'r') as f:
                overrides = json.load(f)
            
            # Validate and load overrides
            for override_id, override_spec in overrides.items():
                self.active_overrides[override_id] = override_spec
            
            logger.info(f"Overrides loaded from {file_path}: {len(overrides)} overrides")
            return True
        except Exception as e:
            logger.error(f"Failed to load overrides from {file_path}: {str(e)}")
            return False
    
    def _get_timestamp(self) -> str:
        """
        Get current timestamp for override tracking.
        
        Returns:
            ISO format timestamp string
        """
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_override_history(self) -> List[Dict]:
        """
        Get complete history of overrides (including applied and removed).
        
        Returns:
            List of all overrides handled by this manager
        """
        return self.override_history.copy()
    
    def add_batch_overrides(self, overrides: List[Dict]) -> Dict[str, bool]:
        """
        Add multiple overrides at once.
        
        Args:
            overrides: List of override specifications
                Each override should have:
                - 'id': unique identifier
                - 'type': override type
                - 'value': override value
                - 'target_segment': optional target segment
                - 'conditions': optional conditions
        
        Returns:
            Dictionary mapping override IDs to success status
        """
        results = {}
        
        for override_data in overrides:
            override_id = override_data['id']
            override_type = override_data['type']
            value = override_data['value']
            target_segment = override_data.get('target_segment')
            conditions = override_data.get('conditions', {})
            
            success = self.add_override(
                override_id=override_id,
                override_type=override_type,
                value=value,
                target_segment=target_segment,
                conditions=conditions
            )
            
            results[override_id] = success
        
        successful = sum(results.values())
        logger.info(f"Batch added {successful}/{len(overrides)} overrides successfully")
        return results


# Convenience class for common override scenarios
class CinematographicOverrideHelper:
    """
    Helper class for common cinematographic override patterns.
    """
    
    @staticmethod
    def create_closeup_override(override_id: str, segment_id: str = None, 
                               duration: float = 1.5) -> Dict:
        """
        Create an override for close-up shots.
        
        Args:
            override_id: Unique ID for override
            segment_id: Specific segment to override (optional)
            duration: Duration for close-up shots
            
        Returns:
            Override specification
        """
        return {
            'id': override_id,
            'type': 'shot_distance_override',
            'value': 'CU',
            'target_segment': segment_id,
            'conditions': {'duration': duration}
        }
    
    @staticmethod
    def create_emotional_intensity_override(override_id: str, intensity: float,
                                          segment_id: str = None) -> Dict:
        """
        Create an override for emotional intensity.
        
        Args:
            override_id: Unique ID for override
            intensity: Intensity value (0.0-1.0)
            segment_id: Specific segment (optional)
            
        Returns:
            Override specification
        """
        return {
            'id': override_id,
            'type': 'emotion_intensity_override',
            'value': intensity,
            'target_segment': segment_id,
            'conditions': {}
        }
    
    @staticmethod
    def create_transition_override(override_id: str, transition_type: str,
                                 segment_id: str = None) -> Dict:
        """
        Create an override for shot transitions.
        
        Args:
            override_id: Unique ID for override
            transition_type: Type of transition ('cut', 'dissolve', etc.)
            segment_id: Specific segment (optional)
            
        Returns:
            Override specification
        """
        return {
            'id': override_id,
            'type': 'transition_override',
            'value': transition_type,
            'target_segment': segment_id,
            'conditions': {}
        }