# LipSyncAutomation v2.0: Advanced Psycho-Cinematic Automation System

Advanced audio-to-video automation system that combines psycho-cinematic principles with emotional analysis to generate emotionally-responsive video content.

## The Problem
Most automated lip-sync or "talking head" videos are emotionally flat, using a single camera angle and static expressions regardless of the audio's tone. This creates a "uncanny valley" effect where the visual presentation contradicts the emotional weight of the speech. The challenge was to automate not just the lip movements, but the entire cinematographic experience—camera distance, angle, and timing—to match the psychological state of the speaker.

## Engineering Highlights

### Psycho-Cinematic Mapping Engine
I implemented a system that translates detected audio emotions (using an 8-emotion taxonomy) into cinematographic decisions. The system automatically adjusts shot distance (e.g., Extreme Close-Ups for high intensity) and camera angles (e.g., Dutch angles for distress) based on the emotional valence and arousal of the speech, effectively automating a professional cinematographer's intuition.

### Cinematographic Grammar Validation
To prevent visual jarring and ensure professional flow, I built a validation layer that checks shot sequences against 32 industry-standard cinematography rules. This ensures that transitions between different emotional segments maintain visual coherence and follow professional narrative flow, preventing the "random jump" feel common in automated video generation.

### Emotional Viseme Synchronization
Beyond simple phoneme-to-mouth mapping, I integrated emotion-aware viseme selection. By mapping detected emotions to specific mouth shapes, the system ensures that a "joyful" greeting looks visually different from an "angry" one. This increases the perceived realism and emotional resonance of the output by aligning the micro-expressions of the character with the audio's tone.

