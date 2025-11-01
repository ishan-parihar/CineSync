import sys
import json
import logging
import logging.config
from pathlib import Path

# Add project root to Python path for absolute imports when running as main
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from lipsync_automation.core.content_orchestrator import ContentOrchestrator
from lipsync_automation.core.profile_manager import ProfileManager
from lipsync_automation.utils.validators import (
    validate_audio_file,
    validate_dependencies,
    validate_output_directory
)
from lipsync_automation.utils.cache_manager import CacheManager


def setup_logging():
    """Initialize logging configuration"""
    config_path = Path(__file__).parent / 'config' / 'logging_config.json'
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    logging.config.dictConfig(config)
    return logging.getLogger('lip_sync')


def main():
    """Main execution workflow for single audio file using v2.0 architecture"""
    logger = setup_logging()
    logger.info("=" * 80)
    logger.info("Lip Sync Automation System v2.0 - Starting")
    logger.info("=" * 80)
    
    try:
        # Load configuration
        config_path = Path(__file__).parent / 'config' / 'settings.json'
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Validate dependencies
        logger.info("Validating system dependencies...")
        if not validate_dependencies(
            config['system']['rhubarb_path'],
            config['system']['ffmpeg_path']
        ):
            logger.error("Dependency validation failed")
            return 1
        
        # Initialize v2.0 orchestrator
        orchestrator = ContentOrchestrator(config)
        
        # Configuration
        audio_path = 'assets/audio/raw/test.wav'
        profile_name = config['profiles']['default_profile']  # Use correct config key
        output_path = 'output/production/test_project/final/lipsync_video.mp4'
        cinematic_mode = config.get('cinematography', {}).get('mode', 'balanced')  # 'emotional', 'tension', 'balanced'
        
        # Validate inputs
        logger.info("Validating input files...")
        if not validate_audio_file(audio_path):
            return 1
        
        if not validate_output_directory(output_path):
            return 1
        
        # Validate profile
        logger.info(f"Validating profile: {profile_name}")
        is_valid, validation_msg = orchestrator.validate_profile(profile_name)
        if not is_valid:
            logger.error(f"Profile validation failed: {validation_msg}")
            return 1
        
        # Generate content using cinematographic principles
        logger.info(f"Generating content with profile '{profile_name}' and cinematic mode '{cinematic_mode}'...")
        result = orchestrator.generate_content(
            audio_path=audio_path,
            profile_name=profile_name,
            output_path=output_path,
            cinematic_mode=cinematic_mode
        )
        
        logger.info("=" * 80)
        logger.info(f"Video generated successfully: {result.video_path}")
        logger.info(f"Metadata: {json.dumps(result.metadata, indent=2)}")
        logger.info("=" * 80)
        return 0
        
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
