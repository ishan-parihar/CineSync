import sys
import json
import logging
import logging.config
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from core.lip_sync_generator import LipSyncGenerator
from core.video_compositor import VideoCompositor
from core.preset_manager import PresetManager
from utils.validators import (
    validate_audio_file,
    validate_dependencies,
    validate_output_directory
)
from utils.cache_manager import CacheManager


def setup_logging():
    """Initialize logging configuration"""
    with open('config/logging_config.json', 'r') as f:
        config = json.load(f)
    
    logging.config.dictConfig(config)
    return logging.getLogger('lip_sync')


def main():
    """Main execution workflow for single audio file"""
    logger = setup_logging()
    logger.info("=" * 80)
    logger.info("Lip Sync Automation System - Starting")
    logger.info("=" * 80)
    
    try:
        # Load configuration
        with open('config/settings.json', 'r') as f:
            config = json.load(f)
        
        # Validate dependencies
        logger.info("Validating system dependencies...")
        if not validate_dependencies(
            config['system']['rhubarb_path'],
            config['system']['ffmpeg_path']
        ):
            logger.error("Dependency validation failed")
            return 1
        
        # Initialize components
        preset_manager = PresetManager()
        generator = LipSyncGenerator()
        compositor = VideoCompositor()
        cache_manager = CacheManager() if config['processing']['enable_caching'] else None
        
        # Configuration
        audio_path = 'assets/audio/raw/narration.wav'
        preset_name = config['presets']['default_preset']
        output_path = 'output/production/test_project/final/lipsync_video.mp4'
        
        # Validate inputs
        logger.info("Validating input files...")
        if not validate_audio_file(audio_path):
            return 1
        
        if not validate_output_directory(output_path):
            return 1
        
        # Load preset
        logger.info(f"Loading preset: {preset_name}")
        preset_config = preset_manager.get_preset(preset_name)
        
        if not preset_manager.validate_preset(preset_name):
            logger.error("Preset validation failed")
            return 1
        
        # Check cache
        phoneme_data = None
        if cache_manager:
            phoneme_data = cache_manager.get_cached_phoneme_data(audio_path)
        
        # Generate or retrieve phoneme data
        if phoneme_data is None:
            logger.info("Generating phoneme data with Rhubarb...")
            phoneme_json = generator.generate_phoneme_data(audio_path)
            phoneme_data = generator.parse_phoneme_data(phoneme_json)
            
            if cache_manager:
                cache_manager.save_phoneme_data(audio_path, phoneme_data)
        
        # Generate frame sequence
        logger.info("Generating frame sequence...")
        frame_sequence = generator.generate_frame_sequence(
            mouth_cues=phoneme_data['mouth_cues'],
            duration=phoneme_data['duration'],
            viseme_mapping=preset_config['mouth_shapes']
        )
        
        # Render video
        logger.info("Rendering final video...")
        compositor.render_video(
            frame_sequence=frame_sequence,
            audio_path=audio_path,
            output_path=output_path,
            background_path=preset_config['background']['image'],
            mouth_position=preset_config['mouth_position']
        )
        
        logger.info("=" * 80)
        logger.info(f"Video generated successfully: {output_path}")
        logger.info("=" * 80)
        return 0
        
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
