#!/usr/bin/env python3
"""
Unit tests for cinematography transforms.
"""

import pytest
import sys
from pathlib import Path

# Add app path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))

try:
    from PIL import Image
    from cinematography.transform_processor import TransformProcessor
except ImportError:
    pytest.skip("TransformProcessor module not available", allow_module_level=True)


@pytest.mark.unit
class TestTransformProcessor:
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures."""
        self.processor = TransformProcessor()
        self.test_image = Image.new('RGB', (1920, 1080), color='red')
    
    def test_vertical_angle_eye_level(self):
        """Test eye level vertical angle transform."""
        result = self.processor.apply_vertical_angle(
            self.test_image, 
            'eye_level'
        )
        
        assert isinstance(result, Image.Image)
        assert result.size == self.test_image.size
    
    def test_vertical_angle_high_angle(self):
        """Test high angle vertical angle transform."""
        result = self.processor.apply_vertical_angle(
            self.test_image, 
            'high_angle'
        )
        
        assert isinstance(result, Image.Image)
        assert result.size == self.test_image.size
    
    def test_vertical_angle_low_angle(self):
        """Test low angle vertical angle transform."""
        result = self.processor.apply_vertical_angle(
            self.test_image, 
            'low_angle'
        )
        
        assert isinstance(result, Image.Image)
        assert result.size == self.test_image.size
    
    def test_vertical_angle_invalid(self):
        """Test invalid vertical angle."""
        with pytest.raises((ValueError, KeyError, TypeError)):
            self.processor.apply_vertical_angle(
                self.test_image, 
                'invalid_angle'
            )
    
    def test_composition_position_center(self):
        """Test center composition positioning."""
        result = self.processor.calculate_composition_position(
            self.test_image.size,
            'center'
        )
        
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], (int, float))
        assert isinstance(result[1], (int, float))
    
    def test_composition_position_rule_of_thirds(self):
        """Test rule of thirds composition positioning."""
        result = self.processor.calculate_composition_position(
            self.test_image.size,
            'rule_of_thirds'
        )
        
        assert isinstance(result, tuple)
        assert len(result) == 2
    
    def test_composition_position_invalid(self):
        """Test invalid composition position."""
        with pytest.raises((ValueError, KeyError, TypeError)):
            self.processor.calculate_composition_position(
                self.test_image.size,
                'invalid_position'
            )
    
    def test_apply_framing_close_up(self):
        """Test close up framing."""
        result = self.processor.apply_framing(
            self.test_image,
            'CU'
        )
        
        assert isinstance(result, Image.Image)
        # Close up should be smaller than original
        assert result.size[0] <= self.test_image.size[0]
        assert result.size[1] <= self.test_image.size[1]
    
    def test_apply_framing_extreme_close_up(self):
        """Test extreme close up framing."""
        result = self.processor.apply_framing(
            self.test_image,
            'ECU'
        )
        
        assert isinstance(result, Image.Image)
        # Extreme close up should be smaller than close up
        assert result.size[0] <= self.test_image.size[0]
        assert result.size[1] <= self.test_image.size[1]
    
    def test_apply_framing_wide_shot(self):
        """Test wide shot framing."""
        result = self.processor.apply_framing(
            self.test_image,
            'WS'
        )
        
        assert isinstance(result, Image.Image)
    
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        # Test with None image
        with pytest.raises((TypeError, AttributeError)):
            self.processor.apply_vertical_angle(None, 'eye_level')
        
        # Test with invalid image size
        with pytest.raises((TypeError, ValueError)):
            self.processor.calculate_composition_position(None, 'center')
        
        # Test with empty tuple
        with pytest.raises((IndexError, ValueError)):
            self.processor.calculate_composition_position((), 'center')