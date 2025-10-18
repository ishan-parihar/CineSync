import unittest
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.lip_sync_generator import LipSyncGenerator
from src.core.preset_manager import PresetManager
from src.utils.validators import validate_dependencies, validate_audio_file


class TestLipSyncGenerator(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        with open('config/settings.json', 'r') as f:
            cls.config = json.load(f)
        cls.generator = LipSyncGenerator()
    
    def test_dependency_validation(self):
        """Test system dependency validation"""
        result = validate_dependencies(
            self.config['system']['rhubarb_path'],
            self.config['system']['ffmpeg_path']
        )
        self.assertTrue(result, "Dependency validation should pass")
    
    def test_preset_loading(self):
        """Test preset discovery and loading"""
        preset_manager = PresetManager()
        presets = preset_manager.list_presets()
        self.assertGreater(len(presets), 0, "Should find at least one preset")
    
    def test_frame_sequence_generation(self):
        """Test frame sequence mapping logic"""
        mock_cues = [
            {'start': 0.0, 'end': 0.5, 'value': 'X'},
            {'start': 0.5, 'end': 1.0, 'value': 'A'},
            {'start': 1.0, 'end': 1.5, 'value': 'B'}
        ]
        
        mock_mapping = {
            'X': 'mock_X.png',
            'A': 'mock_A.png',
            'B': 'mock_B.png'
        }
        
        frames = self.generator.generate_frame_sequence(
            mouth_cues=mock_cues,
            duration=1.5,
            viseme_mapping=mock_mapping
        )
        
        expected_frames = int(1.5 * self.config['video']['fps']) + 1
        self.assertEqual(len(frames), expected_frames, f"Should generate {expected_frames} frames")


if __name__ == '__main__':
    unittest.main()
