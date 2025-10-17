# LipSyncAutomation v2.0 - Phase 2: Cinematographic Decision Engine

## Document Control

**Project:** LipSyncAutomation System Upgrade to Emotion-Aware Multi-Angle Video Generation  
**Version:** 2.0.0  
**Date:** October 18, 2025  
**Status:** Implementation Ready  
**Classification:** Internal Development  

## Phase 2 Overview

**Duration:** 2-3 weeks  
**Team:** 2-3 developers  
**Dependencies:** Phase 1 complete (EmotionAnalyzer operational)

### Phase Objectives

#### Primary Goals
1. Implement PsychoCinematicMapper for emotion-to-shot mapping[4][5][6]
2. Build EmotionalTensionEngine for narrative pacing[7][8]
3. Create ShotGrammarMachine for cinematographic rules[9][10][11]
4. Integrate components into CinematographicDecisionEngine
5. Implement manual override system

#### Deliverables
- [ ] Complete cinematography module with all subcomponents
- [ ] Rule configuration system (JSON-based)
- [ ] Shot sequence generation API
- [ ] Debug visualization tools
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests with EmotionAnalyzer
- [ ] Documentation: Cinematographic rules and customization guide

### Technical Specifications

#### Psycho-Cinematic Mapping Rules

**Based on research correlations between emotion and cinematography**[5][6][12][4]

##### Arousal → Shot Distance Mapping

| Arousal Range | Shot Distance | Justification |
|---------------|---------------|---------------|
| 0.8 - 1.0 | ECU (Extreme Close-Up) | Maximum emotional intensity, facial detail[6] |
| 0.6 - 0.8 | CU (Close-Up) | High emotional engagement[12] |
| 0.4 - 0.6 | MCU (Medium Close-Up) | Standard dialogue, balanced emotion |
| 0.2 - 0.4 | MS (Medium Shot) | Contextual emotion, body language |
| 0.0 - 0.2 | MLS/LS | Environmental context, calm scenes |

##### Valence → Camera Angle Mapping

| Valence Range | Camera Angle | Psychological Effect |
|---------------|--------------|----------------------|
| > 0.4 | Low Angle | Empowerment, heroism[4][13] |
| -0.2 to 0.4 | Eye Level | Neutral, objective observation |
| < -0.2 | High Angle | Vulnerability, weakness[14] |

##### Specific Emotion Overrides

Based on psychological research on emotion perception:[13][4]

| Emotion | Preferred Angle | Rationale |
|---------|-----------------|-----------|
| Fear | High Angle | Emphasizes vulnerability |
| Anger | Low Angle | Emphasizes dominance/power |
| Joy | Low Angle / Eye Level | Elevation, celebration |
| Sadness | High Angle | Defeat, dejection |
| Surprise | Eye Level | Neutral observation of reaction |

##### Shot Duration Calculation

Research shows shot duration has decreased over decades: ~14s (1940s) → ~4.5s (2020s)[15]

**Formula:**
```
base_duration = shot_distance_base[distance]
arousal_factor = 1.0 - (arousal * 0.3)  # Higher arousal = 30% shorter
derivative_factor = 1.0 - (|arousal_change_rate| * 0.2)  # Rapid change = 20% shorter
final_duration = base_duration * arousal_factor * derivative_factor
final_duration = clamp(final_duration, 1.5, 10.0)  # Enforce bounds
```

**Base Durations:**
- ECU: 2.5s (close-ups convey emotion faster)[12]
- CU: 3.5s
- MCU: 4.5s
- MS: 5.5s
- MLS: 7.0s
- LS: 8.0s

#### Cinematographic Rules Configuration

**File:** `config/cinematography_rules.json`

