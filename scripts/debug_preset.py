import os
import sys
import json
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Add project root to path
sys.path.insert(0, os.getcwd())

print(f"Current working directory: {os.getcwd()}")
print(f"Directory exists assets/presets: {os.path.exists('assets/presets')}")
print(f"Directory exists assets/presets/character_1: {os.path.exists('assets/presets/character_1')}")

# Check the configuration file path
config_path = "shared/config/settings.json"
print(f"Config file exists: {os.path.exists(config_path)}")

preset_dir = "assets/presets"  # Default fallback
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        config = json.load(f)
    preset_dir = config['presets']['preset_directory']
    print(f"Preset directory from config: {preset_dir}")
else:
    print("Config file not found, using default preset directory: assets/presets")

# Let's manually test the preset manager logic step by step
preset_path = Path(preset_dir)
print(f"Preset path as Path: {preset_path}")
print(f"Resolved preset path: {preset_path.resolve()}")
print(f"Preset path exists: {preset_path.exists()}")

# Check character directories
if preset_path.exists():
    print("\nCharacter directories:")
    for character_dir in preset_path.iterdir():
        print(f"  Character: {character_dir.name}, is_dir: {character_dir.is_dir()}")
        if character_dir.is_dir() and character_dir.name != 'preset_template':
            print(f"    Processing character: {character_dir.name}")
            angles_dir = character_dir / 'angles'
            print(f"    Angles dir: {angles_dir}, exists: {angles_dir.exists()}, is_dir: {angles_dir.is_dir()}")
            if angles_dir.exists() and angles_dir.is_dir():
                for angle_dir in angles_dir.iterdir():
                    print(f"      Angle: {angle_dir.name}, is_dir: {angle_dir.is_dir()}")
                    if angle_dir.is_dir():
                        # Look for base config in angle directory
                        base_config_file = angle_dir / 'base' / 'preset_config.json'
                        print(f"        Base config file: {base_config_file}, exists: {base_config_file.exists()}")
                        
                        # Look for emotions
                        emotions_dir = angle_dir / 'emotions'
                        print(f"        Emotions dir: {emotions_dir}, exists: {emotions_dir.exists()}")
                        if emotions_dir.exists():
                            for emotion_dir in emotions_dir.iterdir():
                                print(f"          Emotion: {emotion_dir.name}, is_dir: {emotion_dir.is_dir()}")
                                if emotion_dir.is_dir():
                                    config_file = emotion_dir / 'preset_config.json'
                                    print(f"            Config file: {config_file}, exists: {config_file.exists()}")
                                    if config_file.exists():
                                        with open(config_file, 'r') as f:
                                            config_data = json.load(f)
                                        print(f"              Config name: {config_data.get('preset_name', 'No name')}")