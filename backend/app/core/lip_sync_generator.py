import json
import logging
import os
import subprocess
import wave
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

logger = logging.getLogger("lip_sync.generator")


class LipSyncGenerator:
    """Core engine for phoneme detection and frame sequence generation"""

    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        if config_path is None:
            # Use shared config by default
            config_path = Path(__file__).parent.parent.parent.parent / "shared" / "config" / "settings.json"
        
        config_path = Path(config_path)
        with open(config_path, "r") as f:
            self.config = json.load(f)

        self.rhubarb_path = self.config["system"]["rhubarb_path"]
        self.fps = self.config["video"]["fps"]
        self.temp_dir = Path(self.config["system"]["temp_directory"])
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        logger.info("LipSyncGenerator initialized")

    def generate_phoneme_data(
        self, audio_path: str, output_json: Optional[str] = None
    ) -> str:
        """Execute Rhubarb to extract phoneme timing data"""
        if output_json is None:
            audio_stem = Path(audio_path).stem
            output_json = str(self.temp_dir / f"{audio_stem}_phonemes.json")

        logger.info(f"Generating phoneme data for: {audio_path}")

        cmd = [
            self.rhubarb_path,
            audio_path,
            "-f",
            self.config["rhubarb"]["output_format"],
            "-o",
            output_json,
            "--recognizer",
            self.config["rhubarb"]["recognizer"],
        ]

        if self.config["rhubarb"]["threads"] > 0:
            cmd.extend(["--threads", str(self.config["rhubarb"]["threads"])])

        if self.config["rhubarb"]["quiet"]:
            cmd.append("--quiet")

        logger.debug(f"Rhubarb command: {' '.join(cmd)}")

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"Rhubarb execution failed: {result.stderr}")
            raise RuntimeError(
                f"Rhubarb failed with code {result.returncode}: {result.stderr}"
            )

        logger.info(f"Phoneme data generated: {output_json}")
        return output_json

    def parse_phoneme_data(self, json_path: str) -> Dict:
        """Parse Rhubarb JSON output to extract timing and metadata"""
        logger.debug(f"Parsing phoneme data from: {json_path}")

        with open(json_path, "r") as f:
            data: Dict = json.load(f)

        duration: float = self._calculate_duration(data["mouthCues"])
        result: Dict = {
            "mouth_cues": data["mouthCues"],
            "metadata": data.get("metadata", {}),
            "duration": duration,
        }
        return result

    def _calculate_duration(self, mouth_cues: List[Dict]) -> float:
        """Calculate total duration from mouth cues"""
        if not mouth_cues:
            return 0.0
        end_times = [cue["end"] for cue in mouth_cues]
        if not end_times:
            return 0.0
        # Explicitly cast to float to help mypy
        max_end: float = max(end_times)
        return max_end

    def generate_frame_sequence(
        self, mouth_cues: List[Dict], duration: float, viseme_mapping: Dict[str, str]
    ) -> List[str]:
        """Map phonemes to frame-by-frame viseme sequence"""
        total_frames = int(duration * self.fps) + 1  # Add buffer frame
        frame_sequence = []

        logger.info(
            f"Generating frame sequence: {total_frames} frames at {self.fps}fps"
        )

        for frame_num in range(total_frames):
            timestamp = frame_num / self.fps
            current_viseme = "X"  # Default resting position

            # Find matching mouth cue for current timestamp
            for cue in mouth_cues:
                if cue["start"] <= timestamp < cue["end"]:
                    current_viseme = cue["value"]
                    break

            viseme_path = viseme_mapping.get(current_viseme)
            if not viseme_path:
                logger.warning(
                    f"Viseme '{current_viseme}' not found in mapping, using X"
                )
                viseme_path = viseme_mapping["X"]

            frame_sequence.append(viseme_path)

        logger.info(f"Frame sequence generated: {len(frame_sequence)} frames")
        return frame_sequence

    def get_audio_duration(self, audio_path: str) -> float:
        """Extract duration from audio file"""
        audio_ext = Path(audio_path).suffix.lower()

        if audio_ext == ".wav":
            with wave.open(audio_path, "rb") as wav:
                frames = wav.getnframes()
                rate = wav.getframerate()
                return frames / float(rate)
        else:
            # Use ffprobe for non-WAV files
            cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                audio_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
