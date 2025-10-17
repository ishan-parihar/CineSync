import argparse
import sys
import json
import logging
import logging.config
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.lip_sync_generator import LipSyncGenerator
from core.video_compositor import VideoCompositor
from core.preset_manager import PresetManager
from utils.validators import validate_audio_file, validate_dependencies
from utils.cache_manager import CacheManager


def setup_logging(verbose: bool = False):
    """Initialize logging configuration"""
    with open('config/logging_config.json', 'r') as f:
        config = json.load(f)
    
    if verbose:
        config['loggers']['lip_sync']['level'] = 'DEBUG'
        config['handlers']['console']['level'] = 'DEBUG'
    
    logging.config.dictConfig(config)
    return logging.getLogger('lip_sync')


def main():
    parser = argparse.ArgumentParser(
        description='Automated Lip Sync Video Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with default preset
  python src/cli.py --audio assets/audio/raw/narration.wav --output output/video.mp4

  # Specify custom preset
  python src/cli.py --audio audio.wav --output video.mp4 --preset character_2/side

  # Use custom FPS and disable caching
  python src/cli.py --audio audio.wav --output video.mp4 --fps 24 --no-cache

  # Verbose logging
  python src/cli.py --audio audio.wav --output video.mp4 --verbose
        """)
    
    parser.add_argument('--audio', help='Path to audio file')
    parser.add_argument('--output', help='Output video path')
    parser.add_argument('--preset', help='Character preset (e.g., character_1/front)')
    parser.add_argument('--config', default='config/settings.json', help='Configuration file')
    parser.add_argument('--fps', type=int, help='Frame rate (overrides config)')
    parser.add_argument('--no-cache', action='store_true', help='Disable phoneme caching')
    parser.add_argument('--verbose', action='store_true', help='Enable debug logging')
    parser.add_argument('--list-presets', action='store_true', help='List available presets and exit')
    
    args = parser.parse_args()
    
    logger = setup_logging(args.verbose)
    
    try:
        # Load configuration
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # List presets if requested
        if args.list_presets:
            preset_manager = PresetManager(args.config)
            print("\nAvailable presets:")
            for preset in preset_manager.list_presets():
                print(f"  - {preset}")
            return 0
        
        if not args.audio or not args.output:
            parser.error("the following arguments are required: --audio, --output")

        
        # Override FPS if specified
        if args.fps:
            config['video']['fps'] = args.fps
            logger.info(f"Using custom FPS: {args.fps}")
        
        # Validate dependencies
        if not validate_dependencies(
            config['system']['rhubarb_path'],
            config['system']['ffmpeg_path']
        ):
            logger.error("Dependency validation failed")
            return 1
        
        # Validate audio
        if not validate_audio_file(args.audio):
            return 1
        
        # Initialize components
        preset_manager = PresetManager(args.config)
        generator = LipSyncGenerator(args.config)
        compositor = VideoCompositor(args.config)
        
        use_cache = config['processing']['enable_caching'] and not args.no_cache
        cache_manager = CacheManager() if use_cache else None
        
        # Determine preset
        preset_name = args.preset or config['presets']['default_preset']
        logger.info(f"Using preset: {preset_name}")
        
        preset_config = preset_manager.get_preset(preset_name)
        
        if not preset_manager.validate_preset(preset_name):
            return 1
        
        # Check cache
        phoneme_data = None
        if cache_manager:
            phoneme_data = cache_manager.get_cached_phoneme_data(args.audio)
        
        # Generate phoneme data
        if phoneme_data is None:
            phoneme_json = generator.generate_phoneme_data(args.audio)
            phoneme_data = generator.parse_phoneme_data(phoneme_json)
            
            if cache_manager:
                cache_manager.save_phoneme_data(args.audio, phoneme_data)
        
        # Generate frames
        frame_sequence = generator.generate_frame_sequence(
            mouth_cues=phoneme_data['mouth_cues'],
            duration=phoneme_data['duration'],
            viseme_mapping=preset_config['mouth_shapes']
        )
        
        # Render video
        compositor.render_video(
            frame_sequence=frame_sequence,
            audio_path=args.audio,
            output_path=args.output,
            background_path=preset_config['background']['image'],
            mouth_position=preset_config['mouth_position']
        )
        
        print(f"\n[SUCCESS] Video generated successfully: {args.output}\n")
        return 0
        
    except Exception as e:
        logger.exception(f"Error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
