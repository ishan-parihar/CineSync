import argparse
import json
import logging
import logging.config
import sys
from pathlib import Path

from .core.content_orchestrator import ContentOrchestrator
from .core.profile_manager import ProfileManager
from .utils.cache_manager import CacheManager
from .utils.validators import validate_audio_file, validate_dependencies

# Backend is now self-contained - relative imports used instead



def setup_logging(verbose: bool = False):
    """Initialize logging configuration"""
    with open("config/logging_config.json", "r") as f:
        config = json.load(f)

    if verbose:
        config["loggers"]["lip_sync"]["level"] = "DEBUG"
        config["handlers"]["console"]["level"] = "DEBUG"

    logging.config.dictConfig(config)
    return logging.getLogger("lip_sync")


def main():
    parser = argparse.ArgumentParser(
        description="Automated Lip Sync Video Generator v2.0 with Cinematographic Principles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with default profile
  python src/cli.py --audio assets/audio/raw/narration.wav --output output/video.mp4

  # Specify custom profile
  python src/cli.py --audio audio.wav --output video.mp4 --profile character_2_emotional

  # Use cinematic mode (emotional, tension, balanced)
  python src/cli.py --audio audio.wav --output video.mp4 --cinematic-mode emotional

  # Verbose logging
  python src/cli.py --audio audio.wav --output video.mp4 --verbose
        """,
    )

    parser.add_argument("--audio", help="Path to audio file")
    parser.add_argument("--output", help="Output video path")
    parser.add_argument(
        "--profile", help="Character profile (e.g., character_2_emotional)"
    )
    parser.add_argument(
        "--cinematic-mode",
        choices=["emotional", "tension", "balanced"],
        default="balanced",
        help="Cinematographic approach to use",
    )
    parser.add_argument(
        "--config", default="config/settings.json", help="Configuration file"
    )
    parser.add_argument(
        "--no-cache", action="store_true", help="Disable phoneme caching"
    )
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    parser.add_argument(
        "--list-profiles", action="store_true", help="List available profiles and exit"
    )

    args = parser.parse_args()

    logger = setup_logging(args.verbose)

    try:
        # Load configuration
        with open(args.config, "r") as f:
            config = json.load(f)

        # List profiles if requested
        if args.list_profiles:
            profile_manager = ProfileManager(config=config)
            print("\nAvailable profiles:")
            for profile in profile_manager.list_profiles():
                print(f"  - {profile}")
            return 0

        if not args.audio or not args.output:
            parser.error("the following arguments are required: --audio, --output")

        # Validate dependencies
        if not validate_dependencies(
            config["system"]["rhubarb_path"], config["system"]["ffmpeg_path"]
        ):
            logger.error("Dependency validation failed")
            return 1

        # Validate audio
        if not validate_audio_file(args.audio):
            return 1

        # Initialize v2.0 orchestrator
        orchestrator = ContentOrchestrator(config)

        # Determine profile
        profile_name = args.profile or config["profiles"]["default_profile"]
        logger.info(f"Using profile: {profile_name}")

        # Validate profile
        is_valid, validation_msg = orchestrator.validate_profile(profile_name)
        if not is_valid:
            logger.error(f"Profile validation failed: {validation_msg}")
            return 1

        # Generate content using cinematographic principles
        logger.info(
            f"Generating content with cinematic mode '{args.cinematic_mode}'..."
        )
        result = orchestrator.generate_content(
            audio_path=args.audio,
            profile_name=profile_name,
            output_path=args.output,
            cinematic_mode=args.cinematic_mode,
        )

        print(f"\n[SUCCESS] Video generated successfully: {result.video_path}\n")
        print(f"Metadata: {json.dumps(result.metadata, indent=2)}\n")
        return 0

    except Exception as e:
        logger.exception(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
