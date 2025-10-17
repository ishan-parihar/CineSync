# LipSyncAutomation v2.0 - Phase 1: Profile System & Emotion Analysis Infrastructure

## Document Control

**Project:** LipSyncAutomation System Upgrade to Emotion-Aware Multi-Angle Video Generation  
**Version:** 2.0.0  
**Date:** October 18, 2025  
**Status:** Implementation Ready  
**Classification:** Internal Development  

## Phase 1 Overview

**Duration:** 2-3 weeks  
**Team:** 3-4 developers  
**Dependencies:** Phase 0 complete  

### Phase Objectives

#### Primary Goals
1. Implement enhanced ProfileManager supporting multi-angle, multi-emotion asset hierarchy
2. Integrate Audio2Emotion model for emotion analysis[1][3]
3. Build emotion taxonomy mapping system
4. Create profile validation and template generation tools
5. Enhance caching system for emotion data

#### Deliverables
- [ ] ProfileManager module with complete API
- [ ] EmotionAnalyzer module with caching
- [ ] Profile validation tools
- [ ] Profile template generator
- [ ] Unit tests (>80% coverage)
- [ ] Migration tool from presets to profiles
- [ ] Documentation: API reference and user guide

### Technical Specifications

#### Profile Directory Structure

```
profiles/
├── profile_manifest.json                    # Registry of all profiles
├── [character_name]/
│   ├── profile_config.json                  # Character configuration
│   └── angles/
│       ├── ECU/                             # Extreme Close-Up
│       │   ├── base/                        # Base layer (head/body)
│       │   │   └── head.png                 # Character head base
│       │   └── emotions/
│       │       ├── joy/
│       │       │   ├── A.png                # Viseme A with joy expression
│       │       │   ├── B.png
│       │       │   ├── C.png
│       │       │   ├── D.png
│       │       │   ├── E.png
│       │       │   ├── F.png
│       │       │   ├── G.png
│       │       │   ├── H.png
│       │       │   └── X.png                # Rest/neutral viseme
│       │       ├── sadness/
│       │       │   └── [A-X].png            # 9 visemes
│       │       ├── anger/
│       │       │   └── [A-X].png
│       │       ├── fear/
│       │       │   └── [A-X].png
│       │       ├── surprise/
│       │       │   └── [A-X].png
│       │       ├── disgust/
│       │       │   └── [A-X].png
│       │       ├── trust/
│       │       │   └── [A-X].png
│       │       └── anticipation/
│       │           └── [A-X].png
│       ├── CU/                              # Close-Up
│       │   └── [same structure as ECU]
│       ├── MCU/                             # Medium Close-Up
│       │   └── [same structure as ECU]
│       └── MS/                              # Medium Shot
│           └── [same structure as ECU]
```

#### Profile Configuration Schema

**File:** `profiles/[character_name]/profile_config.json`

```json
{
  "schema_version": "2.0",
  "profile_name": "protagonist_alex",
  "version": "1.0.0",
  "created_date": "2025-10-18T00:00:00Z",
  "last_modified": "2025-10-18T00:00:00Z",
  
  "character_metadata": {
    "full_name": "Alex Rivera",
    "character_type": "protagonist",
    "art_style": "semi-realistic",
    "artist": "John Doe",
    "notes": "Main character for series 1"
  },
  
  "supported_angles": [
    "ECU",
    "CU",
    "MCU",
    "MS"
  ],
  
  "supported_emotions": {
    "core": [
      "joy",
      "sadness",
      "anger",
      "fear",
      "surprise",
      "disgust",
      "trust",
      "anticipation"
    ],
    "compound": []
  },
  
  "default_settings": {
    "default_angle": "MCU",
    "default_emotion": "trust",
    "base_intensity": 0.7
  },
  
  "asset_specifications": {
    "viseme_format": "PNG",
    "alpha_channel_required": true,
    "resolution_by_angle": {
      "ECU": {"width": 2048, "height": 2048},
      "CU": {"width": 1920, "height": 1920},
      "MCU": {"width": 1920, "height": 1080},
      "MS": {"width": 1920, "height": 1080}
    },
    "color_space": "sRGB",
    "bit_depth": 8
  },
  
  "validation": {
    "strict_mode": true,
    "allow_missing_emotions": false,
    "allow_missing_angles": false,
    "require_base_images": true
  }
}
```

#### Profile Manifest Schema

**File:** `profiles/profile_manifest.json`

```json
{
  "schema_version": "2.0",
  "last_updated": "2025-10-18T00:00:00Z",
  "profiles": [
    {
      "profile_name": "protagonist_alex",
      "path": "protagonist_alex",
      "version": "1.0.0",
      "status": "active",
      "supported_angles": ["ECU", "CU", "MCU", "MS"],
      "supported_emotions": ["joy", "sadness", "anger", "fear", "surprise", "disgust", "trust", "anticipation"],
      "asset_count": 288
    },
    {
      "profile_name": "antagonist_jordan",
      "path": "antagonist_jordan",
      "version": "1.0.0",
      "status": "active",
      "supported_angles": ["CU", "MCU", "MS"],
      "supported_emotions": ["anger", "disgust", "trust", "anticipation"],
      "asset_count": 108
    }
  ]
}
```

### Implementation Details

#### ProfileManager Implementation

**File:** `src/core/profile_manager.py`