```json
{
  "schema_version": "1.0",
  "psycho_mapping": {
    "arousal_to_distance": {
      "thresholds": [
        {"min": 0.8, "max": 1.0, "distance": "ECU"},
        {"min": 0.6, "max": 0.8, "distance": "CU"},
        {"min": 0.4, "max": 0.6, "distance": "MCU"},
        {"min": 0.2, "max": 0.4, "distance": "MS"},
        {"min": 0.0, "max": 0.2, "distance": "MLS"}
      ],
      "intensity_multiplier": true,
      "multiplier_range": [0.8, 1.2]
    },
    "valence_to_angle": {
      "positive_threshold": 0.4,
      "negative_threshold": -0.2,
      "positive_angle": "low_angle",
      "neutral_angle": "eye_level",
      "negative_angle": "high_angle"
    },
    "emotion_angle_overrides": {
      "fear": "high_angle",
      "anger": "low_angle",
      "joy": "low_angle",
      "sadness": "high_angle",
      "surprise": "eye_level",
      "disgust": "eye_level",
      "trust": "eye_level",
      "anticipation": "eye_level"
    },
    "duration_base": {
      "ECU": 2.5,
      "CU": 3.5,
      "MCU": 4.5,
      "MS": 5.5,
      "MLS": 7.0,
      "LS": 8.0
    },
    "duration_modulation": {
      "arousal_weight": 0.3,
      "derivative_weight": 0.2,
      "min_duration": 1.5,
      "max_duration": 10.0
    }
  },
  "tension_engine": {
    "narrative_structure": "three_act",
    "act_boundaries": [0.25, 0.75],
    "climax_position": 0.65,
    "tension_formula": {
      "arousal_momentum_weight": 0.4,
      "valence_volatility_weight": 0.3,
      "position_curve_weight": 0.3
    },
    "phase_multipliers": {
      "setup": 0.6,
      "confrontation": 1.0,
      "resolution": 0.7
    }
  },
  "grammar_rules": {
    "avoid_jump_cuts": true,
    "max_consecutive_similar": 2,
    "smooth_distance_transitions": true,
    "max_distance_jump": 2,
    "rhythm_consistency": true,
    "max_duration_change": 3.0,
    "transition_rules": {
      "distance_change_1": {"type": "cut", "duration": 0.0},
      "distance_change_2": {"type": "dissolve", "duration": 0.3},
      "distance_change_3": {"type": "fade", "duration": 0.5}
    }
  },
  "shot_patterns": {
    "five_shot": {
      "sequence": ["ECU", "CU", "MCU", "MS", "MLS"],
      "trigger": "high_arousal_peak"
    },
    "escalation": {
      "sequence": ["MS", "MCU", "CU", "ECU"],
      "trigger": "rising_arousal"
    },
    "release": {
      "sequence": ["ECU", "CU", "MCU", "MS"],
      "trigger": "falling_tension"
    }
  }
}
```

### Implementation Details

#### PsychoCinematicMapper

**File:** `src/core/cinematography/psycho_mapper.py`

