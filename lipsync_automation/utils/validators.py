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
    
    # Resolve relative paths relative to project root for proper execution
    from pathlib import Path
    import os
    
    # Get the project root (where the main entry point is executed from)
    project_root = Path.cwd()
    
    # If rhubarb_path is relative, make sure we can find it
    rhubarb_abs_path = Path(rhubarb_path)
    if not rhubarb_abs_path.is_absolute():
        # Resolve the relative path properly by resolving it against the project root
        rhubarb_abs_path = (project_root / rhubarb_path).resolve()
    
    # Validate Rhubarb
    try:
        result = subprocess.run(
            [str(rhubarb_abs_path), '--version'],
            capture_output=True,
            text=True,
            timeout=15  # Increased timeout for Wine initialization
        )
        if result.returncode == 0:
            logger.info(f"Rhubarb validated: {result.stdout.strip()}")
        else:
            logger.error(f"Rhubarb execution failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        # If --version times out, try --help as alternative (might be faster)
        try:
            result = subprocess.run(
                [str(rhubarb_abs_path), '--help'],
                capture_output=True,
                text=True,
                timeout=15  # Increased timeout for Wine initialization
            )
            if result.returncode != 0:
                logger.error(f"Rhubarb is not accessible: both --version and --help failed")
                return False
            else:
                logger.info(f"Rhubarb validated (using --help as alternative check)")
        except Exception as e:
            logger.error(f"Rhubarb not accessible: {e}")
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
            timeout=10  # Increased timeout for consistency
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
