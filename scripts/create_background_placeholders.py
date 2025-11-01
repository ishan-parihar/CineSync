#!/usr/bin/env python3
"""Create background placeholder images for all emotion directories"""

import os
import shutil
from pathlib import Path

def create_background_placeholders():
    """Create background.png files in each emotion directory"""
    # Create placeholder background images
    for angle in ['CU', 'ECU', 'MCU', 'MS']:
        for emotion in ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation']:
            emotion_dir = Path(f'assets/presets/character_1/angles/{angle}/emotions/{emotion}')
            base_image = Path(f'assets/presets/character_1/angles/{angle}/base/head.png')
            target_image = emotion_dir / 'background.png'
            
            if base_image.exists():
                shutil.copy2(base_image, target_image)
                print(f'Created background.png in {emotion_dir}')
            else:
                print(f'Base image not found: {base_image}. Creating empty placeholder.')
                # Create a simple placeholder if no base image exists
                with open(target_image, 'wb') as f:
                    # Write a simple 1x1 pixel PNG placeholder (not an actual PNG, but for testing purposes)
                    f.write(b'Dummy background image')
                
if __name__ == "__main__":
    create_background_placeholders()
    print("Background placeholder creation completed!")