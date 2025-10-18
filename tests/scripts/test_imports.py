"""
Test script to check for import errors and basic functionality
"""
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_imports():
    """Test all the imports to make sure everything works"""
    print("Testing imports...")
    
    try:
        print("Testing: core modules")
        from core import emotion_analyzer, profile_manager, content_orchestrator, video_compositor_v2
        print("[OK] Core modules imported successfully")
    except Exception as e:
        print(f"[ERROR] Core modules import failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("Testing: cinematography modules")
        from core.cinematography import decision_engine, grammar_machine, psycho_mapper, tension_engine
        print("[OK] Cinematography modules imported successfully")
    except Exception as e:
        print(f"[ERROR] Cinematography modules import failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("Testing: utils modules")
        from utils import audio_processor, cache_manager, validators
        print("[OK] Utils modules imported successfully")
    except Exception as e:
        print(f"[ERROR] Utils modules import failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test creating instances
    try:
        print("Testing: Creating EmotionAnalyzer instance")
        from core.emotion_analyzer import EmotionAnalyzer
        # Create a minimal config
        config = {
            'emotion_analysis': {
                'cache_enabled': True,
                'segment_min_duration': 1.0,
                'segment_max_duration': 10.0
            },
            'system': {
                'cache_directory': './cache'
            }
        }
        analyzer = EmotionAnalyzer(config)
        print("[OK] EmotionAnalyzer instance created successfully")
    except Exception as e:
        print(f"[ERROR] EmotionAnalyzer instance creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("Testing: Creating ProfileManager instance")
        from core.profile_manager import ProfileManager
        # Create a minimal config for ProfileManager
        profile_config = {
            'system': {
                'profiles_directory': 'profiles',
            },
            'profile_settings': {
                'cache_enabled': True
            }
        }
        profile_manager = ProfileManager(config=profile_config)
        print("[OK] ProfileManager instance created successfully")
    except Exception as e:
        print(f"[ERROR] ProfileManager instance creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("Testing: Creating AudioProcessor instance")
        from utils.audio_processor import AudioProcessor
        audio_proc = AudioProcessor()
        print("[OK] AudioProcessor instance created successfully")
    except Exception as e:
        print(f"[ERROR] AudioProcessor instance creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("Testing: Creating CacheManager instance")
        from utils.cache_manager import CacheManager
        cache_manager = CacheManager()
        print("[OK] CacheManager instance created successfully")
    except Exception as e:
        print(f"[ERROR] CacheManager instance creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    try:
        print("Testing: Creating CinematographicDecisionEngine instance")
        from core.cinematography.decision_engine import CinematographicDecisionEngine
        # Create a minimal config for CinematographicDecisionEngine
        decision_config = {
            'cinematography': {
                'emotion_weights': {'valence': 0.3, 'arousal': 0.4, 'dominance': 0.3},
                'tension_factors': {'build': 0.5, 'release': 0.3, 'peak': 0.2},
                'shot_selection': {'closeup_bias': 0.4, 'medium_shot_bias': 0.4, 'wide_shot_bias': 0.2}
            }
        }
        decision_engine = CinematographicDecisionEngine(config=decision_config)
        print("[OK] CinematographicDecisionEngine instance created successfully")
    except Exception as e:
        print(f"[ERROR] CinematographicDecisionEngine instance creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n[SUCCESS] All imports and basic initializations passed!")
    return True

if __name__ == "__main__":
    success = test_imports()
    if success:
        print("\n[SUCCESS] System import validation successful!")
    else:
        print("\n[FAILURE] System import validation failed!")
        sys.exit(1)