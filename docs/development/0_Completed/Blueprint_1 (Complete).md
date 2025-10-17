# Rhubarb Lip Sync Automation System - Implementation Manual for AI Agents

## Document Purpose

This manual provides complete setup instructions for autonomous AI coding agents (Claude Code, GitHub Copilot, etc.) with full VS Code environment access to implement an automated lip-sync video generation pipeline. All procedures use CLI commands compatible with PowerShell automation, eliminating GUI dependencies.[1][2][3][4]

## System Architecture Overview

The system implements a three-stage pipeline: Rhubarb Lip Sync for phoneme extraction, Python for orchestration logic, and FFmpeg for video composition. The architecture supports multi-character preset management with extensible directory structures for professional content workflows.[3][4]

## Working Directory Structure

```
C:\Users\Ishan\Documents\GitHub\LipSyncAutomation\
├── .vscode\
│   ├── launch.json
│   ├── tasks.json
│   └── settings.json
├── assets\
│   ├── presets\
│   │   ├── character_1\
│   │   │   ├── front\
│   │   │   │   ├── mouth_A.png
│   │   │   │   ├── mouth_B.png
│   │   │   │   ├── mouth_C.png
│   │   │   │   ├── mouth_D.png
│   │   │   │   ├── mouth_E.png
│   │   │   │   ├── mouth_F.png
│   │   │   │   ├── mouth_G.png
│   │   │   │   ├── mouth_H.png
│   │   │   │   ├── mouth_X.png
│   │   │   │   └── background.png
│   │   │   ├── side\
│   │   │   │   └── [same mouth shape structure]
│   │   │   └── preset_config.json
│   │   ├── character_2\
│   │   │   └── [same structure]
│   │   └── preset_template\
│   │       └── template_config.json
│   └── audio\
│       ├── raw\
│       └── processed\
├── output\
│   ├── production\
│   │   ├── [project_name]\
│   │   │   ├── final\
│   │   │   ├── previews\
│   │   │   └── metadata.json
│   ├── temp\
│   └── cache\
├── src\
│   ├── core\
│   │   ├── __init__.py
│   │   ├── lip_sync_generator.py
│   │   ├── preset_manager.py
│   │   └── video_compositor.py
│   ├── utils\
│   │   ├── __init__.py
│   │   ├── validators.py
│   │   ├── audio_processor.py
│   │   └── cache_manager.py
│   ├── cli.py
│   ├── batch_processor.py
│   └── main.py
├── config\
│   ├── settings.json
│   └── logging_config.json
├── tests\
│   ├── fixtures\
│   └── test_generator.py
├── tools\
│   ├── rhubarb\
│   └── ffmpeg\
├── requirements.txt
├── README.md
└── .gitignore
```

## Phase 1: Environment Preparation

### 1.1 PowerShell Execution Policy Configuration

Execute in PowerShell as Administrator to enable script execution:[5]

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### 1.2 Chocolatey Installation (Package Manager)

Install Chocolatey for automated dependency management:[2][6]

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

Verify installation:

```powershell
choco --version
```

### 1.3 FFmpeg Installation via Chocolatey

Install FFmpeg system-wide:[7][2]

```powershell
choco install ffmpeg -y
```

Verify installation and PATH configuration:

```powershell
ffmpeg -version
```

Expected output should show FFmpeg version information. If command not found, manually add to PATH:[8][1]

```powershell
$env:Path += ";C:\ProgramData\chocolatey\lib\ffmpeg\tools\ffmpeg\bin"
[System.Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::Machine)
```

### 1.4 Rhubarb Lip Sync Installation

Navigate to project tools directory and download Rhubarb:[4]

```powershell
cd C:\Users\Ishan\Documents\GitHub\LipSyncAutomation\tools
New-Item -ItemType Directory -Path "rhubarb" -Force
cd rhubarb

# Download latest Windows release (version 1.13.0 as of 2024)
$rhubarbUrl = "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/Rhubarb-Lip-Sync-1.13.0-Windows.zip"
Invoke-WebRequest -Uri $rhubarbUrl -OutFile "rhubarb.zip"

# Extract archive
Expand-Archive -Path "rhubarb.zip" -DestinationPath "." -Force
Remove-Item "rhubarb.zip"

# Move executable to root of rhubarb directory
Move-Item ".\Rhubarb-Lip-Sync-*-Windows\*" -Destination "." -Force
Remove-Item ".\Rhubarb-Lip-Sync-*-Windows" -Recurse
```

Verify Rhubarb installation:[4]

```powershell
.\rhubarb.exe --version
```

### 1.5 Python Virtual Environment Setup

Navigate to project root and create isolated Python environment:[9][5]

```powershell
cd C:\Users\Ishan\Documents\GitHub\LipSyncAutomation

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

Install required Python packages:[3]

```powershell
pip install --upgrade pip
pip install pillow==10.1.0 numpy==1.26.2 wave ffmpeg-python==0.2.0
pip freeze > requirements.txt
```

## Phase 2: Directory Structure Initialization

### 2.1 Create Complete Directory Tree

Execute PowerShell script to generate all necessary directories:

```powershell
$basePath = "C:\Users\Ishan\Documents\GitHub\LipSyncAutomation"

# Create all required directories
$directories = @(
    ".vscode",
    "assets\presets\preset_template",
    "assets\audio\raw",
    "assets\audio\processed",
    "output\production",
    "output\temp",
    "output\cache",
    "src\core",
    "src\utils",
    "config",
    "tests\fixtures",
    "tools\rhubarb",
    "tools\ffmpeg"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path "$basePath\$dir" -Force | Out-Null
}

Write-Host "Directory structure created successfully"
```

### 2.2 Initialize Python Modules

Create `__init__.py` files for package structure:

```powershell
$initFiles = @(
    "src\__init__.py",
    "src\core\__init__.py",
    "src\utils\__init__.py"
)

