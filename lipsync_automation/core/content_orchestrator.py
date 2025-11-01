"""
ContentOrchestrator - Master orchestrator for LipSyncAutomation v2.0
Coordinates all major systems: emotion analysis, cinematography decisions, and video composition
"""
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict

from lipsync_automation.utils.audio_processor import AudioProcessor
from lipsync_automation.utils.cache_manager import CacheManager

from lipsync_automation.core.profile_manager import ProfileManager
from lipsync_automation.core.emotion_analyzer import EmotionAnalyzer
from lipsync_automation.cinematography.decision_engine import DecisionEngine
from lipsync_automation.cinematography.shot_purpose_selector import ShotPurposeSelector
from lipsync_automation.cinematography.transform_processor import TransformProcessor
from lipsync_automation.core.video_compositor_v2 import VideoCompositorV2


@dataclass
class GenerationResult:
    """Result of content generation"""
    video_path: str
    metadata: Dict[str, Any]
    profile_info: Dict[str, Any]
    processing_log: Dict[str, Any]


class ContentOrchestrator:
    """Master orchestrator for LipSyncAutomation v2.0"""
    
    def __init__(self, settings: Dict[str, Any]):
        self.settings = settings
        self.logger = logging.getLogger(__name__)
        
        # Initialize core systems with config
        self.profile_manager = ProfileManager(config=settings)
        self.emotion_analyzer = EmotionAnalyzer(config=settings)
        self.decision_engine = DecisionEngine(config=settings)
        # VideoCompositorV2 expects config_path, so we'll pass a config instead of settings
        # We can work around this by creating a temp config or using default
        self.compositor = VideoCompositorV2(config_path="config/settings.json")
        self.audio_processor = AudioProcessor(config=settings)
        self.cache_manager = CacheManager(cache_dir=settings.get("cache_dir", "cache"))
        
        # NEW: Add cinematographic enhancement components
        self.shot_purpose_selector = ShotPurposeSelector()
        self.transform_processor = TransformProcessor()
        
        # Load configuration
        self.profile_path = settings.get("profile_path", "profiles/default.json")
        self.enable_cache = settings.get("enable_cache", True)
        self.cache_dir = settings.get("cache_dir", "cache")
        
    def generate_content(
        self, 
        audio_path: str, 
        profile_name: str,
        output_path: Optional[str] = None,
        cinematic_mode: str = "balanced"  # "emotional", "tension", "balanced"
    ) -> GenerationResult:
        """
        Generate animated content from audio using cinematographic principles
        
        Args:
            audio_path: Path to input audio file
            profile_name: Name of character profile to use
            output_path: Optional output path (auto-generated if not provided)
            cinematic_mode: How to balance emotion vs tension in decisions
            
        Returns:
            GenerationResult with video path and metadata
        """
        self.logger.info(f"Starting content generation for {audio_path} with profile {profile_name}")
        
        processing_log = {
            "start_time": self._get_timestamp(),
            "stages": {}
        }
        
        try:
            # 1. Load character profile
            self.logger.info("Loading character profile...")
            profile = self.profile_manager.load_profile(profile_name)
            processing_log["stages"]["profile_load"] = self._get_timestamp()
            
            # 2. Process audio (extract features, detect segments)
            self.logger.info("Processing audio...")
            audio_features = self.audio_processor.extract_audio_features(audio_path)
            audio_segments = self.audio_processor.segment_audio_file(audio_path)
            processing_log["stages"]["audio_processing"] = self._get_timestamp()
            
            # 3. Analyze emotions from audio
            self.logger.info("Analyzing emotions...")
            if self.enable_cache:
                emotions = self.cache_manager.get_cached_phoneme_data(audio_path)
                if emotions is None:
                    emotions = self.emotion_analyzer.analyze_audio(audio_path)
                    # Save as phoneme data even though it's emotion analysis
                    # In a real implementation, we'd have a proper data structure
                    self.cache_manager.save_phoneme_data(audio_path, emotions)
            else:
                emotions = self.emotion_analyzer.analyze_audio(audio_path)
            processing_log["stages"]["emotion_analysis"] = self._get_timestamp()
            
            # 4. Generate cinematographic decisions
            self.logger.info("Generating cinematographic decisions...")
            cinematographic_decisions = self.decision_engine.generate_shot_sequence(emotions)
            processing_log["stages"]["cinematography_decisions"] = self._get_timestamp()
            
            # 5. Add cinematographic enhancement with shot purpose selection
            self.logger.info("Applying cinematographic enhancements...")
            frame_sequences = self._build_frame_sequences(
                shot_sequence=cinematographic_decisions,
                emotions=emotions,
                cinematic_mode=cinematic_mode
            )
            processing_log["stages"]["cinematography_enhancement"] = self._get_timestamp()
            
            # 6. Compose final video
            self.logger.info("Composing final video...")
            if output_path is None:
                output_filename = f"generated_{Path(audio_path).stem}_{profile_name}.mp4"
                output_path = str(Path("output") / output_filename)
            
            video_path = self.compositor.render_multiscene_video(
                shot_sequence=frame_sequences,  # Using enhanced frame sequences
                audio_path=audio_path,
                output_path=output_path,
                profile_manager=self.profile_manager
            )
            processing_log["stages"]["video_composition"] = self._get_timestamp()
            
            # 6. Create metadata
            metadata = {
                "audio_path": audio_path,
                "profile_name": profile_name,
                "cinematic_mode": cinematic_mode,
                "emotion_analysis": emotions,
                "decisions_made": len(cinematographic_decisions),
                "video_path": video_path
            }
            
            # Convert profile to dict - profile might be a dict already
            try:
                # If it's a dataclass, use asdict
                from dataclasses import asdict, is_dataclass
                if is_dataclass(profile):
                    profile_info = asdict(profile)
                else:
                    # If it's already a dict or other type, use it as is
                    profile_info = profile
            except:
                # If it's already a dict or other type, use it as is
                profile_info = profile
                
            result = GenerationResult(
                video_path=video_path,
                metadata=metadata,
                profile_info=profile_info,
                processing_log=processing_log
            )
            
            self.logger.info(f"Content generation completed: {video_path}")
            return result
            
        except Exception as e:
            self.logger.error(f"Content generation failed: {str(e)}")
            raise
    
    def _build_frame_sequences(self, shot_sequence: Any, emotions: Any, cinematic_mode: str = "balanced") -> list:
        """
        Build enhanced frame sequences with cinematographic metadata.
        
        Args:
            shot_sequence: Original shot sequence from decision engine
            emotions: Emotion analysis results
            cinematic_mode: How to balance emotion vs tension in decisions
            
        Returns:
            Enhanced frame sequences with cinematographic metadata
        """
        frame_sequences = []
        
        # Get narrative phase and tension score for context
        narrative_phase = "setup"  # This would come from tension engine in full implementation
        tension_score = 0.5  # This would come from tension engine in full implementation
        
        for i, shot in enumerate(shot_sequence):
            # NEW: Select shot purpose
            # emotions is a dictionary with 'emotion_segments' key, not a list
            emotion_segments = emotions.get('emotion_segments', [])
            emotion_segment = emotion_segments[i] if i < len(emotion_segments) else emotion_segments[0] if emotion_segments else {}
            shot_purpose_spec = self.shot_purpose_selector.select_purpose(
                emotion_segment=emotion_segment,
                segment_index=i,
                total_segments=len(shot_sequence),
                narrative_phase=narrative_phase,
                tension_score=tension_score
            )
            
            # NEW: Determine vertical angle
            vertical_angle = self.transform_processor.get_vertical_angle_for_emotion(
                emotion=shot.get('emotion', 'neutral'),
                base_angle=shot_purpose_spec['vertical_angle']
            )
            
            # Add cinematographic metadata to frame sequence, preserving original structure for compatibility
            frame_sequences.append({
                'scene_id': shot.get('scene_id', f'scene_{i}'),
                'emotion': shot.get('emotion', 'neutral'),
                'angle': shot.get('angle', 'MCU'),
                'viseme_sequence': shot.get('viseme_sequence', []),
                # Preserve the shot_specification for video compositor compatibility
                'shot_specification': shot.get('shot_specification', {
                    'distance': shot.get('angle', 'MCU'),  # Map angle to distance for compatibility
                    'angle': shot.get('vertical_angle', 'eye_level'),
                    'duration': shot.get('duration', 1.0)  # Default duration
                }),
                # NEW cinematographic enhancements
                'shot_purpose': shot_purpose_spec['purpose'],
                'vertical_angle': vertical_angle,
                'composition': shot_purpose_spec['composition'],
                'duration_modifier': shot_purpose_spec['duration_modifier'],
                'confidence': shot_purpose_spec['confidence']
            })
        
        return frame_sequences
    
    def generate_batch(
        self, 
        audio_files: list, 
        profile_name: str,
        cinematic_mode: str = "balanced"
    ) -> list:
        """Generate content for multiple audio files"""
        results = []
        for audio_path in audio_files:
            try:
                result = self.generate_content(
                    audio_path=audio_path,
                    profile_name=profile_name,
                    cinematic_mode=cinematic_mode
                )
                results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to process {audio_path}: {str(e)}")
                continue
        return results
    
    def _get_timestamp(self) -> str:
        """Get current timestamp as string"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def validate_profile(self, profile_name: str) -> Tuple[bool, str]:
        """Validate that a profile is compatible with cinematic generation"""
        try:
            # Use ProfileManager's built-in validation method
            validation_result = self.profile_manager.validate_profile(profile_name)
            
            if validation_result['valid']:
                return True, "Profile is valid"
            else:
                errors = validation_result.get('errors', [])
                warnings = validation_result.get('warnings', [])
                all_issues = errors + warnings
                
                if all_issues:
                    message = f"Profile validation failed: {'; '.join(all_issues)}"
                else:
                    message = "Profile validation failed"
                
                return False, message
        except Exception as e:
            return False, f"Error validating profile: {str(e)}"