```python
"""
PsychoCinematicMapper: Maps emotion dimensions to cinematographic parameters
using empirically validated correlations.

References:
- Cutting et al. (2011): Close-ups convey emotion faster
- Maathuis (2011): Camera angle psychology
- Panagiotidis (2022): Shot duration and emotional intensity

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, Tuple
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class PsychoCinematicMapper:
    """
    Maps emotion dimensions to cinematographic shot specifications.
    
    Uses research-backed correlations:
    - Arousal → Shot Distance
    - Valence → Camera Angle
    - Arousal Change Rate → Shot Duration
    """
    
    def __init__(self, config: Dict):
        """
        Initialize mapper with configuration.
        
        Args:
            config: Cinematography rules configuration
        """
        self.config = config
        self.rules = self._load_rules()
        
        logger.info("PsychoCinematicMapper initialized")
    
    def _load_rules(self) -> Dict:
        """Load cinematographic rules from configuration"""
        rules_path = Path("config/cinematography_rules.json")
        
        if rules_path.exists():
            with open(rules_path, 'r') as f:
                return json.load(f)
        else:
            logger.warning("Cinematography rules not found, using defaults")
            return self._get_default_rules()
    
    def _get_default_rules(self) -> Dict:
        """Get default cinematographic rules"""
        # Default rules as defined in section 2.2.2
        return {
            "psycho_mapping": {
                "arousal_to_distance": {
                    "thresholds": [
                        {"min": 0.8, "max": 1.0, "distance": "ECU"},
                        {"min": 0.6, "max": 0.8, "distance": "CU"},
                        {"min": 0.4, "max": 0.6, "distance": "MCU"},
                        {"min": 0.2, "max": 0.4, "distance": "MS"},
                        {"min": 0.0, "max": 0.2, "distance": "MLS"}
                    ]
                },
                # ... (rest of default rules)
            }
        }
    
    def select_shot(self, emotion_state: Dict, context: Dict) -> Dict:
        """
        Select shot specification based on emotion dimensions.
        
        Args:
            emotion_state: Dictionary containing:
                - arousal: float (0-1)
                - valence: float (-1 to 1)
                - intensity: float (0-1)
                - primary_emotion: str (emotion name)
            context: Dictionary containing:
                - previous_shot: Dict or None
                - time_in_segment: float
                - arousal_derivative: float (rate of change)
                - tension_state: Dict (from TensionEngine)
        
        Returns:
            Shot specification dictionary:
            {
                'distance': str,
                'angle': str,
                'duration': float,
                'justification': str,
                'confidence': float
            }
        """
        arousal = emotion_state['arousal']
        valence = emotion_state['valence']
        intensity = emotion_state['intensity']
        primary_emotion = emotion_state['primary_emotion']
        
        # Step 1: Map arousal to shot distance
        distance = self._map_arousal_to_distance(arousal, intensity)
        
        # Step 2: Map valence to camera angle (with emotion overrides)
        angle = self._map_valence_to_angle(valence, primary_emotion)
        
        # Step 3: Calculate shot duration
        duration = self._calculate_duration(
            arousal=arousal,
            arousal_derivative=context.get('arousal_derivative', 0.0),
            distance=distance
        )
        
        # Step 4: Generate justification
        justification = self._generate_justification(
            distance, angle, duration, emotion_state, context
        )
        
        # Step 5: Calculate confidence score
        confidence = self._calculate_confidence(emotion_state, context)
        
        shot_spec = {
            'distance': distance,
            'angle': angle,
            'duration': duration,
            'justification': justification,
            'confidence': confidence,
            'emotion_data': {
                'arousal': arousal,
                'valence': valence,
                'intensity': intensity,
                'emotion': primary_emotion
            }
        }
        
        logger.debug(f"Shot selected: {distance} {angle} {duration:.1f}s")
        
        return shot_spec
    
    def _map_arousal_to_distance(self, arousal: float, intensity: float) -> str:
        """
        Map arousal level to shot distance.
        
        Args:
            arousal: Arousal level (0-1)
            intensity: Emotion intensity (0-1)
        
        Returns:
            Shot distance code (ECU, CU, MCU, MS, MLS, LS)
        """
        rules = self.rules['psycho_mapping']['arousal_to_distance']
        
        # Apply intensity multiplier
        if rules.get('intensity_multiplier', True):
            multiplier_range = rules.get('multiplier_range', [0.8, 1.2])
            multiplier = multiplier_range[0] + (multiplier_range[1] - multiplier_range[0]) * intensity
            adjusted_arousal = arousal * multiplier
        else:
            adjusted_arousal = arousal
        
        # Clamp to [0, 1]
        adjusted_arousal = max(0.0, min(1.0, adjusted_arousal))
        
        # Find matching threshold
        for threshold in rules['thresholds']:
            if threshold['min'] <= adjusted_arousal < threshold['max']:
                return threshold['distance']
        
        # Fallback
        return "MCU"

    def _map_valence_to_angle(self, valence: float, primary_emotion: str) -> str:
        """
        Map valence to camera angle with emotion-specific overrides.
        
        Args:
            valence: Valence score (-1 to +1)
            primary_emotion: Emotion name
        
        Returns:
            Camera angle (high_angle, eye_level, low_angle)
        """
        rules = self.rules['psycho_mapping']['valence_to_angle']
        overrides = self.rules['psycho_mapping'].get('emotion_angle_overrides', {})
        
        # Check for emotion-specific override
        if primary_emotion in overrides:
            return overrides[primary_emotion]
        
        # Use valence-based mapping
        if valence > rules['positive_threshold']:
            return rules['positive_angle']
        elif valence > rules['negative_threshold']:
            return rules['neutral_angle']
        else:
            return rules['negative_angle']
    
    def _calculate_duration(self, arousal: float, arousal_derivative: float, 
                            distance: str) -> float:
        """
        Calculate optimal shot duration based on arousal and shot distance.
        
        Args:
            arousal: Arousal level (0-1)
            arousal_derivative: Rate of arousal change
            distance: Shot distance code
        
        Returns:
            Duration in seconds
        """
        rules = self.rules['psycho_mapping']['duration_base']
        modulation = self.rules['psycho_mapping']['duration_modulation']
        
        # Get base duration for distance
        base = rules.get(distance, 4.5)
        
        # Apply arousal modulation (higher arousal = shorter)
        arousal_factor = 1.0 - (arousal * modulation['arousal_weight'])
        
        # Apply derivative modulation (rapid change = shorter)
        derivative_factor = 1.0 - (abs(arousal_derivative) * modulation['derivative_weight'])
        
        # Calculate final duration
        final = base * arousal_factor * derivative_factor
        
        # Clamp to bounds
        min_dur = modulation['min_duration']
        max_dur = modulation['max_duration']
        
        return max(min_dur, min(max_dur, final))
    
    def _generate_justification(self, distance: str, angle: str, duration: float,
                                 emotion_state: Dict, context: Dict) -> str:
        """Generate human-readable justification for shot selection"""
        arousal = emotion_state['arousal']
        valence = emotion_state['valence']
        emotion = emotion_state['primary_emotion']
        
        justification_parts = []
        
        # Distance justification
        if arousal > 0.7:
            justification_parts.append(f"{distance} shot for high emotional intensity (arousal={arousal:.2f})")
        elif arousal < 0.3:
            justification_parts.append(f"{distance} shot for calm scene (arousal={arousal:.2f})")
        else:
            justification_parts.append(f"{distance} shot for moderate emotion (arousal={arousal:.2f})")
        
        # Angle justification
        if angle == "low_angle":
            justification_parts.append("Low angle emphasizes power/elevation")
        elif angle == "high_angle":
            justification_parts.append("High angle conveys vulnerability")
        else:
            justification_parts.append("Eye level for neutral perspective")
        
        # Duration justification
        if duration < 3.0:
            justification_parts.append(f"Short duration ({duration:.1f}s) for dynamic pacing")
        elif duration > 6.0:
            justification_parts.append(f"Extended duration ({duration:.1f}s) for contemplative moment")
        
        return "; ".join(justification_parts)
    
    def _calculate_confidence(self, emotion_state: Dict, context: Dict) -> float:
        """Calculate confidence score for shot decision"""
        confidence = emotion_state.get('confidence', 0.8)
        
        # Reduce confidence if emotion intensity is low
        if emotion_state['intensity'] < 0.4:
            confidence *= 0.8
        
        # Increase confidence if arousal is clear (very high or very low)
        arousal = emotion_state['arousal']
        if arousal > 0.8 or arousal < 0.2:
            confidence *= 1.1
        
        return min(1.0, confidence)
```

