"""
ProfileManager: Enhanced asset management system supporting multi-angle,
multi-emotion character profiles.

Author: Development Team
Date: 2025-10-18
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class ProfileValidationError(Exception):
    """Raised when profile validation fails"""

    pass


class ProfileManager:
    """
    Manages character profiles with multi-angle, multi-emotion support.

    Responsibilities:
    - Profile discovery and loading
    - Asset path resolution
    - Profile validation
    - Asset caching
    - Template generation
    """

    def __init__(self, config: Dict):
        """
        Initialize ProfileManager.

        Args:
            config: System configuration dictionary containing:
                - profiles_directory: Path to profiles directory
                - cache_enabled: Whether to cache loaded assets
                - validation_strict: Enable strict validation
        """
        self.config = config
        self.profiles_dir = Path(config["system"]["profiles_directory"])
        self.cache_enabled = config.get("profile_settings", {}).get(
            "cache_enabled", True
        )
        self.profiles_cache: Dict[str, Dict] = {}
        self.assets_cache: Dict[str, Any] = {}

        # Load profile manifest
        self.manifest = self._load_manifest()

        logger.info(
            f"ProfileManager initialized with {len(self.manifest['profiles'])} profiles"
        )

    def _load_manifest(self) -> Dict[str, Any]:
        """Load or create profile manifest"""
        manifest_path = self.profiles_dir / "profile_manifest.json"

        if manifest_path.exists():
            with open(manifest_path, "r") as f:
                manifest_data: Dict[str, Any] = json.load(f)
                return manifest_data
        else:
            # Create empty manifest
            manifest = {
                "schema_version": "2.0",
                "last_updated": datetime.now().isoformat(),
                "profiles": [],
            }
            self._save_manifest(manifest)
            return manifest

    def _save_manifest(self, manifest: Dict) -> None:
        """Save profile manifest"""
        manifest_path = self.profiles_dir / "profile_manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

    def load_profile(self, profile_name: str) -> Dict:
        """
        Load complete profile configuration.

        Args:
            profile_name: Name of profile to load

        Returns:
            Profile configuration dictionary

        Raises:
            ProfileValidationError: If profile doesn't exist or is invalid
        """
        # Check cache
        if self.cache_enabled and profile_name in self.profiles_cache:
            logger.debug(f"Profile '{profile_name}' loaded from cache")
            return self.profiles_cache[profile_name]

        # Load from disk
        profile_path = self.profiles_dir / profile_name / "profile_config.json"

        if not profile_path.exists():
            raise ProfileValidationError(
                f"Profile '{profile_name}' not found at {profile_path}"
            )

        with open(profile_path, "r") as f:
            profile_config: Dict[str, Any] = json.load(f)

        # Validate profile
        validation_result = self.validate_profile(profile_name)
        if not validation_result["valid"]:
            if self.config.get("profile_settings", {}).get("validation_strict", True):
                raise ProfileValidationError(
                    f"Profile validation failed: {validation_result['errors']}"
                )
            else:
                logger.warning(
                    f"Profile validation warnings: {validation_result['warnings']}"
                )

        # Cache profile
        if self.cache_enabled:
            self.profiles_cache[profile_name] = profile_config

        logger.info(f"Profile '{profile_name}' loaded successfully")
        return profile_config

    def get_viseme_path(
        self, profile_name: str, angle: str, emotion: str, viseme: str
    ) -> Path:
        """
        Get path to specific viseme image.

        Args:
            profile_name: Character profile name
            angle: Camera angle (ECU, CU, MCU, MS, etc.)
            emotion: Emotion name (joy, sadness, etc.)
            viseme: Viseme letter (A-H, X)

        Returns:
            Path to viseme image file

        Raises:
            FileNotFoundError: If viseme file doesn't exist
        """
        viseme_path = (
            self.profiles_dir
            / profile_name
            / "angles"
            / angle
            / "emotions"
            / emotion
            / f"{viseme}.png"
        )

        if not viseme_path.exists():
            raise FileNotFoundError(
                f"Viseme not found: {profile_name}/{angle}/{emotion}/{viseme}.png"
            )

        return viseme_path

    def load_viseme_image(
        self, profile_name: str, angle: str, emotion: str, viseme: str
    ) -> Any:  # PIL Image type
        """
        Load viseme image with caching support.

        Args:
            profile_name: Character profile name
            angle: Camera angle
            emotion: Emotion name
            viseme: Viseme letter

        Returns:
            PIL Image object
        """
        cache_key = f"{profile_name}:{angle}:{emotion}:{viseme}"

        # Check cache
        if self.cache_enabled and cache_key in self.assets_cache:
            return self.assets_cache[cache_key]

        # Load image
        viseme_path = self.get_viseme_path(profile_name, angle, emotion, viseme)
        image: Any = Image.open(viseme_path)

        # Validate image
        if image.mode != "RGBA":
            logger.warning(f"Image {viseme_path} not in RGBA mode, converting")
            image = image.convert("RGBA")

        # Cache image
        if self.cache_enabled:
            self.assets_cache[cache_key] = image

        return image

    def validate_profile(self, profile_name: str) -> Dict:
        """
        Comprehensive profile validation.

        Args:
            profile_name: Profile to validate

        Returns:
            Validation result dictionary:
            {
                'valid': bool,
                'errors': List[str],
                'warnings': List[str],
                'missing_assets': List[str],
                'stats': Dict
            }
        """
        errors: List[str] = []
        warnings: List[str] = []
        missing_assets: List[str] = []

        profile_path = self.profiles_dir / profile_name

        # Check profile directory exists
        if not profile_path.exists():
            return {
                "valid": False,
                "errors": [f"Profile directory not found: {profile_path}"],
                "warnings": [],
                "missing_assets": [],
                "stats": {},
            }

        # Check profile config exists
        config_path = profile_path / "profile_config.json"
        if not config_path.exists():
            errors.append(f"profile_config.json not found")
            return {
                "valid": False,
                "errors": errors,
                "warnings": [],
                "missing_assets": [],
                "stats": {},
            }

        # Load configuration
        with open(config_path, "r") as f:
            config = json.load(f)

        # Validate required fields
        required_fields = ["profile_name", "supported_angles", "supported_emotions"]
        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")

        if errors:
            return {
                "valid": False,
                "errors": errors,
                "warnings": warnings,
                "missing_assets": missing_assets,
                "stats": {},
            }

        # Check angles directory structure
        angles_path = profile_path / "angles"
        if not angles_path.exists():
            errors.append("angles/ directory not found")
            return {
                "valid": False,
                "errors": errors,
                "warnings": warnings,
                "missing_assets": missing_assets,
                "stats": {},
            }

        # Validate each angle
        total_assets = 0
        expected_assets = 0

        for angle in config["supported_angles"]:
            angle_path = angles_path / angle
            if not angle_path.exists():
                errors.append(f"Angle directory not found: {angle}")
                continue

            # Check emotions for this angle
            emotions_path = angle_path / "emotions"
            if not emotions_path.exists():
                errors.append(f"Emotions directory not found for angle: {angle}")
                continue

            core_emotions = config["supported_emotions"].get("core", [])
            for emotion in core_emotions:
                emotion_path = emotions_path / emotion
                if not emotion_path.exists():
                    warnings.append(f"Emotion directory not found: {angle}/{emotion}")
                    continue

                # Check all 9 visemes exist
                visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
                for viseme in visemes:
                    expected_assets += 1
                    viseme_file = emotion_path / f"{viseme}.png"
                    if viseme_file.exists():
                        total_assets += 1

                        # Validate image properties
                        try:
                            img = Image.open(viseme_file)
                            if img.mode != "RGBA":
                                warnings.append(
                                    f"{angle}/{emotion}/{viseme}.png not in RGBA mode"
                                )
                            img.close()
                        except Exception as e:
                            warnings.append(
                                f"Invalid image {angle}/{emotion}/{viseme}.png: {e}"
                            )
                    else:
                        missing_assets.append(f"{angle}/{emotion}/{viseme}.png")

        # Determine validity
        valid = len(errors) == 0 and len(missing_assets) == 0

        stats = {
            "total_assets": total_assets,
            "expected_assets": expected_assets,
            "completion_percentage": (
                (total_assets / expected_assets * 100) if expected_assets > 0 else 0
            ),
        }

        return {
            "valid": valid,
            "errors": errors,
            "warnings": warnings,
            "missing_assets": missing_assets,
            "stats": stats,
        }

    def create_profile_template(
        self, profile_name: str, angles: List[str], emotions: List[str]
    ) -> Path:
        """
        Generate empty profile directory structure for artists to fill.

        Args:
            profile_name: Name for new profile
            angles: List of camera angles to support
            emotions: List of emotions to support

        Returns:
            Path to created profile directory
        """
        profile_path = self.profiles_dir / profile_name

        if profile_path.exists():
            raise ValueError(f"Profile '{profile_name}' already exists")

        # Create directory structure
        profile_path.mkdir(parents=True)

        angles_path = profile_path / "angles"
        angles_path.mkdir()

        for angle in angles:
            angle_path = angles_path / angle
            angle_path.mkdir()

            # Create base directory
            base_path = angle_path / "base"
            base_path.mkdir()

            # Create emotions directory
            emotions_path = angle_path / "emotions"
            emotions_path.mkdir()

            for emotion in emotions:
                emotion_path = emotions_path / emotion
                emotion_path.mkdir()

                # Create placeholder files
                visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
                for viseme in visemes:
                    placeholder_path = emotion_path / f"{viseme}.png"
                    # Create 1x1 transparent placeholder
                    img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                    img.save(placeholder_path)

        # Create profile config
        config = {
            "schema_version": "2.0",
            "profile_name": profile_name,
            "version": "1.0.0",
            "created_date": datetime.now().isoformat(),
            "last_modified": datetime.now().isoformat(),
            "character_metadata": {
                "full_name": "",
                "character_type": "",
                "art_style": "",
                "artist": "",
                "notes": "",
            },
            "supported_angles": angles,
            "supported_emotions": {"core": emotions, "compound": []},
            "default_settings": {
                "default_angle": angles[0] if angles else "MCU",
                "default_emotion": emotions[0] if emotions else "trust",
                "base_intensity": 0.7,
            },
            "asset_specifications": {
                "viseme_format": "PNG",
                "alpha_channel_required": True,
                "resolution_by_angle": {
                    "ECU": {"width": 2048, "height": 2048},
                    "CU": {"width": 1920, "height": 1920},
                    "MCU": {"width": 1920, "height": 1080},
                    "MS": {"width": 1920, "height": 1080},
                },
                "color_space": "sRGB",
                "bit_depth": 8,
            },
            "validation": {
                "strict_mode": True,
                "allow_missing_emotions": False,
                "allow_missing_angles": False,
                "require_base_images": True,
            },
        }

        config_path = profile_path / "profile_config.json"
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        # Update manifest
        self.manifest["profiles"].append(
            {
                "profile_name": profile_name,
                "path": profile_name,
                "version": "1.0.0",
                "status": "template",
                "supported_angles": angles,
                "supported_emotions": emotions,
                "asset_count": 0,
            }
        )
        self._save_manifest(self.manifest)

        logger.info(f"Profile template created: {profile_path}")
        return profile_path

    def list_profiles(self) -> List[Dict[str, Any]]:
        """
        List all available profiles.

        Returns:
            List of profile metadata dictionaries
        """
        profiles: List[Dict[str, Any]] = self.manifest["profiles"]
        return profiles

    def get_profile_info(self, profile_name: str) -> Dict[str, Any]:
        """
        Get metadata for specific profile.

        Args:
            profile_name: Profile name

        Returns:
            Profile metadata dictionary
        """
        for profile in self.manifest["profiles"]:
            if profile["profile_name"] == profile_name:
                result: Dict[str, Any] = profile
                return result

        raise ValueError(f"Profile '{profile_name}' not found in manifest")

    def get_profile_structure_analysis(self, profile_name: str) -> Dict[str, Any]:
        """
        Perform comprehensive analysis of profile structure.

        Args:
            profile_name: Profile to analyze

        Returns:
            Detailed structure analysis with completion status
        """
        profile_path = self.profiles_dir / profile_name
        config_path = profile_path / "profile_config.json"

        if not profile_path.exists():
            raise ValueError(f"Profile '{profile_name}' not found")

        # Load profile configuration
        with open(config_path, "r") as f:
            config = json.load(f)

        supported_angles = config.get("supported_angles", [])
        supported_emotions = config.get("supported_emotions", {}).get("core", [])
        standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]

        analysis = {
            "profile_name": profile_name,
            "config": {
                "supported_angles": supported_angles,
                "supported_emotions": supported_emotions,
            },
            "actual_structure": {},
            "missing_structure": {},
            "completion_stats": {
                "total_angles": len(supported_angles),
                "completed_angles": 0,
                "total_emotions": len(supported_angles) * len(supported_emotions),
                "completed_emotions": 0,
                "total_visemes": len(supported_angles)
                * len(supported_emotions)
                * len(standard_visemes),
                "completed_visemes": 0,
                "overall_completion": 0.0,
            },
            "repair_needed": False,
        }

        angles_dir = profile_path / "angles"
        actual_angles = []

        if angles_dir.exists():
            actual_angles = [d.name for d in angles_dir.iterdir() if d.is_dir()]

        # Analyze each angle
        for angle in supported_angles:
            angle_path = angles_dir / angle
            angle_analysis = {
                "exists": angle_path.exists(),
                "emotions": {},
                "completion": 0.0,
                "missing_emotions": [],
            }

            if angle_path.exists():
                emotions_dir = angle_path / "emotions"
                actual_emotions = []

                if emotions_dir.exists():
                    actual_emotions = [
                        d.name for d in emotions_dir.iterdir() if d.is_dir()
                    ]

                # Analyze each emotion for this angle
                completed_emotions = 0
                for emotion in supported_emotions:
                    emotion_path = emotions_dir / emotion
                    emotion_analysis = {
                        "exists": emotion_path.exists(),
                        "visemes": {},
                        "completion": 0.0,
                        "missing_visemes": [],
                    }

                    if emotion_path.exists():
                        completed_visemes = 0
                        for viseme in standard_visemes:
                            viseme_path = emotion_path / f"{viseme}.png"
                            viseme_analysis = {
                                "exists": viseme_path.exists(),
                                "valid": viseme_path.exists(),  # Add file validation if needed
                            }
                            emotion_analysis["visemes"][viseme] = viseme_analysis
                            if viseme_analysis["exists"]:
                                completed_visemes += 1

                        emotion_analysis["completion"] = (
                            completed_visemes / len(standard_visemes)
                        ) * 100
                        if completed_visemes == len(standard_visemes):
                            completed_emotions += 1
                        else:
                            emotion_analysis["missing_visemes"] = [
                                viseme
                                for viseme in standard_visemes
                                if not emotion_analysis["visemes"][viseme]["exists"]
                            ]
                    else:
                        emotion_analysis["missing_visemes"] = standard_visemes.copy()

                    angle_analysis["emotions"][emotion] = emotion_analysis

                angle_analysis["completion"] = (
                    completed_emotions / len(supported_emotions)
                ) * 100
                if completed_emotions == len(supported_emotions):
                    analysis["completion_stats"]["completed_angles"] += 1

                angle_analysis["missing_emotions"] = [
                    emotion
                    for emotion in supported_emotions
                    if not angle_analysis["emotions"][emotion]["exists"]
                ]

                # Update totals
                for emotion in supported_emotions:
                    if angle_analysis["emotions"][emotion]["exists"]:
                        analysis["completion_stats"]["completed_emotions"] += 1
                        for viseme in standard_visemes:
                            if angle_analysis["emotions"][emotion]["visemes"][viseme][
                                "exists"
                            ]:
                                analysis["completion_stats"]["completed_visemes"] += 1
            else:
                # Angle doesn't exist - all emotions and visemes are missing
                for emotion in supported_emotions:
                    angle_analysis["emotions"][emotion] = {
                        "exists": False,
                        "visemes": {
                            viseme: {"exists": False, "valid": False}
                            for viseme in standard_visemes
                        },
                        "completion": 0.0,
                        "missing_visemes": standard_visemes.copy(),
                    }
                angle_analysis["missing_emotions"] = supported_emotions.copy()

            analysis["actual_structure"][angle] = angle_analysis

        # Calculate overall completion
        if analysis["completion_stats"]["total_visemes"] > 0:
            analysis["completion_stats"]["overall_completion"] = (
                analysis["completion_stats"]["completed_visemes"]
                / analysis["completion_stats"]["total_visemes"]
            ) * 100

        # Determine if repair is needed
        analysis["repair_needed"] = (
            analysis["completion_stats"]["completed_angles"]
            < analysis["completion_stats"]["total_angles"]
            or analysis["completion_stats"]["completed_emotions"]
            < analysis["completion_stats"]["total_emotions"]
            or analysis["completion_stats"]["completed_visemes"]
            < analysis["completion_stats"]["total_visemes"]
        )

        return analysis

    def create_missing_structure(
        self, profile_name: str, create_placeholders: bool = True
    ) -> Dict[str, Any]:
        """
        Create missing directory structure and placeholder files.

        Args:
            profile_name: Profile to repair
            create_placeholders: Whether to create placeholder viseme files

        Returns:
            Repair operation results
        """
        try:
            analysis = self.get_profile_structure_analysis(profile_name)
            profile_path = self.profiles_dir / profile_name
            standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]

            results = {
                "profile_name": profile_name,
                "created_directories": [],
                "created_files": [],
                "errors": [],
                "success": True,
            }

            # Create missing angles
            for angle_name, angle_data in analysis["actual_structure"].items():
                if not angle_data["exists"]:
                    angle_path = profile_path / "angles" / angle_name
                    try:
                        angle_path.mkdir(parents=True, exist_ok=True)
                        results["created_directories"].append(str(angle_path))

                        # Create base directory for angle
                        base_path = angle_path / "base"
                        base_path.mkdir(exist_ok=True)
                        results["created_directories"].append(str(base_path))

                        # Create emotions directory
                        emotions_path = angle_path / "emotions"
                        emotions_path.mkdir(exist_ok=True)
                        results["created_directories"].append(str(emotions_path))

                    except Exception as e:
                        results["errors"].append(
                            f"Failed to create angle {angle_name}: {str(e)}"
                        )
                        results["success"] = False
                        continue

                # Create missing emotions
                for emotion_name, emotion_data in angle_data["emotions"].items():
                    if not emotion_data["exists"]:
                        emotion_path = (
                            profile_path
                            / "angles"
                            / angle_name
                            / "emotions"
                            / emotion_name
                        )
                        try:
                            emotion_path.mkdir(parents=True, exist_ok=True)
                            results["created_directories"].append(str(emotion_path))

                            # Create placeholder visemes if requested
                            if create_placeholders:
                                for viseme in standard_visemes:
                                    viseme_path = emotion_path / f"{viseme}.png"
                                    if not viseme_path.exists():
                                        # Create 1x1 transparent PNG
                                        img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                                        img.save(viseme_path)
                                        results["created_files"].append(
                                            str(viseme_path)
                                        )

                            # Create preset_config.json for emotion
                            preset_config = {
                                "preset_name": f"{profile_name}_{angle_name}_{emotion_name}",
                                "character_id": profile_name,
                                "angle": angle_name,
                                "emotion": emotion_name,
                                "description": f"{emotion_name.capitalize()} expression for {angle_name} view",
                                "mouth_position": {
                                    "x": 960,
                                    "y": 700,
                                    "anchor": "center",
                                },
                                "background": {
                                    "image": "background.png",
                                    "type": "static",
                                },
                                "mouth_shapes": {
                                    viseme: f"{viseme}.png"
                                    for viseme in standard_visemes
                                },
                                "image_specifications": {
                                    "format": "PNG",
                                    "bit_depth": 32,
                                    "alpha_channel": True,
                                    "dimensions": [512, 512],
                                    "dpi": 300,
                                },
                                "metadata": {
                                    "created_date": datetime.now().isoformat(),
                                    "version": "1.0",
                                    "author": "Auto-generated",
                                },
                            }

                            config_path = emotion_path / "preset_config.json"
                            with open(config_path, "w") as f:
                                json.dump(preset_config, f, indent=2)
                            results["created_files"].append(str(config_path))

                        except Exception as e:
                            results["errors"].append(
                                f"Failed to create emotion {emotion_name}: {str(e)}"
                            )
                            results["success"] = False

            return results

        except Exception as e:
            return {
                "profile_name": profile_name,
                "created_directories": [],
                "created_files": [],
                "errors": [str(e)],
                "success": False,
            }