foreach ($file in $initFiles) {
    New-Item -ItemType File -Path "C:\Users\Ishan\Documents\GitHub\LipSyncAutomation\$file" -Force | Out-Null
}
```

## Phase 3: Configuration File Generation

### 3.1 Main Configuration (config\settings.json)

Create centralized system configuration:[3][4]

```json
{
  "system": {
    "rhubarb_path": "C:\\Users\\Ishan\\Documents\\GitHub\\LipSyncAutomation\\tools\\rhubarb\\rhubarb.exe",
    "ffmpeg_path": "ffmpeg",
    "temp_directory": "output\\temp",
    "cache_directory": "output\\cache"
  },
  "video": {
    "fps": 30,
    "resolution": [1920, 1080],
    "codec": "libx264",
    "preset": "medium",
    "crf": 18,
    "pixel_format": "yuv420p",
    "audio_codec": "aac",
    "audio_bitrate": "192k"
  },
  "rhubarb": {
    "output_format": "json",
    "recognizer": "pocketSphinx",
    "threads": 0,
    "quiet": false,
    "extended_shapes": true
  },
  "processing": {
    "enable_caching": true,
    "parallel_workers": 4,
    "cleanup_temp_files": true
  },
  "presets": {
    "default_preset": "character_1/front",
    "preset_directory": "assets\\presets"
  },
  "viseme_mapping": {
    "A": "mouth_A.png",
    "B": "mouth_B.png",
    "C": "mouth_C.png",
    "D": "mouth_D.png",
    "E": "mouth_E.png",
    "F": "mouth_F.png",
    "G": "mouth_G.png",
    "H": "mouth_H.png",
    "X": "mouth_X.png"
  }
}
```

### 3.2 Preset Template Configuration (assets\presets\preset_template\template_config.json)

Define preset structure for character management:[3]

```json
{
  "preset_name": "character_1_front",
  "character_id": "character_1",
  "angle": "front",
  "description": "Front-facing view of character 1",
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
    "A": "mouth_A.png",
    "B": "mouth_B.png",
    "C": "mouth_C.png",
    "D": "mouth_D.png",
    "E": "mouth_E.png",
    "F": "mouth_F.png",
    "G": "mouth_G.png",
    "H": "mouth_H.png",
    "X": "mouth_X.png"
  },
  "image_specifications": {
    "format": "PNG",
    "bit_depth": 32,
    "alpha_channel": true,
    "dimensions": [512, 512],
    "dpi": 300
  },
  "metadata": {
    "created_date": "2025-10-17",
    "version": "1.0",
    "author": ""
  }
}
```

### 3.3 Logging Configuration (config\logging_config.json)

Configure comprehensive logging system:

```json
{
  "version": 1,
  "disable_existing_loggers": false,
  "formatters": {
    "detailed": {
      "format": "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
      "datefmt": "%Y-%m-%d %H:%M:%S"
    },
    "simple": {
      "format": "%(levelname)s - %(message)s"
    }
  },
  "handlers": {
    "console": {
      "class": "logging.StreamHandler",
      "level": "INFO",
      "formatter": "simple",
      "stream": "ext://sys.stdout"
    },
    "file": {
      "class": "logging.handlers.RotatingFileHandler",
      "level": "DEBUG",
      "formatter": "detailed",
      "filename": "lipsync_automation.log",
      "maxBytes": 10485760,
      "backupCount": 5
    },
    "error_file": {
      "class": "logging.handlers.RotatingFileHandler",
      "level": "ERROR",
      "formatter": "detailed",
      "filename": "lipsync_errors.log",
      "maxBytes": 10485760,
      "backupCount": 3
    }
  },
  "loggers": {
    "lip_sync": {
      "level": "DEBUG",
      "handlers": ["console", "file", "error_file"],
      "propagate": false
    }
  },
  "root": {
    "level": "INFO",
    "handlers": ["console", "file"]
  }
}
```

## Phase 4: Core Implementation

### 4.1 Preset Manager (src\core\preset_manager.py)

Implement multi-character preset management system:

```python
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
import logging

logger = logging.getLogger('lip_sync.preset_manager')


class PresetManager:
    """Manages character presets and asset configurations"""
    
    def __init__(self, config_path: str = "config/settings.json"):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.preset_dir = Path(self.config['presets']['preset_directory'])
        self.presets_cache = {}
        self._scan_presets()
    
    def _scan_presets(self):
        """Discover all available presets in assets directory"""
        logger.info(f"Scanning presets in {self.preset_dir}")
        
        for character_dir in self.preset_dir.iterdir():
            if not character_dir.is_dir() or character_dir.name == 'preset_template':
                continue
            
            for angle_dir in character_dir.iterdir():
                if not angle_dir.is_dir():
                    continue
                
                config_file = angle_dir / 'preset_config.json'
                if config_file.exists():
                    preset_key = f"{character_dir.name}/{angle_dir.name}"
                    self.presets_cache[preset_key] = self._load_preset_config(config_file)
                    logger.debug(f"Loaded preset: {preset_key}")
    
    def _load_preset_config(self, config_path: Path) -> Dict:
        """Load preset configuration from JSON file"""
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def get_preset(self, preset_name: str) -> Dict:
        """Retrieve preset configuration by name"""
        if preset_name not in self.presets_cache:
            raise ValueError(f"Preset '{preset_name}' not found. Available: {self.list_presets()}")
        
        preset_config = self.presets_cache[preset_name].copy()
        preset_path = self.preset_dir / preset_name
        
        # Resolve absolute paths for all image assets
        preset_config['background']['image'] = str(preset_path / preset_config['background']['image'])
        
        for shape, filename in preset_config['mouth_shapes'].items():
            preset_config['mouth_shapes'][shape] = str(preset_path / filename)
        
        return preset_config
    
    def list_presets(self) -> List[str]:
        """Return list of all available preset identifiers"""
        return list(self.presets_cache.keys())
    
    def create_preset_from_template(self, character_id: str, angle: str, description: str = "") -> str:
        """Create new preset directory structure from template"""
        template_path = self.preset_dir / 'preset_template' / 'template_config.json'
        
        with open(template_path, 'r') as f:
            template_config = json.load(f)
        
        # Update configuration
        preset_name = f"{character_id}_{angle}"
        template_config['preset_name'] = preset_name
        template_config['character_id'] = character_id
        template_config['angle'] = angle
        template_config['description'] = description
        template_config['metadata']['created_date'] = str(Path(__file__).stat().st_mtime)
        
        # Create directory structure
        preset_path = self.preset_dir / character_id / angle
        preset_path.mkdir(parents=True, exist_ok=True)
        
        # Write configuration
        config_output = preset_path / 'preset_config.json'
        with open(config_output, 'w') as f:
            json.dump(template_config, f, indent=2)
        
        logger.info(f"Created new preset: {character_id}/{angle}")
        
        # Refresh preset cache
        self._scan_presets()
        
        return f"{character_id}/{angle}"
    
    def validate_preset(self, preset_name: str) -> bool:
        """Verify all required assets exist for preset"""
        try:
            preset_config = self.get_preset(preset_name)
            
            # Check background image
            if not os.path.exists(preset_config['background']['image']):
                logger.error(f"Background missing: {preset_config['background']['image']}")
                return False
            
            # Check all mouth shape images
            for shape, path in preset_config['mouth_shapes'].items():
                if not os.path.exists(path):
                    logger.error(f"Mouth shape {shape} missing: {path}")
                    return False
            
            logger.info(f"Preset '{preset_name}' validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Preset validation failed: {e}")
            return False