#### EmotionalTensionEngine

**File:** `src/core/cinematography/tension_engine.py`

```python
"""
EmotionalTensionEngine: Calculates narrative tension for pacing decisions.

Based on dramatic structure theory (three-act structure, tension curves).

Author: Development Team
Date: 2025-10-18
"""

import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class EmotionalTensionEngine:
    """
    Models narrative tension as mathematical curve that drives pacing.
    
    Uses three-act structure:
    - Setup (0-25%): Building tension
    - Confrontation (25-75%): Peak tension
    - Resolution (75-100%): Falling tension
    """
    
    def __init__(self, config: Dict):
        """
        Initialize tension engine.
        
        Args:
            config: Cinematography rules configuration
        """
        self.config = config
        self.rules = config.get('tension_engine', {})
        self.tension_history: List[float] = []
        
        logger.info("EmotionalTensionEngine initialized")
    
    def calculate_narrative_tension(self, 
                                     emotion_segments: List[Dict],
                                     current_time: float) -> Dict:
        """
        Calculate current narrative tension state.
        
        Args:
            emotion_segments: All emotion segments up to current point
            current_time: Current timestamp in audio
        
        Returns:
            Tension state dictionary:
            {
                'tension_score': float (0-1),
                'arousal_momentum': float,
                'valence_volatility': float,
                'narrative_phase': str,
                'pacing_directive': str
            }
        """
        if not emotion_segments:
            return self._get_default_tension()
        
        # Calculate arousal momentum
        arousal_momentum = self._calculate_arousal_momentum(emotion_segments)
        
        # Calculate valence volatility
        valence_volatility = self._calculate_valence_volatility(emotion_segments)
        
        # Determine narrative phase and position
        total_duration = emotion_segments[-1]['end_time']
        position = current_time / total_duration if total_duration > 0 else 0
        narrative_phase = self._determine_narrative_phase(position)
        
        # Calculate composite tension
        tension_score = self._composite_tension_score(
            arousal_momentum=arousal_momentum,
            valence_volatility=valence_volatility,
            narrative_phase=narrative_phase,
            position=position
        )
        
        # Store in history
        self.tension_history.append(tension_score)
        
        # Determine pacing directive
        pacing = self._tension_to_pacing(tension_score)
        
        return {
            'tension_score': tension_score,
            'arousal_momentum': arousal_momentum,
            'valence_volatility': valence_volatility,
            'narrative_phase': narrative_phase,
            'narrative_position': position,
            'pacing_directive': pacing
        }
    
    def _calculate_arousal_momentum(self, segments: List[Dict]) -> float:
        """Calculate rate of change in arousal (emotional acceleration)"""
        if len(segments) < 2:
            return 0.0
        
        # Look at last 3 segments
        recent = segments[-3:]
        arousals = [s['primary_emotion']['arousal'] for s in recent]
        
        # Calculate derivative
        derivatives = [arousals[i+1] - arousals[i] for i in range(len(arousals)-1)]
        
        return float(np.mean(derivatives))
    
    def _calculate_valence_volatility(self, segments: List[Dict]) -> float:
        """Calculate emotional contrast frequency"""
        if len(segments) < 2:
            return 0.0
        
        # Look at last 5 segments
        recent = segments[-5:]
        valences = [s['primary_emotion']['valence'] for s in recent]
        
        # Calculate standard deviation
        return float(np.std(valences))
    
    def _determine_narrative_phase(self, position: float) -> str:
        """Map position to dramatic structure phase"""
        boundaries = self.rules.get('act_boundaries', [0.25, 0.75])
        
        if position < boundaries[0]:
            return "setup"
        elif position < boundaries[1]:
            return "confrontation"
        else:
            return "resolution"
    
    def _composite_tension_score(self, arousal_momentum: float,
                                  valence_volatility: float,
                                  narrative_phase: str,
                                  position: float) -> float:
        """Combine factors into overall tension score"""
        formula = self.rules.get('tension_formula', {})
        multipliers = self.rules.get('phase_multipliers', {})
        
        # Weights
        momentum_weight = formula.get('arousal_momentum_weight', 0.4)
        volatility_weight = formula.get('valence_volatility_weight', 0.3)
        position_weight = formula.get('position_curve_weight', 0.3)
        
        # Position curve (peaks at climax_position)
        climax_pos = self.rules.get('climax_position', 0.65)
        position_factor = self._tension_curve(position, climax_pos)
        
        # Calculate weighted sum
        tension = (
            momentum_weight * abs(arousal_momentum) +
            volatility_weight * valence_volatility +
            position_weight * position_factor
        )
        
        # Apply phase multiplier
        phase_mult = multipliers.get(narrative_phase, 1.0)
        tension *= phase_mult
        
        return min(1.0, tension)
    
    def _tension_curve(self, x: float, peak: float) -> float:
        """Parabolic curve with peak at specified position"""
        return 1.0 - ((x - peak) ** 2) / (peak ** 2)
    
    def _tension_to_pacing(self, tension: float) -> str:
        """Convert tension score to pacing directive"""
        if tension > 0.7:
            return "fast"
        elif tension > 0.4:
            return "moderate"
        else:
            return "slow"
    
    def _get_default_tension(self) -> Dict:
        """Default tension state"""
        return {
            'tension_score': 0.5,
            'arousal_momentum': 0.0,
            'valence_volatility': 0.0,
            'narrative_phase': 'setup',
            'narrative_position': 0.0,
            'pacing_directive': 'moderate'
        }
```

