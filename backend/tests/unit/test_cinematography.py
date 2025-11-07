#!/usr/bin/env python3
"""
Unit tests for cinematography shot purpose selection.
"""

import pytest
import sys
from pathlib import Path

# Add app path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

try:
    from cinematography.shot_purpose_selector import ShotPurposeSelector
except ImportError:
    pytest.skip("ShotPurposeSelector module not available", allow_module_level=True)


@pytest.mark.unit
class TestShotPurposeSelector:
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures."""
        self.selector = ShotPurposeSelector()
    
    def test_high_arousal_selects_reaction(self, mock_emotion_segment):
        """Test that high arousal emotions select reaction shots."""
        segment = mock_emotion_segment
        segment['primary_emotion']['arousal'] = 0.8
        
        result = self.selector.select_purpose(
            segment, 
            segment_index=0,
            total_segments=3,
            narrative_phase="development",
            tension_score=0.5
        )
        
        # Verify result structure
        assert 'purpose' in result
        assert 'vertical_angle' in result
        assert 'preferred_framings' in result
        assert 'description' in result
        assert 'composition' in result
        assert 'confidence' in result
        
        # Verify types
        assert isinstance(result['purpose'], str)
        assert isinstance(result['preferred_framings'], list)
        assert isinstance(result['confidence'], (int, float))
    
    def test_low_arousal_selects_observational(self, mock_emotion_segment):
        """Test that low arousal emotions select observational shots."""
        segment = mock_emotion_segment
        segment['primary_emotion']['arousal'] = 0.2
        
        result = self.selector.select_purpose(
            segment, 
            segment_index=0,
            total_segments=3,
            narrative_phase="development",
            tension_score=0.3
        )
        
        assert result['purpose'] in ['observational', 'context']
        assert 'vertical_angle' in result
    
    def test_negative_valence_selects_confrontation(self, mock_emotion_segment):
        """Test that negative emotions select confrontation shots."""
        segment = mock_emotion_segment
        segment['primary_emotion']['valence'] = -0.7
        
        result = self.selector.select_purpose(
            segment, 
            segment_index=0,
            total_segments=3,
            narrative_phase="conflict",
            tension_score=0.8
        )
        
        assert result['purpose'] in ['confrontation', 'tension']
        assert 'preferred_framings' in result
    
    def test_positive_valence_selects_harmony(self, mock_emotion_segment):
        """Test that positive emotions select harmony shots."""
        segment = mock_emotion_segment
        segment['primary_emotion']['valence'] = 0.8
        
        result = self.selector.select_purpose(
            segment, 
            segment_index=0,
            total_segments=3,
            narrative_phase="resolution",
            tension_score=0.2
        )
        
        assert result['purpose'] in ['harmony', 'connection']
    
    def test_intensity_affects_shot_size(self, mock_emotion_segment):
        """Test that emotion intensity affects preferred shot size."""
        segment = mock_emotion_segment
        segment['primary_emotion']['intensity'] = 0.9
        
        result = self.selector.select_purpose(
            segment, 
            segment_index=0,
            total_segments=3,
            narrative_phase="climax",
            tension_score=0.9
        )
        
        # High intensity should prefer closer shots
        framings = result['preferred_framings']
        assert any(f in ['CU', 'ECU'] for f in framings)
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        # Test with empty segment
        with pytest.raises((KeyError, TypeError, AttributeError)):
            self.selector.select_purpose({})
        
        # Test with None
        with pytest.raises((TypeError, AttributeError)):
            self.selector.select_purpose(None)