```python
"""
ProfileManager: Enhanced asset management system supporting multi-angle,
multi-emotion character profiles.

Author: Development Team
Date: 2025-10-18
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import logging
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)


class ProfileValidationError(Exception):
    """Raised when profile validation fails"""
    pass


class ProfileManager:
    """
    Manages character profiles with multi-angle, multi-emotion support.
    
    Responsibilities:
    - Profile discovery and loading
    - Asset path resolution
    - Profile validation
    - Asset caching
    - Template generation
    """
    
    def __init__(self, config: Dict):
        """
        Initialize ProfileManager.
        
        Args:
            config: System configuration dictionary containing:
                - profiles_directory: Path to profiles directory
                - cache_enabled: Whether to cache loaded assets
                - validation_strict: Enable strict validation
        """
        self.config = config
        self.profiles_dir = Path(config['profiles_directory'])
        self.cache_enabled = config.get('cache_enabled', True)
        self.profiles_cache: Dict[str, Dict] = {}
        self.assets_cache: Dict[str, Image.Image] = {}
        
        # Load profile manifest
        self.manifest = self._load_manifest()
        
        logger.info(f"ProfileManager initialized with {len(self.manifest['profiles'])} profiles")
    
    def _load_manifest(self) -> Dict:
        """Load or create profile manifest"""
        manifest_path = self.profiles_dir / "profile_manifest.json"
        
        if manifest_path.exists():
            with open(manifest_path, 'r') as f:
                return json.load(f)
        else:
            # Create empty manifest
            manifest = {
                "schema_version": "2.0",
                "last_updated": datetime.now().isoformat(),
                "profiles": []
            }
            self._save_manifest(manifest)
            return manifest
    
    def _save_manifest(self, manifest: Dict):
        """Save profile manifest"""
        manifest_path = self.profiles_dir / "profile_manifest.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
    
    def load_profile(self, profile_name: str) -> Dict:
        """
        Load complete profile configuration.
        
        Args:
            profile_name: Name of profile to load
            
        Returns:
            Profile configuration dictionary
            
        Raises:
            ProfileValidationError: If profile doesn't exist or is invalid
        """
        # Check cache
        if self.cache_enabled and profile_name in self.profiles_cache:
            logger.debug(f"Profile '{profile_name}' loaded from cache")
            return self.profiles_cache[profile_name]
        
        # Load from disk
        profile_path = self.profiles_dir / profile_name / "profile_config.json"
        
        if not profile_path.exists():
            raise ProfileValidationError(f"Profile '{profile_name}' not found at {profile_path}")
        
        with open(profile_path, 'r') as f:
            profile_config = json.load(f)
        
        # Validate profile
        validation_result = self.validate_profile(profile_name)
        if not validation_result['valid']:
            if self.config.get('validation_strict', True):
                raise ProfileValidationError(
                    f"Profile validation failed: {validation_result['errors']}"
                )
            else:
                logger.warning(f"Profile validation warnings: {validation_result['warnings']}")
        
        # Cache profile
        if self.cache_enabled:
            self.profiles_cache[profile_name] = profile_config
        
        logger.info(f"Profile '{profile_name}' loaded successfully")
        return profile_config
    
    def get_viseme_path(self,
                        profile_name: str,
                        angle: str,
                        emotion: str,
                        viseme: str) -> Path:
        """
        Get path to specific viseme image.
        
        Args:
            profile_name: Character profile name
            angle: Camera angle (ECU, CU, MCU, MS, etc.)
            emotion: Emotion name (joy, sadness, etc.)
            viseme: Viseme letter (A-H, X)
            
        Returns:
            Path to viseme image file
            
        Raises:
            FileNotFoundError: If viseme file doesn't exist
        """
        viseme_path = (
            self.profiles_dir / 
            profile_name / 
            "angles" / 
            angle / 
            "emotions" / 
            emotion / 
            f"{viseme}.png"
        )
        
        if not viseme_path.exists():
            raise FileNotFoundError(
                f"Viseme not found: {profile_name}/{angle}/{emotion}/{viseme}.png"
            )
        
        return viseme_path
    
    def load_viseme_image(self,
                          profile_name: str,
                          angle: str,
                          emotion: str,
                          viseme: str) -> Image.Image:
        """
        Load viseme image with caching support.
        
        Args:
            profile_name: Character profile name
            angle: Camera angle
            emotion: Emotion name
            viseme: Viseme letter
            
        Returns:
            PIL Image object
        """
        cache_key = f"{profile_name}:{angle}:{emotion}:{viseme}"
        
        # Check cache
        if self.cache_enabled and cache_key in self.assets_cache:
            return self.assets_cache[cache_key]
        
        # Load image
        viseme_path = self.get_viseme_path(profile_name, angle, emotion, viseme)
        image = Image.open(viseme_path)
        
        # Validate image
        if image.mode != 'RGBA':
            logger.warning(f"Image {viseme_path} not in RGBA mode, converting")
            image = image.convert('RGBA')
        
        # Cache image
        if self.cache_enabled:
            self.assets_cache[cache_key] = image
        
        return image
    
    def validate_profile(self, profile_name: str) -> Dict:
        """
        Comprehensive profile validation.
        
        Args:
            profile_name: Profile to validate
            
        Returns:
            Validation result dictionary:
            {
                'valid': bool,
                'errors': List[str],
                'warnings': List[str],
                'missing_assets': List[str],
                'stats': Dict
            }
        """
        errors = []
        warnings = []
        missing_assets = []
        
        profile_path = self.profiles_dir / profile_name
        
        # Check profile directory exists
        if not profile_path.exists():
            return {
                'valid': False,
                'errors': [f"Profile directory not found: {profile_path}"],
                'warnings': [],
                'missing_assets': [],
                'stats': {}
            }
        
        # Check profile config exists
        config_path = profile_path / "profile_config.json"
        if not config_path.exists():
            errors.append(f"profile_config.json not found")
            return {'valid': False, 'errors': errors, 'warnings': [], 'missing_assets': [], 'stats': {}}
        
        # Load configuration
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Validate required fields
        required_fields = ['profile_name', 'supported_angles', 'supported_emotions']
        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return {'valid': False, 'errors': errors, 'warnings': warnings, 'missing_assets': missing_assets, 'stats': {}}
        
        # Check angles directory structure
        angles_path = profile_path / "angles"
        if not angles_path.exists():
            errors.append("angles/ directory not found")
            return {'valid': False, 'errors': errors, 'warnings': warnings, 'missing_assets': missing_assets, 'stats': {}}
        
        # Validate each angle
        total_assets = 0
        expected_assets = 0
        
        for angle in config['supported_angles']:
            angle_path = angles_path / angle
            if not angle_path.exists():
                errors.append(f"Angle directory not found: {angle}")
                continue
            
            # Check emotions for this angle
            emotions_path = angle_path / "emotions"
            if not emotions_path.exists():
                errors.append(f"Emotions directory not found for angle: {angle}")
                continue
            
            core_emotions = config['supported_emotions'].get('core', [])
            for emotion in core_emotions:
                emotion_path = emotions_path / emotion
                if not emotion_path.exists():
                    warnings.append(f"Emotion directory not found: {angle}/{emotion}")
                    continue
                
                # Check all 9 visemes exist
                visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
                for viseme in visemes:
                    expected_assets += 1
                    viseme_file = emotion_path / f"{viseme}.png"
                    if viseme_file.exists():
                        total_assets += 1
                        
                        # Validate image properties
                        try:
                            img = Image.open(viseme_file)
                            if img.mode != 'RGBA':
                                warnings.append(f"{angle}/{emotion}/{viseme}.png not in RGBA mode")
                            img.close()
                        except Exception as e:
                            warnings.append(f"Invalid image {angle}/{emotion}/{viseme}.png: {e}")
                    else:
                        missing_assets.append(f"{angle}/{emotion}/{viseme}.png")
        
        # Determine validity
        valid = len(errors) == 0 and len(missing_assets) == 0
        
        stats = {
            'total_assets': total_assets,
            'expected_assets': expected_assets,
            'completion_percentage': (total_assets / expected_assets * 100) if expected_assets > 0 else 0
        }
        
        return {
            'valid': valid,
            'errors': errors,
            'warnings': warnings,
            'missing_assets': missing_assets,
            'stats': stats
        }
    
    def create_profile_template(self,
                                profile_name: str,
                                angles: List[str],
                                emotions: List[str]) -> Path:
        """
        Generate empty profile directory structure for artists to fill.
        
        Args:
            profile_name: Name for new profile
            angles: List of camera angles to support
            emotions: List of emotions to support
            
        Returns:
            Path to created profile directory
        """
        profile_path = self.profiles_dir / profile_name
        
        if profile_path.exists():
            raise ValueError(f"Profile '{profile_name}' already exists")
        
        # Create directory structure
        profile_path.mkdir(parents=True)
        
        angles_path = profile_path / "angles"
        angles_path.mkdir()
        
        for angle in angles:
            angle_path = angles_path / angle
            angle_path.mkdir()
            
            # Create base directory
            base_path = angle_path / "base"
            base_path.mkdir()
            
            # Create emotions directory
            emotions_path = angle_path / "emotions"
            emotions_path.mkdir()
            
            for emotion in emotions:
                emotion_path = emotions_path / emotion
                emotion_path.mkdir()
                
                # Create placeholder files
                visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
                for viseme in visemes:
                    placeholder_path = emotion_path / f"{viseme}.png"
                    # Create 1x1 transparent placeholder
                    img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
                    img.save(placeholder_path)
        
        # Create profile config
        config = {
            "schema_version": "2.0",
            "profile_name": profile_name,
            "version": "1.0.0",
            "created_date": datetime.now().isoformat(),
            "last_modified": datetime.now().isoformat(),
            "character_metadata": {
                "full_name": "",
                "character_type": "",
                "art_style": "",
                "artist": "",
                "notes": ""
            },
            "supported_angles": angles,
            "supported_emotions": {
                "core": emotions,
                "compound": []
            },
            "default_settings": {
                "default_angle": angles[0] if angles else "MCU",
                "default_emotion": emotions[0] if emotions else "trust",
                "base_intensity": 0.7
            },
            "asset_specifications": {
                "viseme_format": "PNG",
                "alpha_channel_required": True,
                "resolution_by_angle": {
                    "ECU": {"width": 2048, "height": 2048},
                    "CU": {"width": 1920, "height": 1920},
                    "MCU": {"width": 1920, "height": 1080},
                    "MS": {"width": 1920, "height": 1080}
                },
                "color_space": "sRGB",
                "bit_depth": 8
            },
            "validation": {
                "strict_mode": True,
                "allow_missing_emotions": False,
                "allow_missing_angles": False,
                "require_base_images": True
            }
        }
        
        config_path = profile_path / "profile_config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Update manifest
        self.manifest['profiles'].append({
            "profile_name": profile_name,
            "path": profile_name,
            "version": "1.0.0",
            "status": "template",
            "supported_angles": angles,
            "supported_emotions": emotions,
            "asset_count": 0
        })
        self._save_manifest(self.manifest)
        
        logger.info(f"Profile template created: {profile_path}")
        return profile_path
    
    def list_profiles(self) -> List[Dict]:
        """
        List all available profiles.
        
        Returns:
            List of profile metadata dictionaries
        """
        return self.manifest['profiles']
    
    def get_profile_info(self, profile_name: str) -> Dict:
        """
        Get metadata for specific profile.
        
        Args:
            profile_name: Profile name
            
        Returns:
            Profile metadata dictionary
        """
        for profile in self.manifest['profiles']:
            if profile['profile_name'] == profile_name:
                return profile
        
        raise ValueError(f"Profile '{profile_name}' not found in manifest")
```

