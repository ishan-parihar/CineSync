"""
ContentOrchestrator - Master orchestrator for LipSyncAutomation v2.0
Coordinates all major systems: emotion analysis, cinematography decisions, and video composition
"""
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict

from .profile_manager import ProfileManager
from .emotion_analyzer import EmotionAnalyzer
from .cinematography.decision_engine import DecisionEngine
from .video_compositor_v2 import VideoCompositorV2
from ..utils.audio_processor import AudioProcessor
from ..utils.cache_manager import CacheManager


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
        
        # Initialize core systems
        self.profile_manager = ProfileManager()
        self.emotion_analyzer = EmotionAnalyzer()
        self.decision_engine = DecisionEngine()
        self.compositor = VideoCompositorV2()
        self.audio_processor = AudioProcessor()
        self.cache_manager = CacheManager()
        
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
            audio_features = self.audio_processor.extract_features(audio_path)
            audio_segments = self.audio_processor.segment_audio(audio_path)
            processing_log["stages"]["audio_processing"] = self._get_timestamp()
            
            # 3. Analyze emotions from audio
            self.logger.info("Analyzing emotions...")
            if self.enable_cache:
                cache_key = f"emotion_{Path(audio_path).stem}_{profile_name}"
                emotions = self.cache_manager.get(cache_key)
                if emotions is None:
                    emotions = self.emotion_analyzer.analyze_emotions(audio_path, profile)
                    self.cache_manager.set(cache_key, emotions)
            else:
                emotions = self.emotion_analyzer.analyze_emotions(audio_path, profile)
            processing_log["stages"]["emotion_analysis"] = self._get_timestamp()
            
            # 4. Generate cinematographic decisions
            self.logger.info("Generating cinematographic decisions...")
            cinematographic_decisions = self.decision_engine.generate_decisions(
                emotions, 
                audio_segments, 
                profile,
                cinematic_mode=cinematic_mode
            )
            processing_log["stages"]["cinematography_decisions"] = self._get_timestamp()
            
            # 5. Compose final video
            self.logger.info("Composing final video...")
            if output_path is None:
                output_filename = f"generated_{Path(audio_path).stem}_{profile_name}.mp4"
                output_path = str(Path("output") / output_filename)
            
            video_path = self.compositor.compose_video(
                audio_path=audio_path,
                profile=profile,
                cinematographic_decisions=cinematographic_decisions,
                output_path=output_path
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
            
            result = GenerationResult(
                video_path=video_path,
                metadata=metadata,
                profile_info=asdict(profile),
                processing_log=processing_log
            )
            
            self.logger.info(f"Content generation completed: {video_path}")
            return result
            
        except Exception as e:
            self.logger.error(f"Content generation failed: {str(e)}")
            raise
    
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
            profile = self.profile_manager.load_profile(profile_name)
            issues = []
            
            # Check required fields
            if not profile.mouth_shapes:
                issues.append("No mouth shapes defined")
            if not profile.angles:
                issues.append("No angles defined")
            if not profile.emotion_mappings:
                issues.append("No emotion mappings defined")
            
            # Check that all required assets exist
            for angle_name, angle_data in profile.angles.items():
                for asset_path in angle_data.get("assets", []):
                    if not Path(asset_path).exists():
                        issues.append(f"Missing asset: {asset_path}")
            
            is_valid = len(issues) == 0
            message = "Profile is valid" if is_valid else f"Profile validation failed: {'; '.join(issues)}"
            return is_valid, message
            
        except Exception as e:
            return False, f"Error validating profile: {str(e)}"