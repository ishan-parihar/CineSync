#!/usr/bin/env python3
"""
Script to create and manage standardized animation preset structure for LipSyncAutomation v2.0
Directory structure: characters -> angles -> emotions -> image presets
Author: Development Team
Date: 2025-10-18
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any
import shutil

class AnimationStructureManager:
    """
    Manages the standardized animation preset directory structure:
    characters/
    └── character_name/
        └── angles/
            └── angle_name/
                └── emotions/
                    └── emotion_name/
                        ├── A.png
                        ├── B.png
                        ├── C.png
                        ├── D.png
                        ├── E.png
                        ├── F.png
                        ├── G.png
                        ├── H.png
                        └── X.png
    """
    
    # Default emotions based on 8-emotion taxonomy
    DEFAULT_EMOTIONS = [
        'joy', 'sadness', 'anger', 'fear', 
        'surprise', 'disgust', 'trust', 'anticipation'
    ]
    
    # Default viseme images required for each emotion
    DEFAULT_VISEME_IMAGES = [
        'A.png', 'B.png', 'C.png', 'D.png', 
        'E.png', 'F.png', 'G.png', 'H.png', 'X.png'
    ]
    
    # Default angles
    DEFAULT_ANGLES = ['front', 'side', 'profile', 'three_quarter']
    
    def __init__(self, base_path: str = "characters"):
        """
        Initialize the animation structure manager.
        
        Args:
            base_path: Base directory for character animations (default: "characters")
        """
        self.base_path = Path(base_path)
        self.structure_config = self._get_default_config()
        
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for the structure."""
        return {
            "emotions": self.DEFAULT_EMOTIONS,
            "viseme_images": self.DEFAULT_VISEME_IMAGES,
            "angles": self.DEFAULT_ANGLES,
            "required_files": self.DEFAULT_VISEME_IMAGES
        }
    
    def create_character(self, character_name: str) -> bool:
        """
        Create a new character directory with all required subdirectories.
        
        Args:
            character_name: Name of the character to create
            
        Returns:
            True if successful, False otherwise
        """
        try:
            character_path = self.base_path / character_name
            character_path.mkdir(parents=True, exist_ok=True)
            
            # Create angles directory
            angles_path = character_path / "angles"
            angles_path.mkdir(exist_ok=True)
            
            # Create all angle directories
            for angle in self.structure_config["angles"]:
                angle_path = angles_path / angle
                angle_path.mkdir(exist_ok=True)
                
                # Create emotions directory for each angle
                emotions_path = angle_path / "emotions"
                emotions_path.mkdir(exist_ok=True)
                
                # Create emotion directories with viseme images
                for emotion in self.structure_config["emotions"]:
                    emotion_path = emotions_path / emotion
                    emotion_path.mkdir(exist_ok=True)
                    
                    # Create placeholder files for each viseme
                    for viseme in self.structure_config["required_files"]:
                        viseme_path = emotion_path / viseme
                        # Create a placeholder file (empty for now)
                        viseme_path.touch(exist_ok=True)
            
            print(f"✓ Created character '{character_name}' with complete structure")
            return True
            
        except Exception as e:
            print(f"✗ Error creating character '{character_name}': {e}")
            return False
    
    def add_angle(self, character_name: str, angle_name: str) -> bool:
        """
        Add a new angle to an existing character.
        
        Args:
            character_name: Name of existing character
            angle_name: Name of angle to add
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if character exists
            character_path = self.base_path / character_name
            if not character_path.exists():
                print(f"✗ Character '{character_name}' does not exist")
                return False
            
            # Create angle directory
            angle_path = character_path / "angles" / angle_name
            angle_path.mkdir(parents=True, exist_ok=True)
            
            # Create emotions directory for the new angle
            emotions_path = angle_path / "emotions"
            emotions_path.mkdir(exist_ok=True)
            
            # Create emotion directories with viseme images
            for emotion in self.structure_config["emotions"]:
                emotion_path = emotions_path / emotion
                emotion_path.mkdir(exist_ok=True)
                
                # Create placeholder files for each viseme
                for viseme in self.structure_config["required_files"]:
                    viseme_path = emotion_path / viseme
                    viseme_path.touch(exist_ok=True)
            
            print(f"✓ Added angle '{angle_name}' to character '{character_name}'")
            return True
            
        except Exception as e:
            print(f"✗ Error adding angle '{angle_name}' to '{character_name}': {e}")
            return False
    
    def add_emotion(self, character_name: str, angle_name: str, emotion_name: str) -> bool:
        """
        Add a new emotion to an existing character angle.
        
        Args:
            character_name: Name of existing character
            angle_name: Name of existing angle
            emotion_name: Name of emotion to add
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if character and angle exist
            emotion_path = self.base_path / character_name / "angles" / angle_name / "emotions" / emotion_name
            if emotion_path.exists():
                print(f"! Emotion '{emotion_name}' already exists for '{character_name}/{angle_name}'")
                return True
            
            emotion_path.mkdir(parents=True, exist_ok=True)
            
            # Create viseme placeholder files for the emotion
            for viseme in self.structure_config["required_files"]:
                viseme_path = emotion_path / viseme
                viseme_path.touch(exist_ok=True)
            
            print(f"✓ Added emotion '{emotion_name}' to '{character_name}/{angle_name}'")
            return True
            
        except Exception as e:
            print(f"✗ Error adding emotion '{emotion_name}' to '{character_name}/{angle_name}': {e}")
            return False
    
    def add_viseme_image(self, character_name: str, angle_name: str, emotion_name: str, viseme_name: str) -> bool:
        """
        Add a viseme image to an existing emotion.
        
        Args:
            character_name: Name of existing character
            angle_name: Name of existing angle
            emotion_name: Name of existing emotion
            viseme_name: Name of viseme image to add (e.g., "A.png")
            
        Returns:
            True if successful, False otherwise
        """
        try:
            viseme_path = self.base_path / character_name / "angles" / angle_name / "emotions" / emotion_name / viseme_name
            viseme_path.touch(exist_ok=True)
            
            print(f"✓ Added viseme '{viseme_name}' to '{character_name}/{angle_name}/{emotion_name}'")
            return True
            
        except Exception as e:
            print(f"✗ Error adding viseme '{viseme_name}' to '{character_name}/{angle_name}/{emotion_name}': {e}")
            return False
    
    def list_characters(self) -> List[str]:
        """List all characters in the base directory."""
        characters = []
        if self.base_path.exists():
            for item in self.base_path.iterdir():
                if item.is_dir():
                    angles_path = item / "angles"
                    if angles_path.exists():
                        characters.append(item.name)
        return sorted(characters)
    
    def list_angles(self, character_name: str) -> List[str]:
        """List all angles for a specific character."""
        angles = []
        angles_path = self.base_path / character_name / "angles"
        if angles_path.exists():
            for item in angles_path.iterdir():
                if item.is_dir():
                    angles.append(item.name)
        return sorted(angles)
    
    def list_emotions(self, character_name: str, angle_name: str) -> List[str]:
        """List all emotions for a specific character angle."""
        emotions = []
        emotions_path = self.base_path / character_name / "angles" / angle_name / "emotions"
        if emotions_path.exists():
            for item in emotions_path.iterdir():
                if item.is_dir():
                    emotions.append(item.name)
        return sorted(emotions)
    
    def validate_character_animation_set(self, character_name: str) -> Dict[str, Any]:
        """
        Validate that all required animation files exist for a character.
        
        Args:
            character_name: Name of character to validate
            
        Returns:
            Dictionary with validation results
        """
        validation_result = {
            "character": character_name,
            "valid": True,
            "missing_files": [],
            "errors": [],
            "warnings": [],
            "summary": {}
        }
        
        try:
            # Check if character exists
            character_path = self.base_path / character_name
            if not character_path.exists():
                validation_result["valid"] = False
                validation_result["errors"].append(f"Character '{character_name}' does not exist")
                return validation_result
            
            # Count total expected and found items
            total_expected_sets = 0
            total_found_sets = 0
            
            # Check all angles for this character
            for angle in self.structure_config["angles"]:
                angle_path = character_path / "angles" / angle
                if not angle_path.exists():
                    continue  # This angle might not exist yet
                
                # Check all emotions for this angle
                for emotion in self.structure_config["emotions"]:
                    emotion_path = angle_path / "emotions" / emotion
                    if not emotion_path.exists():
                        missing_path = f"{angle}/{emotion}"
                        validation_result["missing_files"].append(missing_path)
                        validation_result["valid"] = False
                    else:
                        # Check all required visemes for this emotion
                        for viseme in self.structure_config["required_files"]:
                            viseme_path = emotion_path / viseme
                            if not viseme_path.exists():
                                missing_file = f"{angle}/{emotion}/{viseme}"
                                validation_result["missing_files"].append(missing_file)
                                validation_result["valid"] = False
                            else:
                                total_found_sets += 1
                            total_expected_sets += 1
            
            # Calculate summary
            validation_result["summary"] = {
                "total_expected_sets": total_expected_sets,
                "total_found_sets": total_found_sets,
                "completeness_percentage": (total_found_sets / total_expected_sets * 100) if total_expected_sets > 0 else 0
            }
            
            if validation_result["valid"] and validation_result["missing_files"]:
                validation_result["valid"] = False
            
            if validation_result["valid"]:
                print(f"✓ Character '{character_name}' is fully validated")
            else:
                print(f"✗ Character '{character_name}' validation failed - {len(validation_result['missing_files'])} missing files")
                
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(str(e))
            print(f"✗ Error validating character '{character_name}': {e}")
        
        return validation_result
    
    def validate_all_characters(self) -> Dict[str, Any]:
        """Validate all characters in the directory."""
        all_characters = self.list_characters()
        validation_results = {
            "total_characters": len(all_characters),
            "valid_characters": 0,
            "invalid_characters": [],
            "details": {}
        }
        
        for character in all_characters:
            result = self.validate_character_animation_set(character)
            validation_results["details"][character] = result
            if result["valid"]:
                validation_results["valid_characters"] += 1
            else:
                validation_results["invalid_characters"].append(character)
        
        return validation_results
    
    def export_structure_report(self, output_file: str = "animation_structure_report.json") -> bool:
        """Export a complete report of the animation structure."""
        try:
            report = {
                "base_path": str(self.base_path),
                "total_characters": len(self.list_characters()),
                "characters": {},
                "validation_summary": self.validate_all_characters()
            }
            
            for character in self.list_characters():
                character_info = {
                    "angles": self.list_angles(character),
                    "emotions_per_angle": {},
                    "total_emotions": 0
                }
                
                for angle in self.list_angles(character):
                    emotions = self.list_emotions(character, angle)
                    character_info["emotions_per_angle"][angle] = emotions
                    character_info["total_emotions"] += len(emotions)
                
                report["characters"][character] = character_info
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Exported structure report to {output_file}")
            return True
            
        except Exception as e:
            print(f"✗ Error exporting structure report: {e}")
            return False
    
    def print_structure_tree(self, character_name: str = None):
        """Print a tree view of the animation structure."""
        print(f"\nAnimation Structure Tree ({self.base_path}):")
        print("=" * 50)
        
        if character_name:
            characters = [character_name] if character_name in self.list_characters() else []
        else:
            characters = self.list_characters()
        
        for char in characters:
            char_path = self.base_path / char
            print(f"├── {char}/")
            print(f"    └── angles/")
            
            for angle in self.list_angles(char):
                print(f"        ├── {angle}/")
                print(f"            └── emotions/")
                
                for i, emotion in enumerate(self.list_emotions(char, angle)):
                    is_last_emotion = i == len(self.list_emotions(char, angle)) - 1
                    emotion_prefix = "            │   ├──" if not is_last_emotion else "                ├──"
                    print(f"{emotion_prefix} {emotion}/")
                    
                    for j, viseme in enumerate(self.structure_config["required_files"]):
                        viseme_path = self.base_path / char / "angles" / angle / "emotions" / emotion / viseme
                        is_last_viseme = j == len(self.structure_config["required_files"]) - 1
                        viseme_prefix = "            │   │   ├──" if not is_last_viseme else "                │   ├──"
                        
                        status = "✓" if viseme_path.exists() else "✗"
                        print(f"{viseme_prefix} {viseme} [{status}]")
        
        if not characters:
            print("    No characters found")