#### ShotGrammarMachine

**File:** `src/core/cinematography/grammar_machine.py`

```python
"""
ShotGrammarMachine: Finite state machine implementing cinematographic grammar.

Ensures professional shot sequencing through rule-based patterns.

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ShotGrammarMachine:
    """
    Implements cinematographic grammar rules for shot sequences.
    
    Rules:
    - Avoid jump cuts (consecutive similar shots)
    - Smooth distance transitions
    - Maintain rhythm consistency
    - Apply shot patterns when appropriate
    """
    
    def __init__(self, config: Dict):
        """Initialize grammar machine"""
        self.config = config
        self.rules = config.get('grammar_rules', {})
        self.patterns = config.get('shot_patterns', {})
        self.shot_history: List[Dict] = []
        self.current_pattern: Optional[str] = None
        self.pattern_index: int = 0
        
        logger.info("ShotGrammarMachine initialized")
    
    def select_next_shot(self, emotion_state: Dict, tension_state: Dict,
                         psycho_shot: Dict) -> Dict:
        """
        Apply grammar rules to refine shot selection.
        
        Args:
            emotion_state: Current emotion state
            tension_state: Current tension state
            psycho_shot: Suggested shot from PsychoCinematicMapper
        
        Returns:
            Refined shot specification
        """
        # If in active pattern, continue it
        if self.current_pattern:
            pattern_shot = self._continue_pattern(emotion_state, tension_state)
            if pattern_shot:
                return pattern_shot
        
        # Check if new pattern should start
        new_pattern = self._detect_pattern_trigger(emotion_state, tension_state)
        if new_pattern:
            self.current_pattern = new_pattern
            self.pattern_index = 0
            return self._start_pattern(psycho_shot)
        
        # Apply transition rules to psycho shot
        refined_shot = self._apply_transition_rules(psycho_shot)
        
        # Record shot
        self.shot_history.append(refined_shot)
        
        return refined_shot
    
    def _detect_pattern_trigger(self, emotion_state: Dict, 
                                 tension_state: Dict) -> Optional[str]:
        """Detect conditions that trigger shot patterns"""
        
        # High arousal peak → five-shot pattern
        if emotion_state['arousal'] > 0.85:
            return "five_shot"
        
        # Rising arousal → escalation pattern
        if len(self.shot_history) >= 2:
            if self._is_escalating():
                return "escalation"
        
        # Falling tension → release pattern
        if tension_state['narrative_phase'] == "resolution" and tension_state['tension_score'] < 0.4:
            return "release"
        
        return None
    
    def _is_escalating(self) -> bool:
        """Check if recent shots show escalation"""
        if len(self.shot_history) < 2:
            return False
        
        recent = self.shot_history[-2:]
        distance_order = ["LS", "MLS", "MS", "MCU", "CU", "ECU"]
        
        for i in range(len(recent) - 1):
            try:
                idx1 = distance_order.index(recent[i]['distance'])
                idx2 = distance_order.index(recent[i+1]['distance'])
                if idx2 <= idx1:  # Not getting closer
                    return False
            except ValueError:
                continue
        
        return True
    
    def _start_pattern(self, base_shot: Dict) -> Dict:
        """Start a new shot pattern"""
        pattern_def = self.patterns.get(self.current_pattern, {})
        sequence = pattern_def.get('sequence', [])
        
        if not sequence:
            return base_shot
        
        # Get first shot in pattern
        pattern_distance = sequence[0]
        
        shot = base_shot.copy()
        shot['distance'] = pattern_distance
        shot['pattern'] = self.current_pattern
        shot['pattern_index'] = 0
        
        self.pattern_index = 1
        self.shot_history.append(shot)
        
        return shot
    
    def _continue_pattern(self, emotion_state: Dict, tension_state: Dict) -> Optional[Dict]:
        """Continue active pattern"""
        pattern_def = self.patterns.get(self.current_pattern, {})
        sequence = pattern_def.get('sequence', [])
        
        if self.pattern_index >= len(sequence):
            # Pattern complete
            self.current_pattern = None
            self.pattern_index = 0
            return None
        
        # Get next shot in pattern
        pattern_distance = sequence[self.pattern_index]
        
        # Use previous shot as base
        if self.shot_history:
            shot = self.shot_history[-1].copy()
        else:
            shot = {}
        
        shot['distance'] = pattern_distance
        shot['pattern'] = self.current_pattern
        shot['pattern_index'] = self.pattern_index
        
        self.pattern_index += 1
        self.shot_history.append(shot)
        
        return shot
    
    def _apply_transition_rules(self, proposed_shot: Dict) -> Dict:
        """Apply grammar rules for smooth transitions"""
        if not self.shot_history:
            return proposed_shot
        
        previous = self.shot_history[-1]
        shot = proposed_shot.copy()
        
        # Rule 1: Avoid jump cuts
        if self.rules.get('avoid_jump_cuts', True):
            if self._is_jump_cut(previous, shot):
                shot = self._modify_to_avoid_jump_cut(shot, previous)
        
        # Rule 2: Smooth distance transitions
        if self.rules.get('smooth_distance_transitions', True):
            shot['distance'] = self._smooth_distance_transition(
                previous['distance'], 
                shot['distance']
            )
        
        # Rule 3: Rhythm consistency
        if self.rules.get('rhythm_consistency', True):
            shot['duration'] = self._smooth_duration(
                previous.get('duration', 4.0),
                shot.get('duration', 4.0)
            )
        
        # Rule 4: Determine transition type
        shot['transition'] = self._determine_transition(previous, shot)
        
        return shot
    
    def _is_jump_cut(self, shot1: Dict, shot2: Dict) -> bool:
        """Check if transition would be a jump cut"""
        # Jump cut = same distance and angle
        return (shot1.get('distance') == shot2.get('distance') and
                shot1.get('angle') == shot2.get('angle'))
    
    def _modify_to_avoid_jump_cut(self, shot: Dict, previous: Dict) -> Dict:
        """Modify shot to avoid jump cut"""
        # Change angle to create variation
        if shot.get('angle') == previous.get('angle'):
            angle_variations = {
                'eye_level': 'low_angle',
                'low_angle': 'eye_level',
                'high_angle': 'eye_level'
            }
            shot['angle'] = angle_variations.get(shot['angle'], 'eye_level')
        
        return shot
    
    def _smooth_distance_transition(self, prev_distance: str, target_distance: str) -> str:
        """Prevent jarring distance jumps"""
        distance_hierarchy = ["ECU", "CU", "MCU", "MS", "MLS", "LS"]
        max_jump = self.rules.get('max_distance_jump', 2)
        
        try:
            prev_idx = distance_hierarchy.index(prev_distance)
            target_idx = distance_hierarchy.index(target_distance)
            
            jump_size = abs(target_idx - prev_idx)
            
            if jump_size > max_jump:
                # Limit jump to max_jump steps
                direction = 1 if target_idx > prev_idx else -1
                new_idx = prev_idx + (direction * max_jump)
                return distance_hierarchy[new_idx]
        except (ValueError, IndexError):
            pass
        
        return target_distance
    
    def _smooth_duration(self, prev_duration: float, target_duration: float) -> float:
        """Smooth duration changes"""
        max_change = self.rules.get('max_duration_change', 3.0)
        
        change = target_duration - prev_duration
        
        if abs(change) > max_change:
            direction = 1 if change > 0 else -1
            return prev_duration + (direction * max_change)
        
        return target_duration
    
    def _determine_transition(self, prev_shot: Dict, curr_shot: Dict) -> Dict:
        """Determine transition type based on shot relationship"""
        transition_rules = self.rules.get('transition_rules', {})
        
        distance_hierarchy = ["ECU", "CU", "MCU", "MS", "MLS", "LS"]
        
        try:
            prev_idx = distance_hierarchy.index(prev_shot['distance'])
            curr_idx = distance_hierarchy.index(curr_shot['distance'])
            change = abs(curr_idx - prev_idx)
            
            if change <= 1:
                rule = transition_rules.get('distance_change_1', {})
            elif change == 2:
                rule = transition_rules.get('distance_change_2', {})
            else:
                rule = transition_rules.get('distance_change_3', {})
            
            return {
                'type': rule.get('type', 'cut'),
                'duration': rule.get('duration', 0.0)
            }
        except (ValueError, KeyError):
            return {'type': 'cut', 'duration': 0.0}
```

