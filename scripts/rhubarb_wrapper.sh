#!/bin/bash
# Wrapper script to run Rhubarb (Wine or Mock)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if Wine is available and Rhubarb.exe exists
if command -v wine >/dev/null 2>&1 && [ -f "$PROJECT_DIR/tools/rhubarb/rhubarb.exe" ]; then
    # Use real Rhubarb with Wine
    wine "$PROJECT_DIR/tools/rhubarb/rhubarb.exe" "$@"
else
    # Use mock Rhubarb implementation
    python3 "$SCRIPT_DIR/mock_rhubarb.py" "$@"
fi