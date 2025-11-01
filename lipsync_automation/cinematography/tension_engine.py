"""
TensionEngine: Calculates narrative tension and emotional intensity
to drive cinematographic decisions.

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, List, Tuple, Optional, Any
import logging
import json
from typing import cast

logger = logging.getLogger(__name__)


class TensionEngine:
    """
    Calculates narrative tension and emotional intensity levels
    to inform cinematographic decisions.
    
    The engine analyzes emotional patterns over time to determine
    optimal camera angles, distances, and transitions for maximum
    dramatic impact.
    """
    
    def __init__(self, config: Dict):
        """
        Initialize tension calculation engine.
        
        Args:
            config: System configuration containing tension rules
        """
        self.config = config
        self.tension_weights = self._load_tension_weights()
        
        logger.info("TensionEngine initialized")
    
    def _load_tension_weights(self) -> Dict[str, Any]:
        """
        Load tension calculation weights and factors.
        
        Returns:
            Dictionary of tension calculation parameters
        """
        # Try to load from config file, fall back to defaults
        config_path = self.config.get('cinematography_config', 'config/cinematography_rules.json')
        try:
            with open(config_path, 'r') as f:
                rules: Dict[str, Any] = json.load(f)
            return cast(Dict[str, Any], rules.get('tension_weights', {
                'temporal_smoothing': 0.3,  # How much previous segments affect current tension
                'emotional_intensity_weight': 0.4,
                'arousal_weight': 0.3,
                'valence_change_weight': 0.3,
                'emotional_stability_weight': 0.2,
                'minimum_tension': 0.0,
                'maximum_tension': 1.0
            }))
        except FileNotFoundError:
            logger.warning(f"Tension weights config file not found: {config_path}, using defaults")
            return {
                'temporal_smoothing': 0.3,  # How much previous segments affect current tension
                'emotional_intensity_weight': 0.4,
                'arousal_weight': 0.3,
                'valence_change_weight': 0.3,
                'emotional_stability_weight': 0.2,
                'minimum_tension': 0.0,
                'maximum_tension': 1.0
            }
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in tension weights file: {config_path}, using defaults")
            return {
                'temporal_smoothing': 0.3,  # How much previous segments affect current tension
                'emotional_intensity_weight': 0.4,
                'arousal_weight': 0.3,
                'valence_change_weight': 0.3,
                'emotional_stability_weight': 0.2,
                'minimum_tension': 0.0,
                'maximum_tension': 1.0
            }
    
    def calculate_segment_tension(self, segment: Dict, context: Optional[Dict] = None) -> Dict:
        """
        Calculate tension for a single emotion segment.
        
        Args:
            segment: Emotion segment with timing and emotion data
            context: Context including previous segments
            
        Returns:
            Tension data dictionary:
            {
                'tension_level': float (0.0-1.0),
                'tension_type': string ('buildup'|'peak'|'release'|'stable'),
                'intensity': float,
                'stability': float
            }
        """
        if context is None:
            context = {}
        
        primary_emotion = segment['primary_emotion']
        emotion_name = primary_emotion['name']
        emotion_confidence = primary_emotion['confidence']
        emotion_intensity = primary_emotion['intensity']
        valence = primary_emotion['valence']
        arousal = primary_emotion['arousal']
        
        # Base tension from emotional intensity
        base_tension = emotion_intensity * self.tension_weights['emotional_intensity_weight']
        
        # Factor from arousal (higher arousal = higher tension)
        arousal_tension = arousal * self.tension_weights['arousal_weight']
        
        # Factor from emotional valence changes (sudden changes create tension)
        valence_change_tension = 0.0
        previous_segment = context.get('previous_segment')
        if previous_segment:
            previous_valence = previous_segment['primary_emotion']['valence']
            valence_change = abs(valence - previous_valence)
            valence_change_tension = valence_change * self.tension_weights['valence_change_weight']
        
        # Calculate total tension
        total_tension = min(
            self.tension_weights['maximum_tension'],
            base_tension + arousal_tension + valence_change_tension
        )
        
        # Determine tension type based on pattern
        tension_type = self._classify_tension_type(
            total_tension, segment, context
        )
        
        # Calculate emotional stability (inverse of tension)
        stability = max(0.0, 1.0 - total_tension)
        
        tension_result = {
            'tension_level': total_tension,
            'tension_type': tension_type,
            'intensity': emotion_intensity,
            'stability': stability
        }
        
        logger.debug(f"Calculated tension for {emotion_name}: {tension_result}")
        
        return tension_result
    
    def _classify_tension_type(self, tension_level: float, 
                              current_segment: Dict, 
                              context: Dict) -> str:
        """
        Classify the type of tension based on pattern analysis.
        
        Args:
            tension_level: Calculated tension level
            current_segment: Current emotion segment
            context: Context with previous segments
            
        Returns:
            Tension type string
        """
        if tension_level < 0.2:
            return 'stable'
        
        # Check for emotional changes vs previous segment
        if context.get('previous_segment'):
            prev_emotion = context['previous_segment']['primary_emotion']
            curr_emotion = current_segment['primary_emotion']
            
            # Significant change in valence or emotion type
            valence_change = abs(curr_emotion['valence'] - prev_emotion['valence'])
            emotion_change = curr_emotion['name'] != prev_emotion['name']
            
            if valence_change > 0.4 or (emotion_change and tension_level > 0.5):
                return 'buildup'
            elif tension_level > 0.7:
                return 'peak'
            else:
                return 'release'
        else:
            # First segment - use absolute values
            if tension_level > 0.7:
                return 'peak'
            elif tension_level > 0.4:
                return 'buildup'
            else:
                return 'stable'
    
    def calculate_sequence_tension(self, emotion_segments: List[Dict]) -> List[Dict]:
        """
        Calculate tension across an entire sequence of emotion segments.
        
        Args:
            emotion_segments: List of emotion segments from analysis
            
        Returns:
            List of tension data for each segment
        """
        tension_sequence: List[Dict] = []
        
        for i, segment in enumerate(emotion_segments):
            # Build context from previous segment
            context = {}
            if i > 0 and tension_sequence:
                context['previous_segment'] = emotion_segments[i-1]
                context['previous_tension'] = tension_sequence[i-1]
            
            # Calculate tension for this segment
            tension_data = self.calculate_segment_tension(segment, context)
            
            # Add to sequence
            tension_entry = {
                'segment_id': segment['segment_id'],
                'start_time': segment['start_time'],
                'end_time': segment['end_time'],
                'emotion': segment['primary_emotion']['name'],
                **tension_data
            }
            
            tension_sequence.append(tension_entry)
        
        # Apply temporal smoothing across the sequence
        tension_sequence = self._smooth_tension_sequence(tension_sequence)
        
        logger.info(f"Calculated tension for {len(tension_sequence)} segments")
        return tension_sequence
    
    def _smooth_tension_sequence(self, tension_sequence: List[Dict]) -> List[Dict]:
        """
        Apply temporal smoothing to tension sequence to reduce jarring fluctuations.
        
        Args:
            tension_sequence: List of tension data for segments
            
        Returns:
            Smoothed tension sequence
        """
        if len(tension_sequence) < 2:
            return tension_sequence
        
        smoothing_factor = self.tension_weights['temporal_smoothing']
        
        # Apply smoothing algorithm
        for i in range(1, len(tension_sequence)):
            prev_tension = tension_sequence[i-1]['tension_level']
            curr_tension = tension_sequence[i]['tension_level']
            
            # Smooth current tension based on previous
            smoothed_tension = (
                (1 - smoothing_factor) * curr_tension + 
                smoothing_factor * prev_tension
            )
            
            tension_sequence[i]['tension_level'] = min(
                self.tension_weights['maximum_tension'],
                max(self.tension_weights['minimum_tension'], smoothed_tension)
            )
        
        return tension_sequence
    
    def detect_tension_peaks(self, tension_sequence: List[Dict]) -> List[Dict]:
        """
        Detect tension peaks and release points in the sequence.
        
        Args:
            tension_sequence: Tension sequence to analyze
            
        Returns:
            List of detected peaks with timing and magnitude
        """
        peaks = []
        
        for i in range(1, len(tension_sequence) - 1):
            current = tension_sequence[i]['tension_level']
            previous = tension_sequence[i-1]['tension_level']
            next_level = tension_sequence[i+1]['tension_level']
            
            # Detect local maximum (peak)
            if current > previous and current > next_level:
                peak_data = {
                    'time': tension_sequence[i]['start_time'],
                    'magnitude': current,
                    'segment_id': tension_sequence[i]['segment_id'],
                    'emotion': tension_sequence[i]['emotion']
                }
                peaks.append(peak_data)
        
        logger.info(f"Detected {len(peaks)} tension peaks in sequence")
        return peaks
    
    def suggest_cinematographic_accent(self, tension_data: Dict) -> Dict:
        """
        Suggest cinematographic techniques based on tension level.
        
        Args:
            tension_data: Tension analysis result
            
        Returns:
            Cinematographic suggestions dictionary
        """
        tension_level = tension_data['tension_level']
        tension_type = tension_data['tension_type']
        
        suggestions = {
            'shot_distance': self._suggest_distance_by_tension(tension_level, tension_type),
            'camera_angle': self._suggest_angle_by_tension(tension_level, tension_type),
            'movement': self._suggest_movement_by_tension(tension_level, tension_type),
            'transition': self._suggest_transition_by_tension(tension_level, tension_type),
            'emphasis_technique': self._suggest_emphasis_by_tension(tension_level, tension_type)
        }
        
        return suggestions
    
    def _suggest_distance_by_tension(self, tension_level: float, tension_type: str) -> str:
        """Suggest shot distance based on tension."""
        if tension_level > 0.8:
            return 'ECU'  # Extreme Close-up for high tension
        elif tension_level > 0.6:
            return 'CU'    # Close-up for moderate tension
        elif tension_level > 0.4:
            return 'MCU'   # Medium Close-up for building tension
        else:
            return 'MS'    # Medium Shot for low tension
    
    def _suggest_angle_by_tension(self, tension_level: float, tension_type: str) -> str:
        """Suggest camera angle based on tension."""
        if tension_type == 'peak':
            return 'dutch'  # Dutch angle for peak tension
        elif tension_level > 0.7:
            return 'low_angle'  # Low angle for power during high tension
        elif tension_level < 0.3:
            return 'high_angle'  # High angle for vulnerability during low tension
        else:
            return 'eye_level'   # Neutral eye-level for medium tension
    
    def _suggest_movement_by_tension(self, tension_level: float, tension_type: str) -> str:
        """Suggest camera movement based on tension."""
        if tension_type == 'buildup':
            return 'slow_zoom_in'  # Building intensity
        elif tension_type == 'peak':
            return 'handheld'      # Unstable during peaks
        elif tension_level > 0.7:
            return 'fixed'         # Stable but intense
        else:
            return 'static'        # Calm, stable shot
    
    def _suggest_transition_by_tension(self, tension_level: float, tension_type: str) -> str:
        """Suggest transition type based on tension."""
        if tension_type == 'peak':
            return 'cut'           # Sharp cut during peak
        elif tension_type == 'buildup':
            return 'dissolve'      # Smooth transition during buildup
        elif tension_type == 'release':
            return 'fade_out'      # Fade during release
        else:
            return 'cut'           # Standard cut
    
    def _suggest_emphasis_by_tension(self, tension_level: float, tension_type: str) -> str:
        """Suggest emphasis technique based on tension."""
        if tension_level > 0.9:
            return 'extreme_closeup'  # Maximum emphasis
        elif tension_level > 0.7:
            return 'closeup'          # High emphasis
        elif tension_type == 'buildup':
            return 'focus_pull'       # Focus pull during buildup
        else:
            return 'none'             # No special emphasis