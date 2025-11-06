#!/usr/bin/env python3
"""
Mock Rhubarb implementation for development when Wine is not available.
This simulates Rhubarb's JSON output for lip-sync processing.
"""
import json
import sys
import argparse
from pathlib import Path

def generate_mock_lipsync(audio_file: str, output_file: str | None = None) -> dict:
    """Generate mock lip-sync data"""
    # Get audio duration (mock calculation based on file size)
    audio_path = Path(audio_file)
    if not audio_path.exists():
        print(f"Error: Audio file '{audio_file}' not found", file=sys.stderr)
        sys.exit(1)
    
    # Mock duration based on file size (rough estimate)
    file_size_mb = audio_path.stat().st_size / (1024 * 1024)
    estimated_duration = max(1.0, file_size_mb * 10)  # Rough estimate
    
    # Generate mock mouth cues at regular intervals
    mouth_cues = []
    current_time = 0.0
    interval = 0.1  # 100ms intervals
    
    mouth_shapes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']
    
    while current_time < estimated_duration:
        # Vary mouth shapes somewhat realistically
        if current_time < 1.0:
            shape = 'X'  # Resting at start
        elif current_time > estimated_duration - 1.0:
            shape = 'X'  # Resting at end
        else:
            # Cycle through mouth shapes with some variation
            shape_index = int((current_time / interval) % len(mouth_shapes))
            shape = mouth_shapes[shape_index]
        
        mouth_cues.append({
            "start": current_time,
            "end": current_time + interval,
            "shape": shape
        })
        
        current_time += interval
    
    metadata = {
        "soundFile": audio_file,
        "duration": estimated_duration,
        "phonemeSet": "Disney",
        "frameRate": 30.0,
        "recognizer": "pocketSphinx",
        "maxPhonemes": 8,
        "machineName": "MockRhubarb",
        "version": "1.13.0-mock"
    }
    
    result = {
        "metadata": metadata,
        "mouthCues": mouth_cues
    }
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Mock Rhubarb lip-sync generator')
    parser.add_argument('audio_file', help='Input audio file')
    parser.add_argument('output_file', nargs='?', help='Output JSON file (positional, like real Rhubarb)')
    parser.add_argument('-o', '--outputFile', help='Output JSON file (flag version)')
    parser.add_argument('-r', '--recognizer', default='pocketSphinx', help='Speech recognizer (ignored in mock)')
    parser.add_argument('-f', '--outputFormat', default='json', help='Output format (only json supported)')
    parser.add_argument('--extendedShapes', action='store_true', help='Use extended mouth shapes')
    parser.add_argument('--quiet', action='store_true', help='Suppress output')
    parser.add_argument('--version', action='version', version='Mock Rhubarb 1.13.0')
    
    args = parser.parse_args()
    
    # Handle both positional and flag-based output file arguments
    output_file = args.outputFile or args.output_file
    
    if args.outputFormat.lower() != 'json':
        print("Error: Mock Rhubarb only supports JSON output format", file=sys.stderr)
        sys.exit(1)
    
    # Generate mock lip-sync data
    result = generate_mock_lipsync(args.audio_file, output_file)
    
    # Output results
    if output_file:
        output_path = Path(output_file)
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        if not args.quiet:
            print(f"Mock lip-sync data saved to {output_path}")
    else:
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()