#### EmotionAnalyzer Implementation

**File:** `src/core/emotion_analyzer.py`

```python
"""
EmotionAnalyzer: Audio emotion recognition using Audio2Emotion model.

Supports multiple backends:
- NVIDIA Audio2Emotion v3.0 (default)
- Hume AI API (optional)
- Custom ONNX models

Author: Development Team
Date: 2025-10-18
"""

import numpy as np
import librosa
import soundfile as sf
from pathlib import Path
from typing import Dict, List, Optional
import json
import logging
import hashlib
import onnxruntime as ort

logger = logging.getLogger(__name__)


class EmotionAnalysisError(Exception):
    """Raised when emotion analysis fails"""
    pass


class EmotionAnalyzer:
    """
    Audio emotion recognition system.
    
    Analyzes audio files and generates emotion segments with timing,
    confidence scores, and dimensional metrics (valence/arousal).
    """
    
    # Standard 8-emotion taxonomy (Plutchik's wheel)
    EMOTION_TAXONOMY = [
        'joy', 'sadness', 'anger', 'fear',
        'surprise', 'disgust', 'trust', 'anticipation'
    ]
    
    def __init__(self, config: Dict, backend: str = "audio2emotion"):
        """
        Initialize EmotionAnalyzer.
        
        Args:
            config: System configuration containing:
                - model_path: Path to emotion recognition model
                - cache_enabled: Enable result caching
                - confidence_threshold: Minimum confidence for emotion detection
            backend: Emotion recognition backend ('audio2emotion', 'hume', 'custom')
        """
        self.config = config
        self.backend = backend
        self.cache_enabled = config.get('emotion_analysis', {}).get('cache_enabled', True)
        self.cache_dir = Path(config.get('cache_directory', './cache')) / 'emotions'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Load model
        self.model = self._load_model()
        
        logger.info(f"EmotionAnalyzer initialized with backend: {backend}")
    
    def _load_model(self):
        """Load emotion recognition model based on backend"""
        if self.backend == "audio2emotion":
            model_path = self.config['emotion_analysis']['model_path']
            if not Path(model_path).exists():
                raise EmotionAnalysisError(f"Model not found: {model_path}")
            
            # Load ONNX model
            session = ort.InferenceSession(
                model_path,
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
            )
            logger.info(f"Loaded Audio2Emotion model from {model_path}")
            return session
        
        elif self.backend == "hume":
            # Hume AI API client
            api_key = os.getenv('HUME_API_KEY')
            if not api_key:
                raise EmotionAnalysisError("HUME_API_KEY environment variable not set")
            # Initialize Hume client here
            return None  # Placeholder
        
        else:
            raise ValueError(f"Unsupported backend: {self.backend}")
    
    def analyze_audio(self, 
                      audio_path: str,
                      transcript: Optional[str] = None) -> Dict:
        """
        Analyze audio file and generate emotion segments.
        
        Args:
            audio_path: Path to audio file
            transcript: Optional text transcript for multimodal analysis
            
        Returns:
            Emotion analysis dictionary matching schema:
            {
                'metadata': {...},
                'emotion_segments': [...],
                'overall_sentiment': {...}
            }
            
        Raises:
            EmotionAnalysisError: If analysis fails
        """
        # Check cache
        if self.cache_enabled:
            cache_key = self._generate_cache_key(audio_path)
            cached_result = self._load_from_cache(cache_key)
            if cached_result:
                logger.info(f"Emotion analysis loaded from cache: {audio_path}")
                return cached_result
        
        logger.info(f"Analyzing audio: {audio_path}")
        
        # Load audio
        audio, sr = librosa.load(audio_path, sr=16000)  # Resample to 16kHz
        duration = librosa.get_duration(y=audio, sr=sr)
        
        # Segment audio
        segments = self._segment_audio(audio, sr)
        
        # Analyze each segment
        emotion_segments = []
        for i, segment_data in enumerate(segments):
            segment_audio = segment_data['audio']
            start_time = segment_data['start_time']
            end_time = segment_data['end_time']
            
            # Extract emotion
            emotion_result = self._classify_emotion(segment_audio, sr)
            
            # Map to standard taxonomy
            emotion_result['primary_emotion'] = self._map_to_taxonomy(
                emotion_result['primary_emotion']
            )
            
            emotion_segments.append({
                'segment_id': f"seg_{i:03d}",
                'start_time': start_time,
                'end_time': end_time,
                'primary_emotion': emotion_result['primary_emotion'],
                'secondary_emotions': emotion_result.get('secondary_emotions', []),
                'acoustic_features': emotion_result.get('acoustic_features', {})
            })
        
        # Calculate overall sentiment
        overall_sentiment = self._calculate_overall_sentiment(emotion_segments)
        
        # Build result
        result = {
            'metadata': {
                'audio_file': str(audio_path),
                'duration': duration,
                'model': self.backend,
                'timestamp': datetime.now().isoformat(),
                'sample_rate': sr
            },
            'emotion_segments': emotion_segments,
            'overall_sentiment': overall_sentiment
        }
        
        # Cache result
        if self.cache_enabled:
            self._save_to_cache(cache_key, result)
        
        logger.info(f"Emotion analysis complete: {len(emotion_segments)} segments")
        return result
    
    def _segment_audio(self, audio: np.ndarray, sr: int) -> List[Dict]:
        """
        Segment audio into analyzable chunks using voice activity detection.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            List of segment dictionaries with audio and timing
        """
        # Use librosa's onset detection for segmentation
        # This is a simplified approach; can be enhanced with VAD
        
        # Detect onsets
        onset_frames = librosa.onset.onset_detect(
            y=audio,
            sr=sr,
            wait=int(sr * 0.5),  # 0.5s minimum between onsets
            backtrack=True
        )
        
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        
        # Add start and end
        onset_times = np.concatenate([[0], onset_times, [len(audio) / sr]])
        
        segments = []
        min_duration = self.config['emotion_analysis'].get('segment_min_duration', 1.0)
        max_duration = self.config['emotion_analysis'].get('segment_max_duration', 10.0)
        
        for i in range(len(onset_times) - 1):
            start_time = onset_times[i]
            end_time = onset_times[i + 1]
            duration = end_time - start_time
            
            # Enforce duration constraints
            if duration < min_duration:
                continue  # Skip too-short segments
            
            if duration > max_duration:
                # Split long segments
                num_splits = int(np.ceil(duration / max_duration))
                split_duration = duration / num_splits
                for j in range(num_splits):
                    split_start = start_time + j * split_duration
                    split_end = start_time + (j + 1) * split_duration
                    
                    start_sample = int(split_start * sr)
                    end_sample = int(split_end * sr)
                    
                    segments.append({
                        'audio': audio[start_sample:end_sample],
                        'start_time': split_start,
                        'end_time': split_end
                    })
            else:
                start_sample = int(start_time * sr)
                end_sample = int(end_time * sr)
                
                segments.append({
                    'audio': audio[start_sample:end_sample],
                    'start_time': start_time,
                    'end_time': end_time
                })
        
        return segments
    
    def _classify_emotion(self, audio: np.ndarray, sr: int) -> Dict:
        """
        Run emotion classification on audio segment.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            Emotion classification result
        """
        if self.backend == "audio2emotion":
            return self._classify_audio2emotion(audio, sr)
        elif self.backend == "hume":
            return self._classify_hume(audio, sr)
        else:
            raise ValueError(f"Unsupported backend: {self.backend}")
    
    def _classify_audio2emotion(self, audio: np.ndarray, sr: int) -> Dict:
        """
        Classify emotion using Audio2Emotion ONNX model.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            Emotion classification with confidence scores
        """
        # Preprocess audio for model
        # Note: Actual preprocessing depends on Audio2Emotion model requirements
        # This is a placeholder implementation
        
        # Extract mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=audio,
            sr=sr,
            n_mels=128,
            fmax=8000
        )
        
        # Convert to log scale
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Normalize
        mel_spec_norm = (mel_spec_db - mel_spec_db.mean()) / mel_spec_db.std()
        
        # Reshape for model input (batch_size, channels, height, width)
        input_tensor = mel_spec_norm[np.newaxis, np.newaxis, :, :]
        input_tensor = input_tensor.astype(np.float32)
        
        # Run inference
        input_name = self.model.get_inputs()[0].name
        output_name = self.model.get_outputs()[0].name
        
        outputs = self.model.run([output_name], {input_name: input_tensor})
        emotion_probs = outputs[0][0]  # Shape: (num_emotions,)
        
        # Get top emotions
        top_idx = np.argsort(emotion_probs)[::-1]
        
        # Map model outputs to taxonomy
        # Note: Mapping depends on model's emotion labels
        model_emotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']
        
        primary_idx = top_idx[0]
        primary_emotion_name = model_emotions[primary_idx]
        primary_confidence = float(emotion_probs[primary_idx])
        
        # Calculate valence and arousal from emotion
        valence, arousal = self._emotion_to_valence_arousal(
            primary_emotion_name, primary_confidence
        )
        
        # Extract acoustic features
        acoustic_features = self._extract_acoustic_features(audio, sr)
        
        result = {
            'primary_emotion': {
                'name': primary_emotion_name,
                'confidence': primary_confidence,
                'intensity': primary_confidence,  # Use confidence as intensity
                'valence': valence,
                'arousal': arousal
            },
            'secondary_emotions': [
                {
                    'name': model_emotions[idx],
                    'confidence': float(emotion_probs[idx]),
                    'intensity': float(emotion_probs[idx])
                }
                for idx in top_idx[1:3]  # Top 2 secondary emotions
            ],
            'acoustic_features': acoustic_features
        }
        
        return result
    
    def _emotion_to_valence_arousal(self, emotion: str, confidence: float) -> Tuple[float, float]:
        """
        Map emotion name to valence-arousal space.
        Based on Russell's circumplex model of affect.
        
        Args:
            emotion: Emotion name
            confidence: Confidence score
            
        Returns:
            (valence, arousal) tuple, each in range [-1, 1] or [0, 1]
        """
        # Valence: -1 (negative) to +1 (positive)
        # Arousal: 0 (calm) to 1 (excited)
        
        emotion_coords = {
            'joy': (0.8, 0.7),
            'happy': (0.8, 0.7),
            'sadness': (-0.6, 0.3),
            'sad': (-0.6, 0.3),
            'anger': (-0.7, 0.9),
            'angry': (-0.7, 0.9),
            'fear': (-0.6, 0.8),
            'fearful': (-0.6, 0.8),
            'surprise': (0.2, 0.8),
            'surprised': (0.2, 0.8),
            'disgust': (-0.8, 0.5),
            'disgusted': (-0.8, 0.5),
            'trust': (0.5, 0.3),
            'neutral': (0.0, 0.2),
            'anticipation': (0.3, 0.6)
        }
        
        coords = emotion_coords.get(emotion.lower(), (0.0, 0.5))
        valence = coords[0] * confidence
        arousal = coords[1] * confidence
        
        return valence, arousal
    
    def _extract_acoustic_features(self, audio: np.ndarray, sr: int) -> Dict:
        """
        Extract acoustic features from audio segment.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            Dictionary of acoustic features
        """
        # Pitch (F0)
        pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:
                pitch_values.append(pitch)
        
        pitch_mean = np.mean(pitch_values) if pitch_values else 0.0
        pitch_variance = np.var(pitch_values) if pitch_values else 0.0
        
        # Energy
        energy = librosa.feature.rms(y=audio)[0]
        energy_mean = float(np.mean(energy))
        
        # Speaking rate (zero-crossing rate as proxy)
        zcr = librosa.feature.zero_crossing_rate(audio)[0]
        speaking_rate = float(np.mean(zcr) * 10)  # Scale to reasonable range
        
        return {
            'pitch_mean': float(pitch_mean),
            'pitch_variance': float(pitch_variance),
            'energy_level': energy_mean,
            'speaking_rate': speaking_rate
        }
    
    def _map_to_taxonomy(self, emotion_data: Dict) -> Dict:
        """
        Map model-specific emotion to standardized taxonomy.
        
        Args:
            emotion_data: Raw emotion data from model
            
        Returns:
            Standardized emotion data
        """
        # Emotion name mapping
        emotion_map = {
            'happy': 'joy',
            'sad': 'sadness',
            'angry': 'anger',
            'fearful': 'fear',
            'surprised': 'surprise',
            'disgusted': 'disgust',
            'neutral': 'trust',
            'excited': 'anticipation'
        }
        
        emotion_name = emotion_data['name'].lower()
        standardized_name = emotion_map.get(emotion_name, emotion_name)
        
        # Ensure emotion is in taxonomy
        if standardized_name not in self.EMOTION_TAXONOMY:
            logger.warning(f"Unknown emotion '{standardized_name}', defaulting to 'trust'")
            standardized_name = 'trust'
        
        emotion_data['name'] = standardized_name
        return emotion_data
    
    def _calculate_overall_sentiment(self, segments: List[Dict]) -> Dict:
        """
        Calculate overall sentiment from all segments.
        
        Args:
            segments: List of emotion segments
            
        Returns:
            Overall sentiment dictionary
        """
        if not segments:
            return {
                'dominant_emotion': 'trust',
                'emotional_arc': 'stable',
                'tone': 'neutral'
            }
        
        # Count emotion occurrences
        emotion_counts = {}
        total_valence = 0.0
        total_arousal = 0.0
        
        for segment in segments:
            emotion_name = segment['primary_emotion']['name']
            emotion_counts[emotion_name] = emotion_counts.get(emotion_name, 0) + 1
            
            total_valence += segment['primary_emotion']['valence']
            total_arousal += segment['primary_emotion']['arousal']
        
        # Dominant emotion
        dominant_emotion = max(emotion_counts, key=emotion_counts.get)
        
        # Emotional arc (trajectory)
        if len(segments) >= 3:
            start_valence = segments[0]['primary_emotion']['valence']
            end_valence = segments[-1]['primary_emotion']['valence']
            
            if end_valence > start_valence + 0.3:
                emotional_arc = "rising"
            elif end_valence < start_valence - 0.3:
                emotional_arc = "falling"
            else:
                emotional_arc = "stable"
        else:
            emotional_arc = "stable"
        
        # Tone
        avg_valence = total_valence / len(segments)
        avg_arousal = total_arousal / len(segments)
        
        if avg_valence > 0.3 and avg_arousal > 0.6:
            tone = "enthusiastic"
        elif avg_valence > 0.3:
            tone = "positive"
        elif avg_valence < -0.3 and avg_arousal > 0.6:
            tone = "confrontational"
        elif avg_valence < -0.3:
            tone = "negative"
        else:
            tone = "neutral"
        
        return {
            'dominant_emotion': dominant_emotion,
            'emotional_arc': emotional_arc,
            'tone': tone,
            'average_valence': avg_valence,
            'average_arousal': avg_arousal
        }
    
    def _generate_cache_key(self, audio_path: str) -> str:
        """Generate cache key from audio file"""
        with open(audio_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        return f"emotion_{file_hash}"
    
    def _load_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Load emotion analysis from cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                return json.load(f)
        return None
    
    def _save_to_cache(self, cache_key: str, data: Dict):
        """Save emotion analysis to cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        with open(cache_file, 'w') as f:
            json.dump(data, f, indent=2)
```