def main():
    """Main function to demonstrate the animation structure manager."""
    print("LipSyncAutomation v2.0 - Animation Structure Manager")
    print("=" * 60)
    
    # Initialize the manager
    manager = AnimationStructureManager()
    
    # Create the base directory
    manager.base_path.mkdir(parents=True, exist_ok=True)
    
    while True:
        print("\n" + "="*60)
        print("ANIMATION STRUCTURE MANAGEMENT MENU")
        print("="*60)
        print("1. Create new character")
        print("2. Add angle to character")
        print("3. Add emotion to character angle")  
        print("4. Add viseme image to emotion")
        print("5. List characters")
        print("6. List angles for character")
        print("7. List emotions for character angle")
        print("8. Validate character animation set")
        print("9. Validate all characters")
        print("10. Print structure tree")
        print("11. Export structure report")
        print("0. Exit")
        
        try:
            choice = input("\nEnter your choice (0-11): ").strip()
            
            if choice == "0":
                print("Exiting Animation Structure Manager...")
                break
            elif choice == "1":
                char_name = input("Enter character name: ").strip()
                if char_name:
                    manager.create_character(char_name)
            elif choice == "2":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                if char_name and angle_name:
                    manager.add_angle(char_name, angle_name)
            elif choice == "3":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                emotion_name = input("Enter emotion name: ").strip()
                if char_name and angle_name and emotion_name:
                    manager.add_emotion(char_name, angle_name, emotion_name)
            elif choice == "4":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                emotion_name = input("Enter emotion name: ").strip()
                viseme_name = input("Enter viseme image name (e.g., A.png): ").strip()
                if char_name and angle_name and emotion_name and viseme_name:
                    manager.add_viseme_image(char_name, angle_name, emotion_name, viseme_name)
            elif choice == "5":
                characters = manager.list_characters()
                if characters:
                    print("\nCharacters:")
                    for i, char in enumerate(characters, 1):
                        validation = manager.validate_character_animation_set(char)
                        status = "✓" if validation["valid"] else "✗"
                        print(f"  {i}. {char} [{status}]")
                else:
                    print("No characters found.")
            elif choice == "6":
                char_name = input("Enter character name: ").strip()
                if char_name:
                    angles = manager.list_angles(char_name)
                    if angles:
                        print(f"\nAngles for '{char_name}':")
                        for i, angle in enumerate(angles, 1):
                            print(f"  {i}. {angle}")
                    else:
                        print(f"No angles found for '{char_name}'.")
            elif choice == "7":
                char_name = input("Enter character name: ").strip()
                angle_name = input("Enter angle name: ").strip()
                if char_name and angle_name:
                    emotions = manager.list_emotions(char_name, angle_name)
                    if emotions:
                        print(f"\nEmotions for '{char_name}/{angle_name}':")
                        for i, emotion in enumerate(emotions, 1):
                            print(f"  {i}. {emotion}")
                    else:
                        print(f"No emotions found for '{char_name}/{angle_name}'.")
            elif choice == "8":
                char_name = input("Enter character name to validate: ").strip()
                if char_name:
                    result = manager.validate_character_animation_set(char_name)
                    print(f"\nValidation Result for '{char_name}':")
                    print(f"  Valid: {'Yes' if result['valid'] else 'No'}")
                    print(f"  Missing Files: {len(result['missing_files'])}")
                    if result['missing_files']:
                        print("  Missing Files List:")
                        for missing in result['missing_files'][:10]:  # Show first 10
                            print(f"    - {missing}")
                        if len(result['missing_files']) > 10:
                            print(f"    ... and {len(result['missing_files']) - 10} more")
            elif choice == "9":
                result = manager.validate_all_characters()
                print(f"\nValidation Summary:")
                print(f"  Total Characters: {result['total_characters']}")
                print(f"  Valid Characters: {result['valid_characters']}")
                print(f"  Invalid Characters: {len(result['invalid_characters'])}")
                if result['invalid_characters']:
                    print(f"  Invalid Character Names: {', '.join(result['invalid_characters'])}")
            elif choice == "10":
                char_name = input("Enter specific character name (or press Enter for all): ").strip()
                if char_name:
                    manager.print_structure_tree(char_name)
                else:
                    manager.print_structure_tree()
            elif choice == "11":
                output_file_input = input("Enter output file name (default: animation_structure_report.json): ").strip()
                if not output_file_input:
                    output_file_input = "animation_structure_report.json"
                manager.export_structure_report(output_file_input)
            else:
                print("Invalid choice. Please enter a number between 0-11.")
        
        except KeyboardInterrupt:
            print("\n\nExiting Animation Structure Manager...")
            break
        except Exception as e:
            print(f"An error occurred: {e}")


if __name__ == "__main__":
    main()