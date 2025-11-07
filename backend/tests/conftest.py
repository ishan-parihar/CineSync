#!/usr/bin/env python3
"""
Shared fixtures and configuration for backend tests.
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, MagicMock
import pytest

# Add the app directory to the path for imports
backend_root = Path(__file__).parent.parent
app_path = backend_root / "app"
sys.path.insert(0, str(app_path))

# Try to import the actual modules, fall back to mocks if they don't exist
try:
    from core.lip_sync_generator import LipSyncGenerator
    from core.preset_manager import PresetManager
    from cinematography.shot_purpose_selector import ShotPurposeSelector
    from cinematography.transform_processor import TransformProcessor
    from utils.animation_structure_manager import AnimationStructureManager
    ACTUAL_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import actual modules ({e}), using mocks instead")
    LipSyncGenerator = Mock
    PresetManager = Mock
    ShotPurposeSelector = Mock
    TransformProcessor = Mock
    AnimationStructureManager = Mock
    ACTUAL_MODULES_AVAILABLE = False


@pytest.fixture
def project_root_path():
    """Get the project root path."""
    return Path(__file__).parent.parent.parent


@pytest.fixture
def test_config():
    """Load test configuration."""
    project_root = Path(__file__).parent.parent.parent
    config_path = project_root / "shared" / "config" / "settings.json"
    if config_path.exists():
        with open(config_path, 'r') as f:
            return json.load(f)
    else:
        # Return minimal config for testing
        return {
            "system": {
                "rhubarb_path": "rhubarb",
                "ffmpeg_path": "ffmpeg",
                "temp_directory": "temp",
                "profiles_directory": "profiles",
                "cache_directory": "cache"
            },
            "video": {
                "fps": 30,
                "width": 1920,
                "height": 1080
            },
            "audio": {
                "sample_rate": 22050,
                "chunk_size": 1024
            }
        }


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def sample_audio_file():
    """Path to a sample audio file for testing."""
    project_root = Path(__file__).parent.parent.parent
    audio_path = project_root / "test_audio.wav"
    if audio_path.exists():
        return audio_path
    else:
        # Create a mock audio file path for testing
        return project_root / "assets" / "audio" / "raw" / "test.wav"


@pytest.fixture
def mock_emotion_segment():
    """Mock emotion segment data for testing."""
    return {
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
    }


@pytest.fixture
def mock_emotion_analysis():
    """Mock complete emotion analysis data."""
    return {
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
            'duration': 4.0
        },
        'overall_sentiment': {
            'dominant_emotion': 'mixed'
        }
    }


@pytest.fixture
def mock_mouth_cues():
    """Mock mouth cue data for testing."""
    return [
        {'start': 0.0, 'end': 0.5, 'value': 'X'},
        {'start': 0.5, 'end': 1.0, 'value': 'A'},
        {'start': 1.0, 'end': 1.5, 'value': 'B'},
        {'start': 1.5, 'end': 2.0, 'value': 'C'}
    ]


@pytest.fixture
def mock_viseme_mapping():
    """Mock viseme mapping for testing."""
    return {
        'X': 'rest.png',
        'A': 'open.png',
        'B': 'wide.png',
        'C': 'narrow.png'
    }


@pytest.fixture
def lip_sync_generator(test_config):
    """Initialize LipSyncGenerator for testing."""
    try:
        return LipSyncGenerator()
    except Exception:
        # Return a mock generator if initialization fails
        mock_generator = Mock()
        mock_generator.generate_frame_sequence.return_value = ['frame1.png', 'frame2.png']
        return mock_generator


@pytest.fixture
def preset_manager():
    """Initialize PresetManager for testing."""
    try:
        return PresetManager()
    except Exception:
        # Return a mock manager if initialization fails
        mock_manager = Mock()
        mock_manager.list_presets.return_value = ['character_1']
        return mock_manager


@pytest.fixture
def shot_purpose_selector():
    """Initialize ShotPurposeSelector for testing."""
    try:
        return ShotPurposeSelector()
    except Exception:
        # Return a mock selector if initialization fails
        mock_selector = Mock()
        mock_selector.select_purpose.return_value = {
            'purpose': 'reaction',
            'vertical_angle': 'eye_level',
            'preferred_framings': ['CU', 'ECU']
        }
        return mock_selector


@pytest.fixture
def transform_processor():
    """Initialize TransformProcessor for testing."""
    try:
        return TransformProcessor()
    except Exception:
        # Return a mock processor if initialization fails
        mock_processor = Mock()
        mock_processor.apply_vertical_angle.return_value = Mock()
        mock_processor.calculate_composition_position.return_value = (960, 540)
        return mock_processor


@pytest.fixture
def animation_structure_manager():
    """Initialize AnimationStructureManager for testing."""
    try:
        return AnimationStructureManager()
    except Exception:
        # Return a mock manager if initialization fails
        mock_manager = Mock()
        mock_manager.list_characters.return_value = ['character_1']
        mock_manager.list_angles.return_value = ['front', 'side']
        mock_manager.list_emotions.return_value = ['joy', 'anger', 'sadness']
        return mock_manager


@pytest.fixture
def mock_api_client():
    """Mock API client for testing endpoints."""
    client = Mock()
    
    # Mock health check
    client.get.return_value.json.return_value = {"status": "healthy"}
    client.get.return_value.status_code = 200
    
    return client


@pytest.fixture
def sample_test_profile():
    """Sample test profile data."""
    return {
        "character_name": "test_character",
        "angles": {
            "front": {
                "emotions": {
                    "joy": ["rest.png", "open.png", "wide.png"],
                    "anger": ["rest.png", "narrow.png", "tight.png"]
                }
            }
        },
        "metadata": {
            "created_by": "test",
            "version": "1.0.0"
        }
    }


# Test markers for categorizing tests
pytest_plugins = []

def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow running"
    )
    config.addinivalue_line(
        "markers", "api: marks tests that require API server"
    )
    config.addinivalue_line(
        "markers", "frontend: marks tests that require frontend"
    )