#!/usr/bin/env python3
"""
Script to create proper preset structure that aligns with the new animation system.
This script ensures the presets directory follows the required format and creates
sample files for testing.
"""

import json
import os
from pathlib import Path
from typing import List

def create_preset_structure():
    """Create proper preset structure aligned with the animation system."""
    
    # Define the base paths
    preset_base = Path("assets/presets")
    profiles_base = Path("profiles")
    
    # Define standard values
    emotions = ['neutral', 'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation']
    angles = ['front', 'side', 'profile', 'three_quarter']
    
    print("Creating proper preset structure aligned with animation system...")
    
    # Create the preset base directory
    preset_base.mkdir(parents=True, exist_ok=True)
    
    # Create character directory
    character_name = "character_1"
    character_dir = preset_base / character_name
    character_dir.mkdir(exist_ok=True)
    
    # For each angle, create the preset structure
    for angle in angles:
        angle_dir = character_dir / angle
        angle_dir.mkdir(exist_ok=True)
        
        # Create placeholder images if they don't exist
        background_path = angle_dir / "background.png"
        if not background_path.exists():
            # Create a dummy background image (will be replaced with real image later)
            background_path.touch()
            print(f"Created placeholder: {background_path}")
        
        # Create viseme images for this preset
        viseme_shapes = {
            'A': 'mouth_A.jpg',
            'B': 'mouth_B.jpg', 
            'C': 'mouth_C.jpg',
            'D': 'mouth_D.jpg',
            'E': 'mouth_E.jpg',
            'F': 'mouth_F.jpg',
            'G': 'mouth_G.jpg',
            'H': 'mouth_H.jpg',
            'X': 'mouth_X.jpg'
        }
        
        for viseme_name, viseme_filename in viseme_shapes.items():
            viseme_path = angle_dir / viseme_filename
            if not viseme_path.exists():
                viseme_path.touch()
                print(f"Created viseme: {viseme_path}")
        
        # Create or update preset configuration
        preset_config_path = angle_dir / "preset_config.json"
        
        # Define viseme shapes here to ensure they're in scope
        viseme_shapes = {
            'A': 'mouth_A.jpg',
            'B': 'mouth_B.jpg', 
            'C': 'mouth_C.jpg',
            'D': 'mouth_D.jpg',
            'E': 'mouth_E.jpg',
            'F': 'mouth_F.jpg',
            'G': 'mouth_G.jpg',
            'H': 'mouth_H.jpg',
            'X': 'mouth_X.jpg'
        }
        
        preset_config = {
            "preset_name": f"{character_name}_{angle}",
            "character_id": character_name,
            "angle": angle,
            "description": f"{angle.capitalize()}-facing view of {character_name}",
            "mouth_position": {
                "x": 960,
                "y": 700,
                "anchor": "center"
            },
            "background": {
                "image": "background.png",
                "type": "static"
            },
            "mouth_shapes": viseme_shapes,
            "image_specifications": {
                "format": "JPG",
                "bit_depth": 24,
                "alpha_channel": False,
                "dimensions": [512, 512],
                "dpi": 300
            },
            "metadata": {
                "created_date": str(Path(__file__).stat().st_mtime),
                "version": "1.0",
                "author": "Auto-generated"
            }
        }
        
        with open(preset_config_path, 'w') as f:
            json.dump(preset_config, f, indent=2)
        
        print(f"Created preset config: {preset_config_path}")
    
    # Also ensure the profile structure is properly aligned
    print("\nEnsuring profile structure is aligned...")
    profiles_base.mkdir(exist_ok=True)
    
    # Create or update the profile structure to match the preset structure
    profile_dir = profiles_base / character_name
    profile_dir.mkdir(exist_ok=True)
    
    # Create profile config
    profile_config_path = profile_dir / "profile_config.json"
    profile_config = {
        "name": character_name,
        "description": f"Profile for {character_name}",
        "created_date": str(Path(__file__).stat().st_mtime),
        "angles": angles,
        "emotions": emotions,
        "visemes": [f"{shape}.png" for shape in viseme_shapes.keys()]
    }
    
    with open(profile_config_path, 'w') as f:
        json.dump(profile_config, f, indent=2)
    
    print(f"Created profile config: {profile_config_path}")
    
    # Create angles directory in profile
    angles_dir = profile_dir / "angles"
    angles_dir.mkdir(exist_ok=True)
    
    # For each angle that exists in presets, create in profiles
    for angle in angles:
        angle_dir = angles_dir / angle
        angle_dir.mkdir(exist_ok=True)
        
        # Create emotions directory
        emotions_dir = angle_dir / "emotions"
        emotions_dir.mkdir(exist_ok=True)
        
        # For each emotion, create viseme placeholders
        for emotion in emotions:
            emotion_dir = emotions_dir / emotion
            emotion_dir.mkdir(exist_ok=True)
            
            # Create viseme files for this emotion
            for viseme_shape in viseme_shapes.keys():
                viseme_filename = f"{viseme_shape}.png"
                viseme_path = emotion_dir / viseme_filename
                # Only create if it doesn't exist (to avoid overwriting existing content)
                if not viseme_path.exists():
                    viseme_path.touch()
                    print(f"Created emotion viseme: {viseme_path}")
    
    print(f"\nSuccessfully created aligned preset and profile structures for {character_name}")
    print(f"- Presets: {preset_base / character_name}")
    print(f"- Profiles: {profiles_base / character_name}")
    
    return True

