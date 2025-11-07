"""
GrammarMachine: Implements cinematographic grammar and narrative flow rules
using finite state machines and transition probabilities.

Author: Development Team
Date: 2025-10-18
"""

import json
import logging
import random
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, cast

from .psycho_mapper import PsychoCinematicMapper
from .tension_engine import TensionEngine

logger = logging.getLogger(__name__)


class GrammarMachine:
    """
    Implements cinematographic grammar rules and shot transition logic.

    Based on classical film grammar and narrative flow principles:
    - 180-degree rule
    - Shot reverse-shot patterns
    - Continuity editing
    - Emotional rhythm matching
    """

    def __init__(self, config: Dict):
        """
        Initialize cinematographic grammar machine.

        Args:
            config: System configuration containing grammar rules
        """
        self.config = config
        self.grammar_rules = self._load_grammar_rules()
        self.state_transitions = self._load_state_transitions()
        self.emotional_grammar = self._load_emotional_grammar()

        logger.info("GrammarMachine initialized")

    def _load_grammar_rules(self) -> Dict[str, Any]:
        """
        Load basic cinematographic grammar rules.

        Returns:
            Dictionary of grammar rules
        """
        # Try to load from config file, fall back to defaults
        default_config_path = str(Path(__file__).parent.parent.parent.parent / "shared" / "config" / "cinematography_rules.json")
        config_path = self.config.get(
            "cinematography_config", default_config_path
        )
        try:
            with open(config_path, "r") as f:
                rules = cast(Dict[str, Any], json.load(f))
            return cast(
                Dict[str, Any],
                rules.get(
                    "grammar_rules",
                    {
                        # Shot distance progression rules
                        "distance_progression": {
                            "allowed_sequences": [
                                [
                                    "LS",
                                    "MS",
                                    "MCU",
                                    "CU",
                                    "ECU",
                                ],  # Establishing to intimate
                                [
                                    "ECU",
                                    "CU",
                                    "MCU",
                                    "MS",
                                    "LS",
                                ],  # Intimate to establishing
                                ["MS", "CU", "MS"],  # Classic reverse shot pattern
                            ],
                            "forbidden_sequences": [
                                ["ECU", "LS"],  # Too jarring jump
                                ["LS", "ECU"],  # Avoid too abrupt change
                            ],
                            "progression_penalty": 0.3,  # Penalty for breaking progression
                        },
                        # Angle consistency rules
                        "angle_consistency": {
                            "180_degree_rule": True,  # Maintain screen direction
                            "axis_break_penalty": 0.8,  # High penalty for breaking 180-degree rule
                            "angle_transition_rules": {
                                "high_angle": ["eye_level", "low_angle"],
                                "eye_level": ["high_angle", "low_angle", "dutch"],
                                "low_angle": ["eye_level", "high_angle"],
                                "dutch": ["any"],  # Dutch can go anywhere
                            },
                        },
                        # Emotional rhythm matching
                        "emotional_rhythm": {
                            "tempo_matching": True,  # Match shot duration to emotional tempo
                            "intensity_matching": True,  # Match shot type to emotional intensity
                            "valence_continuity": True,  # Maintain emotional tone transitions
                        },
                    },
                ),
            )
        except FileNotFoundError:
            logger.warning(
                f"Grammar rules config file not found: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    # Shot distance progression rules
                    "distance_progression": {
                        "allowed_sequences": [
                            [
                                "LS",
                                "MS",
                                "MCU",
                                "CU",
                                "ECU",
                            ],  # Establishing to intimate
                            [
                                "ECU",
                                "CU",
                                "MCU",
                                "MS",
                                "LS",
                            ],  # Intimate to establishing
                            ["MS", "CU", "MS"],  # Classic reverse shot pattern
                        ],
                        "forbidden_sequences": [
                            ["ECU", "LS"],  # Too jarring jump
                            ["LS", "ECU"],  # Avoid too abrupt change
                        ],
                        "progression_penalty": 0.3,  # Penalty for breaking progression
                    },
                    # Angle consistency rules
                    "angle_consistency": {
                        "180_degree_rule": True,  # Maintain screen direction
                        "axis_break_penalty": 0.8,  # High penalty for breaking 180-degree rule
                        "angle_transition_rules": {
                            "high_angle": ["eye_level", "low_angle"],
                            "eye_level": ["high_angle", "low_angle", "dutch"],
                            "low_angle": ["eye_level", "high_angle"],
                            "dutch": ["any"],  # Dutch can go anywhere
                        },
                    },
                    # Emotional rhythm matching
                    "emotional_rhythm": {
                        "tempo_matching": True,  # Match shot duration to emotional tempo
                        "intensity_matching": True,  # Match shot type to emotional intensity
                        "valence_continuity": True,  # Maintain emotional tone transitions
                    },
                },
            )
        except json.JSONDecodeError:
            logger.error(
                f"Invalid JSON in grammar rules file: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    # Shot distance progression rules
                    "distance_progression": {
                        "allowed_sequences": [
                            [
                                "LS",
                                "MS",
                                "MCU",
                                "CU",
                                "ECU",
                            ],  # Establishing to intimate
                            [
                                "ECU",
                                "CU",
                                "MCU",
                                "MS",
                                "LS",
                            ],  # Intimate to establishing
                            ["MS", "CU", "MS"],  # Classic reverse shot pattern
                        ],
                        "forbidden_sequences": [
                            ["ECU", "LS"],  # Too jarring jump
                            ["LS", "ECU"],  # Avoid too abrupt change
                        ],
                        "progression_penalty": 0.3,  # Penalty for breaking progression
                    },
                    # Angle consistency rules
                    "angle_consistency": {
                        "180_degree_rule": True,  # Maintain screen direction
                        "axis_break_penalty": 0.8,  # High penalty for breaking 180-degree rule
                        "angle_transition_rules": {
                            "high_angle": ["eye_level", "low_angle"],
                            "eye_level": ["high_angle", "low_angle", "dutch"],
                            "low_angle": ["eye_level", "high_angle"],
                            "dutch": ["any"],  # Dutch can go anywhere
                        },
                    },
                    # Emotional rhythm matching
                    "emotional_rhythm": {
                        "tempo_matching": True,  # Match shot duration to emotional tempo
                        "intensity_matching": True,  # Match shot type to emotional intensity
                        "valence_continuity": True,  # Maintain emotional tone transitions
                    },
                },
            )

    def _load_state_transitions(self) -> Dict[str, Any]:
        """
        Load state transition probabilities for cinematographic FSM.

        Returns:
            Dictionary of transition probabilities
        """
        # Try to load from config file, fall back to defaults
        default_config_path = str(Path(__file__).parent.parent.parent.parent / "shared" / "config" / "cinematography_rules.json")
        config_path = self.config.get(
            "cinematography_config", default_config_path
        )
        try:
            with open(config_path, "r") as f:
                rules = cast(Dict[str, Any], json.load(f))
            return cast(
                Dict[str, Any],
                rules.get(
                    "state_transitions",
                    {
                        "establishing": {
                            "MS": {
                                "probability": 0.4,
                                "next_states": ["closeup", "medium"],
                            },
                            "LS": {
                                "probability": 0.3,
                                "next_states": ["closeup", "medium"],
                            },
                            "MLS": {
                                "probability": 0.3,
                                "next_states": ["closeup", "medium"],
                            },
                        },
                        "closeup": {
                            "CU": {
                                "probability": 0.6,
                                "next_states": ["medium", "establishing"],
                            },
                            "ECU": {
                                "probability": 0.4,
                                "next_states": ["medium", "establishing"],
                            },
                        },
                        "medium": {
                            "MCU": {
                                "probability": 0.4,
                                "next_states": ["closeup", "establishing"],
                            },
                            "MS": {
                                "probability": 0.4,
                                "next_states": ["closeup", "establishing"],
                            },
                            "CU": {"probability": 0.2, "next_states": ["closeup"]},
                        },
                    },
                ),
            )
        except FileNotFoundError:
            logger.warning(
                f"State transitions config file not found: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    "establishing": {
                        "MS": {
                            "probability": 0.4,
                            "next_states": ["closeup", "medium"],
                        },
                        "LS": {
                            "probability": 0.3,
                            "next_states": ["closeup", "medium"],
                        },
                        "MLS": {
                            "probability": 0.3,
                            "next_states": ["closeup", "medium"],
                        },
                    },
                    "closeup": {
                        "CU": {
                            "probability": 0.6,
                            "next_states": ["medium", "establishing"],
                        },
                        "ECU": {
                            "probability": 0.4,
                            "next_states": ["medium", "establishing"],
                        },
                    },
                    "medium": {
                        "MCU": {
                            "probability": 0.4,
                            "next_states": ["closeup", "establishing"],
                        },
                        "MS": {
                            "probability": 0.4,
                            "next_states": ["closeup", "establishing"],
                        },
                        "CU": {"probability": 0.2, "next_states": ["closeup"]},
                    },
                },
            )
        except json.JSONDecodeError:
            logger.error(
                f"Invalid JSON in state transitions file: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    "establishing": {
                        "MS": {
                            "probability": 0.4,
                            "next_states": ["closeup", "medium"],
                        },
                        "LS": {
                            "probability": 0.3,
                            "next_states": ["closeup", "medium"],
                        },
                        "MLS": {
                            "probability": 0.3,
                            "next_states": ["closeup", "medium"],
                        },
                    },
                    "closeup": {
                        "CU": {
                            "probability": 0.6,
                            "next_states": ["medium", "establishing"],
                        },
                        "ECU": {
                            "probability": 0.4,
                            "next_states": ["medium", "establishing"],
                        },
                    },
                    "medium": {
                        "MCU": {
                            "probability": 0.4,
                            "next_states": ["closeup", "establishing"],
                        },
                        "MS": {
                            "probability": 0.4,
                            "next_states": ["closeup", "establishing"],
                        },
                        "CU": {"probability": 0.2, "next_states": ["closeup"]},
                    },
                },
            )

    def _load_emotional_grammar(self) -> Dict[str, Any]:
        """
        Load emotional grammar rules for shot matching.

        Returns:
            Dictionary of emotional grammar rules
        """
        # Try to load from config file, fall back to defaults
        default_config_path = str(Path(__file__).parent.parent.parent.parent / "shared" / "config" / "cinematography_rules.json")
        config_path = self.config.get(
            "cinematography_config", default_config_path
        )
        try:
            with open(config_path, "r") as f:
                rules = cast(Dict[str, Any], json.load(f))
            return cast(
                Dict[str, Any],
                rules.get(
                    "emotional_grammar",
                    {
                        "emotional_containment": {
                            # Emotions that should maintain shot distance consistency
                            "high_intensity": ["anger", "fear", "surprise"],
                            "low_intensity": ["sadness", "trust", "anticipation"],
                            "modulation_rules": {
                                "quick_modulation_penalty": 0.7,  # Penalty for rapid changes during high intensity
                                "gradual_modulation_bonus": 0.3,  # Bonus for gradual changes during low intensity
                            },
                        },
                        "emotional_transition": {
                            # Rules for transitioning between emotions
                            "compatible_pairs": [
                                ["joy", "trust"],
                                ["fear", "surprise"],
                                ["anger", "anticipation"],
                                ["sadness", "trust"],
                            ],
                            "incompatible_pairs": [
                                ["joy", "sadness"],
                                ["anger", "joy"],
                                ["fear", "joy"],
                            ],
                            "transition_rules": {
                                "compatible_bonus": 0.4,
                                "incompatible_penalty": 0.6,
                                "neutral_bridge_shot": [
                                    "MCU",
                                    "MS",
                                ],  # Use neutral shots for incompatible transitions
                            },
                        },
                    },
                ),
            )
        except FileNotFoundError:
            logger.warning(
                f"Emotional grammar config file not found: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    "emotional_containment": {
                        # Emotions that should maintain shot distance consistency
                        "high_intensity": ["anger", "fear", "surprise"],
                        "low_intensity": ["sadness", "trust", "anticipation"],
                        "modulation_rules": {
                            "quick_modulation_penalty": 0.7,  # Penalty for rapid changes during high intensity
                            "gradual_modulation_bonus": 0.3,  # Bonus for gradual changes during low intensity
                        },
                    },
                    "emotional_transition": {
                        # Rules for transitioning between emotions
                        "compatible_pairs": [
                            ["joy", "trust"],
                            ["fear", "surprise"],
                            ["anger", "anticipation"],
                            ["sadness", "trust"],
                        ],
                        "incompatible_pairs": [
                            ["joy", "sadness"],
                            ["anger", "joy"],
                            ["fear", "joy"],
                        ],
                        "transition_rules": {
                            "compatible_bonus": 0.4,
                            "incompatible_penalty": 0.6,
                            "neutral_bridge_shot": [
                                "MCU",
                                "MS",
                            ],  # Use neutral shots for incompatible transitions
                        },
                    },
                },
            )
        except json.JSONDecodeError:
            logger.error(
                f"Invalid JSON in emotional grammar file: {config_path}, using defaults"
            )
            return cast(
                Dict[str, Any],
                {
                    "emotional_containment": {
                        # Emotions that should maintain shot distance consistency
                        "high_intensity": ["anger", "fear", "surprise"],
                        "low_intensity": ["sadness", "trust", "anticipation"],
                        "modulation_rules": {
                            "quick_modulation_penalty": 0.7,  # Penalty for rapid changes during high intensity
                            "gradual_modulation_bonus": 0.3,  # Bonus for gradual changes during low intensity
                        },
                    },
                    "emotional_transition": {
                        # Rules for transitioning between emotions
                        "compatible_pairs": [
                            ["joy", "trust"],
                            ["fear", "surprise"],
                            ["anger", "anticipation"],
                            ["sadness", "trust"],
                        ],
                        "incompatible_pairs": [
                            ["joy", "sadness"],
                            ["anger", "joy"],
                            ["fear", "joy"],
                        ],
                        "transition_rules": {
                            "compatible_bonus": 0.4,
                            "incompatible_penalty": 0.6,
                            "neutral_bridge_shot": [
                                "MCU",
                                "MS",
                            ],  # Use neutral shots for incompatible transitions
                        },
                    },
                },
            )

    def validate_shot_sequence(
        self,
        shot_sequence: List[Dict[str, Any]],
        emotion_sequence: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Validate shot sequence against cinematographic grammar rules.

        Args:
            shot_sequence: List of shot specifications
            emotion_sequence: Optional emotion data for emotional grammar validation

        Returns:
            Validation result dictionary
        """
        validation_result: Dict[str, Any] = {
            "valid": True,
            "score": 1.0,
            "violations": [],
            "warnings": [],
            "grammar_score": 1.0,
            "emotional_score": 1.0,
            "continuity_score": 1.0,
        }

        if len(shot_sequence) < 2:
            return validation_result

        # Check distance progression
        distance_violations = self._check_distance_progression(shot_sequence)
        validation_result["violations"].extend(distance_violations)

        # Check angle consistency
        angle_violations = self._check_angle_consistency(shot_sequence)
        validation_result["violations"].extend(angle_violations)

        # Check emotional grammar if emotion data provided
        if emotion_sequence:
            emotional_violations = self._check_emotional_grammar(
                shot_sequence, emotion_sequence
            )
            validation_result["violations"].extend(emotional_violations)

        # Calculate scores
        if validation_result["violations"]:
            validation_result["valid"] = False
            # Deduct points for violations
            validation_result["score"] = max(
                0.0, 1.0 - (len(validation_result["violations"]) * 0.2)
            )
        else:
            validation_result["score"] = 1.0

        return validation_result

    def _check_distance_progression(
        self, shot_sequence: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Check shot distance progression for cinematographic coherence.

        Args:
            shot_sequence: List of shot specifications

        Returns:
            List of violation descriptions
        """
        violations: List[str] = []

        for i in range(1, len(shot_sequence)):
            prev_shot = shot_sequence[i - 1]
            curr_shot = shot_sequence[i]
            prev_spec = cast(Dict[str, Any], prev_shot.get("shot_specification", {}))
            curr_spec = cast(Dict[str, Any], curr_shot.get("shot_specification", {}))

            prev_distance = cast(str, prev_spec.get("distance", ""))
            curr_distance = cast(str, curr_spec.get("distance", ""))

            # Check forbidden sequences
            for forbidden_seq in self.grammar_rules["distance_progression"][
                "forbidden_sequences"
            ]:
                if (
                    prev_distance == forbidden_seq[0]
                    and curr_distance == forbidden_seq[1]
                ):
                    violations.append(
                        f"Forbidden distance transition: {prev_distance} -> {curr_distance}"
                    )

        return violations

    def _check_angle_consistency(
        self, shot_sequence: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Check camera angle consistency and 180-degree rule.

        Args:
            shot_sequence: List of shot specifications

        Returns:
            List of violation descriptions
        """
        violations: List[str] = []

        for i in range(1, len(shot_sequence)):
            prev_shot = shot_sequence[i - 1]
            curr_shot = shot_sequence[i]
            prev_spec = cast(Dict[str, Any], prev_shot.get("shot_specification", {}))
            curr_spec = cast(Dict[str, Any], curr_shot.get("shot_specification", {}))

            prev_angle = cast(str, prev_spec.get("angle", ""))
            curr_angle = cast(str, curr_spec.get("angle", ""))

            # Check angle transition rules
            allowed_angles = self.grammar_rules["angle_consistency"][
                "angle_transition_rules"
            ].get(prev_angle, [])

            if (
                allowed_angles
                and allowed_angles != ["any"]
                and curr_angle not in allowed_angles
            ):
                violations.append(
                    f"Invalid angle transition: {prev_angle} -> {curr_angle}"
                )

        return violations

    def _check_emotional_grammar(
        self,
        shot_sequence: List[Dict[str, Any]],
        emotion_sequence: List[Dict[str, Any]],
    ) -> List[str]:
        """
        Check emotional grammar for coherence.

        Args:
            shot_sequence: List of shot specifications
            emotion_sequence: List of emotion data

        Returns:
            List of violation descriptions
        """
        violations: List[str] = []

        # Match shot sequence with emotion sequence
        for i in range(1, len(shot_sequence)):
            if i < len(emotion_sequence):
                prev_emotion_data = emotion_sequence[i - 1]
                curr_emotion_data = emotion_sequence[i]

                prev_emotion_primary = cast(
                    Dict[str, Any], prev_emotion_data.get("primary_emotion", {})
                )
                curr_emotion_primary = cast(
                    Dict[str, Any], curr_emotion_data.get("primary_emotion", {})
                )

                prev_emotion = cast(str, prev_emotion_primary.get("name", ""))
                curr_emotion = cast(str, curr_emotion_primary.get("name", ""))

                # Check incompatible emotion pairs
                for incompatible_pair in self.emotional_grammar["emotional_transition"][
                    "incompatible_pairs"
                ]:
                    if (
                        prev_emotion == incompatible_pair[0]
                        and curr_emotion == incompatible_pair[1]
                    ) or (
                        prev_emotion == incompatible_pair[1]
                        and curr_emotion == incompatible_pair[0]
                    ):
                        violations.append(
                            f"Incompatible emotion transition: {prev_emotion} -> {curr_emotion}"
                        )

        return violations

    def suggest_optimal_transition(
        self,
        current_shot: Dict[str, Any],
        target_emotion: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Suggest optimal shot transition based on grammar rules.

        Args:
            current_shot: Current shot specification
            target_emotion: Target emotion data
            context: Additional context

        Returns:
            Suggested transition specification
        """
        if context is None:
            context = {}

        current_distance = current_shot["shot_specification"]["distance"]
        current_angle = current_shot["shot_specification"]["angle"]
        target_emotion_name = target_emotion["name"]

        # Calculate probabilities for different transition options
        transition_options = []

        # Generate possible next shots based on FSM
        for state, transitions in self.state_transitions.items():
            for distance, props in transitions.items():
                # Calculate compatibility score
                score = self._calculate_transition_score(
                    current_shot, distance, target_emotion
                )

                transition_options.append(
                    {
                        "distance": distance,
                        "angle": self._suggest_compatible_angle(
                            current_angle, distance
                        ),
                        "probability": props["probability"],
                        "compatibility_score": score,
                        "overall_score": (props["probability"] * 0.6) + (score * 0.4),
                    }
                )

        # Sort by overall score
        transition_options.sort(key=lambda x: x["overall_score"], reverse=True)

        # Return the best option
        best_option = (
            transition_options[0]
            if transition_options
            else {
                "distance": current_distance,
                "angle": current_angle,
                "probability": 0.5,
                "compatibility_score": 0.5,
                "overall_score": 0.5,
            }
        )

        # Add contextual adjustments
        if (
            target_emotion_name
            in self.emotional_grammar["emotional_containment"]["high_intensity"]
        ):
            # For high intensity emotions, prefer closer shots
            if best_option["distance"] in ["LS", "MLS"]:
                best_option["distance"] = "MCU"  # Move closer
        elif (
            target_emotion_name
            in self.emotional_grammar["emotional_containment"]["low_intensity"]
        ):
            # For low intensity emotions, maintain distance
            best_option["angle"] = "eye_level"  # Maintain neutrality

        return best_option

    def _calculate_transition_score(
        self, current_shot: Dict, next_distance: str, target_emotion: Dict
    ) -> float:
        """
        Calculate compatibility score for shot transition.

        Args:
            current_shot: Current shot specification
            next_distance: Proposed next shot distance
            target_emotion: Target emotion data

        Returns:
            Compatibility score (0.0-1.0)
        """
        # Start with base compatibility
        score = 0.5

        current_distance = current_shot["shot_specification"]["distance"]
        target_emotion_name = target_emotion["name"]
        target_intensity = target_emotion["intensity"]

        # Adjust for distance progression rules
        if self._is_progressive_distance_change(current_distance, next_distance):
            score += 0.2
        else:
            # Penalize non-progressive changes
            score -= 0.1

        # Adjust for emotional compatibility
        intensity_factor = self._calculate_emotional_intensity_factor(
            target_emotion_name, target_intensity
        )
        score += intensity_factor * 0.3

        # Ensure score stays within bounds
        return max(0.0, min(1.0, score))

    def _is_progressive_distance_change(self, current: str, next_distance: str) -> bool:
        """
        Check if distance change follows progressive cinematographic rules.

        Args:
            current: Current distance
            next_distance: Next distance

        Returns:
            True if change is progressive
        """
        distances = ["LS", "MLS", "MS", "MCU", "CU", "ECU"]

        try:
            current_idx = distances.index(current)
            next_idx = distances.index(next_distance)

            # Progressive is moving one step at a time (or staying same)
            return abs(next_idx - current_idx) <= 1
        except ValueError:
            # If distance not in our list, assume it's valid
            return True

    def _calculate_emotional_intensity_factor(
        self, emotion_name: str, intensity: float
    ) -> float:
        """
        Calculate factor based on emotional intensity for shot selection.

        Args:
            emotion_name: Name of emotion
            intensity: Emotional intensity (0.0-1.0)

        Returns:
            Intensity factor (-0.5 to 0.5)
        """
        if emotion_name in ["anger", "fear", "surprise"]:
            # High intensity emotions should drive closer shots
            return min(0.5, intensity)
        elif emotion_name in ["sadness", "trust"]:
            # Lower intensity emotions might prefer moderate shots
            return max(-0.3, -intensity * 0.5)
        else:
            # Neutral emotions follow standard rules
            return 0.0

    def _suggest_compatible_angle(self, current_angle: str, distance: str) -> str:
        """
        Suggest compatible angle based on current angle and target distance.

        Args:
            current_angle: Current camera angle
            distance: Target shot distance

        Returns:
            Compatible camera angle
        """
        # Maintain angle type for similar distances
        if distance in ["ECU", "CU"]:
            # Close shots can use more dramatic angles
            if current_angle == "dutch":
                return "dutch"
            elif current_angle in ["high_angle", "low_angle"]:
                return current_angle
            else:
                return "eye_level"
        elif distance in ["MS", "MLS", "LS"]:
            # Wide shots typically use neutral angles
            return "eye_level"
        else:
            # Medium shots can vary
            return current_angle if current_angle != "dutch" else "eye_level"

    def generate_grammar_compliant_sequence(
        self,
        target_emotions: List[Dict[str, Any]],
        duration_constraints: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate a grammar-compliant shot sequence for target emotions.

        Args:
            target_emotions: List of target emotion specifications
            duration_constraints: Optional duration constraints

        Returns:
            Grammar-compliant shot sequence
        """
        shot_sequence: List[Dict[str, Any]] = []

        for i, emotion_data in enumerate(target_emotions):
            context = {}
            if i > 0 and shot_sequence:
                context["previous_shot"] = shot_sequence[i - 1]
                context["previous_emotion"] = target_emotions[i - 1]

            # Determine shot based on grammar and emotion
            shot_spec = self._generate_grammar_shot(emotion_data, context)

            # Create sequence entry
            sequence_entry = {
                "segment_id": f"shot_{i:03d}",
                "emotion": emotion_data["name"],
                "shot_specification": shot_spec,
                "timing": self._calculate_timing(emotion_data, duration_constraints),
            }

            shot_sequence.append(sequence_entry)

        # Validate and adjust the sequence
        validation = self.validate_shot_sequence(shot_sequence, target_emotions)
        if not validation["valid"]:
            # Apply corrections for violations
            shot_sequence = self._correct_grammar_violations(
                shot_sequence, target_emotions, validation
            )

        return shot_sequence

    def _generate_grammar_shot(
        self, emotion_data: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Select appropriate shot based on emotion and narrative context.

        Args:
            emotion_data: Emotion data from analyzer
            context: Narrative context including previous shots and tension

        Returns:
            Shot specification
        """
        # Determine base shot from emotion
        emotion_name = emotion_data["name"].lower()

        # Basic shot selection based on emotion
        if emotion_name in ["anger", "fear", "surprise"]:
            distance = "CU"  # Close-up for intense emotions
            angle = "low_angle" if emotion_name == "anger" else "high_angle"
        elif emotion_name in ["sadness", "trust"]:
            distance = "MCU"  # Medium close-up for emotional connection
            angle = "eye_level"
        else:
            distance = "MCU"  # Default to medium close-up
            angle = "eye_level"

        # Duration based on emotional stability
        stability_factor = 1.0 - emotion_data.get(
            "intensity", 0.5
        )  # More intense = shorter
        base_duration = 2.0  # Default 2 seconds
        duration = base_duration * (0.5 + stability_factor)

        return {
            "distance": distance,
            "angle": angle,
            "duration": max(0.5, min(5.0, duration)),  # Clamp between 0.5 and 5 seconds
            "transition_hint": "cut",  # Default transition
        }

    def _calculate_timing(
        self,
        emotion_data: Dict[str, Any],
        duration_constraints: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Calculate timing information for shot.

        Args:
            emotion_data: Emotion data
            duration_constraints: Duration constraints

        Returns:
            Timing dictionary
        """
        if duration_constraints:
            min_duration = duration_constraints.get("min_duration", 1.0)
            max_duration = duration_constraints.get("max_duration", 3.0)
        else:
            min_duration = 1.0
            max_duration = 3.0

        # Base duration on emotional intensity (more intense = potentially shorter)
        intensity = emotion_data.get("intensity", 0.5)
        base_duration = min_duration + (max_duration - min_duration) * (1.0 - intensity)

        return {
            "duration": base_duration,
            "in_transition": 0.1,  # Quick fade-in
            "out_transition": 0.1,  # Quick fade-out
        }

    def _correct_grammar_violations(
        self,
        shot_sequence: List[Dict[str, Any]],
        emotion_sequence: List[Dict[str, Any]],
        validation: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Apply corrections to fix grammar violations.

        Args:
            shot_sequence: Original shot sequence
            emotion_sequence: Emotion sequence
            validation: Validation results

        Returns:
            Corrected shot sequence
        """
        corrected_sequence = shot_sequence.copy()

        for violation in validation["violations"]:
            # Apply corrections based on violation type
            if "distance transition" in violation:
                # Adjust distance to be more progressive
                self._correct_distance_violations(corrected_sequence)
            elif "angle transition" in violation:
                # Adjust angles to maintain consistency
                self._correct_angle_violations(corrected_sequence)

        return corrected_sequence

    def _correct_distance_violations(self, sequence: List[Dict[str, Any]]) -> None:
        """
        Correct distance progression violations.

        Args:
            sequence: Shot sequence to correct
        """
        for i in range(1, len(sequence)):
            prev_distance = sequence[i - 1]["shot_specification"]["distance"]
            curr_distance = sequence[i]["shot_specification"]["distance"]

            # Check if this violates progression rules
            if not self._is_progressive_distance_change(prev_distance, curr_distance):
                # Insert an intermediate shot or adjust to be more progressive
                sequence[i]["shot_specification"]["distance"] = (
                    self._get_progressive_distance(prev_distance, curr_distance)
                )

    def _get_progressive_distance(self, from_distance: str, to_distance: str) -> str:
        """
        Get a progressive intermediate distance between two shots.

        Args:
            from_distance: Starting distance
            to_distance: Target distance

        Returns:
            Progressive intermediate distance
        """
        distances = ["LS", "MLS", "MS", "MCU", "CU", "ECU"]

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

    def _correct_angle_violations(self, sequence: List[Dict[str, Any]]) -> None:
        """
        Correct angle transition violations.

        Args:
            sequence: Shot sequence to correct
        """
        for i in range(1, len(sequence)):
            prev_angle = sequence[i - 1]["shot_specification"]["angle"]
            curr_angle = sequence[i]["shot_specification"]["angle"]

            # Avoid jarring angle changes like switching from high_angle to low_angle
            # If there's a significant angle change, try to smooth the transition
            angle_hierarchy = {
                "dutch": 0,  # Most dynamic/attention-grabbing
                "low_angle": 1,  # Power/authority
                "eye_level": 2,  # Neutral/objective
                "high_angle": 3,  # Vulnerability/weakness
            }

            if prev_angle in angle_hierarchy and curr_angle in angle_hierarchy:
                prev_rank = angle_hierarchy[prev_angle]
                curr_rank = angle_hierarchy[curr_angle]

                # If there's a large jump in angle hierarchy, consider smoothing
                if abs(prev_rank - curr_rank) > 2:  # Large change
                    # For now, make the current angle the same as previous for continuity
                    sequence[i]["shot_specification"]["angle"] = prev_angle


# FSM-based cinematographic state machine
class CinematographicFSM:
    """
    Finite State Machine for cinematographic states and transitions.
    """

    def __init__(self):
        self.states = {
            "establishing": {
                "entry_actions": ["wide_shot"],
                "transitions": ["medium", "closeup"],
            },
            "medium": {
                "entry_actions": ["medium_shot"],
                "transitions": ["closeup", "establishing"],
            },
            "closeup": {
                "entry_actions": ["closeup_shot"],
                "transitions": ["medium", "establishing"],
            },
            "action": {
                "entry_actions": ["dynamic_shot"],
                "transitions": ["closeup", "medium"],
            },
        }
        self.current_state = "establishing"

    def transition_to(self, new_state: str) -> bool:
        """
        Transition to a new cinematographic state.

        Args:
            new_state: Target state

        Returns:
            True if transition is valid
        """
        if new_state in self.states[self.current_state]["transitions"]:
            self.current_state = new_state
            return True
        return False

    def get_current_actions(self) -> List[str]:
        """
        Get actions associated with current state.

        Returns:
            List of cinematographic actions
        """
        return cast(List[str], self.states[self.current_state]["entry_actions"])
