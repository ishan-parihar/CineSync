#!/usr/bin/env python3
"""
Script to recreate the presets directory with the correct structure.
According to the documentation at docs/development/Blueprint_2/Full_Blueprint_2.md,
the structure must have angles -> emotions -> visemes, with all emotions predefined.
"""

import json
import os
from pathlib import Path
from PIL import Image
from datetime import datetime

def create_proper_presets_structure():
    """Create the proper presets structure according to the documentation."""
    
    # Define the standard structure elements
    angles = ["ECU", "CU", "MCU", "MS"]  # Extreme Close-Up, Close-Up, Medium Close-Up, Medium Shot
    emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust", "trust", "anticipation"]
    visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]  # 9 viseme shapes
    
    # Create the base directory
    preset_dir = Path("assets/presets/character_1")
    preset_dir.mkdir(parents=True, exist_ok=True)
    
    print("Creating proper presets structure according to documentation...")
    print(f"Structure: assets/presets/character_name/angles/angle_name/emotions/emotion_name/visemes")
    
    # Create the profile manifest
    manifest = {
        "schema_version": "2.0",
        "last_updated": "2025-10-18T00:00:00Z",
        "profiles": [
            {
                "profile_name": "character_1",
                "path": "character_1",
                "version": "1.0.0",
                "status": "active",
                "supported_angles": angles,
                "supported_emotions": emotions,
                "asset_count": len(angles) * len(emotions) * len(visemes)  # 4 * 8 * 9 = 288
            }
        ]
    }
    
    manifest_path = Path("assets/presets/profile_manifest.json")
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Created manifest with {len(angles)} angles, {len(emotions)} emotions, {len(visemes)} visemes")
    print(f"Total expected assets: {len(angles) * len(emotions) * len(visemes)}")
    
    # Create the profile config
    profile_config = {
        "schema_version": "2.0",
        "profile_name": "character_1",
        "version": "1.0.0",
        "created_date": "2025-10-18T00:00:00Z",
        "last_modified": "2025-10-18T00:00:00Z",
        "character_metadata": {
            "full_name": "Character 1",
            "character_type": "protagonist",
            "art_style": "semi-realistic",
            "artist": "Auto-generated",
            "notes": "Auto-generated profile structure"
        },
        "supported_angles": angles,
        "supported_emotions": {
            "core": emotions,
            "compound": []
        },
        "default_settings": {
            "default_angle": "MCU",
            "default_emotion": "trust",
            "base_intensity": 0.7
        },
        "asset_specifications": {
            "viseme_format": "PNG",
            "alpha_channel_required": True,
            "resolution_by_angle": {
                "ECU": {"width": 2048, "height": 2048},
                "CU": {"width": 1920, "height": 1920},
                "MCU": {"width": 1920, "height": 1080},
                "MS": {"width": 1920, "height": 1080}
            },
            "color_space": "sRGB",
            "bit_depth": 8
        },
        "validation": {
            "strict_mode": True,
            "allow_missing_emotions": False,
            "allow_missing_angles": False,
            "require_base_images": True
        }
    }
    
    config_path = preset_dir / "profile_config.json"
    with open(config_path, 'w') as f:
        json.dump(profile_config, f, indent=2)
    
    print(f"Created profile configuration for character_1")
    
    # Create the proper directory structure with assets
    angles_path = preset_dir / "angles"
    angles_path.mkdir(exist_ok=True)
    
    total_created = 0
    
    # Create each angle directory
    for angle in angles:
        angle_path = angles_path / angle
        angle_path.mkdir(exist_ok=True)
        
        # Create base directory for the angle
        base_path = angle_path / "base"
        base_path.mkdir(exist_ok=True)
        
        # Create placeholder base image
        base_img = Image.new('RGBA', (1920, 1080), (255, 255, 255, 0))  # Transparent white base
        base_img.save(base_path / "head.png")
        
        # Create emotions directory for the angle
        emotions_path = angle_path / "emotions"
        emotions_path.mkdir(exist_ok=True)
        
        # Create each emotion directory
        character_id = "character_1"  # Define character_id in this context
        for emotion in emotions:
            emotion_path = emotions_path / emotion
            emotion_path.mkdir(exist_ok=True)
            
            # Create placeholder viseme images for this emotion
            for viseme in visemes:
                viseme_path = emotion_path / f"{viseme}.png"
                
                # Create a placeholder viseme image (different colors for different visemes)
                # Map visemes to different colors for visual distinction
                color_map = {
                    'A': (255, 0, 0, 128),      # Red
                    'B': (0, 255, 0, 128),      # Green
                    'C': (0, 0, 255, 128),      # Blue
                    'D': (255, 255, 0, 128),    # Yellow
                    'E': (255, 0, 255, 128),    # Magenta
                    'F': (0, 255, 255, 128),    # Cyan
                    'G': (128, 0, 0, 128),      # Dark Red
                    'H': (0, 128, 0, 128),      # Dark Green
                    'X': (0, 0, 128, 128)       # Dark Blue
                }
                
                color = color_map.get(viseme, (128, 128, 128, 128))  # Default gray
                
                # Create a small image with specific color for this viseme/emotion combo
                viseme_img = Image.new('RGBA', (100, 100), color)
                viseme_img.save(viseme_path)
                
                # Create preset_config.json for this emotion if it doesn't exist yet
                emotion_config_path = emotion_path / "preset_config.json"
                if not emotion_config_path.exists():
                    # Create emotion-specific config
                    emotion_config = {
                        "preset_name": f"{character_id}_{angle}_{emotion}",
                        "character_id": character_id,
                        "angle": angle,
                        "emotion": emotion,
                        "description": f"{emotion.capitalize()} expression for {angle} view",
                        "mouth_position": {
                            "x": 960,
                            "y": 700,
                            "anchor": "center"
                        },
                        "background": {
                            "image": "background.png",
                            "type": "static"
                        },
                        "mouth_shapes": {
                            "A": "A.png",
                            "B": "B.png", 
                            "C": "C.png",
                            "D": "D.png",
                            "E": "E.png",
                            "F": "F.png",
                            "G": "G.png",
                            "H": "H.png",
                            "X": "X.png"
                        },
                        "image_specifications": {
                            "format": "PNG",
                            "bit_depth": 32,
                            "alpha_channel": True,
                            "dimensions": [512, 512],
                            "dpi": 300
                        },
                        "metadata": {
                            "created_date": datetime.now().isoformat(),
                            "version": "1.0",
                            "author": ""
                        }
                    }
                    with open(emotion_config_path, 'w') as f:
                        json.dump(emotion_config, f, indent=2)
                
                total_created += 1
                print(f"  Created: {angle_path.name}/{emotion_path.name}/{viseme_path.name}")
    
    print(f"\nSuccessfully created preset structure:")
    print(f"- Character: character_1")
    print(f"- Angles: {angles}")
    print(f"- Emotions per angle: {emotions}")
    print(f"- Visemes per emotion: {visemes}")
    print(f"- Total assets created: {total_created}")
    print(f"- Location: {preset_dir}")
    
    # Also create similar structure in profiles directory to maintain alignment
    print(f"\nCreating aligned profiles structure...")
    create_aligned_profiles_structure()
    
    return True

