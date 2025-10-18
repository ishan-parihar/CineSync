"""
ShotPurposeSelector: Semantic layer for determining shot narrative purpose.

This component analyzes emotion and narrative context to select appropriate
shot purposes, which then influence framing, angle, and composition choices.
"""

from typing import Dict, List, Optional
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ShotPurposeSelector:
    """
    Selects shot purpose based on narrative context and emotion state.
    
    Shot purposes are semantic labels that guide concrete cinematographic
    decisions without requiring separate visual assets.
    """
    
    def __init__(self, config_path: str = "config/shot_purpose_profiles.json"):
        """Initialize with shot purpose profiles"""
        self.profiles = self._load_profiles(config_path)
        self.purpose_history: List[str] = []
        
    def _load_profiles(self, config_path: str) -> Dict:
        """Load shot purpose profiles from configuration"""
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def select_purpose(self, 
                       emotion_segment: Dict,
                       segment_index: int,
                       total_segments: int,
                       narrative_phase: str,
                       tension_score: float) -> Dict:
        """
        Select shot purpose for current segment.
        
        Args:
            emotion_segment: Current emotion segment data
            segment_index: Index in sequence (0-based)
            total_segments: Total number of segments
            narrative_phase: Phase from tension engine (setup/confrontation/resolution)
            tension_score: Current tension level (0-1)
            
        Returns:
            Shot purpose specification with metadata
        """
        emotion = emotion_segment['primary_emotion']
        arousal = emotion['arousal']
        valence = emotion['valence']
        
        # Calculate contextual metrics
        arousal_derivative = self._estimate_arousal_change(emotion_segment, segment_index)
        is_first = segment_index == 0
        is_last = segment_index == total_segments - 1
        
        # Apply selection rules
        purpose = self._apply_selection_rules(
            arousal=arousal,
            valence=valence,
            arousal_derivative=arousal_derivative,
            is_first=is_first,
            is_last=is_last,
            tension_score=tension_score,
            narrative_phase=narrative_phase
        )
        
        # Get purpose profile
        purpose_profile = self.profiles['shot_purposes'].get(purpose, {})
        
        # Build result
        result = {
            'purpose': purpose,
            'description': purpose_profile.get('description', ''),
            'preferred_framings': purpose_profile.get('preferred_framings', ['MCU']),
            'vertical_angle': purpose_profile.get('vertical_angle_default', 'eye_level'),
            'composition': purpose_profile.get('composition_default', 'centered'),
            'duration_modifier': purpose_profile.get('duration_modifier', 1.0),
            'confidence': self._calculate_confidence(purpose, emotion)
        }
        
        # Store in history
        self.purpose_history.append(purpose)
        
        return result
    
    def _apply_selection_rules(self, **kwargs) -> str:
        """Apply rule-based logic to select purpose"""
        rules = self.profiles.get('purpose_selection_rules', {})
        
        # Rule 1: First segment → establishing
        if kwargs['is_first']:
            return 'establishing'
        
        # Rule 2: High arousal → reaction
        if kwargs['arousal'] > 0.75:
            return 'reaction'
        
        # Rule 3: Arousal spike → emphasis
        if kwargs['arousal_derivative'] > 0.3:
            return 'emphasis'
        
        # Rule 4: Large valence shift → transition
        if abs(kwargs.get('valence_change', 0)) > 0.5:
            return 'transition'
        
        # Rule 5: Default moderate speech → dialogue
        if kwargs['arousal'] < 0.6:
            return 'dialogue'
        
        # Fallback
        return 'dialogue'
    
    def _estimate_arousal_change(self, segment: Dict, index: int) -> float:
        """Estimate arousal change rate"""
        # In full implementation, compare with previous segment
        return 0.0
    
    def _calculate_confidence(self, purpose: str, emotion: Dict) -> float:
        """Calculate confidence in purpose selection"""
        base_confidence = 0.85
        
        # Adjust based on emotion confidence
        emotion_confidence = emotion.get('confidence', 0.8)
        
        return min(1.0, base_confidence * emotion_confidence)