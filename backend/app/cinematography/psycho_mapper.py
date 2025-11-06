"""
PsychoCinematicMapper: Maps psychological and emotional states to camera shots
based on psycho-cinematic principles and film grammar.

Author: Development Team
Date: 2025-10-18
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple, cast

logger = logging.getLogger(__name__)


class PsychoCinematicMapper:
    """
    Maps emotional and psychological states to appropriate cinematographic choices.

    Based on psycho-cinematic research and film grammar principles:
    - Close-ups for intimacy and emotional intensity
    - Wide shots for establishing context and distance
    - High angles for vulnerability/weakness
    - Low angles for power/authority
    - Eye-level for neutrality and objectivity
    """

    def __init__(self, config: Dict):
        """
        Initialize psycho-cinematic mapper.

        Args:
            config: System configuration containing cinematography rules
        """
        self.config = config
        self.emotion_shot_mappings = self._load_emotion_mappings()
        self.tension_shot_mappings = self._load_tension_mappings()

        logger.info("PsychoCinematicMapper initialized")

    def _load_emotion_mappings(self) -> Dict[str, Any]:
        """
        Load emotion-to-shot mappings based on psycho-cinematic research.

        Returns:
            Dictionary mapping emotions to appropriate shot types
        """
        # Try to load from config file, fall back to defaults
        config_path = self.config.get(
            "cinematography_config", "config/cinematography_rules.json"
        )
        try:
            with open(config_path, "r") as f:
                rules: Dict[str, Any] = json.load(f)
            return cast(
                Dict[str, Any],
                rules.get(
                    "emotion_mappings",
                    {
                        # High arousal emotions - typically use close-ups for intensity
                        "joy": {
                            "primary_shots": [
                                "CU",
                                "MCU",
                            ],  # Close-up, Medium Close-up for intimacy
                            "angles": [
                                "eye_level",
                                "low_angle",
                            ],  # Eye-level for neutrality, low for power
                            "intensity_bias": 0.3,  # Joy doesn't need extreme intensity
                        },
                        "anger": {
                            "primary_shots": [
                                "CU",
                                "ECU",
                            ],  # Extreme Close-up for intensity
                            "angles": [
                                "low_angle",
                                "dutch",
                            ],  # Low for aggression, Dutch for tension
                            "intensity_bias": 0.9,  # High intensity for anger
                        },
                        "fear": {
                            "primary_shots": ["CU", "MCU"],
                            "angles": [
                                "high_angle",
                                "low_angle",
                            ],  # High for vulnerability, low for threat
                            "intensity_bias": 0.8,  # High intensity for fear
                        },
                        "surprise": {
                            "primary_shots": ["CU", "MCU"],
                            "angles": [
                                "eye_level",
                                "dutch",
                            ],  # Sudden change with Dutch angle
                            "intensity_bias": 0.7,  # Moderate to high intensity
                        },
                        # Low arousal emotions - may use wider shots for contemplation
                        "sadness": {
                            "primary_shots": [
                                "MCU",
                                "MS",
                            ],  # Medium shots for emotional distance
                            "angles": [
                                "high_angle",
                                "eye_level",
                            ],  # High for sadness/vulnerability
                            "intensity_bias": 0.4,  # Moderate intensity for sadness
                        },
                        "disgust": {
                            "primary_shots": ["CU", "ECU"],
                            "angles": [
                                "high_angle",
                                "dutch",
                            ],  # High for looking down, Dutch for unease
                            "intensity_bias": 0.7,  # Moderate to high intensity
                        },
                        "trust": {
                            "primary_shots": ["MCU", "MS"],
                            "angles": [
                                "eye_level",
                                "slight_low",
                            ],  # Neutral eye-level, slight low for reliability
                            "intensity_bias": 0.2,  # Low intensity for calm trust
                        },
                        "anticipation": {
                            "primary_shots": ["CU", "MCU"],
                            "angles": ["eye_level", "slight_low"],  # Focused attention
                            "intensity_bias": 0.6,  # Moderate intensity for anticipation
                        },
                    },
                ),
            )
        except FileNotFoundError:
            logger.warning(
                f"Emotion mappings config file not found: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    # High arousal emotions - typically use close-ups for intensity
                    "joy": {
                        "primary_shots": [
                            "CU",
                            "MCU",
                        ],  # Close-up, Medium Close-up for intimacy
                        "angles": [
                            "eye_level",
                            "low_angle",
                        ],  # Eye-level for neutrality, low for power
                        "intensity_bias": 0.3,  # Joy doesn't need extreme intensity
                    },
                    "anger": {
                        "primary_shots": [
                            "CU",
                            "ECU",
                        ],  # Extreme Close-up for intensity
                        "angles": [
                            "low_angle",
                            "dutch",
                        ],  # Low for aggression, Dutch for tension
                        "intensity_bias": 0.9,  # High intensity for anger
                    },
                    "fear": {
                        "primary_shots": ["CU", "MCU"],
                        "angles": [
                            "high_angle",
                            "low_angle",
                        ],  # High for vulnerability, low for threat
                        "intensity_bias": 0.8,  # High intensity for fear
                    },
                    "surprise": {
                        "primary_shots": ["CU", "MCU"],
                        "angles": [
                            "eye_level",
                            "dutch",
                        ],  # Sudden change with Dutch angle
                        "intensity_bias": 0.7,  # Moderate to high intensity
                    },
                    # Low arousal emotions - may use wider shots for contemplation
                    "sadness": {
                        "primary_shots": [
                            "MCU",
                            "MS",
                        ],  # Medium shots for emotional distance
                        "angles": [
                            "high_angle",
                            "eye_level",
                        ],  # High for sadness/vulnerability
                        "intensity_bias": 0.4,  # Moderate intensity for sadness
                    },
                    "disgust": {
                        "primary_shots": ["CU", "ECU"],
                        "angles": [
                            "high_angle",
                            "dutch",
                        ],  # High for looking down, Dutch for unease
                        "intensity_bias": 0.7,  # Moderate to high intensity
                    },
                    "trust": {
                        "primary_shots": ["MCU", "MS"],
                        "angles": [
                            "eye_level",
                            "slight_low",
                        ],  # Neutral eye-level, slight low for reliability
                        "intensity_bias": 0.2,  # Low intensity for calm trust
                    },
                    "anticipation": {
                        "primary_shots": ["CU", "MCU"],
                        "angles": ["eye_level", "slight_low"],  # Focused attention
                        "intensity_bias": 0.6,  # Moderate intensity for anticipation
                    },
                },
            )
        except json.JSONDecodeError:
            logger.error(
                f"Invalid JSON in emotion mappings file: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    # High arousal emotions - typically use close-ups for intensity
                    "joy": {
                        "primary_shots": [
                            "CU",
                            "MCU",
                        ],  # Close-up, Medium Close-up for intimacy
                        "angles": [
                            "eye_level",
                            "low_angle",
                        ],  # Eye-level for neutrality, low for power
                        "intensity_bias": 0.3,  # Joy doesn't need extreme intensity
                    },
                    "anger": {
                        "primary_shots": [
                            "CU",
                            "ECU",
                        ],  # Extreme Close-up for intensity
                        "angles": [
                            "low_angle",
                            "dutch",
                        ],  # Low for aggression, Dutch for tension
                        "intensity_bias": 0.9,  # High intensity for anger
                    },
                    "fear": {
                        "primary_shots": ["CU", "MCU"],
                        "angles": [
                            "high_angle",
                            "low_angle",
                        ],  # High for vulnerability, low for threat
                        "intensity_bias": 0.8,  # High intensity for fear
                    },
                    "surprise": {
                        "primary_shots": ["CU", "MCU"],
                        "angles": [
                            "eye_level",
                            "dutch",
                        ],  # Sudden change with Dutch angle
                        "intensity_bias": 0.7,  # Moderate to high intensity
                    },
                    # Low arousal emotions - may use wider shots for contemplation
                    "sadness": {
                        "primary_shots": [
                            "MCU",
                            "MS",
                        ],  # Medium shots for emotional distance
                        "angles": [
                            "high_angle",
                            "eye_level",
                        ],  # High for sadness/vulnerability
                        "intensity_bias": 0.4,  # Moderate intensity for sadness
                    },
                    "disgust": {
                        "primary_shots": ["CU", "ECU"],
                        "angles": [
                            "high_angle",
                            "dutch",
                        ],  # High for looking down, Dutch for unease
                        "intensity_bias": 0.7,  # Moderate to high intensity
                    },
                    "trust": {
                        "primary_shots": ["MCU", "MS"],
                        "angles": [
                            "eye_level",
                            "slight_low",
                        ],  # Neutral eye-level, slight low for reliability
                        "intensity_bias": 0.2,  # Low intensity for calm trust
                    },
                    "anticipation": {
                        "primary_shots": ["CU", "MCU"],
                        "angles": ["eye_level", "slight_low"],  # Focused attention
                        "intensity_bias": 0.6,  # Moderate intensity for anticipation
                    },
                },
            )

    def _load_tension_mappings(self) -> Dict[str, Any]:
        """
        Load tension level to shot distance mappings.

        Returns:
            Dictionary mapping tension levels to shot types
        """
        # Tension level mappings (0.0-1.0) to shot distances
        return {
            "low": ["MS", "MLS", "LS"],  # Medium, Medium Long, Long Shots for calm
            "medium": ["MCU", "CU"],  # Medium Close-up, Close-up for engagement
            "high": ["CU", "ECU"],  # Close-up, Extreme Close-up for intensity
            "critical": [
                "ECU",
                "OTS",
            ],  # Extreme Close-up, Over-the-Shoulder for extreme tension
        }

    def select_shot(
        self, emotion_data: Dict, context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Select appropriate shot based on emotion and context data.

        Args:
            emotion_data: Emotion analysis result containing:
                - name: Primary emotion name
                - valence: Emotional valence (-1 to +1)
                - arousal: Emotional arousal (0 to 1)
                - intensity: Emotional intensity (0 to 1)
            context: Additional context including:
                - previous_shot: Previous shot type
                - narrative_tension: Current tension level
                - character_relationship: Relationship between speakers
                - scene_context: Scene type or purpose

        Returns:
            Shot specification dictionary:
            {
                'distance': 'string (ECU|CU|MCU|MS|MLS|LS)',
                'angle': 'string (high_angle|eye_level|low_angle|dutch)',
                'duration': float,
                'transition_hint': 'string'
            }
        """
        if context is None:
            context = {}

        emotion_name = emotion_data.get("name", "neutral").lower()
        arousal = emotion_data.get("arousal", 0.5)
        valence = emotion_data.get("valence", 0.0)
        intensity = emotion_data.get("intensity", 0.0)

        # Get emotion-based preferences
        default_prefs = {
            "primary_shots": ["MCU", "MS"],
            "angles": ["eye_level", "slight_low"],
            "intensity_bias": 0.2,
        }
        emotion_prefs = self.emotion_shot_mappings.get(
            emotion_name, self.emotion_shot_mappings.get("trust", default_prefs)
        )

        # Calculate shot distance based on arousal and intensity
        shot_distance = self._determine_distance(emotion_data, context)

        # Determine angle based on valence and emotion
        shot_angle = self._determine_angle(emotion_data, context)

        # Calculate duration based on emotional stability
        shot_duration = self._determine_duration(emotion_data, context)

        # Determine transition type based on emotional shift
        transition_hint = self._determine_transition_type(emotion_data, context)

        shot_spec = {
            "distance": shot_distance,
            "angle": shot_angle,
            "duration": shot_duration,
            "transition_hint": transition_hint,
        }

        logger.debug(f"Selected shot for {emotion_name}: {shot_spec}")

        return shot_spec

    def _determine_distance(self, emotion_data: Dict, context: Dict) -> str:
        """
        Determine appropriate camera distance based on emotion.

        Args:
            emotion_data: Emotion data
            context: Additional context

        Returns:
            Appropriate shot distance
        """
        emotion_name = emotion_data.get("name", "neutral").lower()
        arousal = emotion_data.get("arousal", 0.5)
        intensity = emotion_data.get("intensity", 0.0)

        # Get emotion-specific preferences
        emotion_prefs = cast(
            Dict[str, Any],
            self.emotion_shot_mappings.get(
                emotion_name, self.emotion_shot_mappings["trust"]
            ),
        )

        # Calculate distance priority based on arousal and intensity
        # Higher arousal/intensity = closer shot
        emotion_weight = (abs(arousal) + intensity) / 2.0

        if emotion_weight > 0.7:
            # High emotional intensity - use close shots
            primary_shots = cast(List[str], emotion_prefs.get("primary_shots", ["CU"]))
            return primary_shots[0] if primary_shots else "CU"
        elif emotion_weight > 0.4:
            # Medium emotional intensity - use medium close shots
            primary_shots = cast(List[str], emotion_prefs.get("primary_shots", ["MCU"]))
            if len(primary_shots) > 1:
                return primary_shots[1]
            else:
                return primary_shots[0] if primary_shots else "MCU"
        else:
            # Low emotional intensity - use medium to wide shots
            # For emotions that allow it
            if emotion_name in ["sadness", "trust"]:
                return "MS"  # Use medium shot for calmer emotions
            else:
                return "MCU"  # Default to medium close for all others

    def _determine_angle(self, emotion_data: Dict, context: Dict) -> str:
        """
        Determine appropriate camera angle based on emotion and valence.

        Args:
            emotion_data: Emotion data
            context: Additional context

        Returns:
            Appropriate camera angle
        """
        emotion_name = emotion_data.get("name", "neutral").lower()
        valence = emotion_data.get("valence", 0.0)
        arousal = emotion_data.get("arousal", 0.5)

        emotion_prefs = self.emotion_shot_mappings.get(
            emotion_name, self.emotion_shot_mappings["trust"]
        )

        # Use emotion-specific angle preferences
        if emotion_name in ["fear", "sadness"]:
            # Use high angle for vulnerability
            if "high_angle" in emotion_prefs["angles"]:
                return "high_angle"
            else:
                return "high_angle"  # Default to high angle for these emotions even if not in preferences

        elif emotion_name in ["anger", "joy"]:
            # Use low angle for power/authority or confidence
            if "low_angle" in emotion_prefs["angles"]:
                return "low_angle"
            else:
                return "low_angle"  # Default to low angle for these emotions even if not in preferences

        elif emotion_name == "surprise":
            # Surprise often benefits from sudden angle changes
            if "dutch" in emotion_prefs["angles"]:
                return "dutch"  # Dutch angle for disorientation
            else:
                return (
                    "dutch"  # Default to Dutch for surprise even if not in preferences
                )

        elif valence < -0.3:
            # Negative valence - often use high angle for vulnerability
            return "high_angle"
        elif valence > 0.3:
            # Positive valence - often use low angle for power/optimism
            return "low_angle"
        else:
            # Neutral valence - use eye level for objectivity
            return "eye_level"

    def _determine_duration(self, emotion_data: Dict, context: Dict) -> float:
        """
        Determine appropriate shot duration based on emotional stability.

        Args:
            emotion_data: Emotion data
            context: Additional context

        Returns:
            Appropriate shot duration in seconds
        """
        arousal = emotion_data.get("arousal", 0.5)
        valence = emotion_data.get("valence", 0.0)
        intensity = emotion_data.get("intensity", 0.0)

        # High arousal = shorter, more dynamic shots
        # Low arousal = longer, more contemplative shots

        # Base duration calculation
        stability = 1.0 - abs(arousal)  # More stable if less aroused

        # Adjust based on intensity (higher intensity may need longer to process)
        intensity_factor = 0.5 + (intensity * 0.5)  # Range 0.5-1.0

        # Calculate base duration
        if abs(arousal) > 0.6:
            # High arousal - shorter shots (0.5-1.5s)
            base_duration = 0.5 + (0.5 * stability)
        elif abs(arousal) > 0.3:
            # Medium arousal - medium shots (1.0-2.0s)
            base_duration = 1.0 + (0.5 * stability)
        else:
            # Low arousal - longer shots (1.5-3.0s)
            base_duration = 1.5 + (1.0 * stability)

        # Apply intensity factor
        final_duration = base_duration * intensity_factor

        # Apply context if available
        previous_shot = cast(Dict[str, Any], context.get("previous_shot", {}))
        distance = (
            cast(str, previous_shot.get("distance", "MS")) if previous_shot else "MS"
        )
        if previous_shot and distance != "ECU" and final_duration < 1.0:
            # Don't make shots too short if not extreme close-up
            final_duration = cast(float, max(final_duration, 1.0))

        return cast(float, min(final_duration, 5.0))  # Cap at 5 seconds

    def _determine_transition_type(self, emotion_data: Dict, context: Dict) -> str:
        """
        Determine appropriate transition based on emotional shift.

        Args:
            emotion_data: Current emotion data
            context: Additional context including previous emotion

        Returns:
            Appropriate transition type
        """
        previous_emotion = context.get("previous_emotion", {})

        if not previous_emotion:
            # First shot - no special transition needed
            return "none"

        # Calculate emotional shift
        current_valence = emotion_data.get("valence", 0.0)
        previous_valence = previous_emotion.get("valence", 0.0)
        valence_shift = abs(current_valence - previous_valence)

        current_arousal = emotion_data.get("arousal", 0.5)
        previous_arousal = previous_emotion.get("arousal", 0.5)
        arousal_shift = abs(current_arousal - previous_arousal)

        shift_magnitude = (valence_shift + arousal_shift) / 2.0

        # If there's a significant emotional shift, use more dramatic transitions
        if shift_magnitude > 0.5:
            return "dissolve"  # Smooth transition for emotional shift
        elif shift_magnitude > 0.3:
            return "fade"  # For moderate shifts
        else:
            return "cut"  # For subtle shifts or continuity

    def get_emotion_aware_shot_sequence(
        self, emotion_segments: List[Dict]
    ) -> List[Dict]:
        """
        Generate complete shot sequence based on emotion analysis.

        Args:
            emotion_segments: List of emotion segments from analysis

        Returns:
            List of shot specifications with timing and transitions
        """
        shot_sequence: List[Dict] = []

        for i, segment in enumerate(emotion_segments):
            # Create context based on previous segment
            context = {}
            if i > 0:
                context["previous_emotion"] = emotion_segments[i - 1]["primary_emotion"]
                context["previous_shot"] = shot_sequence[i - 1] if shot_sequence else {}

            # Select shot for current segment
            shot_spec = self.select_shot(segment["primary_emotion"], context)

            # Add timing information
            shot_spec_with_timing = {
                "segment_id": segment["segment_id"],
                "start_time": segment["start_time"],
                "end_time": segment["end_time"],
                "emotion": segment["primary_emotion"]["name"],
                "shot_specification": shot_spec,
            }

            shot_sequence.append(shot_spec_with_timing)

        logger.info(f"Generated shot sequence for {len(shot_sequence)} segments")
        return shot_sequence


# Aliases for backward compatibility
PsychoMapper = PsychoCinematicMapper
