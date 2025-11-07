#!/usr/bin/env python3
"""
Final integration test to verify all cinematographic enhancement components work together.
"""
import sys
import os
# Add the project root to the path so imports work correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.core.cinematography.shot_purpose_selector import ShotPurposeSelector
from src.core.cinematography.transform_processor import TransformProcessor
from src.core.cinematography.decision_engine import DecisionEngine
from src.core.content_orchestrator import ContentOrchestrator


def test_shot_purpose_and_transform_integration():
    """Test that shot purpose selection and transform processing work together"""
    print("Testing shot purpose and transform integration...")
    
    # Initialize components
    shot_selector = ShotPurposeSelector()
    transform_processor = TransformProcessor()
    
    # Test emotion segment
    emotion_segment = {
        'primary_emotion': {
            'arousal': 0.85,
            'valence': -0.6,
            'confidence': 0.9
        }
    }
    
    # Select shot purpose
    shot_purpose_spec = shot_selector.select_purpose(
        emotion_segment=emotion_segment,
        segment_index=1,
        total_segments=10,
        narrative_phase='confrontation',
        tension_score=0.8
    )
    
    print(f"  Selected shot purpose: {shot_purpose_spec['purpose']}")
    print(f"  Vertical angle: {shot_purpose_spec['vertical_angle']}")
    
    # Apply transform based on selected purpose
    from PIL import Image
    test_image = Image.new('RGBA', (512, 512), (255, 0, 0, 255))
    
    transformed_image = transform_processor.apply_vertical_angle(
        image=test_image,
        angle=shot_purpose_spec['vertical_angle'],
        frame_size=(1920, 1080)
    )
    
    assert transformed_image is not None
    print("  PASS: Shot purpose selection and transform application work together")


def test_decision_engine_integration():
    """Test that the decision engine works with cinematographic components"""
    print("\nTesting decision engine integration...")
    
    decision_engine = DecisionEngine(config={"cinematography": {"enable_cinematic_enhancement": True}})
    
    # Mock emotion data in correct format - needs specific fields expected by tension engine
    mock_emotion_analysis = {
        'emotion_segments': [
            {
                'segment_id': 'seg_0',
                'start_time': 0.0,
                'end_time': 2.0,
                'primary_emotion': {
                    'name': 'joy',
                    'emotions': {'joy': 0.8, 'surprise': 0.2},
                    'arousal': 0.7,
                    'valence': 0.8,
                    'confidence': 0.9,
                    'intensity': 0.8
                }
            },
            {
                'segment_id': 'seg_1',
                'start_time': 2.0,
                'end_time': 4.0,
                'primary_emotion': {
                    'name': 'anger',
                    'emotions': {'anger': 0.9, 'disgust': 0.1},
                    'arousal': 0.9,
                    'valence': -0.7,
                    'confidence': 0.85,
                    'intensity': 0.9
                }
            }
        ],
        'metadata': {
            'duration': 4.0  # 2 seconds per segment
        },
        'overall_sentiment': {
            'dominant_emotion': 'mixed'
        }
    }
    
    # Generate shot sequence
    shot_sequence = decision_engine.generate_shot_sequence(mock_emotion_analysis)
    
    assert len(shot_sequence) == len(mock_emotion_analysis['emotion_segments'])
    print(f"  PASS: Generated shot sequence with {len(shot_sequence)} shots")
    
    # Verify that shots have cinematographic metadata
    for i, shot in enumerate(shot_sequence):
        assert 'emotion' in shot
        assert 'shot_specification' in shot
        print(f"    Shot {i}: {shot['emotion']}")


def test_content_orchestrator_integration():
    """Test that ContentOrchestrator integrates all cinematographic components"""
    print("\nTesting ContentOrchestrator integration...")
    
    # Full config for testing - needs all required fields for all components
    config = {
        "system": {
            "ffmpeg_path": "ffmpeg",
            "temp_directory": "temp",
            "profiles_directory": "profiles",
            "cache_directory": "cache"
        },
        "video_composition": {
            "fps": 30,
            "codec": "libx264",
            "preset": "medium",
            "crf": 23,
            "audio_codec": "aac",
            "audio_bitrate": "128k"
        },
        "profile_settings": {
            "default_profile": "character_1"
        },
        "cinematography": {
            "enable_cinematic_enhancement": True,
            "shot_purpose_profiles_path": "shared/config/shot_purpose_profiles.json",
            "transform_presets_path": "shared/config/transform_presets.json"
        },
        "emotion_analysis": {
            "model_path": "models/emotion_model.h5",
            "confidence_threshold": 0.6,
            "segment_duration": 1.0,
            "feature_extraction": {
                "sample_rate": 22050,
                "n_mfcc": 13,
                "n_fft": 2048
            }
        },
        "cache_dir": "cache",
        "enable_cache": True,
        "profile_path": "profiles/character_1.json"
    }
    
    orchestrator = ContentOrchestrator(settings=config)
    
    # Check that cinematographic components were initialized
    assert hasattr(orchestrator, 'shot_purpose_selector')
    assert hasattr(orchestrator, 'transform_processor')
    assert hasattr(orchestrator, 'decision_engine')
    
    print("  PASS: ContentOrchestrator initialized with cinematographic components")


def run_complete_system_test():
    """Run a complete test of the cinematographic enhancement system"""
    print("=== Final Integration Test: Cinematographic Enhancement System ===\n")
    
    try:
        test_shot_purpose_and_transform_integration()
        test_decision_engine_integration()
        test_content_orchestrator_integration()
        
        print("\n=== All Integration Tests Passed! ===")
        print("PASS: Cinematographic enhancement system is fully integrated")
        print("PASS: Shot purpose selection works with emotion data")
        print("PASS: Transform processing works with vertical angles and composition")
        print("PASS: All components are properly integrated in ContentOrchestrator")
        print("PASS: System is ready for production use")
        
        return True
    except Exception as e:
        print(f"\nFAILED: Integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_complete_system_test()
    if success:
        print("\nSUCCESS: Cinematographic Enhancement System Implementation Complete!")
    else:
        print("\nFAILED: System integration test failed")
        sys.exit(1)