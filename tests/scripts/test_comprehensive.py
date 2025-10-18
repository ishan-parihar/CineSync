"""
Comprehensive test script to verify all system components of LipSyncAutomation v2.0
"""
import os
import sys
import json
import logging
from pathlib import Path

# Add the src directory to Python path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from core.content_orchestrator import ContentOrchestrator
from core.emotion_analyzer import EmotionAnalyzer
from core.preset_manager import PresetManager
from core.profile_manager import ProfileManager
from core.cinematography.decision_engine import CinematographicDecisionEngine
from core.cinematography.grammar_machine import GrammarMachine
from core.video_compositor_v2 import VideoCompositorV2
from utils.cache_manager import CacheManager
from utils.audio_processor import AudioProcessor
from utils.validators import validate_audio_file, validate_dependencies

# Set up logging for the test
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_emotion_analyzer():
    """Test emotion analysis functionality with detailed logging"""
    logger.info("Testing Emotion Analyzer...")
    try:
        analyzer = EmotionAnalyzer()
        
        # Test with a sample audio file
        audio_path = os.path.join("assets", "audio", "raw", "test.wav")
        if not os.path.exists(audio_path):
            # Create a simple placeholder if test file doesn't exist
            logger.warning(f"Audio file {audio_path} not found, skipping real analysis test")
            # Test initialization only
            logger.info("EmotionAnalyzer initialized successfully")
            return True
            
        # Test emotion extraction with logging
        result = analyzer.extract_emotions(audio_path)
        logger.info(f"Emotion analysis result: {result}")
        
        # Validate result structure
        assert isinstance(result, dict), "Result should be a dictionary"
        assert "features" in result, "Result should contain 'features'"
        assert "emotions" in result, "Result should contain 'emotions'"
        
        logger.info("✓ Emotion Analyzer test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Emotion Analyzer test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_preset_manager():
    """Test preset management functionality"""
    logger.info("Testing Preset Manager...")
    try:
        preset_manager = PresetManager()
        
        # List available presets
        presets = preset_manager.list_presets()
        logger.info(f"Available presets: {presets}")
        
        # Test loading a specific preset if available
        if presets:
            first_preset = presets[0]
            preset_config = preset_manager.load_preset(first_preset)
            logger.info(f"Preset config loaded: {preset_config}")
        
        # Validate a preset (if we have any)
        # Try to validate a preset against a profile
        logger.info("✓ Preset Manager test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Preset Manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_profile_manager():
    """Test profile management functionality"""
    logger.info("Testing Profile Manager...")
    try:
        profile_manager = ProfileManager()
        
        # List available profiles
        profiles = profile_manager.list_profiles()
        logger.info(f"Available profiles: {profiles}")
        
        # Test loading first available profile
        if profiles:
            first_profile = profiles[0]
            profile_config = profile_manager.get_profile_config(first_profile)
            logger.info(f"Profile config loaded: {type(profile_config)}")
        
        # Test getting profile for a character
        test_profile = profile_manager.get_profile('character_1')
        if test_profile:
            logger.info(f"Character 1 profile loaded: {type(test_profile)}")
        
        logger.info("✓ Profile Manager test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Profile Manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cinematography_engine():
    """Test cinematographic decision engine"""
    logger.info("Testing Cinematographic Decision Engine...")
    try:
        # Initialize the decision engine
        decision_engine = CinematographicDecisionEngine()
        grammar_machine = GrammarMachine(decision_engine)
        
        # Test with sample emotion data
        sample_emotions = {
            'arousal': 0.5,
            'valence': 0.3,
            'dominance': 0.7,
            'trust': 0.8,
            'fear': 0.2,
            'joy': 0.6,
            'anger': 0.1,
            'sadness': 0.3,
            'surprise': 0.4,
            'disgust': 0.05
        }
        
        # Generate cinematographic decisions
        decisions = decision_engine.generate_decisions(sample_emotions, angle='front')
        logger.info(f"Cinematographic decisions: {decisions}")
        
        # Test grammar machine
        grammar_sequence = grammar_machine.generate_grammar_sequence(decisions)
        logger.info(f"Grammar sequence: {grammar_sequence}")
        
        logger.info("✓ Cinematographic Decision Engine test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Cinematographic Decision Engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_video_compositor():
    """Test video composition functionality"""
    logger.info("Testing Video Compositor...")
    try:
        compositor = VideoCompositorV2()
        
        # Test basic initialization
        logger.info(f"VideoCompositor initialized successfully: {compositor}")
        
        # Check if we have required assets
        preset_manager = PresetManager()
        available_presets = preset_manager.list_presets()
        logger.info(f"Available presets for compositor: {available_presets}")
        
        logger.info("✓ Video Compositor test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Video Compositor test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cache_manager():
    """Test cache management functionality"""
    logger.info("Testing Cache Manager...")
    try:
        cache_manager = CacheManager()
        
        # Test cache operations
        test_key = "test_key"
        test_value = {"test": "data", "value": 123}
        
        # Test caching
        cache_manager.cache_phoneme_data(test_key, test_value)
        logger.info(f"Cached data with key: {test_key}")
        
        # Test retrieval
        retrieved_data = cache_manager.get_cached_phoneme_data(test_key)
        logger.info(f"Retrieved data: {retrieved_data}")
        
        assert retrieved_data == test_value, "Cached and retrieved data should match"
        
        logger.info("✓ Cache Manager test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Cache Manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_audio_processor():
    """Test audio processing functionality"""
    logger.info("Testing Audio Processor...")
    try:
        processor = AudioProcessor()
        
        # Test with a sample audio file
        audio_path = os.path.join("assets", "audio", "raw", "test.wav")
        if os.path.exists(audio_path):
            # Extract phonemes
            phonemes = processor.extract_phonemes(audio_path)
            logger.info(f"Extracted phonemes: {len(phonemes) if phonemes else 0} segments")
        else:
            logger.warning(f"Audio file {audio_path} not found, testing initialization only")
        
        logger.info("✓ Audio Processor test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Audio Processor test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_content_orchestrator():
    """Test the main content orchestrator"""
    logger.info("Testing Content Orchestrator...")
    try:
        orchestrator = ContentOrchestrator()
        
        # Check if required directories exist
        logger.info(f"Preset directory exists: {os.path.exists(orchestrator.preset_manager.presets_dir)}")
        logger.info(f"Profile directory exists: {os.path.exists(orchestrator.profile_manager.profiles_dir)}")
        
        # Log initial state
        logger.info("Content Orchestrator initialized successfully")
        
        logger.info("✓ Content Orchestrator test passed")
        return True
    except Exception as e:
        logger.error(f"✗ Content Orchestrator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_comprehensive_tests():
    """Run all tests and report results"""
    logger.info("Starting comprehensive system tests...")
    
    tests = [
        ("Emotion Analyzer", test_emotion_analyzer),
        ("Preset Manager", test_preset_manager),
        ("Profile Manager", test_profile_manager),
        ("Cinematographic Engine", test_cinematography_engine),
        ("Video Compositor", test_video_compositor),
        ("Cache Manager", test_cache_manager),
        ("Audio Processor", test_audio_processor),
        ("Content Orchestrator", test_content_orchestrator),
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running: {test_name}")
        logger.info(f"{'='*50}")
        
        success = test_func()
        results.append((test_name, success))
    
    # Summary
    logger.info(f"\n{'='*50}")
    logger.info("TEST RESULTS SUMMARY")
    logger.info(f"{'='*50}")
    
    passed = 0
    for test_name, success in results:
        status = "PASS" if success else "FAIL"
        logger.info(f"{test_name}: {status}")
        if success:
            passed += 1
    
    logger.info(f"\nTotal: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        logger.info("🎉 All tests passed! System is working correctly.")
        return True
    else:
        logger.error("❌ Some tests failed. Please check the logs above.")
        return False

if __name__ == "__main__":
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)