```

### 4.2 Core Lip Sync Generator (src\core\lip_sync_generator.py)

Main orchestration logic for phoneme processing:[4][3]

```python
import subprocess
import json
import os
import wave
from pathlib import Path
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger('lip_sync.generator')


class LipSyncGenerator:
    """Core engine for phoneme detection and frame sequence generation"""
    
    def __init__(self, config_path: str = "config/settings.json"):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.rhubarb_path = self.config['system']['rhubarb_path']
        self.fps = self.config['video']['fps']
        self.temp_dir = Path(self.config['system']['temp_directory'])
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("LipSyncGenerator initialized")
    
    def generate_phoneme_data(self, audio_path: str, output_json: Optional[str] = None) -> str:
        """Execute Rhubarb to extract phoneme timing data"""
        if output_json is None:
            audio_stem = Path(audio_path).stem
            output_json = str(self.temp_dir / f"{audio_stem}_phonemes.json")
        
        logger.info(f"Generating phoneme data for: {audio_path}")
        
        cmd = [
            self.rhubarb_path,
            audio_path,
            '-f', self.config['rhubarb']['output_format'],
            '-o', output_json,
            '--recognizer', self.config['rhubarb']['recognizer']
        ]
        
        if self.config['rhubarb']['threads'] > 0:
            cmd.extend(['--threads', str(self.config['rhubarb']['threads'])])
        
        if self.config['rhubarb']['quiet']:
            cmd.append('--quiet')
        
        logger.debug(f"Rhubarb command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Rhubarb execution failed: {result.stderr}")
            raise RuntimeError(f"Rhubarb failed with code {result.returncode}: {result.stderr}")
        
        logger.info(f"Phoneme data generated: {output_json}")
        return output_json
    
    def parse_phoneme_data(self, json_path: str) -> Dict:
        """Parse Rhubarb JSON output to extract timing and metadata"""
        logger.debug(f"Parsing phoneme data from: {json_path}")
        
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        return {
            'mouth_cues': data['mouthCues'],
            'metadata': data.get('metadata', {}),
            'duration': self._calculate_duration(data['mouthCues'])
        }
    
    def _calculate_duration(self, mouth_cues: List[Dict]) -> float:
        """Calculate total duration from mouth cues"""
        if not mouth_cues:
            return 0.0
        return max(cue['end'] for cue in mouth_cues)
    
    def generate_frame_sequence(self, mouth_cues: List[Dict], duration: float, 
                                viseme_mapping: Dict[str, str]) -> List[str]:
        """Map phonemes to frame-by-frame viseme sequence"""
        total_frames = int(duration * self.fps) + 1  # Add buffer frame
        frame_sequence = []
        
        logger.info(f"Generating frame sequence: {total_frames} frames at {self.fps}fps")
        
        for frame_num in range(total_frames):
            timestamp = frame_num / self.fps
            current_viseme = 'X'  # Default resting position
            
            # Find matching mouth cue for current timestamp
            for cue in mouth_cues:
                if cue['start'] <= timestamp < cue['end']:
                    current_viseme = cue['value']
                    break
            
            viseme_path = viseme_mapping.get(current_viseme)
            if not viseme_path:
                logger.warning(f"Viseme '{current_viseme}' not found in mapping, using X")
                viseme_path = viseme_mapping['X']
            
            frame_sequence.append(viseme_path)
        
        logger.info(f"Frame sequence generated: {len(frame_sequence)} frames")
        return frame_sequence
    
    def get_audio_duration(self, audio_path: str) -> float:
        """Extract duration from audio file"""
        audio_ext = Path(audio_path).suffix.lower()
        
        if audio_ext == '.wav':
            with wave.open(audio_path, 'rb') as wav:
                frames = wav.getnframes()
                rate = wav.getframerate()
                return frames / float(rate)
        else:
            # Use ffprobe for non-WAV files
            cmd = [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
```

### 4.3 Video Compositor (src\core\video_compositor.py)

FFmpeg integration for video rendering:[3]

```python
import subprocess
import tempfile
import os
from pathlib import Path
from typing import List, Dict, Optional
import logging

logger = logging.getLogger('lip_sync.compositor')


class VideoCompositor:
    """Handles FFmpeg video composition and rendering"""
    
    def __init__(self, config_path: str = "config/settings.json"):
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.ffmpeg_path = self.config['system']['ffmpeg_path']
        self.video_config = self.config['video']
        self.temp_dir = Path(self.config['system']['temp_directory'])
        
        logger.info("VideoCompositor initialized")
    
    def render_video(self, frame_sequence: List[str], audio_path: str, 
                    output_path: str, background_path: Optional[str] = None,
                    mouth_position: Optional[Dict] = None) -> str:
        """Compile frames and audio into final video"""
        logger.info(f"Rendering video: {output_path}")
        logger.info(f"Total frames: {len(frame_sequence)}, Background: {background_path is not None}")
        
        with tempfile.TemporaryDirectory(dir=self.temp_dir) as tmpdir:
            # Create concat demuxer file
            concat_file = Path(tmpdir) / 'frames.txt'
            self._create_concat_file(frame_sequence, concat_file)
            
            if background_path:
                return self._render_with_background(
                    concat_file, audio_path, background_path, 
                    output_path, mouth_position
                )
            else:
                return self._render_simple(concat_file, audio_path, output_path)
    
    def _create_concat_file(self, frame_sequence: List[str], output_file: Path):
        """Generate FFmpeg concat demuxer manifest"""
        frame_duration = 1 / self.video_config['fps']
        
        with open(output_file, 'w') as f:
            for frame_path in frame_sequence:
                abs_path = os.path.abspath(frame_path).replace('\\', '/')
                f.write(f"file '{abs_path}'\n")
                f.write(f"duration {frame_duration}\n")
            
            # Duplicate last frame to prevent truncation
            last_frame = os.path.abspath(frame_sequence[-1]).replace('\\', '/')
            f.write(f"file '{last_frame}'\n")
        
        logger.debug(f"Concat file created: {output_file}")
    
    def _render_simple(self, concat_file: Path, audio_path: str, output_path: str) -> str:
        """Render video without background overlay"""
        cmd = [
            self.ffmpeg_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-i', audio_path,
            '-c:v', self.video_config['codec'],
            '-preset', self.video_config['preset'],
            '-crf', str(self.video_config['crf']),
            '-pix_fmt', self.video_config['pixel_format'],
            '-c:a', self.video_config['audio_codec'],
            '-b:a', self.video_config['audio_bitrate'],
            '-shortest',
            '-y',
            output_path
        ]
        
        self._execute_ffmpeg(cmd)
        return output_path
    
    def _render_with_background(self, concat_file: Path, audio_path: str,
                                background_path: str, output_path: str,
                                mouth_position: Optional[Dict] = None) -> str:
        """Render video with background and mouth overlay"""
        
        # Default to center if position not specified
        if mouth_position is None:
            overlay_x = "(W-w)/2"
            overlay_y = "(H-h)/2"
        else:
            x = mouth_position.get('x', 960)
            y = mouth_position.get('y', 700)
            anchor = mouth_position.get('anchor', 'center')
            
            if anchor == 'center':
                overlay_x = f"{x}-(w/2)"
                overlay_y = f"{y}-(h/2)"
            elif anchor == 'topleft':
                overlay_x = str(x)
                overlay_y = str(y)
            else:
                overlay_x = str(x)
                overlay_y = str(y)
        
        filter_complex = (
            f"[0:v]fps={self.video_config['fps']}[mouth];"
            f"[1:v]scale={self.video_config['resolution'][0]}:{self.video_config['resolution'][1]}[bg];"
            f"[bg][mouth]overlay={overlay_x}:{overlay_y}"
        )
        
        cmd = [
            self.ffmpeg_path,
            '-loop', '1',
            '-i', background_path,
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-i', audio_path,
            '-filter_complex', filter_complex,
            '-c:v', self.video_config['codec'],
            '-preset', self.video_config['preset'],
            '-crf', str(self.video_config['crf']),
            '-pix_fmt', self.video_config['pixel_format'],
            '-c:a', self.video_config['audio_codec'],
            '-b:a', self.video_config['audio_bitrate'],
            '-shortest',
            '-y',
            output_path
        ]
        
        self._execute_ffmpeg(cmd)
        return output_path
    
    def _execute_ffmpeg(self, cmd: List[str]):
        """Execute FFmpeg command with error handling"""
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg execution failed: {result.stderr}")
            raise RuntimeError(f"FFmpeg failed with code {result.returncode}: {result.stderr}")
        
        logger.info("Video rendering completed successfully")
```

### 4.4 Validators (src\utils\validators.py)

Pre-flight validation system:

```python
import os
import subprocess
from pathlib import Path
from typing import Dict
import logging
from PIL import Image

logger = logging.getLogger('lip_sync.validators')


def validate_audio_file(audio_path: str) -> bool:
    """Verify audio file exists and format is supported"""
    if not os.path.exists(audio_path):
        logger.error(f"Audio file not found: {audio_path}")
        return False
    
    supported_formats = ['.wav', '.ogg', '.mp3', '.flac', '.m4a']
    ext = Path(audio_path).suffix.lower()
    
    if ext not in supported_formats:
        logger.error(f"Unsupported audio format '{ext}'. Supported: {supported_formats}")
        return False
    
    logger.debug(f"Audio file validated: {audio_path}")
    return True


def validate_mouth_images(viseme_mapping: Dict[str, str]) -> bool:
    """Ensure all required mouth shape images exist and meet specifications"""
    missing_images = []
    invalid_images = []
    
    for viseme, path in viseme_mapping.items():
        if not os.path.exists(path):
            missing_images.append(f"{viseme}: {path}")
            continue
        
        try:
            with Image.open(path) as img:
                # Check for alpha channel
                if img.mode not in ('RGBA', 'LA'):
                    invalid_images.append(f"{viseme}: No alpha channel - {path}")
                
                # Check minimum dimensions
                if img.width < 256 or img.height < 256:
                    invalid_images.append(f"{viseme}: Dimensions too small ({img.width}x{img.height}) - {path}")
                    
        except Exception as e:
            invalid_images.append(f"{viseme}: Cannot open image - {path} ({e})")
    
    if missing_images:
        logger.error(f"Missing mouth images:\n" + "\n".join(missing_images))
        return False
    
    if invalid_images:
        logger.error(f"Invalid mouth images:\n" + "\n".join(invalid_images))
        return False
    
    logger.info(f"All {len(viseme_mapping)} mouth images validated")
    return True


def validate_dependencies(rhubarb_path: str, ffmpeg_path: str) -> bool:
    """Check if Rhubarb and FFmpeg are accessible"""
    
    # Validate Rhubarb
    try:
        result = subprocess.run(
            [rhubarb_path, '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            logger.info(f"Rhubarb validated: {result.stdout.strip()}")
        else:
            logger.error(f"Rhubarb execution failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Rhubarb not accessible: {e}")
        return False
    
    # Validate FFmpeg
    try:
        result = subprocess.run(
            [ffmpeg_path, '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            logger.info(f"FFmpeg validated: {version_line}")
        else:
            logger.error(f"FFmpeg execution failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"FFmpeg not accessible: {e}")
        return False
    
    return True


def validate_output_directory(output_path: str) -> bool:
    """Ensure output directory exists and is writable"""
    output_dir = Path(output_path).parent
    
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Test write permissions
        test_file = output_dir / '.write_test'
        test_file.touch()
        test_file.unlink()
        
        logger.debug(f"Output directory validated: {output_dir}")
        return True
        
    except Exception as e:
        logger.error(f"Output directory not writable: {output_dir} ({e})")
        return False
```

### 4.5 Cache Manager (src\utils\cache_manager.py)

Phoneme data caching for performance optimization:

```python
import hashlib
import json
import os
from pathlib import Path
from typing import Optional, Dict
import logging

logger = logging.getLogger('lip_sync.cache')


class CacheManager:
    """Manages phoneme data caching to avoid redundant processing"""
    
    def __init__(self, cache_dir: str = "output/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        logger.debug(f"CacheManager initialized: {self.cache_dir}")
    
    def get_audio_hash(self, audio_path: str) -> str:
        """Generate MD5 hash of audio file for cache key"""
        hash_md5 = hashlib.md5()
        
        with open(audio_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        
        return hash_md5.hexdigest()
    
    def get_cached_phoneme_data(self, audio_path: str) -> Optional[Dict]:
        """Retrieve cached phoneme data if available"""
        audio_hash = self.get_audio_hash(audio_path)
        cache_file = self.cache_dir / f"{audio_hash}.json"
        
        if not cache_file.exists():
            logger.debug(f"Cache miss for: {Path(audio_path).name}")
            return None
        
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
            
            logger.info(f"Cache hit for: {Path(audio_path).name}")
            return data
            
        except Exception as e:
            logger.warning(f"Failed to load cached data: {e}")
            return None
    
    def save_phoneme_data(self, audio_path: str, phoneme_data: Dict):
        """Store phoneme data in cache"""
        audio_hash = self.get_audio_hash(audio_path)
        cache_file = self.cache_dir / f"{audio_hash}.json"
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(phoneme_data, f, indent=2)
            
            logger.debug(f"Phoneme data cached: {cache_file}")
            
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")
    
    def clear_cache(self):
        """Remove all cached phoneme data"""
        count = 0
        for cache_file in self.cache_dir.glob('*.json'):
            cache_file.unlink()
            count += 1
        
        logger.info(f"Cache cleared: {count} files removed")
```

### 4.6 Main Orchestrator (src\main.py)

Entry point for single file processing:

```python
import sys
import json
import logging
import logging.config
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from core.lip_sync_generator import LipSyncGenerator
from core.video_compositor import VideoCompositor
from core.preset_manager import PresetManager
from utils.validators import (
    validate_audio_file,
    validate_dependencies,
    validate_output_directory
)
from utils.cache_manager import CacheManager


def setup_logging():
    """Initialize logging configuration"""
    with open('config/logging_config.json', 'r') as f:
        config = json.load(f)
    
    logging.config.dictConfig(config)
    return logging.getLogger('lip_sync')


def main():
    """Main execution workflow for single audio file"""
    logger = setup_logging()
    logger.info("=" * 80)
    logger.info("Lip Sync Automation System - Starting")
    logger.info("=" * 80)
    
    try:
        # Load configuration
        with open('config/settings.json', 'r') as f:
            config = json.load(f)
        
        # Validate dependencies
        logger.info("Validating system dependencies...")
        if not validate_dependencies(
            config['system']['rhubarb_path'],
            config['system']['ffmpeg_path']
        ):
            logger.error("Dependency validation failed")
            return 1
        
        # Initialize components
        preset_manager = PresetManager()
        generator = LipSyncGenerator()
        compositor = VideoCompositor()
        cache_manager = CacheManager() if config['processing']['enable_caching'] else None
        
        # Configuration
        audio_path = 'assets/audio/raw/narration.wav'
        preset_name = config['presets']['default_preset']
        output_path = 'output/production/test_project/final/lipsync_video.mp4'
        
        # Validate inputs
        logger.info("Validating input files...")
        if not validate_audio_file(audio_path):
            return 1
        
        if not validate_output_directory(output_path):
            return 1
        
        # Load preset
        logger.info(f"Loading preset: {preset_name}")
        preset_config = preset_manager.get_preset(preset_name)
        
        if not preset_manager.validate_preset(preset_name):
            logger.error("Preset validation failed")
            return 1
        
        # Check cache
        phoneme_data = None
        if cache_manager:
            phoneme_data = cache_manager.get_cached_phoneme_data(audio_path)
        
        # Generate or retrieve phoneme data
        if phoneme_data is None:
            logger.info("Generating phoneme data with Rhubarb...")
            phoneme_json = generator.generate_phoneme_data(audio_path)
            phoneme_data = generator.parse_phoneme_data(phoneme_json)
            
            if cache_manager:
                cache_manager.save_phoneme_data(audio_path, phoneme_data)
        
        # Generate frame sequence
        logger.info("Generating frame sequence...")
        frame_sequence = generator.generate_frame_sequence(
            mouth_cues=phoneme_data['mouth_cues'],
            duration=phoneme_data['duration'],
            viseme_mapping=preset_config['mouth_shapes']
        )
        
        # Render video
        logger.info("Rendering final video...")
        compositor.render_video(
            frame_sequence=frame_sequence,
            audio_path=audio_path,
            output_path=output_path,
            background_path=preset_config['background']['image'],
            mouth_position=preset_config['mouth_position']
        )
        
        logger.info("=" * 80)
        logger.info(f"Video generated successfully: {output_path}")
        logger.info("=" * 80)
        return 0
        
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
```

### 4.7 CLI Interface (src\cli.py)

Command-line interface for AI agent automation:[3]

```python
import argparse
import sys
import json
import logging
import logging.config
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.lip_sync_generator import LipSyncGenerator
from core.video_compositor import VideoCompositor
from core.preset_manager import PresetManager
from utils.validators import validate_audio_file, validate_dependencies
from utils.cache_manager import CacheManager


def setup_logging(verbose: bool = False):
    """Initialize logging configuration"""
    with open('config/logging_config.json', 'r') as f:
        config = json.load(f)
    
    if verbose:
        config['loggers']['lip_sync']['level'] = 'DEBUG'
        config['handlers']['console']['level'] = 'DEBUG'
    
    logging.config.dictConfig(config)
    return logging.getLogger('lip_sync')


def main():
    parser = argparse.ArgumentParser(
        description='Automated Lip Sync Video Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with default preset
  python src/cli.py --audio assets/audio/raw/narration.wav --output output/video.mp4

  # Specify custom preset
  python src/cli.py --audio audio.wav --output video.mp4 --preset character_2/side

  # Use custom FPS and disable caching
  python src/cli.py --audio audio.wav --output video.mp4 --fps 24 --no-cache

  # Verbose logging
  python src/cli.py --audio audio.wav --output video.mp4 --verbose
        """
    )
    
    parser.add_argument('--audio', required=True, help='Path to audio file')
    parser.add_argument('--output', required=True, help='Output video path')
    parser.add_argument('--preset', help='Character preset (e.g., character_1/front)')
    parser.add_argument('--config', default='config/settings.json', help='Configuration file')
    parser.add_argument('--fps', type=int, help='Frame rate (overrides config)')
    parser.add_argument('--no-cache', action='store_true', help='Disable phoneme caching')
    parser.add_argument('--verbose', action='store_true', help='Enable debug logging')
    parser.add_argument('--list-presets', action='store_true', help='List available presets and exit')
    
    args = parser.parse_args()
    
    logger = setup_logging(args.verbose)
    
    try:
        # Load configuration
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # List presets if requested
        if args.list_presets:
            preset_manager = PresetManager(args.config)
            print("\nAvailable presets:")
            for preset in preset_manager.list_presets():
                print(f"  - {preset}")
            return 0
        
        # Override FPS if specified
        if args.fps:
            config['video']['fps'] = args.fps
            logger.info(f"Using custom FPS: {args.fps}")
        
        # Validate dependencies
        if not validate_dependencies(
            config['system']['rhubarb_path'],
            config['system']['ffmpeg_path']
        ):
            logger.error("Dependency validation failed")
            return 1
        
        # Validate audio
        if not validate_audio_file(args.audio):
            return 1
        
        # Initialize components
        preset_manager = PresetManager(args.config)
        generator = LipSyncGenerator(args.config)
        compositor = VideoCompositor(args.config)
        
        use_cache = config['processing']['enable_caching'] and not args.no_cache
        cache_manager = CacheManager() if use_cache else None
        
        # Determine preset
        preset_name = args.preset or config['presets']['default_preset']
        logger.info(f"Using preset: {preset_name}")
        
        preset_config = preset_manager.get_preset(preset_name)
        
        if not preset_manager.validate_preset(preset_name):
            return 1
        
        # Check cache
        phoneme_data = None
        if cache_manager:
            phoneme_data = cache_manager.get_cached_phoneme_data(args.audio)
        
        # Generate phoneme data
        if phoneme_data is None:
            phoneme_json = generator.generate_phoneme_data(args.audio)
            phoneme_data = generator.parse_phoneme_data(phoneme_json)
            
            if cache_manager:
                cache_manager.save_phoneme_data(args.audio, phoneme_data)
        
        # Generate frames
        frame_sequence = generator.generate_frame_sequence(
            mouth_cues=phoneme_data['mouth_cues'],
            duration=phoneme_data['duration'],
            viseme_mapping=preset_config['mouth_shapes']
        )
        
        # Render video
        compositor.render_video(
            frame_sequence=frame_sequence,
            audio_path=args.audio,
            output_path=args.output,
            background_path=preset_config['background']['image'],
            mouth_position=preset_config['mouth_position']
        )
        
        print(f"\n✓ Video generated successfully: {args.output}\n")
        return 0
        
    except Exception as e:
        logger.exception(f"Error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
```

### 4.8 Batch Processor (src\batch_processor.py)

Parallel processing for multiple audio files:

```python
import argparse
import sys
import json
import logging
import logging.config
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Tuple

sys.path.insert(0, str(Path(__file__).parent))

from core.lip_sync_generator import LipSyncGenerator
from core.video_compositor import VideoCompositor
from core.preset_manager import PresetManager
from utils.validators import validate_audio_file
from utils.cache_manager import CacheManager


def setup_logging():
    with open('config/logging_config.json', 'r') as f:
        config = json.load(f)
    logging.config.dictConfig(config)
    return logging.getLogger('lip_sync.batch')


def process_single_file(audio_path: Path, output_dir: Path, preset_name: str,
                       generator: LipSyncGenerator, compositor: VideoCompositor,
                       preset_config: dict, cache_manager: CacheManager = None) -> Tuple[str, bool, str]:
    """Process single audio file - designed for parallel execution"""
    
    try:
        audio_name = audio_path.stem
        output_path = output_dir / f"{audio_name}.mp4"
        
        # Check cache
        phoneme_data = None
        if cache_manager:
            phoneme_data = cache_manager.get_cached_phoneme_data(str(audio_path))
        
        # Generate phoneme data
        if phoneme_data is None:
            phoneme_json = generator.generate_phoneme_data(str(audio_path))
            phoneme_data = generator.parse_phoneme_data(phoneme_json)
            
            if cache_manager:
                cache_manager.save_phoneme_data(str(audio_path), phoneme_data)
        
        # Generate frames
        frame_sequence = generator.generate_frame_sequence(
            mouth_cues=phoneme_data['mouth_cues'],
            duration=phoneme_data['duration'],
            viseme_mapping=preset_config['mouth_shapes']
        )
        
        # Render video
        compositor.render_video(
            frame_sequence=frame_sequence,
            audio_path=str(audio_path),
            output_path=str(output_path),
            background_path=preset_config['background']['image'],
            mouth_position=preset_config['mouth_position']
        )
        
        return str(audio_path), True, str(output_path)
        
    except Exception as e:
        return str(audio_path), False, str(e)


def main():
    parser = argparse.ArgumentParser(description='Batch Lip Sync Video Generator')
    parser.add_argument('--input', required=True, help='Input directory containing audio files')
    parser.add_argument('--output', required=True, help='Output directory for videos')
    parser.add_argument('--preset', help='Character preset to use')
    parser.add_argument('--workers', type=int, default=4, help='Number of parallel workers')
    parser.add_argument('--extensions', default='wav,mp3,ogg', help='Comma-separated audio extensions')
    parser.add_argument('--config', default='config/settings.json', help='Configuration file')
    
    args = parser.parse_args()
    
    logger = setup_logging()
    logger.info("Batch Processing Started")
    
    try:
        # Load configuration
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # Initialize components
        preset_manager = PresetManager(args.config)
        generator = LipSyncGenerator(args.config)
        compositor = VideoCompositor(args.config)
        cache_manager = CacheManager() if config['processing']['enable_caching'] else None
        
        # Determine preset
        preset_name = args.preset or config['presets']['default_preset']
        preset_config = preset_manager.get_preset(preset_name)
        
        # Find audio files
        input_dir = Path(args.input)
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        extensions = [f".{ext.strip()}" for ext in args.extensions.split(',')]
        audio_files = []
        
        for ext in extensions:
            audio_files.extend(input_dir.glob(f"*{ext}"))
        
        if not audio_files:
            logger.error(f"No audio files found in {input_dir} with extensions {extensions}")
            return 1
        
        logger.info(f"Found {len(audio_files)} audio files to process")
        logger.info(f"Using {args.workers} parallel workers")
        
        # Process files in parallel
        results = []
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(
                    process_single_file,
                    audio_file,
                    output_dir,
                    preset_name,
                    generator,
                    compositor,
                    preset_config,
                    cache_manager
                ): audio_file for audio_file in audio_files
            }
            
            for future in as_completed(futures):
                audio_path, success, result = future.result()
                results.append((audio_path, success, result))
                
                if success:
                    logger.info(f"✓ Completed: {Path(audio_path).name} -> {result}")
                else:
                    logger.error(f"✗ Failed: {Path(audio_path).name} - {result}")
        
        # Summary
        successful = sum(1 for _, success, _ in results if success)
        failed = len(results) - successful
        
        print("\n" + "=" * 80)
        print(f"Batch Processing Complete")
        print(f"Total: {len(results)} | Successful: {successful} | Failed: {failed}")
        print("=" * 80 + "\n")
        
        return 0 if failed == 0 else 1
        
    except Exception as e:
        logger.exception(f"Batch processing error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
```

## Phase 5: VS Code Integration

### 5.1 Launch Configuration (.vscode\launch.json)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Main Pipeline",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/src/main.py",
      "console": "integratedTerminal",
      "justMyCode": false,
      "cwd": "${workspaceFolder}",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/src"
      }
    },
    {
      "name": "Python: CLI Interface",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/src/cli.py",
      "console": "integratedTerminal",
      "args": [
        "--audio", "assets/audio/raw/narration.wav",
        "--output", "output/production/test/final/video.mp4",
        "--verbose"
      ],
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Python: Batch Processor",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/src/batch_processor.py",
      "console": "integratedTerminal",
      "args": [
        "--input", "assets/audio/raw",
        "--output", "output/production/batch_test/final",
        "--workers", "4"
      ],
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Python: List Presets",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/src/cli.py",
      "console": "integratedTerminal",
      "args": ["--list-presets"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### 5.2 Task Automation (.vscode\tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Activate Virtual Environment",
      "type": "shell",
      "windows": {
        "command": ".\\venv\\Scripts\\Activate.ps1"
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Run Main Pipeline",
      "type": "shell",
      "windows": {
        "command": ".\\venv\\Scripts\\python.exe"
      },
      "args": ["src/main.py"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Validate Dependencies",
      "type": "shell",
      "windows": {
        "command": ".\\venv\\Scripts\\python.exe"
      },
      "args": [
        "-c",
        "from src.utils.validators import validate_dependencies; import json; c = json.load(open('config/settings.json')); print('✓ Dependencies OK' if validate_dependencies(c['system']['rhubarb_path'], c['system']['ffmpeg_path']) else '✗ Dependencies Failed')"
      ],
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "List Available Presets",
      "type": "shell",
      "windows": {
        "command": ".\\venv\\Scripts\\python.exe"
      },
      "args": ["src/cli.py", "--list-presets"],
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "Clear Cache",
      "type": "shell",
      "windows": {
        "command": ".\\venv\\Scripts\\python.exe"
      },
      "args": [
        "-c",
        "from src.utils.cache_manager import CacheManager; cm = CacheManager(); cm.clear_cache(); print('Cache cleared')"
      ],
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "Run Unit Tests",
      "type": "shell",
      "windows": {
        "command": ".\\venv\\Scripts\\python.exe"
      },
      "args": ["-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"],
      "group": {
        "kind": "test",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always"
      }
    }
  ]
}
```

### 5.3 Workspace Settings (.vscode\settings.json)

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}\\venv\\Scripts\\python.exe",
  "python.terminal.activateEnvironment": true,
  "python.analysis.extraPaths": ["${workspaceFolder}/src"],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "output/temp/**": true,
    "output/cache/**": true
  },
  "files.associations": {
    "*.json": "jsonc"
  },
  "terminal.integrated.env.windows": {
    "PYTHONPATH": "${workspaceFolder}\\src"
  }
}
```

## Phase 6: AI Agent Execution Instructions

### 6.1 Initial Setup Command Sequence

Execute these commands sequentially in PowerShell from project root:[2][9]

```powershell
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 2. Verify dependencies
python -c "from src.utils.validators import validate_dependencies; import json; c = json.load(open('config/settings.json')); validate_dependencies(c['system']['rhubarb_path'], c['system']['ffmpeg_path'])"

# 3. List available presets
python src\cli.py --list-presets

# 4. Process single file
python src\cli.py --audio assets\audio\raw\narration.wav --output output\production\test\final\video.mp4 --verbose

# 5. Batch process directory
python src\batch_processor.py --input assets\audio\raw --output output\production\batch\final --workers 4
```

### 6.2 Preset Creation Workflow

To add a new character preset:[3]

```powershell
# Create preset directory structure
python -c "from src.core.preset_manager import PresetManager; pm = PresetManager(); pm.create_preset_from_template('character_2', 'front', 'Front view of character 2')"

# This creates: assets/presets/character_2/front/
# User must then add:
#   - background.png (character background image)
#   - mouth_A.png through mouth_X.png (9 mouth shapes with alpha channel)
```

### 6.3 Common AI Agent Commands

```powershell
# Process with specific preset
python src\cli.py --audio audio.wav --output video.mp4 --preset character_2/side

# Process with custom FPS
python src\cli.py --audio audio.wav --output video.mp4 --fps 24

# Disable caching for troubleshooting
python src\cli.py --audio audio.wav --output video.mp4 --no-cache

# Clear phoneme cache
python -c "from src.utils.cache_manager import CacheManager; CacheManager().clear_cache()"

# Validate preset
python -c "from src.core.preset_manager import PresetManager; pm = PresetManager(); print(pm.validate_preset('character_1/front'))"
```

## Phase 7: Testing & Validation

### 7.1 Unit Test Implementation (tests\test_generator.py)

```python
import unittest
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from core.lip_sync_generator import LipSyncGenerator
from core.preset_manager import PresetManager
from utils.validators import validate_dependencies, validate_audio_file


class TestLipSyncGenerator(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        with open('config/settings.json', 'r') as f:
            cls.config = json.load(f)
        cls.generator = LipSyncGenerator()
    
    def test_dependency_validation(self):
        """Test system dependency validation"""
        result = validate_dependencies(
            self.config['system']['rhubarb_path'],
            self.config['system']['ffmpeg_path']
        )
        self.assertTrue(result, "Dependency validation should pass")
    
    def test_preset_loading(self):
        """Test preset discovery and loading"""
        preset_manager = PresetManager()
        presets = preset_manager.list_presets()
        self.assertGreater(len(presets), 0, "Should find at least one preset")
    
    def test_frame_sequence_generation(self):
        """Test frame sequence mapping logic"""
        mock_cues = [
            {'start': 0.0, 'end': 0.5, 'value': 'X'},
            {'start': 0.5, 'end': 1.0, 'value': 'A'},
            {'start': 1.0, 'end': 1.5, 'value': 'B'}
        ]
        
        mock_mapping = {
            'X': 'mock_X.png',
            'A': 'mock_A.png',
            'B': 'mock_B.png'
        }
        
        frames = self.generator.generate_frame_sequence(
            mouth_cues=mock_cues,
            duration=1.5,
            viseme_mapping=mock_mapping
        )
        
        expected_frames = int(1.5 * self.config['video']['fps']) + 1
        self.assertEqual(len(frames), expected_frames, f"Should generate {expected_frames} frames")


if __name__ == '__main__':
    unittest.main()
```

### 7.2 Integration Test Script

Create `tests\run_integration_test.ps1`:

```powershell
# Integration test script for AI agents

Write-Host "Running Integration Tests..." -ForegroundColor Cyan

# Test 1: Dependency validation
Write-Host "`n[Test 1] Validating dependencies..." -ForegroundColor Yellow
python -c "from src.utils.validators import validate_dependencies; import json; c = json.load(open('config/settings.json')); assert validate_dependencies(c['system']['rhubarb_path'], c['system']['ffmpeg_path'])"
if ($LASTEXITCODE -eq 0) { Write-Host "✓ Dependencies OK" -ForegroundColor Green } else { Write-Host "✗ Dependencies Failed" -ForegroundColor Red; exit 1 }

# Test 2: Preset discovery
Write-Host "`n[Test 2] Discovering presets..." -ForegroundColor Yellow
python src\cli.py --list-presets
if ($LASTEXITCODE -eq 0) { Write-Host "✓ Preset Discovery OK" -ForegroundColor Green } else { Write-Host "✗ Preset Discovery Failed" -ForegroundColor Red; exit 1 }

# Test 3: Unit tests
Write-Host "`n[Test 3] Running unit tests..." -ForegroundColor Yellow
python -m unittest discover -s tests -p "test_*.py"
if ($LASTEXITCODE -eq 0) { Write-Host "✓ Unit Tests Passed" -ForegroundColor Green } else { Write-Host "✗ Unit Tests Failed" -ForegroundColor Red; exit 1 }

Write-Host "`n✓ All Integration Tests Passed" -ForegroundColor Green
```

## Phase 8: Documentation & Maintenance

### 8.1 README.md

```markdown
# Rhubarb Lip Sync Automation System

Automated lip-sync video generation pipeline for 2D animation content creation.

## Quick Start

```
# Activate environment
.\venv\Scripts\Activate.ps1

# Process single audio file
python src\cli.py --audio assets\audio\raw\narration.wav --output output\video.mp4

# Batch process directory
python src\batch_processor.py --input assets\audio\raw --output output\batch --workers 4
```

## Architecture

- **Rhubarb Lip Sync**: Phoneme detection from audio
- **Python Pipeline**: Orchestration and preset management
- **FFmpeg**: Video composition and rendering

## Directory Structure

```
├── assets/presets/          # Character presets with mouth shapes
├── output/production/       # Final rendered videos
├── src/core/               # Core processing modules
├── src/utils/              # Validation and caching utilities
└── config/                 # System configuration
```

## Adding New Characters

1. Create preset structure:
   ```
   python -c "from src.core.preset_manager import PresetManager; pm = PresetManager(); pm.create_preset_from_template('character_name', 'angle')"
   ```

2. Add images to `assets/presets/character_name/angle/`:
   - background.png (character base)
   - mouth_A.png through mouth_X.png (9 mouth shapes)

3. Use preset:
   ```
   python src\cli.py --audio audio.wav --output video.mp4 --preset character_name/angle
   ```

## Troubleshooting

- **Rhubarb not found**: Check `config/settings.json` for correct path to `rhubarb.exe`
- **FFmpeg errors**: Verify all mouth images have alpha channels and consistent dimensions
- **Audio sync issues**: Ensure audio is WAV or OGG format (use FFmpeg to convert)

## Performance

- Enable caching in `config/settings.json` to avoid reprocessing phoneme data
- Use batch processing with multiple workers for large-scale content generation
- Typical processing time: 2-5 seconds per minute of audio on modern hardware
```

### 8.2 .gitignore

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
ENV/
env/

# Output directories
output/temp/
output/cache/
*.mp4
*.avi
*.mkv

# Logs
*.log

# IDE
.vscode/.history/
.idea/

# System
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*_phonemes.json
```

## Summary

This implementation provides a complete, autonomous-AI-friendly pipeline for automated lip-sync video generation. All installation procedures use CLI commands compatible with PowerShell automation. The preset system supports unlimited characters and angles, with extensible directory structures for professional workflows. The modular architecture allows AI coding agents to execute the entire pipeline without human intervention while maintaining comprehensive logging and error handling.[1][5][2][4][3]