### Configuration Updates

#### Enhanced settings.json

**File:** `config/settings.json`

```json
{
  "system": {
    "profiles_directory": "./profiles",
    "cache_directory": "./cache",
    "temp_directory": "./temp",
    "log_directory": "./logs",
    "rhubarb_path": "/usr/local/bin/rhubarb",
    "ffmpeg_path": "/usr/bin/ffmpeg"
  },
  
  "emotion_analysis": {
    "backend": "audio2emotion",
    "model_path": "./models/audio2emotion/model.onnx",
    "cache_enabled": true,
    "confidence_threshold": 0.6,
    "segment_min_duration": 1.0,
    "segment_max_duration": 10.0,
    "use_gpu": true
  },
  
  "profile_settings": {
    "cache_enabled": true,
    "validation_strict": true,
    "default_profile": "protagonist_default",
    "asset_preload": false
  },
  
  "video_composition": {
    "default_resolution": "1920x1080",
    "fps": 30,
    "codec": "libx264",
    "preset": "medium",
    "crf": 18,
    "audio_codec": "aac",
    "audio_bitrate": "192k"
  },
  
  "logging": {
    "level": "INFO",
    "console_output": true,
    "file_output": true,
    "log_file": "./logs/lipsync.log"
  }
}
```

### Testing Requirements

