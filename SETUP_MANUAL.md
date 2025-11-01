# LipSyncAutomation v2.0 Complete Setup Manual

## Table of Contents
1. [System Overview](#system-overview)
2. [System Requirements](#system-requirements)
3. [Installation and Setup](#installation-and-setup)
4. [Configuration Setup](#configuration-setup)
5. [Character Profile Creation](#character-profile-creation)
6. [Video Generation Process](#video-generation-process)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced-usage)

## System Overview

LipSyncAutomation v2.0 is an advanced audio-to-video automation system that combines psycho-cinematic principles with emotional analysis to generate emotionally-responsive video content. The system uses AI-driven cinematographic decision-making to create dynamic visual experiences that adapt camera angles, distances, and compositions based on the emotional content of audio input.

### Key Capabilities
- **Audio Emotion Recognition**: Advanced emotion detection using Audio2Emotion models with 8-emotion taxonomy
- **Psycho-Cinematic Mapping**: Maps emotional and psychological states to cinematographically appropriate shot distances, angles, and transitions
- **Tension Analysis Engine**: Calculates narrative tension and emotional intensity to inform shot selection
- **Grammar Validation**: Validates shot sequences against cinematographic rules (32 rules: 18 hard, 14 soft)
- **Rhubarb Lip Sync**: Phoneme detection from audio for lip-sync synchronization
- **FFmpeg Integration**: Video rendering and encoding with multi-scene composition

## System Requirements

### Minimum Hardware Requirements
- **CPU**: Intel/AMD multi-core processor (4+ cores recommended)
- **RAM**: 8GB minimum, 16GB+ recommended
- **Storage**: 10GB+ free space for models and temporary files
- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Software Dependencies
- **Python**: 3.8 or higher
- **FFmpeg**: For video processing and rendering
- **Wine**: On Linux/macOS for Rhubarb compatibility (required if using Rhubarb on non-Windows systems)
- **Audio2Emotion Model**: ONNX model file for emotion analysis

### Software Versions
- Python 3.8+
- FFmpeg 4.0+
- Wine 5.0+ (Linux/macOS only)

## Installation and Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/LipSyncAutomation.git
cd LipSyncAutomation
```

### 2. Create Virtual Environment
```bash
# On Windows
python -m venv venv
venv\Scripts\Activate.ps1

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Install Additional Dependencies
The system requires additional dependencies for emotion analysis:

```bash
pip install librosa soundfile onnxruntime
```

If you encounter issues with librosa, you may also need to install additional audio processing dependencies:

**On Windows:**
```bash
pip install numpy==1.23.5
pip install librosa soundfile onnxruntime
```

**On macOS/Linux:**
```bash
pip install numpy==1.23.5
pip install librosa soundfile onnxruntime
# You may also need system dependencies:
# Ubuntu: sudo apt install libsndfile1-dev
# macOS: brew install libsndfile
```

### 4. Install FFmpeg
#### Windows:
```bash
# Using winget
winget install Gyan.FFmpeg

# Using Chocolatey
choco install ffmpeg
```

#### macOS:
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

### 5. Configure Rhubarb Lip Sync
The system includes Rhubarb Lip Sync in the `tools/rhubarb` directory:

#### For Windows:
- Rhubarb executable: `tools/rhubarb/rhubarb.exe`
- Update `config/settings.json` to: `"rhubarb_path": "tools/rhubarb/rhubarb.exe"`

#### For macOS/Linux:
**Option A**: Install Wine to run the Windows executable
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install wine

# On macOS with Homebrew
brew install --cask wine
```

**Option B**: Use native Rhubarb installation (if available)
```bash
# Download and install Rhubarb natively (if available for your system)
# Update config/settings.json accordingly
```

#### Update the configuration:
Edit `config/settings.json` to match your system:

**Windows:**
```json
{
  "system": {
    "rhubarb_path": "tools/rhubarb/rhubarb.exe",
    "ffmpeg_path": "ffmpeg"
  }
}
```

**macOS/Linux with Wine:**
```json
{
  "system": {
    "rhubarb_path": "./scripts/rhubarb_wrapper.sh",
    "ffmpeg_path": "ffmpeg"
  }
}
```

## Configuration Setup

### 1. Model Setup
The system requires an Audio2Emotion model for emotion analysis. Create the models directory and place the ONNX model:

```bash
mkdir -p models/audio2emotion
```

Place your Audio2Emotion ONNX model at:
```
./models/audio2emotion/network.onnx
```

If you don't have this model, you can:
- Train your own using Audio2Emotion framework
- Download a pre-trained model (instructions vary by model provider)
- Use alternative emotion analysis backends by modifying the configuration

### 2. Update Configuration File
Edit `config/settings.json` to match your system setup:

```json
{
  "system": {
    "profiles_directory": "./profiles",
    "cache_directory": "./cache",
    "temp_directory": "./temp",
    "log_directory": "./logs",
    "rhubarb_path": "./scripts/rhubarb_wrapper.sh",  // Change for Windows: "tools/rhubarb/rhubarb.exe"
    "ffmpeg_path": "ffmpeg"  // Or full path: "/usr/bin/ffmpeg" or "C:/ffmpeg/bin/ffmpeg.exe"
  },
  // ... rest of configuration
}
```

#### Platform-specific Configuration:

**Windows:**
```json
{
  "system": {
    "rhubarb_path": "tools/rhubarb/rhubarb.exe",
    "ffmpeg_path": "ffmpeg"
  },
  "emotion_analysis": {
    "model_path": ".\\models\\audio2emotion\\network.onnx",
    "use_gpu": true
  }
}
```

**macOS/Linux:**
```json
{
  "system": {
    "rhubarb_path": "./scripts/rhubarb_wrapper.sh",
    "ffmpeg_path": "ffmpeg"
  },
  "emotion_analysis": {
    "model_path": "./models/audio2emotion/network.onnx",
    "use_gpu": true
  }
}
```

### 3. Test Dependencies
Run the validation script to ensure all dependencies are correctly configured:

```bash
# First, run a validation to check dependencies
python -c "
from lipsync_automation.utils.validators import validate_dependencies
import json

with open('config/settings.json', 'r') as f:
    config = json.load(f)

result = validate_dependencies(
    config['system']['rhubarb_path'],
    config['system']['ffmpeg_path']
)
print('Dependency validation:', 'PASSED' if result else 'FAILED')
"
```

## Character Profile Creation

### 1. Understanding Profile Structure
The system uses character profiles organized in a multi-angle, multi-emotion structure:

```
profiles/
└── character_name/
    ├── profile_config.json           # Profile configuration
    └── angles/
        ├── ECU/                      # Extreme Close-up
        │   ├── base/
        │   │   └── head.png          # Base character image
        │   └── emotions/
        │       ├── joy/
        │       │   ├── A.png         # Viseme A
        │       │   ├── B.png         # Viseme B
        │       │   ├── ...           # All 9 visemes (A-H, X)
        │       │   └── background.png
        │       └── ...               # Other emotions
        ├── CU/                       # Close-up
        ├── MCU/                      # Medium Close-up
        └── MS/                       # Medium Shot
```

### 2. Create a New Character Profile

#### Option A: Using the Profile Template Creator (Recommended)
```bash
# Create a new profile template
python -c "
from lipsync_automation.core.profile_manager import ProfileManager
import json

with open('config/settings.json', 'r') as f:
    config = json.load(f)

pm = ProfileManager(config=config)
profile_path = pm.create_profile_template(
    profile_name='my_character',
    angles=['ECU', 'CU', 'MCU', 'MS'],
    emotions=['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation']
)
print(f'Profile template created at: {profile_path}')
"
```

#### Option B: Manual Profile Creation
1. Create the directory structure manually:

```bash
mkdir -p profiles/my_character/angles/{ECU,CU,MCU,MS}/emotions/{joy,sadness,anger,fear,surprise,disgust,trust,anticipation}
```

2. Create a `profile_config.json` file:

```json
{
  "schema_version": "2.0",
  "profile_name": "my_character",
  "version": "1.0.0",
  "created_date": "2025-01-01T00:00:00Z",
  "last_modified": "2025-01-01T00:00:00Z",
  "character_metadata": {
    "full_name": "My Character",
    "character_type": "protagonist",
    "art_style": "semi-realistic",
    "artist": "Your Name",
    "notes": "Character designed for dialogue scenes"
  },
  "supported_angles": ["ECU", "CU", "MCU", "MS"],
  "supported_emotions": {
    "core": ["joy", "sadness", "anger", "fear", "surprise", "disgust", "trust", "anticipation"],
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

### 3. Add Character Assets

#### Required Assets
Each emotion directory needs 9 viseme images:
- `A.png` through `H.png` - Mouth shapes for different phonemes
- `X.png` - Neutral/transition shape

#### Asset Specifications
- **Format**: PNG with transparent background (RGBA)
- **Resolution**: As specified in `profile_config.json`
- **Color Space**: sRGB
- **Bit Depth**: 8-bit

#### Create Placeholder Assets
Use the provided script to create placeholder assets:

```bash
python scripts/create_placeholders.py --profile my_character
```

### 4. Validate Profile
```bash
# Validate your profile
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

## Video Generation Process

### 1. Prepare Audio File
- **Format**: WAV, MP3, or other FFmpeg-supported formats
- **Sample Rate**: 16kHz or 22.05kHz recommended
- **Bit Depth**: 16-bit or 24-bit
- **Channels**: Mono or Stereo (Mono recommended)

### 2. Basic Video Generation
```bash
# Generate a single video from audio
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output output/my_video.mp4 --profile character_1
```

### 4. Advanced Video Generation

#### With Cinematic Modes
```bash
# Emotional mode - prioritizes emotion-based shot selection
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output output/my_video.mp4 --profile character_1 --cinematic-mode emotional

# Tension mode - prioritizes tension-based shot selection
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output output/my_video.mp4 --profile character_1 --cinematic-mode tension

# Balanced mode - balances emotion and tension (default)
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output output/my_video.mp4 --profile character_1 --cinematic-mode balanced
```

#### With Verbose Logging
```bash
# Enable detailed logging for debugging
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output output/my_video.mp4 --profile character_1 --verbose
```

#### Disable Caching
```bash
# Process without using cached data
python lipsync_automation/cli.py --audio assets/audio/raw/test.wav --output output/my_video.mp4 --profile character_1 --no-cache
```

### 5. Batch Processing
For multiple audio files:

```bash
# Process all audio files in a directory
python lipsync_automation/batch_processor.py --input assets/audio/raw --output output/batch --profile character_1 --workers 4
```

### 6. List Available Profiles
```bash
# View all available character profiles
python lipsync_automation/cli.py --list-profiles
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Rhubarb Not Found Error
**Error**: `Rhubarb not found` or `FileNotFoundError`

**Solution**:
- Check that `rhubarb_path` in `config/settings.json` is correct
- On Windows: `"rhubarb_path": "tools/rhubarb/rhubarb.exe"`
- On macOS/Linux: `"rhubarb_path": "./scripts/rhubarb_wrapper.sh"`
- Ensure Wine is installed if using Linux/macOS
- **Note**: Make sure to check both `config/settings.json` in the project root AND `lipsync_automation/config/settings.json`, as both files need to have the correct path configuration

#### 2. FFmpeg Not Found Error
**Error**: `ffmpeg not found` or `command not found`

**Solution**:
- Verify FFmpeg is installed and accessible from command line
- Check that `ffmpeg_path` in `config/settings.json` is correct
- Use full path if needed: `"/usr/bin/ffmpeg"` or `"C:/ffmpeg/bin/ffmpeg.exe"`

#### 3. Emotion Analysis Issues
**Error**: `Model not found` or `Emotion analysis failed`

**Solution**:
- Verify that the Audio2Emotion ONNX model is at the correct path
- Check that `"model_path"` in `config/settings.json` points to the correct location
- Ensure the model file is named `network.onnx` in the `./models/audio2emotion/` directory

#### 4. Profile Not Found
**Error**: `Profile 'character_name' not found`

**Solution**:
- Verify the profile exists in the `profiles/` directory
- Check that the profile name matches exactly (case-sensitive)
- Run `python lipsync_automation/cli.py --list-profiles` to see available profiles

#### 5. Audio File Issues
**Error**: `Audio file not supported` or `Could not process audio`

**Solution**:
- Ensure audio file is in a supported format (WAV, MP3, etc.)
- Check that the file exists at the specified path
- Verify the file is not corrupted

#### 6. Configuration Path Issues
**Error**: `Rhubarb not accessible: [Errno 2] No such file or directory` with a path that seems to be missing directory components

**Solution**:
- This issue occurs when there are multiple configuration files with different rhubarb_path values
- Check both configuration files to ensure they have the correct path:
  - `config/settings.json` (project root)
  - `lipsync_automation/config/settings.json` (subdirectory)
- Both files must have consistent rhubarb_path values matching your setup:
  - For Windows: `"rhubarb_path": "tools/rhubarb/rhubarb.exe"`
  - For macOS/Linux: `"rhubarb_path": "./scripts/rhubarb_wrapper.sh"`

#### 7. Memory Issues
**Error**: `MemoryError` or `Out of memory`

**Solution**:
- Use shorter audio files for initial testing
- Adjust processing settings in `config/settings.json`
- Close other applications to free up RAM
- Reduce model complexity if possible

### Validation Scripts

#### Check All Dependencies
```bash
python -c "
import json
from lipsync_automation.utils.validators import validate_dependencies
from lipsync_automation.core.profile_manager import ProfileManager

with open('config/settings.json', 'r') as f:
    config = json.load(f)

# Test dependencies
deps_ok = validate_dependencies(
    config['system']['rhubarb_path'],
    config['system']['ffmpeg_path']
)
print(f'Dependencies: {\"OK\" if deps_ok else \"ERROR\"}')

# Test profile manager
try:
    pm = ProfileManager(config=config)
    profiles = pm.list_profiles()
    print(f'Profiles: Found {len(profiles)} profiles')
except Exception as e:
    print(f'Profiles: ERROR - {e}')
"
```

#### Test Audio Processing
```bash
# Test with included sample audio
python -c "
from lipsync_automation.utils.audio_processor import AudioProcessor
import json

with open('config/settings.json', 'r') as f:
    config = json.load(f)

audio_proc = AudioProcessor(config=config)
try:
    features = audio_proc.extract_audio_features('assets/audio/raw/test.wav')
    print('Audio processing: OK')
    print(f'Features extracted: {len(features) if features else \"None\"}')
except Exception as e:
    print(f'Audio processing: ERROR - {e}')
"
```

### Log Files
Check log files for detailed error information:
- `lipsync_automation.log` - Main application logs
- `lipsync_errors.log` - Error logs only
- Log files are located in the project root directory

## Advanced Usage

### 1. Custom Cinematographic Rules
Modify cinematographic behavior by adjusting rules in:
- `config/cinematography_rules.json`
- `config/shot_purpose_profiles.json`
- `config/transform_presets.json`

### 2. GPU Acceleration
Enable GPU acceleration in `config/settings.json`:
```json
{
  "emotion_analysis": {
    "use_gpu": true
  }
}
```

### 3. Custom Viseme Mappings
Adjust viseme to mouth shape mappings in `config/settings.json`:
```json
{
  "viseme_mapping": {
    "A": "mouth_A.jpg",
    "B": "mouth_B.jpg",
    // ... etc
  }
}
```

### 4. Processing Performance
Adjust parallel processing in `config/settings.json`:
```json
{
  "processing": {
    "parallel_workers": 4
  }
}
```

### 5. Cache Management
The system caches emotion analysis and phoneme data:
- Cache location: `cache/` directory
- Enable/disable in `config/settings.json`
- Clear cache with `--no-cache` flag or by deleting cache directory

### 6. Custom Profile Creation
For advanced users, create custom profiles with different angles or emotions:

```python
from lipsync_automation.core.profile_manager import ProfileManager
import json

with open('config/settings.json', 'r') as f:
    config = json.load(f)

pm = ProfileManager(config=config)

# Create profile with custom angles and emotions
custom_profile_path = pm.create_profile_template(
    profile_name='advanced_character',
    angles=['ECU', 'CU', 'MCU', 'MS', 'MLS', 'LS'],  # Extended shot distances
    emotions=['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation', 'calm', 'excitement']  # Extended emotions
)
```

### 7. Integration with Other Tools
The system outputs standard video formats that can be integrated with:
- Video editing software (Adobe Premiere, Final Cut Pro, DaVinci Resolve)
- Streaming platforms (YouTube, Twitch, Vimeo)
- Game engines (Unity, Unreal, Godot)
- Web applications (using HTML5 video)

### 8. Performance Optimization
For optimal performance:
- Use SSD storage for faster asset loading
- Increase RAM for processing large files
- Use GPU for emotion analysis if available
- Process files in batches for better performance

### 9. Custom Build Process
For deployment or distribution:
```bash
# Create a distributable package
python setup.py sdist bdist_wheel

# Install in development mode
pip install -e .
```

### 10. Monitoring and Analytics
The system generates metadata with each video creation:
- Processing time and performance metrics
- Emotion analysis results
- Shot selection decisions
- Technical quality metrics

Review the metadata output after each video generation for performance insights.