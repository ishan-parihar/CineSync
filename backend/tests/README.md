# Backend Testing Structure

This directory contains the reorganized test suite for the LipSyncAutomation backend, separated into unit and integration tests for better maintainability and clarity.

## Directory Structure

```
backend/tests/
├── unit/                   # Unit tests - fast, isolated tests
│   ├── test_cinematography.py
│   ├── test_transforms.py
│   ├── test_lip_sync_core.py
│   ├── test_utils.py
│   └── test_services.py
├── integration/            # Integration tests - slower, may need external services
│   ├── test_api_endpoints.py
│   ├── test_workflows.py
│   ├── test_websocket.py
│   └── test_animation_structure.py
├── fixtures/              # Test data and mock files
│   ├── mock_data.json
│   ├── sample_audio.wav
│   └── test_profiles/
├── conftest.py            # Shared pytest fixtures and configuration
└── README.md             # This file
```

## Test Categories

### Unit Tests (`unit/`)
- **Purpose**: Test individual components in isolation
- **Speed**: Fast (seconds)
- **Dependencies**: Mocked or minimal
- **Examples**: 
  - Individual component functionality
  - Algorithm testing
  - Data validation
  - Utility functions

### Integration Tests (`integration/`)
- **Purpose**: Test multiple components working together
- **Speed**: Slower (may need network or file system)
- **Dependencies**: Real services or comprehensive mocks
- **Examples**:
  - API endpoint testing
  - Workflow integration
  - WebSocket communication
  - Cross-component functionality

## Running Tests

### All Tests
```bash
cd backend
pytest tests/
```

### Unit Tests Only
```bash
pytest tests/unit/ -m unit
```

### Integration Tests Only
```bash
pytest tests/integration/ -m integration
```

### Specific Test File
```bash
pytest tests/unit/test_cinematography.py -v
```

### Specific Test Method
```bash
pytest tests/unit/test_cinematography.py::TestShotPurposeSelector::test_high_arousal_selects_reaction -v
```

### With Coverage
```bash
pytest tests/ --cov=lipsync_automation --cov-report=html
```

## Test Markers

Tests are marked with the following pytest markers:

- `@pytest.mark.unit`: Unit tests
- `@pytest.mark.integration`: Integration tests
- `@pytest.mark.api`: Tests requiring API server
- `@pytest.mark.slow`: Slow-running tests
- `@pytest.mark.frontend`: Tests requiring frontend

### Running by Marker
```bash
# Run only unit tests
pytest -m unit

# Run only API tests
pytest -m api

# Run tests not requiring API server
pytest -m "not api"
```

## Fixtures

### Shared Fixtures (`conftest.py`)
- `project_root_path`: Project root directory
- `test_config`: Test configuration data
- `temp_dir`: Temporary directory for tests
- `mock_emotion_segment`: Mock emotion data
- `mock_emotion_analysis`: Complete emotion analysis data
- `sample_audio_file`: Path to test audio file

### Component Fixtures
- `lip_sync_generator`: LipSyncGenerator instance
- `preset_manager`: PresetManager instance
- `shot_purpose_selector`: ShotPurposeSelector instance
- `transform_processor`: TransformProcessor instance
- `animation_structure_manager`: AnimationStructureManager instance

## Test Data

### Mock Data (`fixtures/`)
- `mock_data.json`: Test profiles, emotion mappings, and shot rules
- `sample_audio.wav`: Sample audio for testing
- `test_profiles/`: Test profile configurations

## Writing New Tests

### Unit Test Template
```python
#!/usr/bin/env python3
"""
Unit tests for [component].
"""

import pytest
from lipsync_automation.[module] import [Class]

@pytest.mark.unit
class Test[Class]:
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures."""
        self.instance = [Class]()
    
    def test_[specific_functionality](self, [fixture]):
        """Test [specific functionality]."""
        # Arrange
        # Act
        # Assert
        assert expected_result
```

### Integration Test Template
```python
#!/usr/bin/env python3
"""
Integration tests for [feature].
"""

import pytest
from lipsync_automation.[module] import [Class]

@pytest.mark.integration
class Test[Feature]:
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures."""
        try:
            self.instance = [Class]()
        except Exception:
            pytest.skip("[Component] not available")
    
    def test_[workflow](self, [fixture]):
        """Test [workflow] integration."""
        # Test multiple components working together
        pass
```

## Best Practices

1. **Use descriptive test names** that explain what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies** in unit tests
4. **Use pytest.skip()** when dependencies aren't available
5. **Test both happy paths and edge cases**
6. **Keep tests independent** - don't rely on test order
7. **Use fixtures** for common test setup
8. **Add appropriate markers** for test categorization

## Troubleshooting

### Tests Fail with Import Errors
```bash
# Ensure you're in the backend directory
cd backend
# Install the package in development mode
pip install -e ".[dev]"
```

### Integration Tests Fail
- Check if required services are running (API server, WebSocket)
- Verify network connectivity
- Check file permissions for test data

### WebSocket Tests Fail
- Ensure the backend server is running on localhost:8001
- Check if websockets library is installed: `pip install websockets`

### API Tests Fail
- Start the backend server: `python main.py`
- Check if the server is running on the correct port
- Verify API endpoints are accessible

## Configuration

The test suite is configured in `pytest.ini` with:
- Test discovery patterns
- Marker definitions
- Warning filters
- Logging configuration

## Migration from Old Structure

The following files were moved from `/tests/` to the new structure:

| Original File | New Location |
|---------------|--------------|
| `test_shot_purpose.py` | `unit/test_cinematography.py` |
| `test_transforms.py` | `unit/test_transforms.py` |
| `test_generator.py` | `unit/test_lip_sync_core.py` |
| `test_enhanced_endpoints.py` | `integration/test_api_endpoints.py` |
| `test_websocket_enhancements.py` | `integration/test_websocket.py` |
| `final_integration_test.py` | `integration/test_animation_structure.py` |
| `integration_test_final.py` | `integration/test_workflows.py` |

## Continuous Integration

The test suite is designed to work with CI/CD pipelines:
- Unit tests run quickly and provide fast feedback
- Integration tests can be run separately
- Tests are marked for selective execution
- Proper error handling and skipping for missing dependencies