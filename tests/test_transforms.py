# tests/test_transforms.py
import sys
import os
# Add the project root to the path so imports work correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.core.cinematography.transform_processor import TransformProcessor
from PIL import Image

def test_vertical_angle_transforms():
    processor = TransformProcessor()
    
    # Create test image
    test_image = Image.new('RGBA', (512, 512), (255, 0, 0, 255))
    
    # Test each angle
    for angle in ['eye_level', 'low_angle', 'high_angle', 'dutch_left']:
        result = processor.apply_vertical_angle(
            image=test_image,
            angle=angle,
            frame_size=(1920, 1080)
        )
        
        assert result is not None
        print(f"PASS: {angle} transform applied successfully")

def test_composition_positioning():
    processor = TransformProcessor()
    
    positions = processor.calculate_composition_position(
        composition='rule_of_thirds',
        framing='MCU',
        frame_size=(1920, 1080),
        asset_size=(512, 512),
        shot_index=0
    )
    
    assert positions[0] > 0 and positions[0] < 1920
    assert positions[1] > 0 and positions[1] < 1080
    print(f"PASS: Composition positioned at {positions}")

def test_emotion_dependent_angle_resolution():
    processor = TransformProcessor()
    
    # Test emotion-to-angle mapping
    test_cases = [
        ('fear', 'high_angle'),
        ('sadness', 'high_angle'),
        ('anger', 'low_angle'),
        ('joy', 'low_angle'),
        ('surprise', 'eye_level'),
        ('disgust', 'eye_level'),
        ('trust', 'eye_level'),
        ('anticipation', 'eye_level')
    ]
    
    for emotion, expected_angle in test_cases:
        result = processor.get_vertical_angle_for_emotion(
            emotion=emotion,
            base_angle='emotion_dependent'
        )
        assert result == expected_angle
        print(f"PASS: {emotion} maps to {result}")
    
    # Test fallback for unknown emotion
    result = processor.get_vertical_angle_for_emotion(
        emotion='unknown_emotion',
        base_angle='emotion_dependent'
    )
    assert result == 'eye_level'
    print("PASS: Unknown emotion falls back to eye_level")

if __name__ == "__main__":
    test_vertical_angle_transforms()
    test_composition_positioning()
    test_emotion_dependent_angle_resolution()
    print("\nAll transform tests passed!")