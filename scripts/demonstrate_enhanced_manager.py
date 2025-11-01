#!/usr/bin/env python3
"""
Demonstration script for the enhanced Animation Structure Manager
"""

from src.utils.animation_structure_manager import AnimationStructureManager
import json

def demonstrate_enhanced_features():
    print("LipSyncAutomation v2.0 - Enhanced Animation Structure Manager")
    print("="*70)
    
    # Initialize the enhanced manager
    manager = AnimationStructureManager()
    print("[OK] Enhanced Animation Structure Manager initialized successfully")
    
    # Show existing structure
    print(f"\n1. EXISTING STRUCTURE ANALYSIS")
    print("-" * 40)
    characters = manager.list_characters()
    print(f"Characters found: {characters}")
    
    for char in characters:
        angles = manager.list_angles(char)
        print(f"  {char}: {len(angles)} angles -> {angles}")
        
        for angle in angles:
            emotions = manager.list_emotions(char, angle)
            print(f"    {angle}: {len(emotions)} emotions")
    
    # Validate both structures
    print(f"\n2. CROSS-STRUCTURE VALIDATION")
    print("-" * 40)
    validation_result = manager.validate_both_structures()
    print(f"Overall Status: {validation_result['overall_status']}")
    print(f"Profiles Valid: {validation_result['profiles_structure']['valid']}")
    print(f"Presets Valid: {validation_result['presets_structure']['valid']}")
    print(f"Synchronized: {validation_result['cross_structure_validation']['synchronized']}")
    
    if validation_result['cross_structure_validation']['differences']:
        print(f"Differences found: {len(validation_result['cross_structure_validation']['differences'])}")
        for diff in validation_result['cross_structure_validation']['differences'][:3]:
            print(f"  - {diff}")
    
    # Generate structure audit
    print(f"\n3. STRUCTURE AUDIT")
    print("-" * 40)
    audit_result = manager.generate_structure_audit(include_details=False)
    print(f"Total Characters: {audit_result['profiles_structure']['total_characters']}")
    print(f"Total Angles: {audit_result['profiles_structure']['total_angles']}")
    print(f"Total Emotions: {audit_result['profiles_structure']['total_emotions']}")
    print(f"Total Visemes: {audit_result['profiles_structure']['total_visemes']}")
    
    # Show character coverage
    coverage = audit_result['cross_structure_analysis']['character_coverage']
    print(f"Character Coverage:")
    print(f"  Only in Profiles: {len(coverage['only_in_profiles'])}")
    print(f"  Only in Presets: {len(coverage['only_in_presets'])}")
    print(f"  In Both: {len(coverage['in_both'])}")
    
    if audit_result['recommendations']:
        print(f"\nRecommendations:")
        for rec in audit_result['recommendations']:
            print(f"  • {rec}")
    
    # Export structure
    print(f"\n4. STRUCTURE EXPORT")
    print("-" * 40)
    export_result = manager.export_structure_to_json("demo_structure_export.json")
    print(f"Structure export: {'OK Success' if export_result else 'ERROR Failed'}")
    
    # Show synchronization options
    print(f"\n5. SYNCHRONIZATION CAPABILITIES")
    print("-" * 40)
    print("The enhanced manager can synchronize in multiple directions:")
    print("  • Preset to Profile: Sync from assets/presets to profiles/")
    print("  • Profile to Preset: Sync from profiles/ to assets/presets")
    print("  • Bidirectional: Keep both structures in sync")
    print("  • Selective: Sync only specific characters or angles")
    
    # Show new features
    print(f"\n6. ENHANCED FEATURES")
    print("-" * 40)
    print("+ Cross-structure validation")
    print("+ Comprehensive auditing with recommendations")
    print("+ Bidirectional synchronization")
    print("+ Structure consolidation")
    print("+ JSON import/export for backup/sharing")
    print("+ Detailed file-level validation")
    print("+ Migration tools for legacy structures")
    
    # Demonstrate comprehensive report
    print(f"\n7. COMPREHENSIVE REPORT")
    print("-" * 40)
    print("Running comprehensive validation...")
    validation_result = manager.validate_both_structures()
    audit_result = manager.generate_structure_audit(include_details=False)
    
    print(f"Profile Structure:")
    prof_sum = validation_result['profiles_structure']['summary']
    print(f"  - Valid: {validation_result['profiles_structure']['valid']}")
    print(f"  - Characters: {prof_sum.get('total_characters', 0)}")
    print(f"  - Files Found: {prof_sum.get('total_files_found', 0)}/{prof_sum.get('total_files_expected', 1)} ({prof_sum.get('completeness_percentage', 0):.1f}%)")
    
    print(f"Presets Structure:")
    preset_sum = validation_result['presets_structure']['summary']
    print(f"  - Valid: {validation_result['presets_structure']['valid']}")
    print(f"  - Total Presets: {preset_sum.get('total_presets', 0)}")
    print(f"  - Valid Presets: {preset_sum.get('valid_presets', 0)}")
    
    print(f"Cross-Structure:")
    print(f"  - Synchronized: {validation_result['cross_structure_validation']['synchronized']}")
    print(f"  - Differences: {len(validation_result['cross_structure_validation']['differences'])}")
    
    print(f"\nOK - Enhanced Animation Structure Manager demonstration complete!")
    print("This implementation provides comprehensive management of both profiles and presets structures.")

if __name__ == "__main__":
    demonstrate_enhanced_features()