def create_aligned_profiles_structure():
    """Create aligned profiles structure to maintain compatibility."""
    # Copy the same structure to profiles directory
    import shutil
    
    source_preset = Path("assets/presets/character_1")
    target_profile = Path("profiles/character_1")
    
    if target_profile.exists():
        # Remove old structure if it exists
        import shutil
        shutil.rmtree(target_profile)
    
    # Copy the structure from presets to profiles
    shutil.copytree(source_preset, target_profile, dirs_exist_ok=True)
    
    print(f"Created aligned profiles structure: {target_profile}")

def validate_structure():
    """Validate the created structure."""
    print(f"\nValidating created structure...")
    
    preset_dir = Path("assets/presets/character_1")
    if not preset_dir.exists():
        print("ERROR: Preset directory does not exist")
        return False
    
    config_path = preset_dir / "profile_config.json"
    if not config_path.exists():
        print("ERROR: Profile config does not exist")
        return False
    
    angles_path = preset_dir / "angles"
    if not angles_path.exists():
        print("ERROR: Angles directory does not exist")
        return False
    
    # Load config to get expected values
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    expected_angles = config.get('supported_angles', [])
    expected_emotions = config['supported_emotions'].get('core', [])
    visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
    
    print(f"Expected angles: {expected_angles}")
    print(f"Expected emotions: {expected_emotions}")
    print(f"Expected visemes: {visemes}")
    
    actual_angles = [d.name for d in angles_path.iterdir() if d.is_dir()]
    print(f"Actual angles: {actual_angles}")
    
    valid = True
    total_found = 0
    total_expected = len(expected_angles) * len(expected_emotions) * len(visemes)
    
    for angle in expected_angles:
        angle_path = angles_path / angle
        if not angle_path.exists():
            print(f"ERROR: Missing angle directory: {angle}")
            valid = False
            continue
        
        emotions_path = angle_path / "emotions"
        if not emotions_path.exists():
            print(f"ERROR: Missing emotions directory for angle: {angle}")
            valid = False
            continue
        
        actual_emotions = [d.name for d in emotions_path.iterdir() if d.is_dir()]
        print(f"  Angle {angle}: {len(actual_emotions)} emotions found ({'OK' if set(actual_emotions) == set(expected_emotions) else 'MISMATCH'})")
        
        for emotion in expected_emotions:
            emotion_path = emotions_path / emotion
            if not emotion_path.exists():
                print(f"    ERROR: Missing emotion directory: {angle}/{emotion}")
                valid = False
                continue
            
            # Check if preset_config.json exists in emotion directory
            preset_config_path = emotion_path / "preset_config.json"
            if not preset_config_path.exists():
                print(f"    ERROR: Missing preset_config.json in {angle}/{emotion}")
                valid = False
                continue
            
            # Count viseme files
            viseme_files = list(emotion_path.glob("*.png"))
            actual_visemes = [f.stem for f in viseme_files]
            expected_count = len(visemes)
            actual_count = len(actual_visemes)
            
            if set(actual_visemes) == set(visemes):
                status = "OK"
                total_found += actual_count
            else:
                status = "MISMATCH"
                valid = False
            
            print(f"    {emotion}: {actual_count}/{expected_count} visemes {status}")
    
    print(f"\nValidation summary:")
    print(f"  Expected total assets: {total_expected}")
    print(f"  Actual total assets: {total_found}")
    print(f"  Structure valid: {valid}")
    
    return valid

def main():
    """Main function to recreate the presets structure."""
    print("LipSyncAutomation v2.0 - Presets Structure Recreation")
    print("=" * 60)
    print("Recreating presets structure according to documentation:")
    print("docs/development/Blueprint_2/Full_Blueprint_2.md")
    print()
    
    # Create the proper structure
    success = create_proper_presets_structure()
    
    if success:
        # Validate the structure
        is_valid = validate_structure()
        
        if is_valid:
            print(f"\n[SUCCESS] Presets structure recreation completed successfully!")
            print(f"The structure now follows the documented format:")
            print(f"  assets/presets/[character]/angles/[angle]/emotions/[emotion]/[visemes]")
            print(f"  With all 8 emotions predefined for each of the 4 angles")
            print(f"  Each emotion containing all 9 visemes (A-H, X)")
        else:
            print(f"\n[ERROR] Presets structure validation failed!")
            print(f"Check the errors above and correct the structure.")
    else:
        print(f"\n[ERROR] Failed to create presets structure!")

if __name__ == "__main__":
    main()