#### Unit Tests

**File:** `tests/unit/test_profile_manager.py`

```python
import pytest
from pathlib import Path
from src.core.profile_manager import ProfileManager, ProfileValidationError

@pytest.fixture
def config():
    return {
        'profiles_directory': './test_profiles',
        'cache_enabled': False,
        'validation_strict': True
    }

@pytest.fixture
def profile_manager(config):
    return ProfileManager(config)

class TestProfileManager:
    
    def test_create_profile_template(self, profile_manager):
        """Test profile template generation"""
        profile_name = "test_character"
        angles = ["ECU", "CU", "MCU"]
        emotions = ["joy", "sadness", "anger"]
        
        profile_path = profile_manager.create_profile_template(
            profile_name, angles, emotions
        )
        
        assert profile_path.exists()
        assert (profile_path / "profile_config.json").exists()
        assert (profile_path / "angles" / "ECU" / "emotions" / "joy").exists()
    
    def test_validate_profile_complete(self, profile_manager):
        """Test validation of complete profile"""
        # Create test profile with all assets
        # ... (setup code)
        
        result = profile_manager.validate_profile("test_complete")
        
        assert result['valid'] == True
        assert len(result['errors']) == 0
        assert result['stats']['completion_percentage'] == 100.0
    
    def test_validate_profile_missing_assets(self, profile_manager):
        """Test validation catches missing assets"""
        # Create test profile with missing assets
        # ... (setup code)
        
        result = profile_manager.validate_profile("test_incomplete")
        
        assert result['valid'] == False
        assert len(result['missing_assets']) > 0
    
    def test_get_viseme_path(self, profile_manager):
        """Test viseme path resolution"""
        profile_name = "test_character"
        angle = "MCU"
        emotion = "joy"
        viseme = "A"
        
        path = profile_manager.get_viseme_path(
            profile_name, angle, emotion, viseme
        )
        
        assert path.name == "A.png"
        assert "MCU" in str(path)
        assert "joy" in str(path)
```

