"""
Legacy Video Compositor for compatibility with batch processor and older systems.
This provides the render_video method expected by the batch processor.
"""

import subprocess
import tempfile
import os
from pathlib import Path
from typing import List, Dict, Optional
import logging
import json

logger = logging.getLogger('lip_sync.compositor')

class VideoCompositor:
    """
    Legacy video compositor for basic frame sequence rendering.
    Provides render_video method for batch processor compatibility.
    """
    
    def __init__(self, config_path: str = "config/settings.json"):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.ffmpeg_path = self.config['system']['ffmpeg_path']
        self.video_config = self.config['video']
        self.temp_dir = Path(self.config['system']['temp_directory'])
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("Legacy VideoCompositor initialized")
    
    def render_video(self, frame_sequence: List[str], audio_path: str, 
                     output_path: str, background_path: str, 
                     mouth_position: tuple = (960, 540)):
        """
        Render video from frame sequence with background and mouth overlay.
        
        Args:
            frame_sequence: List of image paths for each frame
            audio_path: Path to audio file to add to video
            output_path: Output video path
            background_path: Path to background image
            mouth_position: Position (x, y) to overlay mouth images
        """
        logger.info(f"Rendering video with {len(frame_sequence)} frames")
        
        # Create temporary directory for this rendering job
        with tempfile.TemporaryDirectory(dir=self.temp_dir) as tmpdir:
            tmpdir_path = Path(tmpdir)
            
            # Create composite frames by overlaying mouth images on background
            composite_frames = self._create_composite_frames(
                frame_sequence, background_path, tmpdir_path, mouth_position
            )
            
            # Create video from composite frames
            temp_video = tmpdir_path / "temp_video_no_audio.mp4"
            self._create_video_from_frames(composite_frames, str(temp_video))
            
            # Add audio to the video
            self._add_audio_to_video(str(temp_video), audio_path, output_path)
        
        logger.info(f"Video rendered successfully: {output_path}")
        return output_path
    
    def _create_composite_frames(self, frame_sequence: List[str], background_path: str,
                                temp_dir: Path, mouth_position: tuple) -> List[str]:
        """
        Create composite frames by combining background with mouth images.
        
        Args:
            frame_sequence: List of mouth image paths
            background_path: Path to background image
            temp_dir: Temporary directory for composite frames
            mouth_position: Position to overlay mouth images
            
        Returns:
            List of paths to composite frames
        """
        composite_frames = []
        
        for i, mouth_frame_path in enumerate(frame_sequence):
            # Create composite frame using ffmpeg
            output_frame = temp_dir / f"composite_frame_{i:05d}.png"
            
            # Use ffmpeg to overlay mouth image on background
            # This uses the overlay filter
            cmd = [
                self.ffmpeg_path,
                '-i', background_path,  # Input background
                '-i', mouth_frame_path,  # Input mouth frame
                '-filter_complex', f'[0][1]overlay={mouth_position[0]}:{mouth_position[1]}',
                '-y',  # Overwrite output
                str(output_frame)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Frame composition failed: {result.stderr}")
                # If composition fails, use just the background as fallback
                output_frame = Path(background_path)  # Use background as fallback
            
            composite_frames.append(str(output_frame))
        
        return composite_frames
    
    def _create_video_from_frames(self, frame_paths: List[str], output_path: str):
        """
        Create video from image sequence using ffmpeg.
        
        Args:
            frame_paths: List of image paths
            output_path: Output video path
        """
        # Create a temporary text file with frame list for ffmpeg
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as frame_list:
            for frame_path in frame_paths:
                frame_list.write(f"file '{os.path.abspath(frame_path)}'\n")
                frame_list.write("duration 0.03333333333333333\n")  # 1/30 second for 30fps
            
            # Duplicate last frame to prevent truncation
            frame_list.write(f"file '{os.path.abspath(frame_paths[-1])}'\n")
            frame_list.flush()
            
            cmd = [
                self.ffmpeg_path,
                '-f', 'concat',
                '-safe', '0',
                '-i', frame_list.name,
                '-c:v', self.video_config['codec'],
                '-preset', self.video_config['preset'],
                '-crf', str(self.video_config['crf']),
                '-pix_fmt', self.video_config['pixel_format'],
                '-y',  # Overwrite output
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Video creation failed: {result.stderr}")
                raise RuntimeError(f"Video creation failed: {result.stderr}")
            
            # Clean up the temporary frame list file
            os.unlink(frame_list.name)
    
    def _add_audio_to_video(self, video_path: str, audio_path: str, output_path: str):
        """
        Add audio track to video.
        
        Args:
            video_path: Path to video file without audio
            audio_path: Path to audio file
            output_path: Output path for final video with audio
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
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Audio addition failed: {result.stderr}")
            raise RuntimeError(f"Audio addition failed: {result.stderr}")