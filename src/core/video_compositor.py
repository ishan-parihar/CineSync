import subprocess
import tempfile
import os
import json
from pathlib import Path
from typing import List, Dict, Optional
import logging

logger = logging.getLogger('lip_sync.compositor')


class VideoCompositor:
    """Handles FFmpeg video composition and rendering"""
    
    def __init__(self, config_path: str = "config/settings.json"):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.ffmpeg_path = self.config['system']['ffmpeg_path']
        self.video_config = self.config['video']
        self.temp_dir = Path(self.config['system']['temp_directory'])
        
        logger.info("VideoCompositor initialized")
    
    def render_video(self, frame_sequence: List[str], audio_path: str, 
                    output_path: str, background_path: Optional[str] = None,
                    mouth_position: Optional[Dict] = None) -> str:
        """Compile frames and audio into final video"""
        logger.info(f"Rendering video: {output_path}")
        logger.info(f"Total frames: {len(frame_sequence)}, Background: {background_path is not None}")
        
        with tempfile.TemporaryDirectory(dir=self.temp_dir) as tmpdir:
            # Create concat demuxer file
            concat_file = Path(tmpdir) / 'frames.txt'
            self._create_concat_file(frame_sequence, concat_file)
            
            if background_path:
                return self._render_with_background(
                    concat_file, audio_path, background_path, 
                    output_path, mouth_position
                )
            else:
                return self._render_simple(concat_file, audio_path, output_path)
    
    def _create_concat_file(self, frame_sequence: List[str], output_file: Path):
        """Generate FFmpeg concat demuxer manifest"""
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
    
    def _render_simple(self, concat_file: Path, audio_path: str, output_path: str) -> str:
        """Render video without background overlay"""
        cmd = [
            self.ffmpeg_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-i', audio_path,
            '-c:v', self.video_config['codec'],
            '-preset', self.video_config['preset'],
            '-crf', str(self.video_config['crf']),
            '-pix_fmt', self.video_config['pixel_format'],
            '-c:a', self.video_config['audio_codec'],
            '-b:a', self.video_config['audio_bitrate'],
            '-shortest',
            '-y',
            output_path
        ]
        
        self._execute_ffmpeg(cmd)
        return output_path
    
    def _render_with_background(self, concat_file: Path, audio_path: str,
                                background_path: str, output_path: str,
                                mouth_position: Optional[Dict] = None) -> str:
        """Render video with background and mouth overlay"""
        
        # Default to center if position not specified
        if mouth_position is None:
            overlay_x = "(W-w)/2"
            overlay_y = "(H-h)/2"
        else:
            x = mouth_position.get('x', 960)
            y = mouth_position.get('y', 700)
            anchor = mouth_position.get('anchor', 'center')
            
            if anchor == 'center':
                overlay_x = f"{x}-(w/2)"
                overlay_y = f"{y}-(h/2)"
            elif anchor == 'topleft':
                overlay_x = str(x)
                overlay_y = str(y)
            else:
                overlay_x = str(x)
                overlay_y = str(y)
        
        # Correct the stream indexing: 
        # - [0:v] is the background image (looped)
        # - [1:v] is the mouth frames from concat file
        # - [2:a] is the audio
        filter_complex = (
            f"[1:v]fps={self.video_config['fps']}[mouth];"  # Mouth frames from concat file (stream 1)
            f"[0:v]scale={self.video_config['resolution'][0]}:{self.video_config['resolution'][1]}[bg];"  # Background (stream 0)
            f"[bg][mouth]overlay={overlay_x}:{overlay_y}[video];"  # Overlay result as [video]
        )
        
        cmd = [
            self.ffmpeg_path,
            '-loop', '1',
            '-i', background_path,  # This becomes [0:v]
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),  # This becomes [1:v] for the mouth frames
            '-i', audio_path,  # This becomes [2:a] for the audio
            '-filter_complex', filter_complex,
            '-map', '[video]',  # Map the video output from filter
            '-map', '2:a',  # Map audio from stream 2 (the audio file input)
            '-c:v', self.video_config['codec'],
            '-preset', self.video_config['preset'],
            '-crf', str(self.video_config['crf']),
            '-pix_fmt', self.video_config['pixel_format'],
            '-c:a', self.video_config['audio_codec'],
            '-b:a', self.video_config['audio_bitrate'],
            '-shortest',
            '-y',
            output_path
        ]
        
        self._execute_ffmpeg(cmd)
        return output_path
    
    def _execute_ffmpeg(self, cmd: List[str]):
        """Execute FFmpeg command with error handling"""
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        
        # Log more details about the inputs for diagnostic purposes
        concat_file = None
        for i, arg in enumerate(cmd):
            if 'frames.txt' in arg:
                concat_file = arg
                break
        
        if concat_file:
            try:
                with open(concat_file, 'r') as f:
                    lines = f.readlines()
                    logger.debug(f"Concat file contains {len([l for l in lines if l.startswith('file')])} unique files")
                    # Show first few entries for debugging
                    first_few = [l.strip() for l in lines[:6]]
                    logger.debug(f"First few entries in concat file: {first_few}")
            except Exception as e:
                logger.error(f"Error reading concat file {concat_file}: {e}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg execution failed: {result.stderr}")
            logger.error(f"FFmpeg stdout: {result.stdout}")
            raise RuntimeError(f"FFmpeg failed with code {result.returncode}: {result.stderr}")
        else:
            logger.info(f"FFmpeg execution completed successfully")
            logger.debug(f"FFmpeg output: {result.stdout}")
        
        logger.info("Video rendering completed successfully")
