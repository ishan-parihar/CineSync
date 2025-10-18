import os
from PIL import Image
from pathlib import Path

# Create placeholder images for each viseme for each emotion
profile_dir = Path("profiles/character_1")
visemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
emotions = ['neutral', 'joy', 'surprise', 'anger', 'fear', 'disgust', 'sadness', 'trust', 'anticipation']

# Create directories and placeholder images
for emotion in emotions:
    # Create emotion directory
    emotion_dir = profile_dir / 'angles' / 'front' / 'emotions' / emotion
    emotion_dir.mkdir(parents=True, exist_ok=True)
    
    # Create placeholder images for each viseme
    for viseme in visemes:
        img_path = emotion_dir / f"{viseme}.png"
        # Create a simple 100x100 pixels placeholder image with different colors for each viseme
        img = Image.new('RGBA', (100, 100), (50, 50, 50, 255))  # Gray
        img.save(img_path)
        print(f"Created: {img_path}")

print("Placeholder images created successfully!")