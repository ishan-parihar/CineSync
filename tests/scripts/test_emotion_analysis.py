"""
Test script to verify emotion analysis functionality
"""
import sys
import os
import logging

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from core.emotion_analyzer import EmotionAnalyzer

def test_emotion_analysis():
    """Test emotion analysis functionality with sample audio file"""
    print("Testing emotion analysis functionality...")
    
    # Configure logging to see detailed output
    logging.basicConfig(level=logging.INFO)
    
    # Create a minimal config for EmotionAnalyzer
    config = {
        'emotion_analysis': {
            'cache_enabled': False,  # Disable cache for testing
            'segment_min_duration': 1.0,
            'segment_max_duration': 10.0,
            'model_path': 'models/audio2emotion/model.onnx'  # This will trigger dummy mode
        },
        'system': {
            'cache_directory': './cache'
        }
    }
    
    try:
        # Initialize EmotionAnalyzer
        analyzer = EmotionAnalyzer(config)
        print("[OK] EmotionAnalyzer initialized")
        
        # Test with a sample audio file
        audio_path = os.path.join("assets", "audio", "raw", "test.wav")
        if os.path.exists(audio_path):
            print(f"Analyzing audio file: {audio_path}")
            
            # Run emotion analysis
            result = analyzer.analyze_audio(audio_path)
            
            print(f"[OK] Emotion analysis completed")
            print(f"Result keys: {list(result.keys())}")
            
            # Verify result structure
            assert 'metadata' in result, "Result should contain 'metadata'"
            assert 'emotion_segments' in result, "Result should contain 'emotion_segments'"
            assert 'overall_sentiment' in result, "Result should contain 'overall_sentiment'"
            
            print(f"Number of emotion segments: {len(result['emotion_segments'])}")
            print(f"Overall sentiment: {result['overall_sentiment']}")
            
            # Check first segment if available
            if result['emotion_segments']:
                first_segment = result['emotion_segments'][0]
                print(f"First segment: {first_segment}")
                
                assert 'primary_emotion' in first_segment, "Segment should contain 'primary_emotion'"
                assert 'start_time' in first_segment, "Segment should contain 'start_time'"
                assert 'end_time' in first_segment, "Segment should contain 'end_time'"
                
                primary_emotion = first_segment['primary_emotion']
                print(f"Primary emotion: {primary_emotion}")
            
            print("[SUCCESS] Emotion analysis functionality working correctly!")
            return True
        else:
            print(f"[WARNING] Audio file {audio_path} not found, testing initialization only")
            print("[SUCCESS] Emotion analyzer initialization successful (no audio to test with)")
            return True
            
    except Exception as e:
        print(f"[ERROR] Emotion analysis test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_emotion_to_valence_arousal():
    """Test emotion to valence-arousal conversion"""
    print("\nTesting emotion to valence-arousal conversion...")
    
    # Create a minimal config
    config = {
        'emotion_analysis': {
            'cache_enabled': False,
            'segment_min_duration': 1.0,
            'segment_max_duration': 10.0
        },
        'system': {
            'cache_directory': './cache'
        }
    }
    
    try:
        analyzer = EmotionAnalyzer(config)
        
        # Test various emotions
        test_emotions = [
            ('joy', 0.8),
            ('sadness', 0.7),
            ('anger', 0.9),
            ('fear', 0.6),
            ('surprise', 0.5),
            ('disgust', 0.4),
            ('trust', 0.3),
            ('neutral', 1.0)
        ]
        
        for emotion, confidence in test_emotions:
            valence, arousal = analyzer._emotion_to_valence_arousal(emotion, confidence)
            print(f"Emotion: {emotion}, Confidence: {confidence} -> Valence: {valence:.2f}, Arousal: {arousal:.2f}")
            
            # Basic validation: valence should be in [-1, 1], arousal in [0, 1]
            assert -1.0 <= valence <= 1.0, f"Valence {valence} out of range for {emotion}"
            assert 0.0 <= arousal <= 1.0, f"Arousal {arousal} out of range for {emotion}"
        
        print("[SUCCESS] Emotion to valence-arousal conversion working correctly!")
        return True
    except Exception as e:
        print(f"[ERROR] Emotion to valence-arousal test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_segmentation():
    """Test audio segmentation functionality"""
    print("\nTesting audio segmentation...")
    
    # Create a minimal config
    config = {
        'emotion_analysis': {
            'cache_enabled': False,
            'segment_min_duration': 1.0,
            'segment_max_duration': 10.0
        },
        'system': {
            'cache_directory': './cache'
        }
    }
    
    try:
        analyzer = EmotionAnalyzer(config)
        
        # Create a simple mock audio signal for testing (since librosa might not be available)
        import numpy as np
        sr = 16000
        duration = 5.0  # 5 seconds
        t = np.linspace(0, duration, int(sr * duration))
        # Simple sine wave as mock audio
        audio = np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
        
        segments = analyzer._segment_audio(audio, sr)
        
        print(f"[OK] Created {len(segments)} segments from mock audio")
        for i, seg in enumerate(segments[:3]):  # Show first 3 segments
            print(f"  Segment {i}: start={seg['start_time']:.2f}s, end={seg['end_time']:.2f}s, duration={seg['end_time']-seg['start_time']:.2f}s")
        
        # Verify segment structure
        if segments:
            first_segment = segments[0]
            assert 'audio' in first_segment, "Segment should contain 'audio'"
            assert 'start_time' in first_segment, "Segment should contain 'start_time'"
            assert 'end_time' in first_segment, "Segment should contain 'end_time'"
        
        print("[SUCCESS] Audio segmentation working correctly!")
        return True
    except Exception as e:
        print(f"[ERROR] Audio segmentation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("="*60)
    print("EMOTION ANALYSIS FUNCTIONALITY TEST")
    print("="*60)
    
    all_tests_passed = True
    
    # Run emotion analysis test
    all_tests_passed &= test_emotion_analysis()
    
    # Run emotion to valence-arousal conversion test
    all_tests_passed &= test_emotion_to_valence_arousal()
    
    # Run segmentation test
    all_tests_passed &= test_segmentation()
    
    print("\n" + "="*60)
    if all_tests_passed:
        print("[SUCCESS] All emotion analysis tests passed!")
    else:
        print("[FAILURE] Some emotion analysis tests failed!")
    print("="*60)
    
    sys.exit(0 if all_tests_passed else 1)