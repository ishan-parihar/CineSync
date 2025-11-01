"""
TransformProcessor: Applies vertical angle and composition transforms.

This module handles all post-processing transforms that don't require
additional visual assets - just mathematical transformations of existing assets.
"""

from typing import Dict, Tuple, Any
import json
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)


class TransformProcessor:
    """
    Applies post-processing transforms for vertical angles and composition.
    
    Transforms existing assets mathematically to achieve different
    cinematographic effects without requiring additional visual assets.
    """
    
    def __init__(self, config_path: str = "config/transform_presets.json"):
        """Initialize with transform presets"""
        self.presets = self._load_presets(config_path)
        
    def _load_presets(self, config_path: str) -> Dict[str, Any]:
        """Load transform presets"""
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def apply_vertical_angle(self,
                            image: Image.Image,
                            angle: str,
                            frame_size: Tuple[int, int]) -> Image.Image:
        """
        Apply vertical angle transform to image.
        
        Args:
            image: Source image (RGBA)
            angle: Vertical angle (eye_level, low_angle, high_angle, dutch_left, dutch_right)
            frame_size: Target frame size (width, height)
            
        Returns:
            Transformed image
        """
        transform = self.presets['vertical_angle_transforms'].get(angle, {})
        
        if not transform or angle == 'eye_level':
            return image
        
        # Extract transform parameters
        y_offset_percent = transform.get('y_offset_percent', 0.0)
        rotation_degrees = transform.get('rotation_degrees', 0.0)
        scale_factor = transform.get('scale_factor', 1.0)
        
        # Apply scale
        if scale_factor != 1.0:
            new_size = (
                int(image.width * scale_factor),
                int(image.height * scale_factor)
            )
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Apply rotation
        if rotation_degrees != 0.0:
            image = image.rotate(
                rotation_degrees,
                expand=True,
                resample=Image.Resampling.BICUBIC,
                fillcolor=(0, 0, 0, 0)
            )
        
        logger.debug(f"Applied {angle} transform: y_offset={y_offset_percent}, rotation={rotation_degrees}")
        
        return image
    
    def calculate_composition_position(self,
                                      composition: str,
                                      framing: str,
                                      frame_size: Tuple[int, int],
                                      asset_size: Tuple[int, int],
                                      shot_index: int = 0) -> Tuple[int, int]:
        """
        Calculate position for composition.
        
        Args:
            composition: Composition type (centered, rule_of_thirds, etc.)
            framing: Shot framing (ECU, CU, MCU, MS)
            frame_size: Video frame size (width, height)
            asset_size: Asset image size (width, height)
            shot_index: Shot index for alternation logic
            
        Returns:
            (x, y) position in pixels
        """
        comp_preset = self.presets['composition_presets'].get(composition, {})
        
        # Get base position percentages
        x_percent = comp_preset.get('x_position_percent', 50.0)
        y_percent = comp_preset.get('y_position_percent', 50.0)
        
        # Handle auto positioning (e.g., rule of thirds alternation)
        if x_percent == "auto":
            if composition == "rule_of_thirds":
                # Alternate between left and right
                x_percent = 33.3 if (shot_index % 2 == 0) else 66.7
                # Convert to pixel coordinates
                x_pos = int((x_percent / 100.0) * frame_size[0])
            else:
                x_pos = int((50.0 / 100.0) * frame_size[0])  # default to center
        else:
            # Convert to pixel coordinates
            x_pos = int((x_percent / 100.0) * frame_size[0])
        
        # Apply framing-specific adjustments
        framing_adjust = self.presets['framing_specific_adjustments'].get(framing, {})
        if 'y_position_percent' in framing_adjust:
            y_percent = framing_adjust['y_position_percent']
        
        y_pos = int((y_percent / 100.0) * frame_size[1])
        
        # Center the asset at this position
        x_pos -= asset_size[0] // 2
        y_pos -= asset_size[1] // 2
        
        logger.debug(f"Composition {composition} at ({x_pos}, {y_pos})")
        
        return (x_pos, y_pos)
    
    def get_vertical_angle_for_emotion(self, emotion: str, base_angle: str) -> str:
        """
        Determine vertical angle based on emotion if set to 'emotion_dependent'.
        
        Args:
            emotion: Emotion name
            base_angle: Base angle from shot purpose
            
        Returns:
            Resolved vertical angle
        """
        if base_angle != 'emotion_dependent':
            return base_angle
        
        # Emotion-to-angle mapping
        emotion_angle_map = {
            'fear': 'high_angle',
            'sadness': 'high_angle',
            'anger': 'low_angle',
            'joy': 'low_angle',
            'surprise': 'eye_level',
            'disgust': 'eye_level',
            'trust': 'eye_level',
            'anticipation': 'eye_level'
        }
        
        return emotion_angle_map.get(emotion, 'eye_level')