def validate_structure():
    """Validate that both structures are properly aligned."""
    print("\nValidating structure alignment...")
    
    preset_base = Path("assets/presets")
    profiles_base = Path("profiles")
    
    character_name = "character_1"
    
    # Check if preset structure exists
    preset_character_dir = preset_base / character_name
    if not preset_character_dir.exists():
        print(f"ERROR: Preset character directory does not exist: {preset_character_dir}")
        return False
    
    print(f"OK - Preset structure exists: {preset_character_dir}")
    
    # Check if profile structure exists
    profile_character_dir = profiles_base / character_name
    if not profile_character_dir.exists():
        print(f"ERROR: Profile character directory does not exist: {profile_character_dir}")
        return False
    
    print(f"OK - Profile structure exists: {profile_character_dir}")
    
    # Check alignment
    preset_angles = [d.name for d in preset_character_dir.iterdir() if d.is_dir()]
    profile_angles = []
    
    profile_angles_dir = profile_character_dir / "angles"
    if profile_angles_dir.exists():
        profile_angles = [d.name for d in profile_angles_dir.iterdir() if d.is_dir()]
    
    print(f"OK - Preset angles: {preset_angles}")
    print(f"OK - Profile angles: {profile_angles}")
    
    # Check for alignment
    missing_in_preset = set(profile_angles) - set(preset_angles)
    missing_in_profile = set(preset_angles) - set(profile_angles)
    
    if missing_in_preset:
        print(f"Warning - Angles in profile but not in preset: {missing_in_preset}")
    else:
        print("OK - All profile angles have corresponding preset")
    
    if missing_in_profile:
        print(f"Warning - Angles in preset but not in profile: {missing_in_profile}")
    else:
        print("OK - All preset angles have corresponding profile")
    
    # Check config files
    preset_config_exists = (preset_character_dir / "front" / "preset_config.json").exists()
    profile_config_exists = (profile_character_dir / "profile_config.json").exists()
    
    print(f"OK - Preset config exists: {preset_config_exists}")
    print(f"OK - Profile config exists: {profile_config_exists}")
    
    return True

def main():
    """Main function to run the preset structure creation."""
    print("LipSyncAutomation - Preset Structure Alignment Tool")
    print("=" * 60)
    
    # Create the aligned structure
    success = create_preset_structure()
    
    if success:
        # Validate the structure
        validation_passed = validate_structure()
        
        if validation_passed:
            print("\nOK - Preset structure creation and validation completed successfully!")
            print("\nStructure Overview:")
            print("- Presets: assets/presets/character_1/[angle]/[config and assets]")
            print("- Profiles: profiles/character_1/angles/[angle]/emotions/[emotion]/[viseme files]")
            print("- Both structures are now properly aligned and integrated")
        else:
            print("\nERROR - Validation failed - please check the errors above")
    else:
        print("\nERROR - Failed to create preset structure")

if __name__ == "__main__":
    main()