"""
Emotion analysis service for audio processing and emotion segmentation
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import BaseService
from ..core.emotion_analyzer import EmotionAnalyzer
from ..utils.validators import validate_audio_file


class EmotionAnalysisService(BaseService):
    """Service for emotion analysis and audio processing"""
    
    def _validate_config(self) -> None:
        """Validate emotion analysis service configuration"""
        required_keys = ["system"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.emotion_analyzer = EmotionAnalyzer(config)
    
    def analyze_emotion_audio(self, audio_id: str) -> Dict[str, Any]:
        """Return detailed emotion segmentation data for a specific audio file"""
        try:
            # Determine audio path - could be direct path or need to resolve from audio_id
            audio_path = audio_id
            if not Path(audio_id).exists():
                # Try to find the audio file in common locations
                possible_paths = [
                    self.project_root / "assets" / "audio" / "raw" / audio_id,
                    self.project_root / "uploads" / audio_id,
                ]
                
                for path in possible_paths:
                    if path.exists():
                        audio_path = str(path)
                        break
                else:
                    return {"error": f"Audio file not found: {audio_id}"}
            
            # Validate audio file
            if not validate_audio_file(audio_path):
                return {"error": f"Invalid audio file: {audio_path}"}
            
            # Perform emotion analysis
            emotion_analysis = self.emotion_analyzer.analyze_audio(audio_path)
            
            # Enhance with additional metadata for API response
            enhanced_analysis = {
                "audio_id": audio_id,
                "audio_path": audio_path,
                "analysis_timestamp": datetime.now().isoformat(),
                "analysis_version": "1.0.0",
                "metadata": emotion_analysis.get("metadata", {}),
                "emotion_segments": emotion_analysis.get("emotion_segments", []),
                "overall_sentiment": emotion_analysis.get("overall_sentiment", {}),
                "processing_info": {
                    "total_segments": len(emotion_analysis.get("emotion_segments", [])),
                    "analysis_duration": emotion_analysis.get("metadata", {}).get("duration", 0.0),
                    "model_used": emotion_analysis.get("metadata", {}).get("model", "audio2emotion"),
                    "cache_hit": False,  # TODO: Implement cache detection
                },
            }
            
            # Add segment statistics
            if enhanced_analysis["emotion_segments"]:
                segments = enhanced_analysis["emotion_segments"]
                
                # Calculate emotion distribution
                emotion_counts = {}
                total_confidence = 0.0
                total_valence = 0.0
                total_arousal = 0.0
                
                for segment in segments:
                    primary_emotion = segment.get("primary_emotion", {})
                    emotion_name = primary_emotion.get("name", "unknown")
                    confidence = primary_emotion.get("confidence", 0.0)
                    valence = primary_emotion.get("valence", 0.0)
                    arousal = primary_emotion.get("arousal", 0.0)
                    
                    emotion_counts[emotion_name] = emotion_counts.get(emotion_name, 0) + 1
                    total_confidence += confidence
                    total_valence += valence
                    total_arousal += arousal
                
                enhanced_analysis["segment_statistics"] = {
                    "emotion_distribution": emotion_counts,
                    "average_confidence": total_confidence / len(segments) if segments else 0.0,
                    "average_valence": total_valence / len(segments) if segments else 0.0,
                    "average_arousal": total_arousal / len(segments) if segments else 0.0,
                    "durationweighted_emotion": self._calculate_duration_weighted_emotion(segments),
                }
            
            return enhanced_analysis
            
        except Exception as e:
            return {"error": f"Failed to analyze emotions for {audio_id}: {str(e)}"}
    
    def get_emotion_segments(self, job_id: str, processing_jobs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Retrieve emotion analysis for specific processing jobs with raw audio features"""
        try:
            # Check if job exists
            if job_id not in processing_jobs:
                return {"error": f"Job not found: {job_id}"}
            
            job = processing_jobs[job_id]
            
            # Get audio path from job
            audio_path = job.get("audio_path")
            if not audio_path:
                return {"error": f"No audio path found for job: {job_id}"}
            
            # Check if emotion analysis exists in cache or job result
            emotion_data = None
            
            # First, try to get from job result if completed
            if job.get("status") == "completed" and "result" in job:
                result = job["result"]
                if isinstance(result, dict) and "metadata" in result:
                    emotion_data = result.get("metadata", {}).get("emotion_analysis")
            
            # If not in job result, try to load from cache
            if not emotion_data:
                try:
                    emotion_data = self.emotion_analyzer.analyze_audio(audio_path)
                except Exception:
                    # If analysis fails, try to load from cache directly
                    cache_key = self.emotion_analyzer._generate_cache_key(audio_path)
                    emotion_data = self.emotion_analyzer._load_from_cache(cache_key)
            
            if not emotion_data:
                return {"error": f"No emotion analysis found for job: {job_id}"}
            
            # Enhance segments with additional analysis
            enhanced_segments = []
            emotion_segments = emotion_data.get("emotion_segments", [])
            
            for i, segment in enumerate(emotion_segments):
                enhanced_segment = {
                    **segment,
                    "segment_index": i,
                    "job_context": {
                        "job_id": job_id,
                        "profile_used": job.get("profile_name"),
                        "cinematic_mode": job.get("cinematic_mode", "balanced"),
                    },
                    "alternative_emotions": self._generate_alternative_emotions(segment),
                    "acoustic_analysis": {
                        "features": segment.get("acoustic_features", {}),
                        "quality_metrics": self._calculate_acoustic_quality_metrics(
                            segment.get("acoustic_features", {})
                        ),
                        "speech_characteristics": self._analyze_speech_characteristics(
                            segment.get("acoustic_features", {})
                        ),
                    },
                    "cinematographic_suggestions": self._generate_cinematographic_suggestions(segment),
                }
                enhanced_segments.append(enhanced_segment)
            
            # Compile comprehensive response
            response = {
                "job_id": job_id,
                "job_status": job.get("status"),
                "audio_path": audio_path,
                "analysis_timestamp": datetime.now().isoformat(),
                "emotion_segments": enhanced_segments,
                "raw_audio_features": {
                    "segment_count": len(enhanced_segments),
                    "feature_summary": self._summarize_audio_features(enhanced_segments),
                    "feature_consistency": self._analyze_feature_consistency(enhanced_segments),
                },
                "alternative_emotion_suggestions": self._generate_global_alternatives(emotion_segments),
                "processing_metadata": {
                    "analysis_duration": emotion_data.get("metadata", {}).get("duration", 0.0),
                    "model_used": emotion_data.get("metadata", {}).get("model", "audio2emotion"),
                    "sample_rate": emotion_data.get("metadata", {}).get("sample_rate", 16000),
                    "cache_status": "cached" if job.get("status") == "completed" else "fresh",
                },
            }
            
            return response
            
        except Exception as e:
            return {"error": f"Failed to get emotion segments for job {job_id}: {str(e)}"}
    
    def manual_emotion_adjustment(
        self, 
        adjustment_data: Dict[str, Any], 
        processing_jobs: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Allow manual emotion segment adjustment with confidence score modifications"""
        try:
            # Extract required parameters
            job_id = adjustment_data.get("job_id")
            segment_adjustments = adjustment_data.get("segment_adjustments", [])
            adjustment_options = adjustment_data.get("options", {})
            
            if not job_id:
                return {"error": "job_id is required"}
            
            if not segment_adjustments:
                return {"error": "At least one segment adjustment is required"}
            
            # Validate job exists
            if job_id not in processing_jobs:
                return {"error": f"Job not found: {job_id}"}
            
            job = processing_jobs[job_id]
            audio_path = job.get("audio_path")
            if not audio_path:
                return {"error": f"No audio path found for job: {job_id}"}
            
            # Load current emotion analysis
            try:
                current_analysis = self.emotion_analyzer.analyze_audio(audio_path)
            except Exception:
                cache_key = self.emotion_analyzer._generate_cache_key(audio_path)
                current_analysis = self.emotion_analyzer._load_from_cache(cache_key)
            
            if not current_analysis:
                return {"error": f"No emotion analysis found for job: {job_id}"}
            
            # Process adjustments
            adjustment_results = []
            validation_errors = []
            continuity_warnings = []
            
            current_segments = current_analysis.get("emotion_segments", [])
            
            for adjustment in segment_adjustments:
                segment_id = adjustment.get("segment_id")
                new_emotion = adjustment.get("new_emotion")
                new_confidence = adjustment.get("new_confidence")
                adjustment_reason = adjustment.get("reason", "manual_adjustment")
                
                # Find the segment to adjust
                segment_index = None
                target_segment = None
                
                for i, segment in enumerate(current_segments):
                    if segment.get("segment_id") == segment_id:
                        segment_index = i
                        target_segment = segment
                        break
                
                if segment_index is None or target_segment is None:
                    validation_errors.append(f"Segment {segment_id} not found")
                    continue
                
                # Validate adjustment
                validation_result = self._validate_emotion_adjustment(
                    target_segment, new_emotion, new_confidence, segment_index, current_segments
                )
                
                if not validation_result["valid"]:
                    validation_errors.extend(validation_result["errors"])
                    continue
                
                # Apply adjustment
                adjusted_segment = {
                    **target_segment,
                    "primary_emotion": {
                        "name": new_emotion,
                        "confidence": new_confidence,
                        "intensity": new_confidence,
                        "valence": validation_result["valence"],
                        "arousal": validation_result["arousal"],
                    },
                    "adjustment_metadata": {
                        "original_emotion": target_segment.get("primary_emotion", {}).get("name"),
                        "original_confidence": target_segment.get("primary_emotion", {}).get("confidence"),
                        "adjustment_timestamp": datetime.now().isoformat(),
                        "adjustment_reason": adjustment_reason,
                        "adjusted_by": "manual_api",
                    },
                }
                
                # Update the segment in the analysis
                current_segments[segment_index] = adjusted_segment
                
                adjustment_results.append({
                    "segment_id": segment_id,
                    "adjustment_applied": True,
                    "previous_emotion": target_segment.get("primary_emotion", {}).get("name"),
                    "new_emotion": new_emotion,
                    "confidence_change": new_confidence - target_segment.get("primary_emotion", {}).get("confidence", 0.0),
                    "validation_notes": validation_result.get("notes", []),
                })
            
            # Check emotion continuity rules
            if adjustment_options.get("validate_continuity", True):
                continuity_analysis = self._validate_emotion_continuity(current_segments)
                continuity_warnings.extend(continuity_analysis.get("warnings", []))
            
            # Recalculate overall sentiment with adjustments
            updated_overall_sentiment = self.emotion_analyzer._calculate_overall_sentiment(current_segments)
            
            # Create adjusted analysis
            adjusted_analysis = {
                **current_analysis,
                "emotion_segments": current_segments,
                "overall_sentiment": updated_overall_sentiment,
                "adjustment_metadata": {
                    "job_id": job_id,
                    "adjustment_timestamp": datetime.now().isoformat(),
                    "total_adjustments": len(adjustment_results),
                    "adjustment_summary": adjustment_results,
                    "validation_errors": validation_errors,
                    "continuity_warnings": continuity_warnings,
                    "adjustment_options": adjustment_options,
                },
            }
            
            # Save adjusted analysis to cache with new identifier
            adjusted_cache_key = None
            if adjustment_options.get("save_adjusted", True):
                adjusted_cache_key = f"adjusted_{job_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                self.emotion_analyzer._save_to_cache(adjusted_cache_key, adjusted_analysis)
            
            # Update job with adjustment info
            if "emotion_adjustments" not in job:
                job["emotion_adjustments"] = []
            job["emotion_adjustments"].append({
                "adjustment_id": f"adj_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "adjustment_timestamp": datetime.now().isoformat(),
                "adjustments_count": len(adjustment_results),
                "cache_key": adjusted_cache_key,
            })
            
            return {
                "message": f"Emotion adjustments applied successfully for job {job_id}",
                "job_id": job_id,
                "adjustment_results": adjustment_results,
                "adjusted_analysis": adjusted_analysis,
                "validation_errors": validation_errors,
                "continuity_warnings": continuity_warnings,
                "updated_overall_sentiment": updated_overall_sentiment,
                "adjustment_applied": len(validation_errors) == 0,
            }
            
        except Exception as e:
            return {"error": f"Failed to apply emotion adjustments: {str(e)}"}
    
    def _calculate_duration_weighted_emotion(self, segments: List[Dict[str, Any]]) -> str:
        """Calculate duration-weighted dominant emotion"""
        emotion_durations = {}
        
        for segment in segments:
            emotion = segment.get("primary_emotion", {}).get("name", "neutral")
            duration = segment.get("end_time", 0) - segment.get("start_time", 0)
            emotion_durations[emotion] = emotion_durations.get(emotion, 0) + duration
        
        return max(emotion_durations, key=emotion_durations.get) if emotion_durations else "neutral"
    
    def _generate_alternative_emotions(self, segment: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alternative emotion suggestions for a segment"""
        primary_emotion = segment.get("primary_emotion", {})
        current_emotion = primary_emotion.get("name", "neutral")
        
        # Simple alternative suggestions based on valence/arousal
        alternatives = []
        
        if current_emotion == "joy":
            alternatives.extend([
                {"emotion": "trust", "confidence": 0.7, "reason": "Positive emotional space"},
                {"emotion": "anticipation", "confidence": 0.6, "reason": "Forward-looking positive"},
            ])
        elif current_emotion == "sadness":
            alternatives.extend([
                {"emotion": "fear", "confidence": 0.6, "reason": "Negative emotional space"},
                {"emotion": "disgust", "confidence": 0.5, "reason": "Aversion response"},
            ])
        
        return alternatives
    
    def _calculate_acoustic_quality_metrics(self, acoustic_features: Dict[str, Any]) -> Dict[str, float]:
        """Calculate acoustic quality metrics"""
        return {
            "signal_to_noise_ratio": acoustic_features.get("snr", 0.0),
            "spectral_centroid": acoustic_features.get("spectral_centroid", 0.0),
            "zero_crossing_rate": acoustic_features.get("zcr", 0.0),
            "energy": acoustic_features.get("energy", 0.0),
        }
    
    def _analyze_speech_characteristics(self, acoustic_features: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze speech characteristics from acoustic features"""
        return {
            "tempo": acoustic_features.get("tempo", 0.0),
            "pitch_variability": acoustic_features.get("pitch_std", 0.0),
            "intensity_range": acoustic_features.get("intensity_range", 0.0),
            "articulation_clarity": acoustic_features.get("articulation", 0.5),
        }
    
    def _generate_cinematographic_suggestions(self, segment: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate cinematographic suggestions based on emotion"""
        primary_emotion = segment.get("primary_emotion", {})
        emotion_name = primary_emotion.get("name", "neutral")
        confidence = primary_emotion.get("confidence", 0.0)
        
        suggestions = []
        
        if emotion_name == "joy":
            suggestions.append({
                "shot_type": "CU",
                "angle": "eye_level",
                "reason": "Intimate connection for positive emotions",
                "confidence": confidence * 0.8,
            })
        elif emotion_name == "anger":
            suggestions.append({
                "shot_type": "ECU",
                "angle": "low_angle",
                "reason": "Intensity and power for anger",
                "confidence": confidence * 0.8,
            })
        
        return suggestions
    
    def _summarize_audio_features(self, segments: List[Dict[str, Any]]) -> Dict[str, float]:
        """Summarize audio features across segments"""
        if not segments:
            return {}
        
        # Calculate averages across all segments
        avg_energy = sum(s.get("acoustic_features", {}).get("energy", 0) for s in segments) / len(segments)
        avg_tempo = sum(s.get("acoustic_features", {}).get("tempo", 0) for s in segments) / len(segments)
        
        return {
            "average_energy": avg_energy,
            "average_tempo": avg_tempo,
            "energy_variance": 0.0,  # TODO: Calculate actual variance
            "tempo_variance": 0.0,   # TODO: Calculate actual variance
        }
    
    def _analyze_feature_consistency(self, segments: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze consistency of audio features across segments"""
        return {
            "energy_consistency": 0.8,  # TODO: Calculate actual consistency
            "tempo_consistency": 0.7,   # TODO: Calculate actual consistency
            "overall_consistency": 0.75,
        }
    
    def _generate_global_alternatives(self, emotion_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate global alternative emotion suggestions"""
        emotion_counts = {}
        for segment in emotion_segments:
            emotion = segment.get("primary_emotion", {}).get("name", "neutral")
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        # Suggest alternatives based on overall emotion distribution
        alternatives = []
        if emotion_counts:
            dominant_emotion = max(emotion_counts, key=emotion_counts.get)
            if dominant_emotion == "joy":
                alternatives.append({
                    "alternative_sequence": "trust-anticipation-joy",
                    "reason": "Positive emotional progression",
                    "confidence": 0.7,
                })
        
        return alternatives
    
    def _validate_emotion_adjustment(
        self, 
        segment: Dict[str, Any], 
        new_emotion: str, 
        new_confidence: float,
        segment_index: int, 
        all_segments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate emotion adjustment"""
        errors = []
        notes = []
        
        # Validate confidence range
        if not (0.0 <= new_confidence <= 1.0):
            errors.append("Confidence must be between 0.0 and 1.0")
        
        # Validate emotion name
        valid_emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "trust", "anticipation"]
        if new_emotion not in valid_emotions:
            errors.append(f"Invalid emotion: {new_emotion}. Valid emotions: {valid_emotions}")
        
        # Check continuity with previous segment
        if segment_index > 0:
            prev_segment = all_segments[segment_index - 1]
            prev_emotion = prev_segment.get("primary_emotion", {}).get("name", "neutral")
            
            # Check for dramatic emotional shifts
            if self._is_dramatic_shift(prev_emotion, new_emotion):
                notes.append(f"Dramatic emotional shift from {prev_emotion} to {new_emotion}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "notes": notes,
            "valence": self._get_emotion_valence(new_emotion),
            "arousal": self._get_emotion_arousal(new_emotion),
        }
    
    def _is_dramatic_shift(self, emotion1: str, emotion2: str) -> bool:
        """Check if emotional shift is dramatic"""
        dramatic_pairs = [
            ("joy", "sadness"),
            ("trust", "disgust"),
            ("fear", "anger"),
            ("surprise", "anticipation"),
        ]
        
        return (emotion1, emotion2) in dramatic_pairs or (emotion2, emotion1) in dramatic_pairs
    
    def _get_emotion_valence(self, emotion: str) -> float:
        """Get valence value for emotion"""
        valence_map = {
            "joy": 0.8, "trust": 0.7, "anticipation": 0.4,
            "sadness": -0.6, "disgust": -0.4, "anger": -0.5,
            "fear": -0.7, "surprise": 0.1, "neutral": 0.0
        }
        return valence_map.get(emotion, 0.0)
    
    def _get_emotion_arousal(self, emotion: str) -> float:
        """Get arousal value for emotion"""
        arousal_map = {
            "anger": 0.9, "fear": 0.8, "surprise": 0.7,
            "joy": 0.6, "anticipation": 0.5, "disgust": 0.4,
            "sadness": 0.2, "trust": 0.3, "neutral": 0.0
        }
        return arousal_map.get(emotion, 0.0)
    
    def _validate_emotion_continuity(self, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate emotion continuity across segments"""
        warnings = []
        
        for i in range(1, len(segments)):
            prev_emotion = segments[i-1].get("primary_emotion", {}).get("name", "neutral")
            curr_emotion = segments[i].get("primary_emotion", {}).get("name", "neutral")
            
            if self._is_dramatic_shift(prev_emotion, curr_emotion):
                warnings.append(f"Dramatic shift at segment {i}: {prev_emotion} -> {curr_emotion}")
        
        return {"warnings": warnings}