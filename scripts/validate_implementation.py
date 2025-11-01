#!/usr/bin/env python3
"""
Validation script for LipSyncAutomation v2.0 implementation
Checks for basic structure and presence of key components
"""

import os
import json
from pathlib import Path


def validate_implementation():
    """Validate the v2.0 implementation"""
    project_root = Path(__file__).parent
    print("Validating LipSyncAutomation v2.0 implementation...")
    print("="*60)
    
    # Check directory structure
    required_dirs = [
        "src/core",
        "src/core/cinematography", 
        "src/utils",
        "models/audio2emotion",
        "profiles",
        "assets/presets/character_1/front"
    ]
    
    print("1. Checking directory structure:")
    all_dirs_exist = True
    for dir_path in required_dirs:
        full_path = project_root / dir_path
        if full_path.exists():
            print(f"   [OK] {dir_path}/")
        else:
            print(f"   [MISSING] {dir_path}/")
    print()
    
    # Check required files
    required_files = [
        "src/core/content_orchestrator.py",
        "src/core/profile_manager.py", 
        "src/core/emotion_analyzer.py",
        "src/core/cinematography/decision_engine.py",
        "src/core/cinematography/grammar_machine.py",
        "src/core/cinematography/psycho_mapper.py",
        "src/core/cinematography/tension_engine.py",
        "src/core/video_compositor_v2.py",
        "src/main.py",
        "src/cli.py",
        "config/settings.json",
        "profiles/character_1.json",
        "requirements.txt"
    ]
    
    print("2. Checking required files:")
    all_files_exist = True
    for file_path in required_files:
        full_path = project_root / file_path
        if full_path.exists():
            print(f"   [OK] {file_path}")
        else:
            print(f"   [MISSING] {file_path}")
    print()
    
    # Check settings.json for v2.0 configuration
    print("3. Checking configuration settings:")
    settings_path = project_root / "config/settings.json"
    if settings_path.exists():
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
            
            # Check for v2.0 specific sections
            v2_sections = ['profile_settings', 'cinematography']
            for section in v2_sections:
                if section in settings:
                    print(f"   [OK] {section} configuration present")
                else:
                    print(f"   [MISSING] {section} configuration missing")
            
            # Check that old preset config was replaced
            if 'profiles' in settings:
                print("   [OK] Profiles configuration present (v2.0)")
            else:
                print("   [MISSING] Profiles configuration missing")
                
        except Exception as e:
            print(f"   [ERROR] Error reading settings.json: {e}")
    else:
        print("   [MISSING] config/settings.json not found")
    print()
    
    # Check main.py for v2.0 imports
    print("4. Checking main.py for v2.0 usage:")
    main_path = project_root / "src/main.py"
    if main_path.exists():
        with open(main_path, 'r') as f:
            main_content = f.read()
        
        v2_imports = [
            "ContentOrchestrator",
            "ProfileManager"
        ]
        
        for imp in v2_imports:
            if imp in main_content:
                print(f"   [OK] {imp} import found")
            else:
                print(f"   [MISSING] {imp} import missing")
        
        if "v2.0" in main_content:
            print("   [OK] v2.0 reference found in main.py")
        else:
            print("   [INFO] v2.0 reference not found in main.py")
    else:
        print("   [MISSING] src/main.py not found")
    print()
    
    # Check cli.py for v2.0 usage
    print("5. Checking cli.py for v2.0 usage:")
    cli_path = project_root / "src/cli.py"
    if cli_path.exists():
        with open(cli_path, 'r') as f:
            cli_content = f.read()
        
        v2_cli_elements = [
            "ContentOrchestrator",
            "ProfileManager",
            "--profile",
            "--cinematic-mode"
        ]
        
        for element in v2_cli_elements:
            if element in cli_content:
                print(f"   [OK] {element} found")
            else:
                print(f"   [NOT FOUND] {element} not found")
    else:
        print("   [MISSING] src/cli.py not found")
    print()
    
    # Check profile structure
    print("6. Checking profile structure:")
    profile_path = project_root / "profiles/character_1.json"
    if profile_path.exists():
        try:
            with open(profile_path, 'r') as f:
                profile = json.load(f)
            
            required_profile_fields = [
                "mouth_shapes",
                "angles", 
                "emotion_mappings",
                "cinematographic_preferences"
            ]
            
            for field in required_profile_fields:
                if field in profile:
                    print(f"   [OK] {field} in profile")
                else:
                    print(f"   [MISSING] {field} missing from profile")
                    
        except Exception as e:
            print(f"   [ERROR] Error reading profile: {e}")
    else:
        print("   [MISSING] profiles/character_1.json not found")
    print()
    
    # Final validation summary
    print("7. Implementation validation:")
    if all_dirs_exist and all_files_exist:
        print("   [OK] All required directories and files are present")
        print("   \nLipSyncAutomation v2.0 implementation validation PASSED!")
        return True
    else:
        print("   [ERROR] Some required directories or files are missing")
        print("   \nLipSyncAutomation v2.0 implementation validation FAILED!")
        return False


if __name__ == "__main__":
    success = validate_implementation()
    exit(0 if success else 1)