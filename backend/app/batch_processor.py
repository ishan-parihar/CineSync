import argparse
import json
import logging
import logging.config
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Optional, Tuple

from .core.lip_sync_generator import LipSyncGenerator
from .core.preset_manager import PresetManager
from .core.video_compositor_v2 import VideoCompositorV2
from .utils.cache_manager import CacheManager
from .utils.validators import validate_audio_file

# Backend is now self-contained - relative imports used instead



def setup_logging():
    with open("config/logging_config.json", "r") as f:
        config = json.load(f)
    logging.config.dictConfig(config)
    return logging.getLogger("lip_sync.batch")


def process_single_file(
    audio_path: Path,
    output_dir: Path,
    preset_name: str,
    generator: LipSyncGenerator,
    compositor: VideoCompositorV2,
    preset_config: dict,
    cache_manager: Optional[CacheManager] = None,
) -> Tuple[str, bool, str]:
    """Process single audio file - designed for parallel execution"""

    try:
        audio_name = audio_path.stem
        output_path = output_dir / f"{audio_name}.mp4"

        # Check cache
        phoneme_data = None
        if cache_manager:
            phoneme_data = cache_manager.get_cached_phoneme_data(str(audio_path))

        # Generate phoneme data
        if phoneme_data is None:
            phoneme_json = generator.generate_phoneme_data(str(audio_path))
            phoneme_data = generator.parse_phoneme_data(phoneme_json)

            if cache_manager:
                cache_manager.save_phoneme_data(str(audio_path), phoneme_data)

        # Generate frames
        frame_sequence = generator.generate_frame_sequence(
            mouth_cues=phoneme_data["mouth_cues"],
            duration=phoneme_data["duration"],
            viseme_mapping=preset_config["mouth_shapes"],
        )

        # Render video - using the new method from VideoCompositorV2
        # For batch processor compatibility, create a single scene with the frame sequence
        scene_id = f"scene_{audio_name}"
        compositor.render_multiscene_video(
            shot_sequence=[
                {
                    "scene_id": scene_id,
                    "emotion": "neutral",
                    "angle": "MCU",
                    "viseme_sequence": frame_sequence,
                    "shot_specification": {
                        "distance": "MCU",
                        "angle": "eye_level",
                        "duration": (
                            phoneme_data["duration"]
                            if "duration" in phoneme_data
                            else 2.0
                        ),  # Use actual duration if available
                    },
                    "shot_purpose": "dialogue",
                    "vertical_angle": "eye_level",
                    "composition": "centered",
                    "duration_modifier": 1.0,
                    "confidence": 0.8,
                }
            ],
            audio_path=str(audio_path),
            output_path=str(output_path),
            profile_manager=None,  # Pass None for now until we have proper profile manager integration
        )

        return str(audio_path), True, str(output_path)

    except Exception as e:
        return str(audio_path), False, str(e)


class MockCompositor:
    """Mock compositor to maintain interface compatibility"""

    def __init__(self, config_path: str = "config/settings.json"):
        from .core.video_compositor_v2 import VideoCompositorV2

        self._compositor = VideoCompositorV2(config_path=config_path)

    def render_video(
        self,
        frame_sequence,
        audio_path,
        output_path,
        background_path=None,
        mouth_position=None,
    ):
        """Compatibility wrapper for legacy render_video method"""
        # Create a shot sequence from the frame sequence for the new compositor
        shot_sequence = []
        for i, frame in enumerate(frame_sequence):
            shot = {
                "scene_id": f"scene_{i}",
                "emotion": "neutral",  # Default emotion
                "angle": "MCU",  # Default angle
                "viseme_sequence": [frame],  # Single frame sequence
                "shot_specification": {
                    "distance": "MCU",
                    "angle": "eye_level",
                    "duration": 0.1,  # Default short duration per frame
                },
                "shot_purpose": "dialogue",
                "vertical_angle": "eye_level",
                "composition": "centered",
                "duration_modifier": 1.0,
                "confidence": 0.8,
            }
            shot_sequence.append(shot)

        # Call the new method with adapted parameters
        return self._compositor.render_multiscene_video(
            shot_sequence=shot_sequence,
            audio_path=audio_path,
            output_path=output_path,
            profile_manager=None,  # This will need to be handled differently in real usage
        )


def main():
    parser = argparse.ArgumentParser(description="Batch Lip Sync Video Generator")
    parser.add_argument(
        "--input", required=True, help="Input directory containing audio files"
    )
    parser.add_argument("--output", required=True, help="Output directory for videos")
    parser.add_argument("--preset", help="Character preset to use")
    parser.add_argument(
        "--workers", type=int, default=4, help="Number of parallel workers"
    )
    parser.add_argument(
        "--extensions", default="wav,mp3,ogg", help="Comma-separated audio extensions"
    )
    parser.add_argument(
        "--config", default="config/settings.json", help="Configuration file"
    )

    args = parser.parse_args()

    logger = setup_logging()
    logger.info("Batch Processing Started")

    try:
        # Load configuration
        with open(args.config, "r") as f:
            config = json.load(f)

        # Initialize components
        preset_manager = PresetManager(args.config)
        generator = LipSyncGenerator(args.config)
        compositor = VideoCompositorV2(config_path=args.config)
        cache_manager = (
            CacheManager() if config["processing"]["enable_caching"] else None
        )

        # Determine preset
        preset_name = args.preset or config["presets"]["default_preset"]
        preset_config = preset_manager.get_preset(preset_name)

        # Find audio files
        input_dir = Path(args.input)
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)

        extensions = [f".{ext.strip()}" for ext in args.extensions.split(",")]
        audio_files = []

        for ext in extensions:
            audio_files.extend(input_dir.glob(f"*{ext}"))

        if not audio_files:
            logger.error(
                f"No audio files found in {input_dir} with extensions {extensions}"
            )
            return 1

        logger.info(f"Found {len(audio_files)} audio files to process")
        logger.info(f"Using {args.workers} parallel workers")

        # Process files in parallel
        results = []
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(
                    process_single_file,
                    audio_file,
                    output_dir,
                    preset_name,
                    generator,
                    compositor,
                    preset_config,
                    cache_manager,
                ): audio_file
                for audio_file in audio_files
            }

            for future in as_completed(futures):
                audio_path, success, result = future.result()
                results.append((audio_path, success, result))

                if success:
                    logger.info(f"✓ Completed: {Path(audio_path).name} -> {result}")
                else:
                    logger.error(f"✗ Failed: {Path(audio_path).name} - {result}")

        # Summary
        successful = sum(1 for _, success, _ in results if success)
        failed = len(results) - successful

        print("\n" + "=" * 80)
        print(f"Batch Processing Complete")
        print(f"Total: {len(results)} | Successful: {successful} | Failed: {failed}")
        print("=" * 80 + "\n")

        return 0 if failed == 0 else 1

    except Exception as e:
        logger.exception(f"Batch processing error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
