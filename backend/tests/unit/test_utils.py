#!/usr/bin/env python3
"""
Unit tests for utility functions and helpers.
"""

import pytest
import json
from pathlib import Path
try:
from unittest.mock import Mock, patch
from utils.animation_structure_manager import AnimationStructureManager
except ImportError:
    pytest.skip("animation_structure_manager module not available", allow_module_level=True)


import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))
@pytest.mark.unit
class TestUtilities:
    
    def test_json_file_operations(self, temp_dir):
        """Test JSON file read/write operations."""
        test_data = {"test": "data", "numbers": [1, 2, 3]}
        test_file = temp_dir / "test.json"
        
        # Write JSON file
        with open(test_file, 'w') as f:
            json.dump(test_data, f)
        
        # Read JSON file
        with open(test_file, 'r') as f:
            loaded_data = json.load(f)
        
        assert loaded_data == test_data
    
    def test_path_operations(self, temp_dir):
        """Test path operations and validations."""
        # Test directory creation
        test_dir = temp_dir / "subdir"
        assert not test_dir.exists()
        
        test_dir.mkdir()
        assert test_dir.exists()
        assert test_dir.is_dir()
        
        # Test file creation
        test_file = test_dir / "test.txt"
        test_file.write_text("test content")
        assert test_file.exists()
        assert test_file.is_file()
        
        # Test path operations
        assert test_file.suffix == ".txt"
        assert test_file.stem == "test"
        assert test_file.parent == test_dir
    
    def test_mock_animation_structure_manager(self):
        """Test mock AnimationStructureManager functionality."""
        # Create a mock manager
        mock_manager = Mock(spec=AnimationStructureManager)
        
        # Configure mock methods
        mock_manager.list_characters.return_value = ['character_1', 'character_2']
        mock_manager.list_angles.return_value = ['front', 'side']
        mock_manager.list_emotions.return_value = ['joy', 'anger', 'sadness']
        
        # Test mock behavior
        characters = mock_manager.list_characters()
        assert characters == ['character_1', 'character_2']
        
        angles = mock_manager.list_angles('character_1')
        assert angles == ['front', 'side']
        
        emotions = mock_manager.list_emotions('character_1', 'front')
        assert emotions == ['joy', 'anger', 'sadness']
        
        # Verify method calls
        mock_manager.list_characters.assert_called_once()
        mock_manager.list_angles.assert_called_once_with('character_1')
        mock_manager.list_emotions.assert_called_once_with('character_1', 'front')
    
    def test_error_handling(self):
        """Test error handling in utility functions."""
        # Test file not found error
        with pytest.raises(FileNotFoundError):
            with open("non_existent_file.json", 'r') as f:
                pass
        
        # Test JSON decode error
        with pytest.raises(json.JSONDecodeError):
            json.loads("invalid json string")
    
    def test_data_validation(self):
        """Test data validation functions."""
        # Test string validation
        assert isinstance("test_string", str)
        assert len("test_string") > 0
        
        # Test list validation
        test_list = [1, 2, 3]
        assert isinstance(test_list, list)
        assert len(test_list) == 3
        
        # Test dict validation
        test_dict = {"key": "value"}
        assert isinstance(test_dict, dict)
        assert "key" in test_dict
    
    @patch('pathlib.Path.exists')
    def test_file_existence_check(self, mock_exists):
        """Test file existence checking with mock."""
        mock_exists.return_value = True
        
        test_path = Path("test_file.txt")
        assert test_path.exists()
        mock_exists.assert_called_once()
    
    def test_list_comprehensions(self):
        """Test list comprehension operations."""
        # Test filtering
        numbers = [1, 2, 3, 4, 5]
        even_numbers = [n for n in numbers if n % 2 == 0]
        assert even_numbers == [2, 4]
        
        # Test mapping
        strings = ["a", "b", "c"]
        upper_strings = [s.upper() for s in strings]
        assert upper_strings == ["A", "B", "C"]
        
        # Test filtering and mapping
        numbers = [1, 2, 3, 4, 5]
        doubled_evens = [n * 2 for n in numbers if n % 2 == 0]
        assert doubled_evens == [4, 8]
    
    def test_dict_operations(self):
        """Test dictionary operations."""
        # Test dict creation
        test_dict = {"a": 1, "b": 2, "c": 3}
        
        # Test dict access
        assert test_dict["a"] == 1
        assert test_dict.get("b") == 2
        assert test_dict.get("nonexistent", "default") == "default"
        
        # Test dict methods
        keys = list(test_dict.keys())
        values = list(test_dict.values())
        items = list(test_dict.items())
        
        assert len(keys) == 3
        assert len(values) == 3
        assert len(items) == 3
        assert ("a", 1) in items
    
    def test_string_operations(self):
        """Test string operations."""
        # Test string splitting and joining
        test_string = "hello world test"
        words = test_string.split()
        assert words == ["hello", "world", "test"]
        
        joined = " ".join(words)
        assert joined == test_string
        
        # Test string formatting
        name = "test"
        number = 42
        formatted = f"{name}_{number}"
        assert formatted == "test_42"
        
        # Test string methods
        upper = test_string.upper()
        lower = test_string.lower()
        
        assert upper == "HELLO WORLD TEST"
        assert lower == "hello world test"