**File:** `tests/unit/test_emotion_analyzer.py`

```python
import pytest
import numpy as np
from src.core.emotion_analyzer import EmotionAnalyzer, EmotionAnalysisError

@pytest.fixture
def config():
    return {
        'emotion_analysis': {
            'backend': 'audio2emotion',
            'model_path': './models/audio2emotion/model.onnx',
            'cache_enabled': False,
            'confidence_threshold': 0.6,
            'segment_min_duration': 1.0,
            'segment_max_duration': 10.0
        },
        'cache_directory': './test_cache'
    }

@pytest.fixture
def emotion_analyzer(config):
    return EmotionAnalyzer(config)

class TestEmotionAnalyzer:
    
    def test_analyze_audio_returns_segments(self, emotion_analyzer):
        """Test that audio analysis returns emotion segments"""
        audio_path = "tests/data/sample_audio.wav"
        
        result = emotion_analyzer.analyze_audio(audio_path)
        
        assert 'emotion_segments' in result
        assert len(result['emotion_segments']) > 0
        assert 'metadata' in result
        assert 'overall_sentiment' in result
    
    def test_emotion_segment_structure(self, emotion_analyzer):
        """Test emotion segment has required fields"""
        audio_path = "tests/data/sample_audio.wav"
        
        result = emotion_analyzer.analyze_audio(audio_path)
        segment = result['emotion_segments'][0]
        
        assert 'segment_id' in segment
        assert 'start_time' in segment
        assert 'end_time' in segment
        assert 'primary_emotion' in segment
        
        emotion = segment['primary_emotion']
        assert 'name' in emotion
        assert 'confidence' in emotion
        assert 'valence' in emotion
        assert 'arousal' in emotion
    
    def test_emotion_taxonomy_mapping(self, emotion_analyzer):
        """Test emotions are mapped to standard taxonomy"""
        audio_path = "tests/data/sample_audio.wav"
        
        result = emotion_analyzer.analyze_audio(audio_path)
        
        for segment in result['emotion_segments']:
            emotion_name = segment['primary_emotion']['name']
            assert emotion_name in EmotionAnalyzer.EMOTION_TAXONOMY
    
    def test_cache_functionality(self, emotion_analyzer):
        """Test emotion caching works correctly"""
        emotion_analyzer.cache_enabled = True
        audio_path = "tests/data/sample_audio.wav"
        
        # First analysis
        result1 = emotion_analyzer.analyze_audio(audio_path)
        
        # Second analysis (should hit cache)
        result2 = emotion_analyzer.analyze_audio(audio_path)
        
        assert result1 == result2
```

