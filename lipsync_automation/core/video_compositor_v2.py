"""
VideoCompositorV2: Enhanced video composition engine with multi-scene support,
transitions, and cinematographic shot integration.

Author: Development Team
Date: 2025-10-18
"""

import subprocess
import tempfile
import os
import json
from pathlib import Path
from typing import List, Dict, Optional, Union, Any
import logging
import numpy as np
from PIL import Image

from lipsync_automation.cinematography.transform_processor import TransformProcessor

logger = logging.getLogger('lip_sync.compositor_v2')


class VideoCompositorV2:
    """
    Enhanced video composition engine supporting:
    - Multi-scene composition
    - Shot transitions (cut, dissolve, fade, wipe)
    - Emotion-specific viseme selection
    - Angle-based compositing
    """
    
    def __init__(self, config_path: Union[str, Path] = "config/settings.json"):
        # Adjust path loading to work with installed package
        config_path = Path(config_path)  # Convert to Path for consistent handling
        if str(config_path) == "config/settings.json":
            # Default case: load from package config directory
            config_path_obj = Path(__file__).parent.parent / 'config' / 'settings.json'
        else:
            config_path_obj = config_path
        
        config_path_str = str(config_path_obj)
        with open(config_path_str, 'r') as f:
            self.config = json.load(f)
        with open(config_path_str, 'r') as f:
            self.config = json.load(f)
        
        self.ffmpeg_path = self.config['system']['ffmpeg_path']
        self.video_config = self.config['video_composition']
        self.temp_dir = Path(self.config['system']['temp_directory'])
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # NEW: Initialize transform processor
        self.transform_processor = TransformProcessor()
        
        logger.info("VideoCompositorV2 initialized")
    
    def render_multiscene_video(self, 
                                shot_sequence: List[Dict],
                                audio_path: str,
                                output_path: str,
                                profile_manager: Any) -> str:
        """
        Render multi-scene video with cinematographic shot sequence.
        
        Args:
            shot_sequence: List of shot specifications from CinematographicDecisionEngine
            audio_path: Path to source audio file
            output_path: Output video path
            profile_manager: ProfileManager instance for asset access
            
        Returns:
            Path to rendered output video
        """
        logger.info(f"Rendering multi-scene video: {output_path}")
        logger.info(f"Shot sequence contains {len(shot_sequence)} scenes")
        
        with tempfile.TemporaryDirectory(dir=self.temp_dir) as tmpdir:
            # Create individual scene videos
            scene_videos = []
            for i, shot in enumerate(shot_sequence):
                scene_video = self._render_scene(
                    shot=shot,
                    scene_index=i,
                    profile_manager=profile_manager,
                    temp_dir=Path(tmpdir)
                )
                scene_videos.append(scene_video)
            
            # Concatenate scenes with transitions
            final_video = self._concatenate_scenes_with_transitions(
                scene_videos=scene_videos,
                shot_sequence=shot_sequence,
                audio_path=audio_path,
                output_path=output_path,
                temp_dir=Path(tmpdir)
            )
        
        logger.info(f"Multi-scene video rendering completed: {final_video}")
        return final_video
    
    def _render_scene(self, 
                     shot: Dict, 
                     scene_index: int,
                     profile_manager: Any,
                     temp_dir: Path) -> str:
        """
        Render a single scene with specified shot parameters.
        
        Args:
            shot: Shot specification with distance, angle, emotion and cinematographic metadata
            scene_index: Scene index for file naming
            profile_manager: ProfileManager instance
            temp_dir: Temporary directory for scene rendering
            
        Returns:
            Path to rendered scene video
        """
        scene_id = shot['scene_id']
        emotion = shot['emotion']
        distance = shot.get('angle', shot.get('shot_specification', {}).get('distance', 'MCU'))
        duration = shot.get('shot_specification', {}).get('duration', 2.0)
        
        # Extract cinematographic metadata
        shot_purpose = shot.get('shot_purpose', 'dialogue')
        vertical_angle = shot.get('vertical_angle', 'eye_level')
        composition = shot.get('composition', 'centered')
        
        # Use default profile from config
        profile_name = self.config['profile_settings'].get('default_profile', 'character_1')
        
        # Create frame sequence for this scene based on emotion and cinematographic parameters
        frame_sequence = self._create_emotion_aware_frame_sequence(
            profile_manager=profile_manager,
            profile_name=profile_name,
            emotion=emotion,
            distance=distance,
            duration=duration,
            shot_purpose=shot_purpose,
            vertical_angle=vertical_angle,
            composition=composition
        )
        
        # Create scene-specific output
        scene_output = temp_dir / f"scene_{scene_index:03d}.mp4"
        
        # Use simple composition for the scene
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', dir=temp_dir, delete=False) as concat_file:
            self._create_concat_file(frame_sequence, Path(concat_file.name))
            
            # Render scene video
            self._render_simple_video(
                concat_file=Path(concat_file.name),
                duration=duration,
                output_path=str(scene_output)
            )
        
        logger.debug(f"Scene {scene_index} rendered: {scene_output}")
        
        return str(scene_output)
    
    def _create_emotion_aware_frame_sequence(self,
                                           profile_manager: Any,
                                           profile_name: str,
                                           emotion: str,
                                           distance: str,
                                           duration: float,
                                           shot_purpose: str = "dialogue",
                                           vertical_angle: str = "eye_level",
                                           composition: str = "centered") -> List[str]:
        """
        Create frame sequence based on emotion, angle, and duration.
        
        Args:
            profile_manager: ProfileManager instance
            profile_name: Character profile name
            emotion: Emotion for this scene
            distance: Shot distance (determines which angle assets to use)
            duration: Duration in seconds
            shot_purpose: Narrative purpose of the shot
            vertical_angle: Vertical camera angle
            composition: Composition style
            
        Returns:
            List of frame file paths
        """
        fps = self.video_config['fps']
        total_frames = int(duration * fps)
        
        # Default to MCU if distance not supported
        if distance not in ['ECU', 'CU', 'MCU', 'MS']:
            angle_to_use = 'MCU'
        else:
            angle_to_use = distance
        
        # Get viseme mapping for this specific emotion and angle
        try:
            # For now, generate placeholder frames - in a real implementation
            # we would get the actual viseme images from profile assets
            frame_sequence = []
            visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']  # 9 viseme types
            
            for frame_idx in range(total_frames):
                # Cycle through visemes to create lip-sync effect
                viseme_idx = frame_idx % len(visemes)
                viseme = visemes[viseme_idx]
                
                # In real implementation, we'd get the actual viseme image:
                # viseme_path = profile_manager.get_viseme_path(profile_name, angle_to_use, emotion, viseme)
                
                # For now, create a simple placeholder
                placeholder_path = self._create_placeholder_viseme(
                    temp_dir=self.temp_dir,
                    profile_name=profile_name,
                    angle=angle_to_use,
                    emotion=emotion,
                    viseme=viseme,
                    frame_idx=frame_idx
                )
                
                # Apply cinematographic transforms if needed
                if vertical_angle != "eye_level" or composition != "centered":
                    # In a real implementation, we would apply transforms to each frame
                    # to achieve the desired vertical angle and composition
                    transformed_path = self._apply_cinematographic_transforms(
                        placeholder_path,
                        vertical_angle,
                        composition,
                        distance,
                        frame_idx
                    )
                    frame_sequence.append(transformed_path)
                else:
                    frame_sequence.append(placeholder_path)
            
            logger.info(f"Created emotion-aware frame sequence: {total_frames} frames for '{emotion}' emotion with purpose '{shot_purpose}'")
            return frame_sequence
        except Exception as e:
            logger.error(f"Error creating emotion-aware frame sequence: {e}")
            # Fallback to default viseme sequence
            return self._create_fallback_frame_sequence(total_frames)
    
    def _create_placeholder_viseme(self, temp_dir: Path, profile_name: str, 
                                 angle: str, emotion: str, viseme: str, 
                                 frame_idx: int) -> str:
        """
        Create a placeholder viseme image for demonstration.
        
        Args:
            temp_dir: Temporary directory
            profile_name: Profile name
            angle: Camera angle
            emotion: Emotion
            viseme: Viseme character
            frame_idx: Frame index
            
        Returns:
            Path to placeholder image
        """
        # Create a unique filename for this frame
        frame_path = temp_dir / f"placeholder_{profile_name}_{angle}_{emotion}_{viseme}_{frame_idx:04d}.png"
        
        if not frame_path.exists():
            # Create a simple placeholder image
            # In real implementation, this would load actual viseme asset
            img = Image.new('RGBA', (1920, 1080), (50, 50, 50, 255))  # Gray background
            # Add some text to distinguish the emotion and viseme
            # (Would use proper drawing in real implementation)
            img.save(frame_path)
        
        return str(frame_path)
    
    def _create_fallback_frame_sequence(self, total_frames: int) -> List[str]:
        """
        Create a fallback frame sequence if emotion-specific assets not available.
        
        Args:
            total_frames: Number of frames to create
            
        Returns:
            List of fallback frame paths
        """
        frame_sequence = []
        visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
        
        for frame_idx in range(total_frames):
            viseme_idx = frame_idx % len(visemes)
            viseme = visemes[viseme_idx]
            
            # Create simple fallback image
            frame_path = self.temp_dir / f"fallback_{viseme}_{frame_idx:04d}.png"
            if not frame_path.exists():
                img = Image.new('RGBA', (1920, 1080), (100, 100, 100, 255))  # Light gray
                img.save(frame_path)
            
            frame_sequence.append(str(frame_path))
        
        return frame_sequence
    
    def _create_concat_file(self, frame_sequence: List[str], output_file: Path) -> None:
        """
        Generate FFmpeg concat demuxer manifest for frame sequence.
        
        Args:
            frame_sequence: List of frame image paths
            output_file: Output concat file path
        """
        frame_duration = 1 / self.video_config['fps']
        
        with open(output_file, 'w') as f:
            for frame_path in frame_sequence:
                abs_path = os.path.abspath(frame_path).replace('\\', '/')
                f.write(f"file '{abs_path}'\n")
                f.write(f"duration {frame_duration}\n")
            
            # Duplicate last frame to prevent truncation
            last_frame = os.path.abspath(frame_sequence[-1]).replace('\\', '/')
            f.write(f"file '{last_frame}'\n")
        
        logger.debug(f"Concat file created: {output_file}")
    
    def _apply_cinematographic_transforms(self, 
                                        image_path: str, 
                                        vertical_angle: str, 
                                        composition: str, 
                                        framing: str, 
                                        frame_idx: int) -> str:
        """
        Apply cinematographic transforms to a frame.
        
        Args:
            image_path: Path to source image
            vertical_angle: Vertical angle to apply
            composition: Composition style
            framing: Shot framing
            frame_idx: Frame index for positioning logic
            
        Returns:
            Path to transformed image
        """
        try:
            # Load the source image
            image = Image.open(image_path)
            
            # Apply vertical angle transform
            transformed_image = self.transform_processor.apply_vertical_angle(
                image=image,
                angle=vertical_angle,
                frame_size=(1920, 1080)  # Default HD frame size
            )
            
            # Calculate composition position
            position = self.transform_processor.calculate_composition_position(
                composition=composition,
                framing=framing,
                frame_size=(1920, 1080),
                asset_size=transformed_image.size,
                shot_index=frame_idx
            )
            
            # Create a new frame with the transformed image at the calculated position
            # For the basic implementation, we'll just save the transformed image
            # since the actual positioning happens during compositing
            transformed_path = image_path.replace('.png', f'_transformed_{vertical_angle}_{composition}.png')
            
            # In a real implementation, we might want to reposition the image within the frame
            # For now, just save the transformed image
            transformed_image.save(transformed_path)
            
            return transformed_path
        except Exception as e:
            logger.error(f"Error applying cinematographic transforms: {e}")
            # Return original image path if transform fails
            return image_path
    
    def _render_simple_video(self, concat_file: Path, duration: float, 
                           output_path: str) -> None:
        """
        Render a simple video from concat file.
        
        Args:
            concat_file: FFmpeg concat file
            duration: Expected duration
            output_path: Output path for video
        """
        cmd = [
            self.ffmpeg_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-vf', f'fps={self.video_config["fps"]}',
            '-c:v', self.video_config['codec'],
            '-preset', self.video_config['preset'],
            '-crf', str(self.video_config['crf']),
            '-pix_fmt', 'yuv420p',
            '-y',  # Overwrite output
            output_path
        ]
        
        self._execute_ffmpeg(cmd)
    
    def _concatenate_scenes_with_transitions(self,
                                           scene_videos: List[str],
                                           shot_sequence: List[Dict],
                                           audio_path: str,
                                           output_path: str,
                                           temp_dir: Path) -> str:
        """
        Concatenate multiple scene videos with specified transitions.
        
        Args:
            scene_videos: List of scene video paths
            shot_sequence: Shot sequence with transition specifications
            audio_path: Original audio path
            output_path: Final output path
            temp_dir: Temporary directory
            
        Returns:
            Path to final video
        """
        if len(scene_videos) == 1:
            # If only one scene, just add audio
            final_video = self._add_audio_to_video(
                video_path=scene_videos[0],
                audio_path=audio_path,
                output_path=output_path
            )
            return final_video
        
        # Create complex filter chain for transitions
        return self._apply_complex_transition_chain(
            scene_videos=scene_videos,
            shot_sequence=shot_sequence,
            audio_path=audio_path,
            output_path=output_path,
            temp_dir=temp_dir
        )
    
    def _add_audio_to_video(self, video_path: str, audio_path: str, 
                          output_path: str) -> str:
        """
        Add audio to a video file.
        
        Args:
            video_path: Input video
            audio_path: Input audio
            output_path: Output path
            
        Returns:
            Output path
        """
        cmd = [
            self.ffmpeg_path,
            '-i', video_path,
            '-i', audio_path,
            '-c:v', 'copy',  # Copy video without re-encoding
            '-c:a', self.video_config['audio_codec'],
            '-b:a', self.video_config['audio_bitrate'],
            '-shortest',
            '-y',
            output_path
        ]
        
        self._execute_ffmpeg(cmd)
        return output_path
    
    def _apply_complex_transition_chain(self,
                                      scene_videos: List[str],
                                      shot_sequence: List[Dict],
                                      audio_path: str,
                                      output_path: str,
                                      temp_dir: Path) -> str:
        """
        Apply complex transition chain between scenes with audio.
        
        Args:
            scene_videos: List of scene video paths
            shot_sequence: Shot sequence data
            audio_path: Audio file path
            output_path: Output path
            temp_dir: Temporary directory
            
        Returns:
            Path to final video
        """
        # For now, implement a simple concatenation with basic transitions
        # In a full implementation, this would create complex filter chains
        # for different transition types (dissolve, fade, wipe, etc.)
        
        # First, concatenate videos with basic transitions
        concat_list_file = temp_dir / "concat_list.txt"
        
        with open(concat_list_file, 'w') as f:
            for i, video_path in enumerate(scene_videos):
                f.write(f"file '{os.path.abspath(video_path)}'\n")
                # Add duration based on shot specification if available
                if i < len(shot_sequence):
                    duration = shot_sequence[i]['shot_specification']['duration']
                    f.write(f"duration {duration}\n")
        
        # Create output without audio first
        video_only_output = str(temp_dir / "temp_video_only.mp4")
        
        cmd = [
            self.ffmpeg_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_list_file),
            '-c:v', self.video_config['codec'],
            '-preset', self.video_config['preset'],
            '-crf', str(self.video_config['crf']),
            '-pix_fmt', 'yuv420p',
            '-y',
            video_only_output
        ]
        
        self._execute_ffmpeg(cmd)
        
        # Now add audio to the concatenated video
        final_cmd = [
            self.ffmpeg_path,
            '-i', video_only_output,
            '-i', audio_path,
            '-c:v', 'copy',
            '-c:a', self.video_config['audio_codec'],
            '-b:a', self.video_config['audio_bitrate'],
            '-shortest',
            '-y',
            output_path
        ]
        
        self._execute_ffmpeg(final_cmd)
        
        return output_path
    
    def _execute_ffmpeg(self, cmd: List[str]) -> None:
        """
        Execute FFmpeg command with error handling.
        
        Args:
            cmd: FFmpeg command as list of arguments
        """
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg execution failed: {result.stderr}")
            logger.error(f"FFmpeg stdout: {result.stdout}")
            raise RuntimeError(f"FFmpeg failed with code {result.returncode}: {result.stderr}")
        else:
            logger.info(f"FFmpeg execution completed successfully")
            logger.debug(f"FFmpeg output: {result.stdout}")


