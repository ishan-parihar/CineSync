# CineSync

[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)]
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Language: Python](https://img.shields.io/badge/Language-Python-blue.svg)](https://www.python.org/)

An audio-to-video automation system that applies psycho-cinematic principles to generate emotionally-responsive talking-head video content. Detected emotions drive camera distance, angle, and timing decisions — producing video that feels like a professional cinematographer made the calls, not a static script.

## The Problem

Most automated talking-head videos are emotionally flat. A single camera angle, fixed expression, identical pacing regardless of whether the narration is joyful, tense, or somber. This creates a visual disconnect — the audio carries emotional weight, but the visuals ignore it entirely.

The result is an uncanny valley effect: technically correct lip sync with a disconnected presentation that undermines the message. Making professional-looking video at scale requires either manual cinematography or expensive post-production work.

## The Solution

CineSync closes the loop between audio and visuals. It analyzes narration for emotional content — eight distinct emotions with valence and arousal metrics — then translates those findings into cinematographic decisions: shot distance (Extreme Close-Up for high intensity, Medium Shot for calm), camera angle (Dutch angle for distress, eye-level for neutrality), and timing (faster cuts for tension, held frames for reflection).

The system also validates every generated shot sequence against 32 cinematography grammar rules, ensuring professional flow between segments rather than jarring random jumps.

## Engineering Highlights

### Psycho-Cinematic Mapping Engine

An 8-emotion taxonomy (Joy, Sadness, Anger, Fear, Surprise, Disgust, Trust, Anticipation) drives automated cinematography decisions. Valence (positive/negative) and arousal (intensity) values map to shot distances — Extreme Close-Ups for high arousal, Medium Shots for calm — and camera angles, including Dutch angles for distress signals and eye-level for neutral speech.

### Cinematographic Grammar Validation

A validation layer checks every generated shot sequence against 32 industry-standard cinematography rules. This prevents the "random jump" feel common in automated video: transitions between emotional segments maintain visual coherence, shot progressions follow professional narrative flow, and jump cuts only appear where grammar permits.

### Emotional Viseme Synchronization

Beyond basic phoneme-to-mouth mapping, the system maps detected emotions to specific mouth shapes. A joyful greeting produces visually different micro-expressions than an angry one, because the viseme selection is emotion-aware. This aligns the character's facial expressions with the audio's tone, increasing perceived realism.

### Tension-Based Pacing

Narrative tension analysis informs shot duration and transition decisions. High-tension segments trigger faster cuts and shorter held frames. Transitional passages use dissolves or match cuts. Calm moments allow held Medium Shots to breathe. The pacing layer produces output that feels authored rather than assembled.

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Language** | Python 3 | Core implementation |
| **Lip Sync** | Rhubarb Lip Sync | Phoneme extraction |
| **Emotion Analysis** | ONNX Runtime + audio2emotion | 8-emotion classification from audio |
| **Audio Processing** | Librosa + soundfile | Feature extraction |
| **Video Generation** | FFmpeg | Frame compositing, encoding |
| **Caching** | Local disk cache | Phoneme and emotion caching |
| **Concurrency** | Python multiprocessing | Batch parallel processing |

## Quick Start

### Prerequisites

- Python 3.10+
- FFmpeg (in PATH)
- Rhubarb Lip Sync (bundled in `tools/rhubarb/`)
- audio2emotion ONNX model at `./models/audio2emotion/network.onnx`

### Installation

```powershell
# Clone the repository
git clone https://github.com/ishanparihar/CineSync.git
cd CineSync

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

FFmpeg can be installed via [winget](https://winget.run/pkg/Gyan/FFmpeg) or [Chocolatey](https://community.chocolatey.org/packages/ffmpeg).

### Process a Single Audio File

```powershell
python src/cli.py --audio assets/audio/raw/narration.wav --output output/video.mp4
```

### Batch Process a Directory

```powershell
python src/batch_processor.py --input assets/audio/raw --output output/batch --workers 4
```

## Command-Line Interface

| Flag | Description |
|------|-------------|
| `--audio` | Path to input audio file (required) |
| `--output` | Path for output video file (required) |
| `--preset` | Character preset to use (e.g., `character_1/front`) |
| `--config` | Path to configuration file (default: `config/settings.json`) |
| `--fps` | Override frames per second |
| `--no-cache` | Disable phoneme and emotion caching |
| `--verbose` | Enable detailed debug logging |
| `--list-presets` | List all available character presets |

## Project Structure

```
CineSync/
├── README.md
├── requirements.txt
├── config/
│   └── settings.json           # Paths to FFmpeg, Rhubarb, model
├── tools/
│   └── rhubarb/                # Rhubarb Lip Sync binary
├── models/
│   └── audio2emotion/          # ONNX emotion model
│       └── network.onnx
├── assets/
│   ├── audio/raw/              # Input audio files
│   └── presets/                 # Character image presets
│       └── character_1/front/  # Per-character assets
│           ├── background.png
│           └── mouth_*.png      # Viseme images
├── output/                      # Generated video output
├── src/
│   ├── cli.py                  # Main CLI entry point
│   ├── batch_processor.py       # Parallel batch processing
│   └── core/
│       ├── emotion_engine.py     # Audio analysis + emotion mapping
│       ├── cinematographer.py     # Shot selection + grammar validation
│       ├── viseme_sync.py        # Emotion-aware mouth shape mapping
│       ├── tension_analyzer.py    # Narrative tension scoring
│       ├── video_composer.py      # FFmpeg-based frame assembly
│       └── preset_manager.py      # Character preset management
└── tests/
```

## Development Status

Operational. Core pipeline (emotion analysis, cinematography, lip sync, video assembly) is functional. Batch processing supports parallel execution. Character preset system supports multi-angle assets and emotion-specific visemes.

## License

MIT License — see LICENSE file for details.

---

Developed by [Ishan Parihar](https://github.com/ishanparihar) — If you find this useful, [consider supporting](https://rzp.io/rzp/ishan-parihar)