### Migration Tools

#### Preset to Profile Migration Script

**File:** `scripts/migrate_presets_to_profiles.py`

```python
"""
Migrate v1.0 presets to v2.0 profiles.

Usage:
    python scripts/migrate_presets_to_profiles.py --preset-dir ./presets --output-dir ./profiles

Author: Development Team
Date: 2025-10-18
"""

import argparse
import json
import shutil
from pathlib import Path
from datetime import datetime

def migrate_preset(preset_path: Path, output_dir: Path):
    """
    Migrate a single preset to profile format.
    
    Args:
        preset_path: Path to v1.0 preset directory
        output_dir: Output directory for v2.0 profiles
    """
    preset_name = preset_path.name
    print(f"Migrating preset: {preset_name}")
    
    # Load preset config
    preset_config_path = preset_path / "preset.json"
    if not preset_config_path.exists():
        print(f"  Warning: preset.json not found, skipping")
        return
    
    with open(preset_config_path, 'r') as f:
        preset_config = json.load(f)
    
    # Create profile directory
    profile_path = output_dir / preset_name
    profile_path.mkdir(parents=True, exist_ok=True)
    
    # Create angles directory with default MCU angle
    angles_path = profile_path / "angles"
    angles_path.mkdir(exist_ok=True)
    
    mcu_path = angles_path / "MCU"
    mcu_path.mkdir(exist_ok=True)
    
    # Create base directory
    base_path = mcu_path / "base"
    base_path.mkdir(exist_ok=True)
    
    # Create emotions directory with default "trust" emotion
    emotions_path = mcu_path / "emotions"
    emotions_path.mkdir(exist_ok=True)
    
    trust_path = emotions_path / "trust"
    trust_path.mkdir(exist_ok=True)
    
    # Copy mouth shapes to trust emotion
    mouth_shapes_path = preset_path / "mouth_shapes"
    if mouth_shapes_path.exists():
        for viseme_file in mouth_shapes_path.glob("*.png"):
            dest_file = trust_path / viseme_file.name
            shutil.copy2(viseme_file, dest_file)
            print(f"  Copied: {viseme_file.name}")
    
    # Create profile config
    profile_config = {
        "schema_version": "2.0",
        "profile_name": preset_name,
        "version": "1.0.0",
        "created_date": datetime.now().isoformat(),
        "last_modified": datetime.now().isoformat(),
        "migrated_from_v1": True,
        "character_metadata": {
            "full_name": preset_config.get('character_name', preset_name),
            "character_type": preset_config.get('character_type', ''),
            "art_style": preset_config.get('art_style', ''),
            "artist": preset_config.get('artist', ''),
            "notes": "Migrated from v1.0 preset"
        },
        "supported_angles": ["MCU"],
        "supported_emotions": {
            "core": ["trust"],
            "compound": []
        },
        "default_settings": {
            "default_angle": "MCU",
            "default_emotion": "trust",
            "base_intensity": 0.7
        },
        "asset_specifications": {
            "viseme_format": "PNG",
            "alpha_channel_required": True,
            "resolution_by_angle": {
                "MCU": {"width": 1920, "height": 1080}
            },
            "color_space": "sRGB",
            "bit_depth": 8
        },
        "validation": {
            "strict_mode": False,
            "allow_missing_emotions": True,
            "allow_missing_angles": True,
            "require_base_images": False
        }
    }
    
    # Save profile config
    config_path = profile_path / "profile_config.json"
    with open(config_path, 'w') as f:
        json.dump(profile_config, f, indent=2)
    
    print(f"  Migration complete: {profile_path}")

def main():
    parser = argparse.ArgumentParser(description="Migrate v1.0 presets to v2.0 profiles")
    parser.add_argument('--preset-dir', type=str, default='./presets',
                        help='Directory containing v1.0 presets')
    parser.add_argument('--output-dir', type=str, default='./profiles',
                        help='Output directory for v2.0 profiles')
    
    args = parser.parse_args()
    
    preset_dir = Path(args.preset_dir)
    output_dir = Path(args.output_dir)
    
    if not preset_dir.exists():
        print(f"Error: Preset directory not found: {preset_dir}")
        return
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Migrate all presets
    preset_count = 0
    for preset_path in preset_dir.iterdir():
        if preset_path.is_dir():
            migrate_preset(preset_path, output_dir)
            preset_count += 1
    
    print(f"\nMigration complete: {preset_count} presets migrated")

if __name__ == "__main__":
    main()
```

