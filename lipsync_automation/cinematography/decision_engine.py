"""
CinematographicDecisionEngine: Main engine that orchestrates all cinematographic
decisions using psycho-mapping, tension analysis, and grammar rules.

Author: Development Team
Date: 2025-10-10
"""

from typing import Dict, List, Optional, Any, cast
import logging
import json

from .psycho_mapper import PsychoCinematicMapper
from .tension_engine import TensionEngine
from .grammar_machine import GrammarMachine

logger = logging.getLogger(__name__)


class CinematographicDecisionEngine:
    """
    Main cinematographic decision engine that combines:
    - Psycho-cinematic mapping
    - Tension analysis
    - Grammar validation
    - Final shot selection
    """
    
    def __init__(self, config: Dict):
        """
        Initialize cinematographic decision engine.
        
        Args:
            config: System configuration dictionary
        """
        self.config = config
        
        # Initialize component engines
        self.psycho_mapper = PsychoCinematicMapper(config)
        self.tension_engine = TensionEngine(config)
        self.grammar_machine = GrammarMachine(config)
        
        # Load cinematographic rules
        self.rules = self._load_cinematography_rules()
        
        logger.info("CinematographicDecisionEngine initialized")
    
    def _load_cinematography_rules(self) -> Dict[str, Any]:
        """
        Load cinematographic decision rules and weights.
        
        Returns:
            Dictionary of decision rules
        """
        # Try to load from config file, fall back to defaults
        config_path = self.config.get('cinematography_config', 'config/cinematography_rules.json')
        try:
            with open(config_path, 'r') as f:
                rules = cast(Dict[str, Any], json.load(f))
            return cast(Dict[str, Any], rules.get('cinematography_weights', {
                'emotion_weight': 0.4,
                'tension_weight': 0.3,
                'grammar_weight': 0.3,
                'temporal_smoothing': 0.2,
                'shot_duration_range': {'min': 0.5, 'max': 5.0},
                'angle_stability_window': 3,  # How many shots to maintain angle consistency
                'distance_progression_preference': True,
            }))
        except FileNotFoundError:
            logger.warning(f"Cinematography rules file not found: {config_path}, using defaults")
            return cast(Dict[str, Any], {
                'emotion_weight': 0.4,
                'tension_weight': 0.3,
                'grammar_weight': 0.3,
                'temporal_smoothing': 0.2,
                'shot_duration_range': {'min': 0.5, 'max': 5.0},
                'angle_stability_window': 3,  # How many shots to maintain angle consistency
                'distance_progression_preference': True,
            })
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in cinematography rules file: {config_path}, using defaults")
            return cast(Dict[str, Any], {
                'emotion_weight': 0.4,
                'tension_weight': 0.3,
                'grammar_weight': 0.3,
                'temporal_smoothing': 0.2,
                'shot_duration_range': {'min': 0.5, 'max': 5.0},
                'angle_stability_window': 3,  # How many shots to maintain angle consistency
                'distance_progression_preference': True,
            })
    
    def generate_shot_sequence(self, emotion_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate complete shot sequence from emotion analysis.
        
        Args:
            emotion_analysis: Complete emotion analysis result from EmotionAnalyzer
            
        Returns:
            List of shot specifications with timing and transitions:
            [
                {
                    'scene_id': str,
                    'start_time': float,
                    'end_time': float,
                    'emotion_segment_ref': str,
                    'shot_specification': {
                        'distance': str,
                        'angle': str,
                        'duration': float
                    },
                    'transition': {
                        'type': str,
                        'duration': float
                    },
                    'emotion': str
                },
                ...
            ]
        """
        emotion_segments = emotion_analysis['emotion_segments']
        
        # Calculate tension sequence
        tension_sequence = self.tension_engine.calculate_sequence_tension(emotion_segments)
        
        # Generate initial shot suggestions using psycho-mapping
        initial_shots = self.psycho_mapper.get_emotion_aware_shot_sequence(emotion_segments)
        
        # Apply grammar validation and corrections
        validated_shots = self._validate_and_correct_shots(
            initial_shots, emotion_segments, tension_sequence
        )
        
        # Apply temporal smoothing and continuity
        final_shots = self._apply_temporal_smoothing(validated_shots)
        
        # Format as required output structure
        shot_sequence: List[Dict[str, Any]] = []
        for i, shot in enumerate(final_shots):
            shot_spec = {
                'scene_id': f"scene_{i:03d}",
                'start_time': shot.get('start_time', 0.0),
                'end_time': shot.get('end_time', 0.0),
                'emotion_segment_ref': shot.get('segment_id', ''),
                'shot_specification': shot['shot_specification'],
                'transition': self._determine_transition(shot, i, final_shots),
                'emotion': shot['emotion'] if 'emotion' in shot else ''
            }
            shot_sequence.append(shot_spec)
        
        logger.info(f"Generated shot sequence with {len(shot_sequence)} shots")
        return shot_sequence
    
    def _validate_and_correct_shots(self, initial_shots: List[Dict[str, Any]],
                                  emotion_segments: List[Dict[str, Any]],
                                  tension_sequence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validate initial shots against grammar rules and apply corrections.
        
        Args:
            initial_shots: Initial shot suggestions
            emotion_segments: Original emotion segments
            tension_sequence: Calculated tension sequence
            
        Returns:
            Grammar-compliant shot sequence
        """
        # Combine shot and emotion data for validation
        combined_data: List[Dict[str, Any]] = []
        for shot, emotion, tension in zip(initial_shots, emotion_segments, tension_sequence):
            combined_entry = {
                **shot,
                'emotion_data': emotion['primary_emotion'],
                'tension_data': tension
            }
            combined_data.append(combined_entry)
        
        # Validate against grammar
        validation_result = self.grammar_machine.validate_shot_sequence(
            combined_data, emotion_segments
        )
        
        if validation_result['valid']:
            logger.info("Shot sequence is grammar-compliant")
            return initial_shots
        else:
            logger.warning(f"Shot sequence has {len(validation_result['violations'])} violations, correcting...")
            
            # Apply corrections
            corrected_shots = self._apply_grammar_corrections(
                initial_shots, emotion_segments, validation_result
            )
            
            return corrected_shots
    
    def _apply_grammar_corrections(self, initial_shots: List[Dict[str, Any]],
                                  emotion_segments: List[Dict[str, Any]],
                                  validation_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Apply grammar rule corrections to shot sequence.
        
        Args:
            initial_shots: Initial shot sequence
            emotion_segments: Emotion analysis segments
            validation_result: Grammar validation results
            
        Returns:
            Corrected shot sequence
        """
        corrected_shots = [shot.copy() for shot in initial_shots]
        
        # Apply corrections based on violation types
        for i, violation in enumerate(validation_result['violations']):
            if 'distance transition' in violation:
                self._correct_distance_violations(corrected_shots, i)
            elif 'angle transition' in violation:
                self._correct_angle_violations(corrected_shots, i)
        
        return corrected_shots
    
    def _correct_distance_violations(self, shots: List[Dict[str, Any]], index: int) -> None:
        """
        Correct distance progression violations.
        
        Args:
            shots: Shot sequence to modify
            index: Index of violation
        """
        if index > 0 and index < len(shots):
            # Get surrounding distances
            prev_distance = shots[index-1]['shot_specification']['distance']
            curr_distance = shots[index]['shot_specification']['distance']
            
            # Find a more progressive distance
            progressive_distance = self._get_progressive_distance(prev_distance, curr_distance)
            shots[index]['shot_specification']['distance'] = progressive_distance
    
    def _correct_angle_violations(self, shots: List[Dict[str, Any]], index: int) -> None:
        """
        Correct angle consistency violations.
        
        Args:
            shots: Shot sequence to modify
            index: Index of violation
        """
        if index > 0 and index < len(shots):
            prev_angle = shots[index-1]['shot_specification']['angle']
            curr_angle = shots[index]['shot_specification']['angle']
            
            # Use previous angle if current creates violation
            shots[index]['shot_specification']['angle'] = prev_angle
    
    def _get_progressive_distance(self, from_distance: str, to_distance: str) -> str:
        """
        Get a progressive intermediate distance between two shots.
        
        Args:
            from_distance: Starting distance
            to_distance: Target distance
            
        Returns:
            Progressive intermediate distance
        """
        distances = ['LS', 'MLS', 'MS', 'MCU', 'CU', 'ECU']
        
        try:
            from_idx = distances.index(from_distance)
            to_idx = distances.index(to_distance)
            
            # Move one step towards the target
            if to_idx > from_idx:
                return distances[from_idx + 1]
            else:
                return distances[from_idx - 1]
        except ValueError:
            # If not in our list, return the target
            return to_distance
    
    def _apply_temporal_smoothing(self, shots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply temporal smoothing to reduce jarring transitions.
        
        Args:
            shots: Shot sequence to smooth
            
        Returns:
            Temporally smoothed shot sequence
        """
        if len(shots) < 2:
            return shots
        
        smoothed_shots = [shots[0]]  # Start with first shot
        
        smoothing_factor = cast(float, self.rules['temporal_smoothing'])
        
        for i in range(1, len(shots)):
            current_shot = shots[i].copy()
            previous_shot = smoothed_shots[i-1]
            
            # Smooth distance changes where appropriate
            if self._should_smooth_distance_change(previous_shot, current_shot):
                current_shot['shot_specification']['distance'] = previous_shot['shot_specification']['distance']
            
            # Smooth angle changes where appropriate
            if self._should_smooth_angle_change(previous_shot, current_shot, smoothing_factor):
                current_shot['shot_specification']['angle'] = previous_shot['shot_specification']['angle']
            
            # Adjust duration to maintain rhythm
            current_shot['shot_specification']['duration'] = self._adjust_duration_for_rhythm(
                current_shot, previous_shot, smoothing_factor
            )
            
            smoothed_shots.append(current_shot)
        
        return smoothed_shots
    
    def _should_smooth_distance_change(self, prev_shot: Dict[str, Any], curr_shot: Dict[str, Any]) -> bool:
        """
        Determine if distance change should be smoothed.
        
        Args:
            prev_shot: Previous shot
            curr_shot: Current shot
            
        Returns:
            True if change should be smoothed
        """
        prev_spec = cast(Dict[str, Any], prev_shot.get('shot_specification', {}))
        curr_spec = cast(Dict[str, Any], curr_shot.get('shot_specification', {}))
        
        prev_distance = cast(str, prev_spec.get('distance', ''))
        curr_distance = cast(str, curr_spec.get('distance', ''))
        
        # Don't smooth if it's the same distance
        if prev_distance == curr_distance:
            return False
        
        # Smooth if the change is too dramatic (e.g., ECU to LS directly)
        distances = ['LS', 'MLS', 'MS', 'MCU', 'CU', 'ECU']
        try:
            prev_idx = distances.index(prev_distance)
            curr_idx = distances.index(curr_distance)
            
            # If change is more than 2 steps, should smooth
            return abs(curr_idx - prev_idx) > 2
        except ValueError:
            return False
    
    def _should_smooth_angle_change(self, prev_shot: Dict[str, Any], curr_shot: Dict[str, Any], 
                                  smoothing_factor: float) -> bool:
        """
        Determine if angle change should be smoothed.
        
        Args:
            prev_shot: Previous shot
            curr_shot: Current shot
            smoothing_factor: Smoothing factor to consider
            
        Returns:
            True if change should be smoothed
        """
        prev_spec = cast(Dict[str, Any], prev_shot.get('shot_specification', {}))
        curr_spec = cast(Dict[str, Any], curr_shot.get('shot_specification', {}))
        
        prev_angle = cast(str, prev_spec.get('angle', ''))
        curr_angle = cast(str, curr_spec.get('angle', ''))
        
        # Don't smooth if it's the same angle
        if prev_angle == curr_angle:
            return False
        
        # Generally smooth non-dutch angle changes for continuity
        return curr_angle != 'dutch'
    
    def _adjust_duration_for_rhythm(self, current_shot: Dict[str, Any], previous_shot: Dict[str, Any],
                                   smoothing_factor: float) -> float:
        """
        Adjust shot duration to maintain visual rhythm.
        
        Args:
            current_shot: Current shot to adjust
            previous_shot: Previous shot for reference
            smoothing_factor: Smoothing factor
        """
        curr_spec = cast(Dict[str, Any], current_shot.get('shot_specification', {}))
        prev_spec = cast(Dict[str, Any], previous_shot.get('shot_specification', {}))
        
        curr_duration = cast(float, curr_spec.get('duration', 1.0))
        prev_duration = cast(float, prev_spec.get('duration', 1.0))
        
        # Weighted average to smooth duration changes
        adjusted_duration = (
            (1 - smoothing_factor) * curr_duration + 
            smoothing_factor * prev_duration
        )
        
        # Clamp to reasonable range
        min_dur_dict = cast(Dict[str, Any], self.rules.get('shot_duration_range', {}))
        min_dur = cast(float, min_dur_dict.get('min', 0.5))
        max_dur = cast(float, min_dur_dict.get('max', 5.0))
        
        return max(min_dur, min(max_dur, adjusted_duration))
    
    def _determine_transition(self, shot: Dict[str, Any], index: int, all_shots: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Determine appropriate transition for a shot.
        
        Args:
            shot: Current shot
            index: Shot index
            all_shots: All shots in sequence
            
        Returns:
            Transition specification
        """
        # Default transition
        transition: Dict[str, Any] = {
            'type': 'cut',
            'duration': 0.05  # 50ms cut
        }
        
        # If not the first shot, consider relationship with previous
        if index > 0:
            prev_shot = all_shots[index-1]
            
            # If there's a significant emotional shift, use longer transition
            curr_emotion = shot.get('emotion', '')
            prev_emotion = prev_shot.get('emotion', '')
            
            if curr_emotion != prev_emotion:
                # For emotional shifts, use dissolve
                transition['type'] = 'dissolve'
                transition['duration'] = 0.2  # 200ms dissolve
            else:
                shot_spec = cast(Dict[str, Any], shot.get('shot_specification', {}))
                prev_spec = cast(Dict[str, Any], prev_shot.get('shot_specification', {}))
                
                shot_distance = cast(str, shot_spec.get('distance', ''))
                prev_distance = cast(str, prev_spec.get('distance', ''))
                shot_angle = cast(str, shot_spec.get('angle', ''))
                prev_angle = cast(str, prev_spec.get('angle', ''))
                
                if (shot_distance != prev_distance or shot_angle != prev_angle):
                    # For technical changes, use cut but could consider wipe
                    transition['type'] = 'cut'
                    transition['duration'] = 0.05
        
        return transition
    
    def get_scene_breakdown(self, emotion_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate complete scene breakdown with cinematographic decisions.
        
        Args:
            emotion_analysis: Complete emotion analysis
            
        Returns:
            Scene breakdown dictionary with:
            - shot sequence
            - tension analysis
            - emotional arc
            - suggested camera movements
        """
        shot_sequence = self.generate_shot_sequence(emotion_analysis)
        
        # Calculate tension peaks for dramatic emphasis
        tension_sequence = self.tension_engine.calculate_sequence_tension(
            emotion_analysis['emotion_segments']
        )
        tension_peaks = self.tension_engine.detect_tension_peaks(tension_sequence)
        
        # Calculate overall emotional arc
        overall_sentiment = emotion_analysis.get('overall_sentiment', {})
        
        scene_breakdown = {
            'metadata': {
                'total_scenes': len(shot_sequence),
                'total_duration': emotion_analysis['metadata'].get('duration', 0),
                'dominant_emotion': overall_sentiment.get('dominant_emotion', 'neutral')
            },
            'shot_sequence': shot_sequence,
            'tension_analysis': {
                'peaks': tension_peaks,
                'average_tension': sum(ts['tension_level'] for ts in tension_sequence) / len(tension_sequence) if tension_sequence else 0.0
            },
            'emotional_arc': overall_sentiment,
            'suggested_camera_movements': self._analyze_camera_movements(shot_sequence),
            'cinematographic_notes': self._generate_cinematographic_notes(shot_sequence, tension_sequence)
        }
        
        return scene_breakdown
    
    def _analyze_camera_movements(self, shot_sequence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze and suggest camera movements based on shot sequence.
        
        Args:
            shot_sequence: Generated shot sequence
            
        Returns:
            List of suggested camera movements
        """
        movements: List[Dict[str, Any]] = []
        
        for i, shot in enumerate(shot_sequence):
            shot_spec = cast(Dict[str, Any], shot.get('shot_specification', {}))
            shot_distance = cast(str, shot_spec.get('distance', ''))
            suggested_movement = self._suggest_camera_movement(shot_distance)
            
            if suggested_movement:
                duration = cast(float, shot_spec.get('duration', 1.0))
                
                movement = {
                    'scene_id': cast(str, shot.get('scene_id', '')),
                    'suggested_movement': suggested_movement,
                    'duration': duration
                }
                movements.append(movement)
        
        return movements
    
    def _suggest_camera_movement(self, distance: str) -> Optional[str]:
        """
        Suggest appropriate camera movement based on shot distance.
        
        Args:
            distance: Shot distance (ECU, CU, MCU, MS, etc.)
            
        Returns:
            Suggested camera movement or None
        """
        movement_map = {
            'ECU': 'none',  # Extreme close-ups usually static
            'CU': 'none',   # Close-ups usually static
            'MCU': 'none',  # Medium close-ups usually static
            'MS': 'slow_dolly_in',  # Medium shots can have subtle movement
            'MLS': 'steady_pan',    # Medium long shots can pan
            'LS': 'slow_zoom_out'   # Long shots can zoom or track
        }
        
        return movement_map.get(distance)
    
    def _generate_cinematographic_notes(self, shot_sequence: List[Dict[str, Any]], 
                                      tension_sequence: List[Dict[str, Any]]) -> List[str]:
        """
        Generate cinematographic notes for the sequence.
        
        Args:
            shot_sequence: Generated shot sequence
            tension_sequence: Corresponding tension sequence
            
        Returns:
            List of cinematographic notes
        """
        notes = []
        
        # Note about tension peaks
        high_tension_shots = [s for s in shot_sequence if 
                             s['shot_specification']['distance'] in ['CU', 'ECU']]
        if len(high_tension_shots) > 0:
            notes.append(f"Sequence includes {len(high_tension_shots)} close-up shots for emotional intensity")
        
        # Note about angle consistency
        eye_level_shots = [s for s in shot_sequence if 
                          s['shot_specification']['angle'] == 'eye_level']
        if len(eye_level_shots) > len(shot_sequence) * 0.7:
            notes.append("Maintains eye-level angle for neutral/natural viewing")
        
        # Note about distance progression
        distances = [s['shot_specification']['distance'] for s in shot_sequence]
        if 'LS' in distances and 'ECU' in distances:
            notes.append("Uses wide-to-close progression for narrative development")
        
        return notes


# Alias for backward compatibility
DecisionEngine = CinematographicDecisionEngine