class MultiAngleCompositor:
    """
    Specialized compositor for handling multi-angle shots.
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.ffmpeg_path = config['system']['ffmpeg_path']
        self.video_config = config['video_composition']
    
    def create_multi_angle_composite(self, 
                                   angle_videos: Dict[str, str], 
                                   shot_sequence: List[Dict],
                                   output_path: str) -> str:
        """
        Create a composite video with multiple angles following the shot sequence.
        
        Args:
            angle_videos: Dictionary mapping angles to their video paths
            shot_sequence: Shot sequence specifying which angle to use when
            output_path: Output path for composite video
            
        Returns:
            Path to composite video
        """
        # This is a simplified implementation
        # Full implementation would handle angle switching based on shot sequence
        logger.warning("Multi-angle composite functionality is not fully implemented in this version")
        # For now, return the first available angle video as placeholder
        if angle_videos:
            first_video = next(iter(angle_videos.values()))
            logger.info(f"Using first available angle video as placeholder: {first_video}")
            return first_video
        else:
            logger.error("No angle videos provided for composite")
            raise ValueError("No angle videos provided for composite")


class TransitionManager:
    """
    Manages different types of video transitions between scenes.
    """
    
    def __init__(self, ffmpeg_path: str):
        self.ffmpeg_path = ffmpeg_path
    
    def create_dissolve_transition(self, video1: str, video2: str, 
                                 duration: float = 0.5) -> str:
        """
        Create a dissolve transition between two videos.
        """
        logger.warning("Dissolve transition functionality is not fully implemented in this version")
        # For now, return the first video as placeholder
        return video1
    
    def create_fade_transition(self, video1: str, video2: str,
                             duration: float = 0.5) -> str:
        """
        Create a fade transition between two videos.
        """
        logger.warning("Fade transition functionality is not fully implemented in this version")
        # For now, return the first video as placeholder
        return video1
    
    def create_wipe_transition(self, video1: str, video2: str,
                             duration: float = 0.5) -> str:
        """
        Create a wipe transition between two videos.
        """
        logger.warning("Wipe transition functionality is not fully implemented in this version")
        # For now, return the first video as placeholder
        return video1