### Phase 1 Acceptance Criteria

#### Functionality Requirements

- [ ] ProfileManager can create profile templates
- [ ] ProfileManager can load profiles with multi-angle/emotion support
- [ ] ProfileManager can validate profiles and report missing assets
- [ ] ProfileManager can resolve viseme paths correctly
- [ ] EmotionAnalyzer can analyze audio files and generate segments
- [ ] EmotionAnalyzer maps emotions to standard taxonomy
- [ ] EmotionAnalyzer caches results correctly
- [ ] Migration script successfully converts v1 presets to v2 profiles

#### Testing Requirements

- [ ] Unit test coverage >80% for ProfileManager
- [ ] Unit test coverage >80% for EmotionAnalyzer
- [ ] Integration tests pass for profile loading pipeline
- [ ] Migration script tested on all existing presets

#### Documentation Requirements

- [ ] API documentation complete for ProfileManager
- [ ] API documentation complete for EmotionAnalyzer
- [ ] User guide for profile creation
- [ ] Migration guide from v1 to v2

#### Performance Requirements

- [ ] Profile loading <200ms
- [ ] Emotion analysis <2s per minute of audio
- [ ] Cache hit rate >90% for repeated analyses

### Development Timeline

#### Week 1: ProfileManager Implementation
- Days 1-2: Directory structure and configuration loading
- Days 3-4: Asset path resolution and validation
- Day 5: Profile template generation and testing

#### Week 2: EmotionAnalyzer Implementation
- Days 1-2: Model integration and audio preprocessing
- Days 3-4: Emotion classification and taxonomy mapping
- Day 5: Caching and performance optimization

#### Week 3: Integration and Testing
- Days 1-2: Migration tools development
- Days 3-4: Comprehensive testing
- Day 5: Documentation and code review

### Next Steps

Upon completion of Phase 1:

1. Conduct team code review
2. Merge Phase 1 branch to development
3. Create Phase 1 release tag
4. Begin Phase 2: Cinematographic Decision Engine

---
**End of Phase 1 Documentation**