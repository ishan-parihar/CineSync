# Rhubarb Lip Sync Automation System

Automated lip-sync video generation pipeline for 2D animation content creation. This tool, developed with the assistance of an AI agent, provides a complete and autonomous pipeline for generating lip-synced videos from audio files.

## Architecture

- **Rhubarb Lip Sync**: Phoneme detection from audio.
- **Python Pipeline**: Orchestration, preset management, and video composition.
- **FFmpeg**: Video rendering and encoding.

## Directory Structure

```
├── assets/presets/          # Character presets with mouth shapes
├── output/production/       # Final rendered videos
├── src/core/               # Core processing modules
├── src/utils/              # Validation and caching utilities
└── config/                 # System configuration
```

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

4.  **FFmpeg and Rhubarb**:
    This tool requires **FFmpeg** and **Rhubarb Lip Sync**. The paths to these executables are configured in `config/settings.json`. Please ensure they are installed and that the paths in the configuration file are correct.

    - **FFmpeg**: Can be installed via [winget](https://winget.run/pkg/Gyan/FFmpeg) or [Chocolatey](https://community.chocolatey.org/packages/ffmpeg).
    - **Rhubarb Lip Sync**: The blueprint includes instructions for downloading and extracting Rhubarb into the `tools/rhubarb` directory.

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

3.  **Use the New Preset**:
    You can now use your new preset in your commands:
    ```powershell
    python src\cli.py --audio audio.wav --output video.mp4 --preset character_name/angle
    ```

## Troubleshooting

-   **`Rhubarb not found` or `FFmpeg not found`**:
    Ensure that the paths to `rhubarb.exe` and `ffmpeg.exe` in `config/settings.json` are correct. If you installed FFmpeg via a package manager, it may already be in your system's PATH.

-   **Dependency Issues**:
    If you encounter module not found errors, ensure you have activated the virtual environment (`.\venv\Scripts\Activate.ps1`) and installed all the required packages from `requirements.txt`.

-   **Preset Not Found**:
    Run `python src/cli.py --list-presets` to see a list of all available presets. Make sure the preset you are trying to use is listed.

## Performance

-   **Caching**: The system uses caching for phoneme data to avoid reprocessing the same audio files. This is enabled by default and can be disabled with the `--no-cache` flag.
-   **Batch Processing**: For large numbers of audio files, the `batch_processor.py` script can significantly speed up the process by running multiple instances in parallel.
-   **Processing Time**: On modern hardware, you can expect a processing time of approximately 2-5 seconds per minute of audio.
