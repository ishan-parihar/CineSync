"""
Processing service for job management and content orchestration
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List

from .base import BaseService
from ..core.content_orchestrator import ContentOrchestrator


class ProcessingService(BaseService):
    """Service for managing processing jobs and content orchestration"""
    
    def _validate_config(self) -> None:
        """Validate processing service configuration"""
        required_keys = ["system"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.orchestrator = ContentOrchestrator(config)
    
    def get_job_shot_sequence(self, job_id: str, processing_jobs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Return complete shot sequence with cinematographic metadata for completed jobs"""
        try:
            # Check if job exists
            if job_id not in processing_jobs:
                return {"error": f"Job not found: {job_id}"}
            
            job = processing_jobs[job_id]
            
            # Check if job is completed
            if job.get("status") != "completed":
                return {
                    "error": f"Job {job_id} is not completed. Current status: {job.get('status')}"
                }
            
            # Get job result and metadata
            job_result = job.get("result", {})
            job_metadata = job_result.get("metadata", {})
            
            # Extract shot sequence data
            shot_sequence_data = None
            emotion_analysis = job_metadata.get("emotion_analysis", {})
            
            # Try to get cinematographic decisions from metadata
            if "cinematographic_decisions" in job_metadata:
                shot_sequence_data = job_metadata["cinematographic_decisions"]
            elif "decisions_made" in job_metadata:
                # If we have decision count but not full data, regenerate using ContentOrchestrator
                audio_path = job.get("audio_path")
                profile_name = job.get("profile_name")
                cinematic_mode = job.get("cinematic_mode", "balanced")
                
                if audio_path and profile_name:
                    try:
                        # Regenerate cinematographic decisions
                        emotions = (
                            emotion_analysis
                            or self.orchestrator.emotion_analyzer.analyze_audio(audio_path)
                        )
                        cinematographic_decisions = (
                            self.orchestrator.decision_engine.generate_shot_sequence(emotions)
                        )
                        
                        # Build enhanced frame sequences
                        shot_sequence_data = self.orchestrator._build_frame_sequences(
                            shot_sequence=cinematographic_decisions,
                            emotions=emotions,
                            cinematic_mode=cinematic_mode,
                        )
                    except Exception as e:
                        return {"error": f"Failed to regenerate shot sequence: {str(e)}"}
            
            if not shot_sequence_data:
                return {"error": f"No shot sequence data available for job: {job_id}"}
            
            # Enhance shot sequence with additional analysis
            enhanced_shot_sequence = []
            emotion_segments = emotion_analysis.get("emotion_segments", [])
            
            for i, shot in enumerate(shot_sequence_data):
                # Get corresponding emotion segment
                emotion_segment = emotion_segments[i] if i < len(emotion_segments) else {}
                primary_emotion = emotion_segment.get("primary_emotion", {})
                
                # Generate alternative shot suggestions
                alternative_shots = self._generate_alternative_shots(shot, primary_emotion)
                
                # Calculate decision confidence
                decision_confidence = self._calculate_shot_decision_confidence(shot, emotion_segment)
                
                enhanced_shot = {
                    **shot,
                    "sequence_index": i,
                    "timing": {
                        "start_time": emotion_segment.get("start_time", i * 2.0),
                        "end_time": emotion_segment.get("end_time", (i + 1) * 2.0),
                        "duration": shot.get("shot_specification", {}).get("duration", 2.0),
                    },
                    "emotion_context": {
                        "primary_emotion": primary_emotion.get("name", "neutral"),
                        "emotion_confidence": primary_emotion.get("confidence", 0.0),
                        "valence": primary_emotion.get("valence", 0.0),
                        "arousal": primary_emotion.get("arousal", 0.0),
                    },
                    "decision_analysis": {
                        "confidence": decision_confidence,
                        "reasoning": self._generate_shot_reasoning(shot, primary_emotion),
                        "decision_factors": self._extract_decision_factors(shot),
                        "rule_applications": self._get_applied_rules(shot),
                    },
                    "alternatives": alternative_shots,
                    "technical_specs": {
                        "shot_type": shot.get("angle", "MCU"),
                        "vertical_angle": shot.get("vertical_angle", "eye_level"),
                        "shot_purpose": shot.get("shot_purpose", "dialogue"),
                        "composition_type": shot.get("composition", "centered"),
                        "duration_modifier": shot.get("duration_modifier", 1.0),
                    },
                }
                enhanced_shot_sequence.append(enhanced_shot)
            
            # Compile comprehensive response
            response = {
                "job_id": job_id,
                "job_metadata": {
                    "profile_used": job.get("profile_name"),
                    "cinematic_mode": job.get("cinematic_mode", "balanced"),
                    "processing_date": job.get("start_time"),
                    "completion_date": job.get("end_time"),
                },
                "shot_sequence": enhanced_shot_sequence,
                "sequence_analysis": {
                    "total_shots": len(enhanced_shot_sequence),
                    "total_duration": sum(
                        shot["timing"]["duration"] for shot in enhanced_shot_sequence
                    ),
                    "shot_type_distribution": self._analyze_shot_type_distribution(enhanced_shot_sequence),
                    "emotion_coverage": self._analyze_emotion_coverage(enhanced_shot_sequence),
                    "cinematic_consistency": self._analyze_cinematic_consistency(enhanced_shot_sequence),
                },
                "recommendations": self._generate_sequence_recommendations(enhanced_shot_sequence),
                "export_timestamp": datetime.now().isoformat(),
            }
            
            return response
            
        except Exception as e:
            return {"error": f"Failed to get shot sequence for job {job_id}: {str(e)}"}
    
    def get_job_emotion_analysis(self, job_id: str, processing_jobs: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Return detailed emotion analysis for completed jobs with segment-by-segment breakdown"""
        try:
            # Check if job exists
            if job_id not in processing_jobs:
                return {"error": f"Job not found: {job_id}"}
            
            job = processing_jobs[job_id]
            
            # Get audio path from job
            audio_path = job.get("audio_path")
            if not audio_path:
                return {"error": f"No audio path found for job: {job_id}"}
            
            # Get emotion analysis data
            emotion_data = None
            
            # First, try to get from job result if completed
            if job.get("status") == "completed" and "result" in job:
                result = job["result"]
                if isinstance(result, dict) and "metadata" in result:
                    emotion_data = result.get("metadata", {}).get("emotion_analysis")
            
            # If not in job result, perform fresh analysis
            if not emotion_data:
                try:
                    emotion_data = self.orchestrator.emotion_analyzer.analyze_audio(audio_path)
                except Exception as e:
                    return {"error": f"Failed to analyze emotions: {str(e)}"}
            
            if not emotion_data:
                return {"error": f"No emotion analysis available for job: {job_id}"}
            
            # Enhance emotion segments with transition analysis
            emotion_segments = emotion_data.get("emotion_segments", [])
            enhanced_segments = []
            
            for i, segment in enumerate(emotion_segments):
                # Calculate transition from previous segment
                transition_analysis = None
                if i > 0:
                    prev_segment = emotion_segments[i - 1]
                    transition_analysis = self._analyze_emotion_transition(prev_segment, segment)
                
                enhanced_segment = {
                    **segment,
                    "segment_index": i,
                    "timing_analysis": {
                        "start_time": segment.get("start_time", 0.0),
                        "end_time": segment.get("end_time", 0.0),
                        "duration": segment.get("end_time", 0.0) - segment.get("start_time", 0.0),
                        "position_in_audio": i / len(emotion_segments) if emotion_segments else 0.0,
                    },
                    "emotion_breakdown": {
                        "primary_emotion": segment.get("primary_emotion", {}),
                        "secondary_emotions": segment.get("secondary_emotions", []),
                        "emotion_intensity": self._calculate_emotion_intensity(segment),
                        "emotional_clarity": self._calculate_emotional_clarity(segment),
                    },
                    "acoustic_correlation": {
                        "features": segment.get("acoustic_features", {}),
                        "correlation_strength": self._calculate_acoustic_emotion_correlation(segment),
                        "audio_quality_indicators": self._assess_audio_quality_for_emotion(segment),
                    },
                    "transition_from_previous": transition_analysis,
                    "cinematographic_implications": self._analyze_cinematographic_implications(segment),
                }
                enhanced_segments.append(enhanced_segment)
            
            # Analyze emotional transitions and patterns
            transition_patterns = self._analyze_emotional_transition_patterns(emotion_segments)
            emotional_arc = self._analyze_emotional_arc(emotion_segments)
            
            # Compile comprehensive response
            response = {
                "job_id": job_id,
                "job_context": {
                    "profile_used": job.get("profile_name"),
                    "cinematic_mode": job.get("cinematic_mode", "balanced"),
                    "processing_date": job.get("start_time"),
                    "audio_path": audio_path,
                },
                "emotion_segments": enhanced_segments,
                "overall_emotion_analysis": {
                    "dominant_emotion": self._identify_dominant_emotion(emotion_segments),
                    "emotional_diversity": self._calculate_emotional_diversity(emotion_segments),
                    "emotional_intensity_curve": self._calculate_intensity_curve(emotion_segments),
                    "valence_arousal_trajectory": self._calculate_valence_arousal_trajectory(emotion_segments),
                },
                "transition_analysis": {
                    "total_transitions": len(emotion_segments) - 1 if len(emotion_segments) > 1 else 0,
                    "transition_patterns": transition_patterns,
                    "emotional_smoothness": self._calculate_emotional_smoothness(emotion_segments),
                    "dramatic_moments": self._identify_dramatic_moments(emotion_segments),
                },
                "emotional_arc": emotional_arc,
                "segment_statistics": {
                    "total_segments": len(enhanced_segments),
                    "average_segment_duration": self._calculate_average_segment_duration(emotion_segments),
                    "emotion_distribution": self._calculate_emotion_distribution(emotion_segments),
                    "confidence_statistics": self._calculate_confidence_statistics(emotion_segments),
                },
                "analysis_metadata": {
                    "analysis_timestamp": datetime.now().isoformat(),
                    "analyzer_version": "1.0.0",
                    "audio_duration": emotion_data.get("metadata", {}).get("duration", 0.0),
                    "sample_rate": emotion_data.get("metadata", {}).get("sample_rate", 16000),
                },
            }
            
            return response
            
        except Exception as e:
            return {"error": f"Failed to get emotion analysis for job {job_id}: {str(e)}"}
    
    def start_batch_processing(self, batch_data: Dict[str, Any]) -> Dict[str, Any]:
        """Support multiple file processing with queue management and prioritization"""
        try:
            # Extract required parameters
            audio_files = batch_data.get("audio_files", [])
            if not audio_files:
                return {"error": "audio_files list is required"}
            
            batch_options = batch_data.get("options", {})
            profile_name = batch_options.get("profile_name", "character_1")
            cinematic_mode = batch_options.get("cinematic_mode", "balanced")
            priority = batch_options.get("priority", "normal")
            
            # Generate batch ID
            batch_id = str(uuid.uuid4())
            
            # Create batch tracking structure
            batch_info = {
                "batch_id": batch_id,
                "total_files": len(audio_files),
                "status": "queued",
                "created_at": datetime.now().isoformat(),
                "options": batch_options,
                "jobs": [],
            }
            
            # Create individual jobs for each audio file
            for i, audio_file in enumerate(audio_files):
                job_id = f"{batch_id}_job_{i+1}"
                
                job_data = {
                    "job_id": job_id,
                    "batch_id": batch_id,
                    "audio_path": audio_file,
                    "profile_name": profile_name,
                    "cinematic_mode": cinematic_mode,
                    "status": "queued",
                    "created_at": datetime.now().isoformat(),
                    "priority": priority,
                    "queue_position": i + 1,
                }
                
                batch_info["jobs"].append(job_data)
            
            return {
                "message": f"Batch processing started for {len(audio_files)} files",
                "batch_id": batch_id,
                "batch_info": batch_info,
                "total_jobs": len(audio_files),
                "estimated_completion_time": len(audio_files) * 60,  # 60 seconds per file estimate
            }
            
        except Exception as e:
            return {"error": f"Failed to start batch processing: {str(e)}"}
    
    def _generate_alternative_shots(self, shot: Dict[str, Any], primary_emotion: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alternative shot suggestions"""
        alternatives = []
        current_shot = shot.get("angle", "MCU")
        emotion = primary_emotion.get("name", "neutral")
        
        # Simple alternative suggestions based on current shot and emotion
        if current_shot == "MCU":
            alternatives.extend([
                {"shot": "CU", "reason": "More intimate for emotional content", "confidence": 0.7},
                {"shot": "MS", "reason": "More context for emotional content", "confidence": 0.6},
            ])
        
        return alternatives
    
    def _calculate_shot_decision_confidence(self, shot: Dict[str, Any], emotion_segment: Dict[str, Any]) -> float:
        """Calculate decision confidence for shot selection"""
        base_confidence = shot.get("confidence", 0.8)
        emotion_confidence = emotion_segment.get("primary_emotion", {}).get("confidence", 0.5)
        
        # Weighted average
        return (base_confidence * 0.6) + (emotion_confidence * 0.4)
    
    def _generate_shot_reasoning(self, shot: Dict[str, Any], primary_emotion: Dict[str, Any]) -> str:
        """Generate reasoning for shot selection"""
        emotion = primary_emotion.get("name", "neutral")
        shot_type = shot.get("angle", "MCU")
        
        reasoning_map = {
            ("joy", "CU"): "Close-up emphasizes facial expression and emotional connection",
            ("anger", "ECU"): "Extreme close-up intensifies the anger and creates tension",
            ("sadness", "MS"): "Medium shot provides emotional distance while showing context",
        }
        
        return reasoning_map.get((emotion, shot_type), f"Standard {shot_type} for {emotion} emotion")
    
    def _extract_decision_factors(self, shot: Dict[str, Any]) -> List[str]:
        """Extract decision factors from shot"""
        factors = []
        
        if "emotion" in shot.get("reasoning", "").lower():
            factors.append("emotional_content")
        if "tension" in shot.get("reasoning", "").lower():
            factors.append("tension_level")
        if "grammar" in shot.get("reasoning", "").lower():
            factors.append("film_grammar")
        
        return factors or ["default_selection"]
    
    def _get_applied_rules(self, shot: Dict[str, Any]) -> List[str]:
        """Get applied cinematographic rules"""
        return shot.get("applied_rules", ["emotion_mapping", "grammar_rules"])
    
    def _analyze_shot_type_distribution(self, shot_sequence: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze distribution of shot types"""
        distribution = {}
        for shot in shot_sequence:
            shot_type = shot.get("technical_specs", {}).get("shot_type", "MCU")
            distribution[shot_type] = distribution.get(shot_type, 0) + 1
        
        return distribution
    
    def _analyze_emotion_coverage(self, shot_sequence: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze emotion coverage in shot sequence"""
        emotions = []
        for shot in shot_sequence:
            emotion = shot.get("emotion_context", {}).get("primary_emotion", "neutral")
            emotions.append(emotion)
        
        unique_emotions = set(emotions)
        
        return {
            "total_emotions": len(unique_emotions),
            "emotions_covered": list(unique_emotions),
            "dominant_emotion": max(set(emotions), key=emotions.count) if emotions else "neutral",
        }
    
    def _analyze_cinematic_consistency(self, shot_sequence: List[Dict[str, Any]]) -> Dict[str, float]:
        """Analyze cinematic consistency"""
        # Simplified consistency analysis
        angles = [shot.get("technical_specs", {}).get("shot_type", "MCU") for shot in shot_sequence]
        
        # Calculate angle changes
        angle_changes = sum(1 for i in range(1, len(angles)) if angles[i] != angles[i-1])
        
        return {
            "angle_consistency": 1.0 - (angle_changes / len(angles)) if angles else 1.0,
            "temporal_consistency": 0.8,  # Placeholder
            "overall_consistency": 0.85,  # Placeholder
        }
    
    def _generate_sequence_recommendations(self, shot_sequence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate recommendations for shot sequence improvement"""
        recommendations = []
        
        # Check for repetitive shots
        shot_types = [shot.get("technical_specs", {}).get("shot_type") for shot in shot_sequence]
        if len(set(shot_types)) < 3:
            recommendations.append({
                "type": "variety",
                "message": "Consider adding more shot variety for visual interest",
                "priority": "medium",
            })
        
        return recommendations
    
    def _analyze_emotion_transition(self, prev_segment: Dict[str, Any], curr_segment: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze transition between emotion segments"""
        prev_emotion = prev_segment.get("primary_emotion", {}).get("name", "neutral")
        curr_emotion = curr_segment.get("primary_emotion", {}).get("name", "neutral")
        
        transition_types = {
            ("joy", "sadness"): "dramatic_fall",
            ("sadness", "joy"): "uplifting_rise",
            ("anger", "fear"): "fearful_escape",
        }
        
        transition_type = transition_types.get((prev_emotion, curr_emotion), "standard")
        
        return {
            "from_emotion": prev_emotion,
            "to_emotion": curr_emotion,
            "transition_type": transition_type,
            "dramatic_level": "high" if transition_type != "standard" else "low",
        }
    
    def _calculate_emotion_intensity(self, segment: Dict[str, Any]) -> float:
        """Calculate emotion intensity for segment"""
        primary_emotion = segment.get("primary_emotion", {})
        confidence = primary_emotion.get("confidence", 0.0)
        arousal = primary_emotion.get("arousal", 0.0)
        
        return (confidence + arousal) / 2
    
    def _calculate_emotional_clarity(self, segment: Dict[str, Any]) -> float:
        """Calculate emotional clarity for segment"""
        primary_emotion = segment.get("primary_emotion", {})
        secondary_emotions = segment.get("secondary_emotions", [])
        
        # Higher clarity when primary emotion dominates over secondary emotions
        primary_confidence = primary_emotion.get("confidence", 0.0)
        secondary_confidence = sum(e.get("confidence", 0.0) for e in secondary_emotions) if secondary_emotions else 0.0
        
        return primary_confidence - (secondary_confidence / len(secondary_emotions) if secondary_emotions else 0.0)
    
    def _calculate_acoustic_emotion_correlation(self, segment: Dict[str, Any]) -> float:
        """Calculate correlation between acoustic features and emotion"""
        # Simplified correlation calculation
        return 0.75  # Placeholder
    
    def _assess_audio_quality_for_emotion(self, segment: Dict[str, Any]) -> Dict[str, float]:
        """Assess audio quality for emotion detection"""
        acoustic_features = segment.get("acoustic_features", {})
        
        return {
            "signal_quality": acoustic_features.get("snr", 0.0) / 100.0,  # Normalize
            "clarity": 0.8,  # Placeholder
            "noise_level": 0.2,  # Placeholder
        }
    
    def _analyze_cinematographic_implications(self, segment: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze cinematographic implications of emotion segment"""
        emotion = segment.get("primary_emotion", {}).get("name", "neutral")
        
        implications = {
            "joy": {"suggested_shots": ["CU", "MCU"], "movement": "smooth", "lighting": "bright"},
            "anger": {"suggested_shots": ["ECU", "low_angle"], "movement": "handheld", "lighting": "contrast"},
            "sadness": {"suggested_shots": ["MS", "high_angle"], "movement": "slow", "lighting": "soft"},
        }
        
        return implications.get(emotion, {"suggested_shots": ["MCU"], "movement": "stable", "lighting": "neutral"})
    
    def _analyze_emotional_transition_patterns(self, emotion_segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in emotional transitions"""
        transitions = []
        for i in range(1, len(emotion_segments)):
            prev_emotion = emotion_segments[i-1].get("primary_emotion", {}).get("name", "neutral")
            curr_emotion = emotion_segments[i].get("primary_emotion", {}).get("name", "neutral")
            transitions.append((prev_emotion, curr_emotion))
        
        # Count transition patterns
        transition_counts = {}
        for transition in transitions:
            transition_counts[transition] = transition_counts.get(transition, 0) + 1
        
        return {
            "total_transitions": len(transitions),
            "unique_patterns": len(transition_counts),
            "most_common": max(transition_counts, key=transition_counts.get) if transition_counts else None,
        }
    
    def _analyze_emotional_arc(self, emotion_segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze overall emotional arc"""
        emotions = [segment.get("primary_emotion", {}).get("name", "neutral") for segment in emotion_segments]
        
        # Simple arc analysis
        positive_emotions = ["joy", "trust", "anticipation"]
        negative_emotions = ["sadness", "anger", "fear", "disgust", "surprise"]
        
        positive_count = sum(1 for e in emotions if e in positive_emotions)
        negative_count = sum(1 for e in emotions if e in negative_emotions)
        
        arc_type = "positive" if positive_count > negative_count else "negative" if negative_count > positive_count else "neutral"
        
        return {
            "arc_type": arc_type,
            "positive_ratio": positive_count / len(emotions) if emotions else 0.0,
            "negative_ratio": negative_count / len(emotions) if emotions else 0.0,
            "emotional_complexity": len(set(emotions)),
        }
    
    def _identify_dominant_emotion(self, emotion_segments: List[Dict[str, Any]]) -> str:
        """Identify dominant emotion across segments"""
        emotions = [segment.get("primary_emotion", {}).get("name", "neutral") for segment in emotion_segments]
        
        if not emotions:
            return "neutral"
        
        return max(set(emotions), key=emotions.count)
    
    def _calculate_emotional_diversity(self, emotion_segments: List[Dict[str, Any]]) -> float:
        """Calculate emotional diversity (entropy)"""
        emotions = [segment.get("primary_emotion", {}).get("name", "neutral") for segment in emotion_segments]
        
        if not emotions:
            return 0.0
        
        # Calculate entropy
        unique_emotions = set(emotions)
        total_segments = len(emotions)
        
        entropy = 0.0
        for emotion in unique_emotions:
            probability = emotions.count(emotion) / total_segments
            if probability > 0:
                entropy -= probability * (probability ** 0.5)  # Simplified entropy
        
        return entropy
    
    def _calculate_intensity_curve(self, emotion_segments: List[Dict[str, Any]]) -> List[float]:
        """Calculate emotional intensity curve over time"""
        return [
            self._calculate_emotion_intensity(segment) 
            for segment in emotion_segments
        ]
    
    def _calculate_valence_arousal_trajectory(self, emotion_segments: List[Dict[str, Any]]) -> Dict[str, List[float]]:
        """Calculate valence-arousal trajectory"""
        valence_values = []
        arousal_values = []
        
        for segment in emotion_segments:
            primary_emotion = segment.get("primary_emotion", {})
            valence_values.append(primary_emotion.get("valence", 0.0))
            arousal_values.append(primary_emotion.get("arousal", 0.0))
        
        return {
            "valence": valence_values,
            "arousal": arousal_values,
        }
    
    def _calculate_emotional_smoothness(self, emotion_segments: List[Dict[str, Any]]) -> float:
        """Calculate emotional smoothness across segments"""
        if len(emotion_segments) < 2:
            return 1.0
        
        intensity_changes = []
        for i in range(1, len(emotion_segments)):
            prev_intensity = self._calculate_emotion_intensity(emotion_segments[i-1])
            curr_intensity = self._calculate_emotion_intensity(emotion_segments[i])
            intensity_changes.append(abs(prev_intensity - curr_intensity))
        
        # Lower average change = smoother transitions
        avg_change = sum(intensity_changes) / len(intensity_changes) if intensity_changes else 0.0
        smoothness = 1.0 - min(avg_change, 1.0)  # Normalize to 0-1
        
        return smoothness
    
    def _identify_dramatic_moments(self, emotion_segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify dramatic moments in emotion segments"""
        dramatic_moments = []
        
        for i, segment in enumerate(emotion_segments):
            intensity = self._calculate_emotion_intensity(segment)
            emotion = segment.get("primary_emotion", {}).get("name", "neutral")
            
            # High intensity emotions are dramatic
            if intensity > 0.8:
                dramatic_moments.append({
                    "segment_index": i,
                    "emotion": emotion,
                    "intensity": intensity,
                    "reason": "high_intensity",
                })
        
        return dramatic_moments
    
    def _calculate_average_segment_duration(self, emotion_segments: List[Dict[str, Any]]) -> float:
        """Calculate average segment duration"""
        if not emotion_segments:
            return 0.0
        
        durations = []
        for segment in emotion_segments:
            start = segment.get("start_time", 0.0)
            end = segment.get("end_time", 0.0)
            durations.append(end - start)
        
        return sum(durations) / len(durations) if durations else 0.0
    
    def _calculate_emotion_distribution(self, emotion_segments: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate emotion distribution"""
        emotions = [segment.get("primary_emotion", {}).get("name", "neutral") for segment in emotion_segments]
        
        distribution = {}
        total_segments = len(emotions)
        
        for emotion in set(emotions):
            count = emotions.count(emotion)
            distribution[emotion] = count / total_segments if total_segments > 0 else 0.0
        
        return distribution
    
    def _calculate_confidence_statistics(self, emotion_segments: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate confidence statistics"""
        confidences = [
            segment.get("primary_emotion", {}).get("confidence", 0.0) 
            for segment in emotion_segments
        ]
        
        if not confidences:
            return {"average": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0}
        
        average = sum(confidences) / len(confidences)
        min_conf = min(confidences)
        max_conf = max(confidences)
        
        # Simple standard deviation calculation
        variance = sum((c - average) ** 2 for c in confidences) / len(confidences)
        std_dev = variance ** 0.5
        
        return {
            "average": average,
            "min": min_conf,
            "max": max_conf,
            "std_dev": std_dev,
        }