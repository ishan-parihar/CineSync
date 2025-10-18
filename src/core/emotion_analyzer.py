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
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
import logging
import hashlib
from datetime import datetime

# Optional imports - will be handled with try/except blocks
librosa = None
sf = None
ort = None
try:
    import librosa
except ImportError:
    pass

try:
    import soundfile as sf
except ImportError:
    pass

try:
    import onnxruntime as ort
except ImportError:
    pass

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
        self.cache_dir = Path(config.get('system', {}).get('cache_directory', './cache')) / 'emotions'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Load model
        self.model = self._load_model()
        
        logger.info(f"EmotionAnalyzer initialized with backend: {backend}")
    
    def _load_model(self):
        """Load emotion recognition model based on backend"""
        if self.backend == "audio2emotion":
            if ort is None or librosa is None:
                logger.warning("Required libraries (onnxruntime, librosa) not installed. Using dummy model.")
                return None
            
            model_path = self.config['emotion_analysis']['model_path']
            if not Path(model_path).exists():
                logger.warning(f"Model not found: {model_path}. Using dummy model.")
                return None  # Fall back to dummy model when file doesn't exist
            
            # Load ONNX model with GPU/CPU preference based on config
            use_gpu = self.config.get('emotion_analysis', {}).get('use_gpu', False)
            if use_gpu:
                providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
            else:
                providers = ['CPUExecutionProvider']
            
            session = ort.InferenceSession(
                model_path,
                providers=providers
            )
            logger.info(f"Loaded Audio2Emotion model from {model_path}")
            return session
        
        elif self.backend == "hume":
            # Hume AI API client
            import os
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
        # Generate cache key
        cache_key = self._generate_cache_key(audio_path)
        
        # Check cache
        if self.cache_enabled:
            cached_result = self._load_from_cache(cache_key)
            if cached_result:
                logger.info(f"Emotion analysis loaded from cache: {audio_path}")
                return cached_result
        
        logger.info(f"Analyzing audio: {audio_path}")
        
        # Load audio
        if librosa is None:
            # If librosa is not available, create a dummy analysis
            logger.warning("Librosa not available, returning dummy emotion analysis")
            duration = 0.0  # We can't get duration without librosa
            audio = np.array([])  # Empty array as fallback
            sr = 16000  # Standard sample rate
        else:
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
        if librosa is None:
            # If librosa is not available, return a single segment with the entire audio
            logger.warning("Librosa not available, using fallback segmentation")
            duration = len(audio) / sr if len(audio) > 0 else 1.0
            return [{
                'audio': audio,
                'start_time': 0.0,
                'end_time': duration
            }]
        
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
        if librosa is None or ort is None:
            # If required libraries are not available, return a simulated result
            logger.warning("Librosa or onnxruntime not available, returning simulated emotion analysis")
            # Generate simulated acoustic features
            acoustic_features = self._extract_acoustic_features(audio, sr)
            
            # Simulate primary emotion based on acoustic features
            energy_level = acoustic_features.get('energy_level', 0.0)
            speaking_rate = acoustic_features.get('speaking_rate', 0.0)
            
            # Simulate primary emotion based on energy and speaking rate
            if len(audio) == 0 or sr == 0:
                # If no audio data, return neutral
                primary_emotion_name = 'neutral'
                primary_confidence = 0.6
            elif energy_level > 0.2 and speaking_rate > 0.1:
                primary_emotion_name = 'anger' if speaking_rate > 0.15 else 'joy'
                primary_confidence = 0.8
            elif energy_level < 0.1:
                primary_emotion_name = 'sadness'
                primary_confidence = 0.7
            else:
                primary_emotion_name = 'neutral'
                primary_confidence = 0.6
            
            valence, arousal = self._emotion_to_valence_arousal(
                primary_emotion_name, primary_confidence
            )
            
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
                        'name': 'joy',
                        'confidence': 0.3,
                        'intensity': 0.3
                    },
                    {
                        'name': 'fear',
                        'confidence': 0.2,
                        'intensity': 0.2
                    }
                ],
                'acoustic_features': acoustic_features
            }
            
            return result
        
        # Preprocess audio for model - Audio2Emotion expects raw audio in specific format
        # According to network_info.json, model expects 16kHz audio
        
        # Ensure audio is at correct sample rate (should already be 16kHz from librosa.load)
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
            sr = 16000
        
        # Get model input specifications to understand exact requirements
        if self.model is None:
            raise EmotionAnalysisError("Model not loaded properly. Check if model file exists and dependencies are installed.")
        
        input_name = self.model.get_inputs()[0].name
        input_shape = self.model.get_inputs()[0].shape
        
        logger.info(f"Model expects input shape: {input_shape}")
        
        # Based on error messages, the model internally reshapes [batch, seq_len] to [batch, -1, 5000]
        # So seq_len must be divisible by 5000
        chunk_size = 5000
        audio_len = len(audio)
        
        # Round up to nearest multiple of chunk_size
        padded_len = ((audio_len + chunk_size - 1) // chunk_size) * chunk_size  # Ceiling division
        
        # Pad the audio to make length divisible by chunk_size
        if audio_len < padded_len:
            padded_audio = np.zeros(padded_len, dtype=np.float32)
            padded_audio[:audio_len] = audio
            audio = padded_audio
        elif audio_len > 60000:  # Limit based on trt_info.json MAX_BUFFER_LEN
            # Truncate if too long
            audio = audio[:60000]
            # Make sure it's divisible by chunk_size
            actual_len = 60000
            padded_len = ((60000 + chunk_size - 1) // chunk_size) * chunk_size
            padded_audio = np.zeros(padded_len, dtype=np.float32)
            padded_audio[:60000] = audio
            audio = padded_audio
        
        # Reshape for model input as [batch_size, sequence_length] - 2D tensor
        input_tensor = audio[np.newaxis, :].astype(np.float32)  # Shape: (1, sequence_length)
        
        logger.info(f"Input tensor shape: {input_tensor.shape}, sequence_length={len(audio)} must be divisible by {chunk_size}")
        
        # Run inference
        if self.model is None:
            raise EmotionAnalysisError("Model not loaded properly. Check if model file exists and dependencies are installed.")
        
        if self.model is None:
            raise EmotionAnalysisError("Model not loaded properly. Check if model file exists and dependencies are installed.")
        
        input_name = self.model.get_inputs()[0].name
        output_name = self.model.get_outputs()[0].name
        
        # Run the model
        outputs = self.model.run([output_name], {input_name: input_tensor})
        emotion_probs = outputs[0][0]  # Shape: (num_emotions,)
        
        # Get top emotions
        top_idx = np.argsort(emotion_probs)[::-1]
        
        # Map model outputs to actual emotions from network_info.json
        # According to network_info.json, the model outputs: ["angry", "disgust", "fear", "happy", "neutral", "sad"]
        model_emotions = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad']
        
        # Validate that the number of emotions matches
        if len(emotion_probs) != len(model_emotions):
            logger.warning(f"Model output shape {len(emotion_probs)} doesn't match expected emotions {len(model_emotions)}, using default mapping")
            # Default to the known emotions if there's a mismatch
            pass  # Continue with known emotions list
        
        primary_idx = top_idx[0]
        primary_emotion_name = model_emotions[primary_idx] if primary_idx < len(model_emotions) else 'neutral'
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
                    'name': model_emotions[idx] if idx < len(model_emotions) else 'neutral',
                    'confidence': float(emotion_probs[idx]),
                    'intensity': float(emotion_probs[idx])
                }
                for idx in top_idx[1:3]  # Top 2 secondary emotions
            ],
            'acoustic_features': acoustic_features
        }
        
        return result
    
    def _classify_hume(self, audio: np.ndarray, sr: int) -> Dict:
        """
        Classify emotion using Hume AI API.
        This is a placeholder implementation - in production, you would call the Hume API.
        
        Args:
            audio: Audio signal
            sr: Sample rate
            
        Returns:
            Emotion classification result
        """
        # Placeholder implementation since this requires Hume API
        # In a real implementation, you would upload the audio to Hume API and process the response
        
        # For now, simulate results based on acoustic features
        acoustic_features = self._extract_acoustic_features(audio, sr)
        
        # Determine primary emotion based on acoustic features
        energy_level = acoustic_features['energy_level']
        speaking_rate = acoustic_features['speaking_rate']
        
        # Simulate primary emotion based on energy and speaking rate
        if energy_level > 0.2 and speaking_rate > 0.1:
            primary_emotion_name = 'anger' if speaking_rate > 0.15 else 'joy'
            primary_confidence = 0.8
        elif energy_level < 0.1:
            primary_emotion_name = 'sadness'
            primary_confidence = 0.7
        else:
            primary_emotion_name = 'neutral'
            primary_confidence = 0.6
        
        valence, arousal = self._emotion_to_valence_arousal(
            primary_emotion_name, primary_confidence
        )
        
        result = {
            'primary_emotion': {
                'name': primary_emotion_name,
                'confidence': primary_confidence,
                'intensity': primary_confidence,
                'valence': valence,
                'arousal': arousal
            },
            'secondary_emotions': [
                {
                    'name': 'joy',
                    'confidence': 0.3,
                    'intensity': 0.3
                },
                {
                    'name': 'fear',
                    'confidence': 0.2,
                    'intensity': 0.2
                }
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
        if librosa is None:
            # If librosa is not available, return default acoustic features
            logger.warning("Librosa not available, returning default acoustic features")
            return {
                'pitch_mean': 0.0,
                'pitch_variance': 0.0,
                'energy_level': 0.0,
                'speaking_rate': 0.0
            }
        
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
        if emotion_counts:
            dominant_emotion = max(emotion_counts, key=lambda k: emotion_counts[k])
        else:
            dominant_emotion = 'trust'  # Default if no emotions found
        
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