#### CinematographicDecisionEngine (Master)

**File:** `src/core/cinematography/decision_engine.py`

```python
"""
CinematographicDecisionEngine: Master orchestrator for shot decisions.

Coordinates all cinematography components to generate shot sequences.

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, List
import logging
from .psycho_mapper import PsychoCinematicMapper
from .tension_engine import EmotionalTensionEngine
from .grammar_machine import ShotGrammarMachine
from .override_manager import ManualOverrideManager

logger = logging.getLogger(__name__)


class CinematographicDecisionEngine:
    """
    Master decision engine combining all cinematography components.
    
    Pipeline:
    1. PsychoCinematicMapper: Emotion → Base shot
    2. EmotionalTensionEngine: Calculate narrative tension
    3. ShotGrammarMachine: Apply grammar rules
    4. ManualOverrideManager: Check for user overrides
    """
    
    def __init__(self, config: Dict):
        """Initialize decision engine with all components"""
        self.config = config
        self.psycho_mapper = PsychoCinematicMapper(config)
        self.tension_engine = EmotionalTensionEngine(config)
        self.grammar_machine = ShotGrammarMachine(config)
        self.override_manager = ManualOverrideManager(config)
        
        logger.info("CinematographicDecisionEngine initialized")
    
    def generate_shot_sequence(self, 
                                emotion_segments: List[Dict],
                                audio_duration: float) -> List[Dict]:
        """
        Generate complete shot sequence from emotion analysis.
        
        Args:
            emotion_segments: List of emotion segments from EmotionAnalyzer
            audio_duration: Total audio duration in seconds
        
        Returns:
            List of shot specifications with complete cinematographic data
        """
        logger.info(f"Generating shot sequence for {len(emotion_segments)} emotion segments")
        
        shot_sequence = []
        
        for i, segment in enumerate(emotion_segments):
            # Calculate narrative tension
            tension_state = self.tension_engine.calculate_narrative_tension(
                emotion_segments=emotion_segments[:i+1],
                current_time=segment['start_time']
            )
            
            # Calculate arousal derivative
            arousal_derivative = self._calculate_arousal_derivative(
                emotion_segments[:i+1]
            )
            
            # Build context
            context = {
                'previous_shot': shot_sequence[-1] if shot_sequence else None,
                'time_in_segment': segment['end_time'] - segment['start_time'],
                'arousal_derivative': arousal_derivative,
                'tension_state': tension_state,
                'segment_index': i,
                'total_segments': len(emotion_segments)
            }
            
            # Layer 1: Psycho-cinematic mapping
            base_shot = self.psycho_mapper.select_shot(
                emotion_state=segment['primary_emotion'],
                context=context
            )
            
            # Layer 2: Grammar refinement
            refined_shot = self.grammar_machine.select_next_shot(
                emotion_state=segment['primary_emotion'],
                tension_state=tension_state,
                psycho_shot=base_shot
            )
            
            # Add segment metadata
            refined_shot.update({
                'scene_id': f"scene_{i:03d}",
                'start_time': segment['start_time'],
                'end_time': segment['end_time'],
                'emotion_segment_ref': segment['segment_id'],
                'emotion': segment['primary_emotion']['name'],
                'tension_score': tension_state['tension_score'],
                'narrative_phase': tension_state['narrative_phase']
            })
            
            # Layer 3: Check for manual overrides
            if self.override_manager.has_override(segment['segment_id']):
                refined_shot = self.override_manager.apply_override(
                    segment['segment_id'], refined_shot
                )
            
            shot_sequence.append(refined_shot)
        
        # Post-processing
        shot_sequence = self._post_process_sequence(shot_sequence)
        
        logger.info(f"Shot sequence generated: {len(shot_sequence)} shots")
        return shot_sequence
    
    def _calculate_arousal_derivative(self, segments: List[Dict]) -> float:
        """Calculate rate of change in arousal"""
        if len(segments) < 2:
            return 0.0
        
        prev_arousal = segments[-2]['primary_emotion']['arousal']
        curr_arousal = segments[-1]['primary_emotion']['arousal']
        
        return curr_arousal - prev_arousal
    
    def _post_process_sequence(self, sequence: List[Dict]) -> List[Dict]:
        """Final pass for overall flow optimization"""
        
        # Ensure shot variety
        sequence = self._enforce_variety(sequence)
        
        # Smooth rhythm
        sequence = self._smooth_rhythm(sequence)
        
        # Validate timing
        sequence = self._validate_timing(sequence)
        
        return sequence
    
    def _enforce_variety(self, sequence: List[Dict]) -> List[Dict]:
        """Ensure no more than N consecutive similar shots"""
        max_consecutive = self.config.get('grammar_rules', {}).get('max_consecutive_similar', 2)
        
        for i in range(len(sequence) - max_consecutive):
            window = sequence[i:i + max_consecutive + 1]
            
            # Check if all shots in window are too similar
            if self._all_similar(window):
                # Modify the last shot in window
                sequence[i + max_consecutive] = self._add_variety(
                    sequence[i + max_consecutive]
                )
        
        return sequence
    
    def _all_similar(self, shots: List[Dict]) -> bool:
        """Check if shots are too similar"""
        if len(shots) < 2:
            return False
        
        first = shots[0]
        for shot in shots[1:]:
            if shot['distance'] != first['distance']:
                return False
        
        return True
    
    def _add_variety(self, shot: Dict) -> Dict:
        """Add variety to shot"""
        # Change angle to add variety
        angle_cycle = ['eye_level', 'low_angle', 'high_angle']
        current_angle = shot.get('angle', 'eye_level')
        
        try:
            idx = angle_cycle.index(current_angle)
            shot['angle'] = angle_cycle[(idx + 1) % len(angle_cycle)]
        except ValueError:
            shot['angle'] = 'eye_level'
        
        return shot
    
    def _smooth_rhythm(self, sequence: List[Dict]) -> List[Dict]:
        """Smooth duration variations for consistent rhythm"""
        if len(sequence) < 2:
            return sequence
        
        # Apply moving average to durations
        window_size = 3
        for i in range(1, len(sequence) - 1):
            window = sequence[max(0, i-1):min(len(sequence), i+2)]
            avg_duration = sum(s['duration'] for s in window) / len(window)
            
            # Blend with average (70% original, 30% average)
            sequence[i]['duration'] = 0.7 * sequence[i]['duration'] + 0.3 * avg_duration
        
        return sequence
    
    def _validate_timing(self, sequence: List[Dict]) -> List[Dict]:
        """Ensure shot timings align with audio segments"""
        for shot in sequence:
            # Ensure duration doesn't exceed segment length
            segment_duration = shot['end_time'] - shot['start_time']
            if shot['duration'] > segment_duration:
                shot['duration'] = segment_duration
        
        return sequence
```

