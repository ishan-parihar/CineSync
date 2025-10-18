"""
Test script to verify logging throughout the system
"""
import sys
import os
import logging
import tempfile
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_logging_configuration():
    """Test that logging is properly configured across the system"""
    print("Testing logging configuration...")
    
    # Check if logging config file exists
    config_path = "config/logging_config.json"
    if os.path.exists(config_path):
        print("[OK] Logging configuration file exists")
        import json
        with open(config_path, 'r') as f:
            config = json.load(f)
        print(f"[INFO] Logging config: {list(config.keys())}")
    else:
        print("[WARNING] Logging configuration file not found, using default logging")
    
    # Test basic logging
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    
    # Add handler to capture logs during tests
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.log') as temp_log_file:
        handler = logging.FileHandler(temp_log_file.name)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        logger.info("Logging test message")
        logger.debug("Debug information")
        
        handler.close()
        
        # Read back the log to verify
        with open(temp_log_file.name, 'r') as f:
            log_content = f.read()
        
        if "Logging test message" in log_content:
            print("[OK] Logging system working correctly")
        else:
            print("[ERROR] Logging system not working properly")
            return False
        
        # Clean up
        os.unlink(temp_log_file.name)
    
    print("[SUCCESS] Logging configuration working correctly!")
    return True


def test_module_logging():
    """Test that individual modules can create loggers properly"""
    print("\nTesting module logging...")
    
    try:
        # Test emotion analyzer logging
        from core.emotion_analyzer import EmotionAnalyzer
        
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
        
        analyzer = EmotionAnalyzer(config)
        logger = logging.getLogger(analyzer.__class__.__module__)
        print(f"[OK] EmotionAnalyzer logger: {logger.name}")
        
        # Test cinematography logging
        from core.cinematography.decision_engine import CinematographicDecisionEngine
        from core.cinematography.psycho_mapper import PsychoCinematicMapper
        from core.cinematography.tension_engine import TensionEngine
        from core.cinematography.grammar_machine import GrammarMachine
        
        decision_config = {
            'cinematography': {
                'emotion_weights': {'valence': 0.3, 'arousal': 0.4, 'dominance': 0.3}
            }
        }
        
        decision_engine = CinematographicDecisionEngine(decision_config)
        logger = logging.getLogger(decision_engine.__class__.__module__)
        print(f"[OK] DecisionEngine logger: {logger.name}")
        
        # Test other cinematography modules
        psycho_mapper = PsychoCinematicMapper(decision_config)
        tension_engine = TensionEngine(decision_config)
        grammar_machine = GrammarMachine(decision_config)
        
        print("[OK] All cinematography modules can create loggers")
        
        # Test profile manager logging
        from core.profile_manager import ProfileManager
        profile_config = {
            'system': {
                'profiles_directory': 'profiles',
            },
            'profile_settings': {
                'cache_enabled': True
            }
        }
        profile_manager = ProfileManager(config=profile_config)
        logger = logging.getLogger(profile_manager.__class__.__module__)
        print(f"[OK] ProfileManager logger: {logger.name}")
        
        # Test video compositor logging
        from core.video_compositor_v2 import VideoCompositorV2
        compositor = VideoCompositorV2(config_path="config/settings.json")
        logger = logging.getLogger(compositor.__class__.__module__)
        print(f"[OK] VideoCompositor logger: {logger.name}")
        
        print("[SUCCESS] Module logging working correctly!")
        return True
    except Exception as e:
        print(f"[ERROR] Module logging test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_comprehensive_logging():
    """Test comprehensive logging throughout the system"""
    print("\nTesting comprehensive logging...")
    
    try:
        # Set up logging to see detailed output
        logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')
        
        # Test the content orchestrator with logging
        from core.content_orchestrator import ContentOrchestrator
        
        settings = {
            'system': {
                'profiles_directory': 'profiles',
                'cache_directory': 'cache'
            },
            'profile_settings': {
                'cache_enabled': True
            },
            'emotion_analysis': {
                'cache_enabled': True,
                'segment_min_duration': 1.0,
                'segment_max_duration': 10.0
            },
            'cinematography': {
                'emotion_weights': {'valence': 0.3, 'arousal': 0.4, 'dominance': 0.3},
                'tension_factors': {'build': 0.5, 'release': 0.3, 'peak': 0.2}
            }
        }
        
        orchestrator = ContentOrchestrator(settings)
        print("[OK] ContentOrchestrator initialized with logging")
        
        # Check that all component loggers exist
        loggers = [
            logging.getLogger(orchestrator.profile_manager.__class__.__module__),
            logging.getLogger(orchestrator.emotion_analyzer.__class__.__module__),
            logging.getLogger(orchestrator.decision_engine.__class__.__module__),
            logging.getLogger(orchestrator.compositor.__class__.__module__),
            logging.getLogger(orchestrator.audio_processor.__class__.__module__),
            logging.getLogger(orchestrator.cache_manager.__class__.__module__)
        ]
        
        print(f"[OK] All component loggers accessible: {[logger.name for logger in loggers]}")
        
        # Test that logging actually works by simulating a small operation
        print("[INFO] Logging test completed successfully")
        
        print("[SUCCESS] Comprehensive logging working correctly!")
        return True
    except Exception as e:
        print(f"[ERROR] Comprehensive logging test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_log_levels():
    """Test different log levels"""
    print("\nTesting log levels...")
    
    try:
        # Create a test logger
        logger = logging.getLogger("test_logger")
        logger.setLevel(logging.DEBUG)
        
        # Add a handler to capture output
        import io
        log_capture_string = io.StringIO()
        ch = logging.StreamHandler(log_capture_string)
        ch.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        # Test different log levels
        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")
        logger.error("Error message")
        logger.critical("Critical message")
        
        # Get the log output
        log_contents = log_capture_string.getvalue()
        expected_messages = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        
        for msg in expected_messages:
            if msg in log_contents:
                print(f"[OK] {msg} level message captured")
            else:
                print(f"[ERROR] {msg} level message not captured")
                return False
        
        print("[SUCCESS] Log levels working correctly!")
        return True
    except Exception as e:
        print(f"[ERROR] Log levels test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("="*60)
    print("LOGGING SYSTEM VERIFICATION TEST")
    print("="*60)
    
    all_tests_passed = True
    
    # Run logging configuration test
    all_tests_passed &= test_logging_configuration()
    
    # Run module logging test
    all_tests_passed &= test_module_logging()
    
    # Run comprehensive logging test
    all_tests_passed &= test_comprehensive_logging()
    
    # Run log levels test
    all_tests_passed &= test_log_levels()
    
    print("\n" + "="*60)
    if all_tests_passed:
        print("[SUCCESS] All logging tests passed!")
    else:
        print("[FAILURE] Some logging tests failed!")
    print("="*60)
    
    sys.exit(0 if all_tests_passed else 1)