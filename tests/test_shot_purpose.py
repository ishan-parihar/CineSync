# tests/test_shot_purpose.py
import sys
import os
# Add the project root to the path so imports work correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.cinematography.shot_purpose_selector import ShotPurposeSelector

def test_high_arousal_selects_reaction():
    selector = ShotPurposeSelector()
    
    segment = {
        'primary_emotion': {
            'arousal': 0.85,
            'valence': -0.6,
            'confidence': 0.9
        }
    }
    
    result = selector.select_purpose(
        emotion_segment=segment,
        segment_index=1,
        total_segments=10,
        narrative_phase='confrontation',
        tension_score=0.8
    )
    
    assert result['purpose'] == 'reaction'
    assert 'ECU' in result['preferred_framings'] or 'CU' in result['preferred_framings']
    print("PASS: High arousal correctly selects reaction shot")

def test_first_segment_selects_establishing():
    selector = ShotPurposeSelector()
    
    segment = {
        'primary_emotion': {
            'arousal': 0.4,
            'valence': 0.2,
            'confidence': 0.85
        }
    }
    
    result = selector.select_purpose(
        emotion_segment=segment,
        segment_index=0,  # First segment
        total_segments=10,
        narrative_phase='setup',
        tension_score=0.3
    )
    
    assert result['purpose'] == 'establishing'
    print("PASS: First segment correctly selects establishing shot")

if __name__ == "__main__":
    test_high_arousal_selects_reaction()
    test_first_segment_selects_establishing()
    print("\nAll shot purpose tests passed!")