#### ManualOverrideManager

**File:** `src/core/cinematography/override_manager.py`

```python
"""
ManualOverrideManager: Allows manual control over automated decisions.

Author: Development Team
Date: 2025-10-18
"""

from typing import Dict, Optional
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ManualOverrideManager:
    """
    Manages manual overrides for shot decisions.
    
    Allows users to specify exact shots for specific segments,
    overriding the automated decision engine.
    """
    
    def __init__(self, config: Dict):
        """Initialize override manager"""
        self.config = config
        self.overrides_file = Path(config.get('overrides_file', 'overrides.json'))
        self.overrides = self._load_overrides()
        
        logger.info(f"ManualOverrideManager initialized with {len(self.overrides)} overrides")
    
    def _load_overrides(self) -> Dict:
        """Load overrides from file"""
        if self.overrides_file.exists():
            with open(self.overrides_file, 'r') as f:
                return json.load(f)
        return {}
    
    def has_override(self, segment_id: str) -> bool:
        """Check if segment has manual override"""
        return segment_id in self.overrides
    
    def apply_override(self, segment_id: str, base_shot: Dict) -> Dict:
        """Apply manual override to shot"""
        if segment_id not in self.overrides:
            return base_shot
        
        override = self.overrides[segment_id]
        shot = base_shot.copy()
        
        # Override specific fields
        for key in ['distance', 'angle', 'duration', 'transition']:
            if key in override:
                shot[key] = override[key]
        
        shot['override_applied'] = True
        
        logger.info(f"Override applied to {segment_id}")
        return shot
    
    def add_override(self, segment_id: str, override_data: Dict):
        """Add new override"""
        self.overrides[segment_id] = override_data
        self._save_overrides()
    
    def remove_override(self, segment_id: str):
        """Remove override"""
        if segment_id in self.overrides:
            del self.overrides[segment_id]
            self._save_overrides()
    
    def _save_overrides(self):
        """Save overrides to file"""
        with open(self.overrides_file, 'w') as f:
            json.dump(self.overrides, f, indent=2)
```

