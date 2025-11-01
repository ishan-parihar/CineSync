#!/bin/bash
# Wrapper script to run Windows rhubarb.exe with wine
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
wine "$PROJECT_DIR/tools/rhubarb/rhubarb.exe" "$@"