## Setup and Installation

 1.  **Create Virtual Environment**:
     ```powershell
     python -m venv venv
     ```

 2.  **Activate Virtual Environment**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```

 3.  **Install Dependencies**:
     ```powershell
     pip install -r requirements.txt
     ```

 4.  **Required Components**:
     This tool requires **FFmpeg**, **Rhubarb Lip Sync**, and an **Audio2Emotion model** for emotion recognition. The paths to these executables and models are configured in `config/settings.json`. Please ensure they are installed and that the paths in the configuration file are correct.

     - **FFmpeg**: Can be installed via [winget](https://winget.run/pkg/Gyan/FFmpeg) or [Chocolatey](https://community.chocolatey.org/packages/ffmpeg).
     - **Rhubarb Lip Sync**: The system includes Rhubarb in the `tools/rhubarb` directory.
     - **Audio2Emotion Model**: Place the ONNX model file at `./models/audio2emotion/network.onnx` for emotion analysis.
     - **Audio Libraries**: Install `librosa`, `onnxruntime`, and `soundfile` for audio processing and emotion recognition capabilities.

## Usage

### Quick Start

-   **Process a single audio file**:
    ```powershell
    python src\cli.py --audio assets/audio/raw/narration.wav --output output/video.mp4
    ```

-   **Batch process a directory of audio files**:
    ```powershell
    python src\batch_processor.py --input assets/audio/raw --output output/batch --workers 4
    ```

### Command-Line Interface (CLI)

The `src/cli.py` script provides the following options:

-   `--audio`: Path to the input audio file (required).
-   `--output`: Path for the output video file (required).
-   `--preset`: The character preset to use (e.g., `character_1/front`).
-   `--config`: Path to the configuration file (defaults to `config/settings.json`).
-   `--fps`: Override the frames per second setting from the configuration.
-   `--no-cache`: Disable phoneme caching for the current run.
-   `--verbose`: Enable detailed debug logging.
-   `--list-presets`: List all available character presets and exit.

### Advanced Capabilities

The system automatically analyzes the emotional content of your audio and applies psycho-cinematic principles to generate appropriate cinematography:

- **Emotion-Driven Shot Selection**: Automatically selects shot distances (ECU, CU, MCU, MS) based on detected emotions
- **Dynamic Angle Adjustment**: Changes camera angles (eye-level, high angle, low angle, Dutch) according to emotional intensity
- **Tension-Based Pacing**: Adjusts shot duration and transitions based on narrative tension levels
- **Grammar-Compliant Sequences**: Ensures cinematographically sound shot progressions following industry standards
- **Multi-Scene Composition**: Creates complex multi-scene videos with appropriate transitions between different emotional segments

## Character Presets

### Adding New Characters

 1.  **Create Preset Structure**:
     Run the following command to create a new preset directory from the template:
     ```powershell
     python -c "from src.core.preset_manager import PresetManager; pm = PresetManager(); pm.create_preset_from_template('character_name', 'angle')"
     ```
     Replace `character_name` and `angle` with your desired names (e.g., `character_2`, `side`).

 2.  **Add Character Assets**:
     Add the following image files to the newly created `assets/presets/character_name/angle/` directory:
     -   `background.png`: The character's background image.
     -   `mouth_A.png` through `mouth_X.png`: The nine required mouth shapes with transparent backgrounds.
     -   Optional: Include emotion-specific subdirectories (e.g., `emotions/joy/`, `emotions/anger/`) for emotion-aware viseme selection.

 3.  **Use the New Preset**:
     You can now use your new preset in your commands:
     ```powershell
     python src\cli.py --audio audio.wav --output video.mp4 --preset character_name/angle
     ```

### Multi-Angle Support

The system supports multiple camera angles per character with appropriate emotional mapping:
- **Front/Straight-on**: Direct emotional connection, ideal for dialogue
- **Side Profile**: Narrative storytelling, emotional distance
- **ECU (Extreme Close-up)**: High emotional intensity moments
- **CU (Close-up)**: Emotional expressions and reactions
- **MCU (Medium Close-up)**: Standard dialogue shots
- **MS (Medium Shot)**: Establishing presence in context

## Troubleshooting

 -   **`Rhubarb not found` or `FFmpeg not found`**:
     Ensure that the paths to `rhubarb.exe` and `ffmpeg.exe` in `config/settings.json` are correct. If you installed FFmpeg via a package manager, it may already be in your system's PATH.

 -   **Dependency Issues**:
     If you encounter module not found errors, ensure you have activated the virtual environment (`.\venv\Scripts\Activate.ps1`) and installed all the required packages from `requirements.txt`. For emotion analysis, ensure `librosa`, `onnxruntime`, and `soundfile` are installed.

 -   **Emotion Analysis Issues**:
     If emotion analysis is not working, verify that the Audio2Emotion model is available at `./models/audio2emotion/network.onnx` and that the path is correctly configured in `config/settings.json`.

 -   **Preset Not Found**:
     Run `python src/cli.py --list-presets` to see a list of all available presets. Make sure the preset you are trying to use is listed.

## System Capabilities

 -   **Emotion Analysis**: The system analyzes audio to detect 8 distinct emotions (Joy, sadness, anger, fear, surprise, disgust, trust, anticipation) with valence and arousal metrics.
 -   **Psycho-Cinematic Mapping**: Automatically translates detected emotions into appropriate cinematographic choices including shot distance, angle, and composition.
 -   **Tension Analysis**: Calculates narrative tension levels to inform shot duration and transition decisions for dramatic impact.
 -   **Grammar Validation**: Ensures shot sequences follow cinematographic rules and best practices for visual coherence.
 -   **Multi-Scene Composition**: Creates complex multi-scene videos with appropriate transitions between different emotional segments.
 -   **Caching**: The system uses caching for emotion analysis and phoneme data to avoid reprocessing the same audio files. This is enabled by default and can be disabled with the `--no-cache` flag.
 -   **Batch Processing**: For large numbers of audio files, the `batch_processor.py` script can significantly speed up the process by running multiple instances in parallel.
 -   **Processing Time**: On modern hardware, processing time varies based on audio length and emotional complexity, typically 10-30 seconds per minute of audio due to advanced emotion analysis and cinematographic decision-making.