### Testing Requirements

**File:** `tests/unit/test_cinematography.py`

```python
import pytest
from src.core.cinematography.decision_engine import CinematographicDecisionEngine
from src.core.cinematography.psycho_mapper import PsychoCinematicMapper

@pytest.fixture
def config():
    return {
        'grammar_rules': {
            'max_consecutive_similar': 2,
            'smooth_distance_transitions': True
        }
    }

class TestPsychoCinematicMapper:
    
    def test_high_arousal_maps_to_closeup(self, config):
        """High arousal should map to close-up shots"""
        mapper = PsychoCinematicMapper(config)
        
        emotion = {
            'arousal': 0.9,
            'valence': 0.5,
            'intensity': 0.8,
            'primary_emotion': 'anger'
        }
        
        shot = mapper.select_shot(emotion, {})
        
        assert shot['distance'] in ['CU', 'ECU']
    
    def test_low_arousal_maps_to_wide_shot(self, config):
        """Low arousal should map to wider shots"""
        mapper = PsychoCinematicMapper(config)
        
        emotion = {
            'arousal': 0.1,
            'valence': 0.0,
            'intensity': 0.5,
            'primary_emotion': 'trust'
        }
        
        shot = mapper.select_shot(emotion, {})
        
        assert shot['distance'] in ['MS', 'MLS', 'LS']
    
    def test_emotion_angle_override(self, config):
        """Specific emotions should override valence mapping"""
        mapper = PsychoCinematicMapper(config)
        
        # Fear should always get high angle
        emotion = {
            'arousal': 0.6,
            'valence': -0.5,
            'intensity': 0.7,
            'primary_emotion': 'fear'
        }
        
        shot = mapper.select_shot(emotion, {})
        
        assert shot['angle'] == 'high_angle'
```

### Phase 2 Acceptance Criteria

- [ ] PsychoCinematicMapper correctly maps emotions to shots
- [ ] EmotionalTensionEngine calculates tension curves accurately
- [ ] ShotGrammarMachine prevents jump cuts and jarring transitions
- [ ] CinematographicDecisionEngine generates complete shot sequences
- [ ] Manual override system works correctly
- [ ] Unit test coverage >80%
- [ ] Integration tests with EmotionAnalyzer pass
- [ ] Documentation complete

---
**End of Phase 2 Documentation**