# LipSyncAutomation Character Asset Creation Manual

## Table of Contents
1. [Overview](#overview)
2. [Viseme System Explained](#viseme-system-explained)
3. [Asset Structure and Organization](#asset-structure-and-organization)
4. [Creating Your Character Profile](#creating-your-character-profile)
5. [Designing Viseme Images](#designing-viseme-images)
6. [Creating Base Images](#creating-base-images)
7. [Emotion Variations](#emotion-variations)
8. [Background and Compositing Assets](#background-and-compositing-assets)
9. [File Format and Technical Requirements](#file-format-and-technical-requirements)
10. [Testing Your Character](#testing-your-character)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

## Overview

This manual will guide you through creating complete character assets for use in the LipSyncAutomation system. The system uses a sophisticated viseme-based animation system that requires you to create multiple image assets for each character, organized by shot distance/angle and emotional state.

### What You'll Need to Create
- Base character images for each shot distance/angle
- Viseme images for each emotion in each shot distance/angle
- Background images for compositing
- A profile configuration file

## Viseme System Explained

### What are Visemes?
Visemes are visual representations of phonemes (speech sounds). The human mouth makes different shapes for different sounds, and visemes represent these shapes in animation. The LipSyncAutomation system uses 9 visemes:

- **A**: Mouth open wide (vowel sounds like "ah", "oh", "uh")
- **B**: Closed mouth (sounds like "b", "p", "m")
- **C**: Wide open mouth (vowel sounds like "ee", "ay")
- **D**: Slightly open mouth (sounds like "d", "t", "ng")
- **E**: Rounded lips (sounds like "o", "w")
- **F**: Teeth showing (sounds like "f", "v")
- **G**: Tongue visible (sounds like "th", "z", "s")
- **H**: Half-open mouth (transitional sounds)
- **X**: Neutral/Rest position (when not speaking)

### How Visemes Work in the System
The system uses Rhubarb Lip Sync to analyze your audio and determine which phoneme is being spoken at each moment. It then maps this to the appropriate viseme image for smooth animation that matches the speech.

## Asset Structure and Organization

### Directory Structure
Your character assets will be organized in a hierarchical structure:

```
profiles/
└── your_character_name/
    ├── profile_config.json                 # Main configuration file
    └── angles/
        ├── ECU/                          # Extreme Close-up
        │   ├── base/
        │   │   └── head.png              # Base character image (no mouth animation)
        │   └── emotions/
        │       ├── joy/
        │       │   ├── A.png             # Joy viseme A
        │       │   ├── B.png             # Joy viseme B
        │       │   ├── ...
        │       │   ├── H.png             # Joy viseme H
        │       │   ├── X.png             # Joy rest position
        │       │   └── background.png    # Background for compositing
        │       └── [other emotions]/
        ├── CU/                           # Close-up
        ├── MCU/                          # Medium Close-up
        └── MS/                           # Medium Shot
```

### Shot Distances/Angles
The system supports multiple shot distances with different technical specifications:

- **ECU (Extreme Close-up)**: 2048x2048 pixels - Focus on mouth/face details
- **CU (Close-up)**: 1920x1920 pixels - Face and upper chest
- **MCU (Medium Close-up)**: 1920x1080 pixels - From chest to head
- **MS (Medium Shot)**: 1920x1080 pixels - From waist to head

## Creating Your Character Profile

### Step 1: Profile Configuration
Create a `profile_config.json` file for your character. Here's a template:

```json
{
  "schema_version": "2.0",
  "profile_name": "your_character_name",
  "version": "1.0.0",
  "created_date": "2025-01-01T00:00:00Z",
  "last_modified": "2025-01-01T00:00:00Z",
  "character_metadata": {
    "full_name": "Your Character Full Name",
    "character_type": "protagonist", // protagonist, antagonist, side_character, etc.
    "art_style": "semi-realistic", // semi-realistic, cartoon, anime, etc.
    "artist": "Your Name",
    "notes": "Character description and notes"
  },
  "supported_angles": ["ECU", "CU", "MCU", "MS"],
  "supported_emotions": {
    "core": [
      "joy",
      "sadness", 
      "anger",
      "fear",
      "surprise",
      "disgust",
      "trust",
      "anticipation"
    ],
    "compound": []
  },
  "default_settings": {
    "default_angle": "MCU",
    "default_emotion": "trust",
    "base_intensity": 0.7
  },
  "asset_specifications": {
    "viseme_format": "PNG",
    "alpha_channel_required": true,
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
    "strict_mode": true,
    "allow_missing_emotions": false,
    "allow_missing_angles": false,
    "require_base_images": true
  }
}
```

### Step 2: Create the Directory Structure
Use this command to create the complete directory structure:

```bash
# Create complete structure for your character (replace 'my_character' with your character name)
mkdir -p profiles/my_character/angles/{ECU,CU,MCU,MS}/base
mkdir -p profiles/my_character/angles/{ECU,CU,MCU,MS}/emotions/{joy,sadness,anger,fear,surprise,disgust,trust,anticipation}
```

Or use the automated script:
```bash
python -c "
import json
from pathlib import Path

character_name = 'my_character'
config = {
    'supported_angles': ['ECU', 'CU', 'MCU', 'MS'],
    'supported_emotions': {
        'core': ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation']
    }
}

# Create directory structure
for angle in config['supported_angles']:
    for emotion in config['supported_emotions']['core']:
        Path(f'profiles/{character_name}/angles/{angle}/emotions/{emotion}').mkdir(parents=True, exist_ok=True)
    Path(f'profiles/{character_name}/angles/{angle}/base').mkdir(parents=True, exist_ok=True)
    
print('Directory structure created successfully!')
"
```

## Designing Viseme Images

### Understanding Viseme Design
Each viseme should represent your character's mouth in that specific phonetic shape. Here's how to approach each viseme:

#### Viseme A: Wide Open Mouth
- Mouth open in a wide "O" or "A" shape
- Shows teeth and tongue position for vowel sounds
- Use for sounds like "ah", "oh", "uh", "aw"

#### Viseme B: Closed Mouth  
- Mouth completely closed
- Used for "B", "P", "M" sounds where lips touch
- Should look natural when lips are sealed

#### Viseme C: Stretched Mouth
- Mouth stretched wide horizontally
- Used for "E" and "I" vowel sounds
- Similar to a wide smile or "ee" sound

#### Viseme D: Slightly Open
- Mouth slightly open with relaxed jaw
- For consonants like "D", "T", "N", "L"
- Tongue may be slightly visible

#### Viseme E: Rounded/Protruded
- Lips rounded and slightly protruded
- For "O", "W", "U" sounds
- Like pursing lips for kissing

#### Viseme F: Teeth Show
- Front teeth visible with lips slightly parted
- For "F", "V" sounds
- Upper teeth touch lower lip

#### Viseme G: Tongue Visible
- Tongue between teeth or visible
- For "TH", "Z", "S" sounds
- Can show tongue tip or side

#### Viseme H: Half-Open
- Mouth halfway between closed and open
- Transitional state between other visemes
- Neutral speaking position

#### Viseme X: Neutral/Rest
- Mouth in neutral, relaxed position
- When not speaking or between words
- Natural mouth position

### Design Guidelines for Maximum Visual Impact

1. **Consistency**: All visemes should look like they belong to the same character
2. **Exaggeration**: Exaggerate mouth shapes slightly for better visual clarity
3. **Anatomy**: Respect facial anatomy - don't make impossible mouth shapes
4. **Style**: Match the character's overall art style
5. **Emotion Integration**: Each emotion will have subtle variations of each viseme

## Creating Base Images

### Base Image Requirements
- Transparent background (PNG with alpha channel)
- Shows the character without animated mouth elements
- Should include all elements except the mouth area
- Will be composited with viseme images

### Base Image Tips
1. **Complete Character**: Include head, shoulders, and clothing
2. **Mouth Area**: Leave mouth area transparent or cover with neutral face
3. **Consistent Positioning**: Keep character in same pose for all angles
4. **High Quality**: Use the resolution required for each angle

### Example Base Image Structure
- **ECU**: Focus on face, maybe show shoulders
- **CU**: Face and upper chest
- **MCU**: Head to chest area
- **MS**: Full upper body

## Emotion Variations

### Why Emotions Matter
The system analyzes audio for emotional content and selects appropriate emotional variations of visemes. This creates more natural and expressive animation.

### Creating Emotion-Specific Variations
For each emotion, your visemes should have subtle but meaningful differences:

#### Joy
- Slightly more open mouth shapes
- Possible teeth showing in more visemes
- Eyes might be brighter or more expressive

#### Sadness  
- Softer, more closed mouth shapes
- Less exaggerated movements
- Possible tears or downturned features

#### Anger
- More aggressive mouth shapes
- Tighter lips in some visemes
- More dramatic expressions

#### Fear
- More tense mouth positions
- Slightly wider eyes
- Tension in facial features

#### Surprise
- More exaggerated shapes
- Wider mouth openings
- Raised eyebrows may be visible

#### Disgust
- Wrinkled nose in some visemes
- More closed or turned away mouth shapes
- Expression of distaste

#### Trust
- Relaxed, open expressions
- Natural mouth positions
- Warm, welcoming feel

#### Anticipation
- Forward-leaning or alert expressions
- Mouth ready for speech
- Eager appearance

## Background and Compositing Assets

### Background Image Requirements
- Transparent background or matching background color
- Should blend well with other shots
- May include environmental elements
- Same resolution as the character images

### Background Creation Tips
1. **Simple**: Avoid overly complex backgrounds that distract from character
2. **Consistent**: Match the mood of the character
3. **Layered**: Consider multiple depth layers if needed
4. **Lighting**: Match the lighting of character images

## File Format and Technical Requirements

### Required File Formats
- **Image Format**: PNG with Alpha Channel (RGBA)
- **Color Space**: sRGB
- **Bit Depth**: 8-bit
- **File Names**: A.png, B.png, C.png, D.png, E.png, F.png, G.png, H.png, X.png

### Technical Requirements by Shot Distance

| Shot Distance | Resolution | Purpose |
|---------------|------------|---------|
| ECU (Extreme Close-up) | 2048x2048 | Detailed face/mouth animation |
| CU (Close-up) | 1920x1920 | Face-centered shot |
| MCU (Medium Close-up) | 1920x1080 | Standard portrait shot |
| MS (Medium Shot) | 1920x1080 | Full upper body shot |

### Image Quality Requirements
- **No Compression Artifacts**: PNG format prevents lossy compression
- **Alpha Channel**: Required for proper compositing
- **Consistent Size**: All images must be exactly the resolution specified
- **Proper Alignment**: All visemes should align perfectly when layered

## Testing Your Character

### Before Adding Assets to Your Character

First, you can create placeholder images to test the system structure:
```bash
python scripts/create_placeholders.py --profile my_character
```

### Validating Your Profile
```bash
python -c "
from lipsync_automation.core.profile_manager import ProfileManager
import json

with open('config/settings.json', 'r') as f:
    config = json.load(f)

pm = ProfileManager(config=config)
validation = pm.validate_profile('my_character')
print('Profile validation result:')
print(f'Valid: {validation[\"valid\"]}')
if validation['errors']:
    print('Errors:', validation['errors'])
if validation['warnings']:
    print('Warnings:', validation['warnings'])
"
```

### Testing with Sample Audio
```bash
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output test_my_character.mp4 --profile my_character
```

### Step-by-Step Asset Creation Process

1. **Plan Your Character**
   - Decide on art style and personality
   - Plan the range of expressions
   - Sketch preliminary mouth shapes

2. **Create Base Images**
   - Design the character without animated mouth
   - Create for each shot distance
   - Ensure proper transparency and resolution

3. **Design Neutral Visemes**
   - Create basic viseme shapes for one emotion (e.g., trust)
   - Ensure they align properly with base images
   - Test lip-sync animation with one emotion

4. **Add Other Emotions**
   - Create viseme variations for each emotion
   - Maintain consistency while adding emotional differences
   - Test each emotion individually

5. **Create Background Assets**
   - Design backgrounds that complement your character
   - Ensure proper resolution and transparency

6. **Final Testing and Refinement**
   - Test complete audio-to-video pipeline
   - Refine visemes based on results
   - Ensure smooth transitions between visemes

## Best Practices

### Animation Quality
- **Frame Rate Consistency**: Visemes will be blended based on audio timing
- **Smooth Transitions**: Ensure visemes blend naturally together
- **Timing Sensitivity**: The system will select visemes based on precise audio timing

### Artistic Considerations
- **Style Consistency**: All images should feel like they belong to the same character
- **Exaggeration Balance**: Slight exaggeration improves visual clarity without looking cartoonish
- **Facial Expression**: Include subtle facial changes that complement the mouth movements

### Technical Best Practices
- **File Size**: Large PNG files will slow down processing; optimize without losing quality
- **Memory Management**: The system loads all visemes into memory for performance
- **Backup**: Keep source files for easy modifications later

### Performance Optimization
- **Image Compression**: Use PNG optimization tools to reduce file size
- **Resolution Matching**: Ensure all images are exactly the required resolution
- **Color Consistency**: Match color grading across all images and emotions

## Troubleshooting

### Common Issues and Solutions

#### 1. Viseme Not Displaying Correctly
**Symptoms**: Mouth doesn't seem to move or shows incorrect shapes
**Solutions**:
- Check that A.png, B.png, etc. are in the correct emotion folder
- Verify file names match exactly (case-sensitive)
- Ensure images are the correct resolution
- Confirm PNG has alpha channel

#### 2. Character Appears with Wrong Emotion
**Symptoms**: Character shows unexpected emotional expressions
**Solutions**:
- Check that your profile_config.json lists all supported emotions
- Verify emotional images exist in the correct folders
- Ensure emotion detection is working with your audio

#### 3. Poor Lip Sync Quality
**Symptoms**: Mouth movements don't match speech sounds
**Solutions**:
- Verify Rhubarb lip sync is working properly
- Check that visemes match the intended phonemes
- Adjust or fine-tune your viseme designs

#### 4. Performance Issues
**Symptoms**: Slow processing or memory errors
**Solutions**:
- Optimize PNG file sizes
- Reduce number of angles if not all are needed
- Close other applications to free up RAM

#### 5. Compositing Problems
**Symptoms**: Character doesn't composite properly over background
**Solutions**:
- Verify PNG files have alpha channels enabled
- Check that base images properly align with viseme images
- Ensure background.png files exist in each emotion directory

### Validation Checklist
Before finalizing your character, ensure:

- [ ] Directory structure matches required format
- [ ] All required viseme files exist (A, B, C, D, E, F, G, H, X)
- [ ] All files are PNG format with alpha channels
- [ ] All images are the correct resolution
- [ ] All emotions have complete viseme sets
- [ ] Base images exist for all angles
- [ ] Background images exist for all emotions in all angles
- [ ] profile_config.json is properly formatted

### Testing Workflow
1. **Validate Structure**: Use the validation script to check directory completeness
2. **Test Individual Components**: Try one emotion/angle combination first
3. **Test Full Character**: Once individual components work, test complete character
4. **Refine Based on Results**: Make adjustments based on test output video

## Advanced Techniques

### Multi-Layer Animation
Consider creating additional layers for:
- Tongue movements (for F, V, TH sounds)
- Jaw movement (for opening/closing)
- Facial expressions that change with emotion
- Eye movements that sync with speech

### Style Variations
Create different art styles for the same character:
- Casual vs. formal clothing
- Different hair styles
- Seasonal variations
- Special event versions

### Complex Emotions
For more nuanced animation:
- Create compound emotion visemes
- Blend between emotions during transitions
- Add micro-expressions for more natural feel

This comprehensive guide should help you create complete character assets for the LipSyncAutomation system. Remember to start simple with basic visemes and gradually add complexity as you become more familiar with the system.