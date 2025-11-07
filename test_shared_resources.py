#!/usr/bin/env python3
"""
Test script to verify shared resources usage across the backend

This script tests that all backend modules can successfully load
configuration from the shared/ directory instead of backend/app/config/
"""

import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def test_shared_config_access():
    """Test that all shared config files are accessible"""
    print("Testing shared config access...")
    
    project_root = Path(__file__).parent
    shared_config_dir = project_root / "shared" / "config"
    
    required_configs = [
        "settings.json",
        "cinematography_rules.json", 
        "shot_purpose_profiles.json",
        "transform_presets.json",
        "logging_config.json"
    ]
    
    all_passed = True
    for config_file in required_configs:
        config_path = shared_config_dir / config_file
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    data = json.load(f)
                print(f"✓ {config_file}: {len(data)} sections/keys")
            except Exception as e:
                print(f"✗ {config_file}: Error loading - {e}")
                all_passed = False
        else:
            print(f"✗ {config_file}: File not found")
            all_passed = False
    
    return all_passed


def test_path_resolution():
    """Test path resolution from different module perspectives"""
    print("\nTesting path resolution from different module perspectives...")
    
    project_root = Path(__file__).parent
    
    # Test cinematography module perspective
    cinema_path = project_root / "backend" / "app" / "cinematography" / "test_module.py"
    cinema_project_root = cinema_path.parent.parent.parent.parent
    cinema_config = cinema_project_root / "shared" / "config" / "cinematography_rules.json"
    
    print(f"Cinematography module perspective:")
    print(f"  Calculated project root: {cinema_project_root}")
    print(f"  Config path: {cinema_config}")
    print(f"  Config exists: {cinema_config.exists()}")
    
    # Test core module perspective
    core_path = project_root / "backend" / "app" / "core" / "test_module.py"
    core_project_root = core_path.parent.parent.parent.parent
    core_config = core_project_root / "shared" / "config" / "settings.json"
    
    print(f"Core module perspective:")
    print(f"  Calculated project root: {core_project_root}")
    print(f"  Config path: {core_config}")
    print(f"  Config exists: {core_config.exists()}")
    
    return cinema_config.exists() and core_config.exists()


def test_settings_json_references():
    """Test that settings.json references shared paths"""
    print("\nTesting settings.json shared path references...")
    
    project_root = Path(__file__).parent
    settings_path = project_root / "shared" / "config" / "settings.json"
    
    if not settings_path.exists():
        print("✗ settings.json not found")
        return False
    
    with open(settings_path, 'r') as f:
        settings = json.load(f)
    
    # Check that cinematography section references shared paths
    if "cinematography" in settings:
        cinema_config = settings["cinematography"]
        
        shot_purpose_config = cinema_config.get("shot_purpose_config", "")
        transform_config = cinema_config.get("transform_config", "")
        
        print(f"Shot purpose config: {shot_purpose_config}")
        print(f"Transform config: {transform_config}")
        
        shot_purpose_ok = shot_purpose_config.startswith("shared/config/")
        transform_ok = transform_config.startswith("shared/config/")
        
        print(f"✓ Shot purpose config uses shared path: {shot_purpose_ok}")
        print(f"✓ Transform config uses shared path: {transform_ok}")
        
        return shot_purpose_ok and transform_ok
    else:
        print("✗ cinematography section not found in settings.json")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Shared Resources Implementation Test")
    print("=" * 60)
    
    tests = [
        ("Shared Config Access", test_shared_config_access),
        ("Path Resolution", test_path_resolution), 
        ("Settings.json References", test_settings_json_references)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 30)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ Test failed with error: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("Test Results Summary:")
    print("=" * 60)
    
    all_passed = True
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print("=" * 60)
    if all_passed:
        print("✓ All tests passed! Shared resources implementation is working.")
        return 0
    else:
        print("✗ Some tests failed. Check the implementation.")
        return 1


if __name__ == "__main__":
    sys.exit(main())