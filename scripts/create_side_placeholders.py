import os
from PIL import Image
from pathlib import Path
import shutil

# Create side view directories and copy placeholder images
profile_dir = Path("profiles/character_1")
visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
emotions = ['neutral', 'joy', 'surprise', 'anger', 'fear', 'disgust', 'sadness', 'trust', 'anticipation']

# Create directories and copy images for side view
for emotion in emotions:
    # Create emotion directory for side view
    emotion_dir = profile_dir / 'angles' / 'side' / 'emotions' / emotion
    emotion_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy placeholder images from front view for each viseme
    for viseme in visemes:
        source_img = profile_dir / 'angles' / 'front' / 'emotions' / 'trust' / f"{viseme}.png"
        dest_img = emotion_dir / f"{viseme}.png"
        shutil.copy2(source_img, dest_img)
        print(f"Copied: {dest_img}")

print("Side view placeholder images created successfully!")