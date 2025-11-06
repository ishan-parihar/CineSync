#!/usr/bin/env python3
"""
Simple test to verify the standardized API response implementation
"""

import sys
import os
import json
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import the functions we need to test
sys.path.insert(0, str(project_root / "web-ui" / "backend"))

try:
    from main import create_success_response, create_error_response, ErrorCodes
    
    print("✓ Successfully imported standardized response functions")
    
    # Test success response
    print("\n" + "="*50)
    print("TESTING SUCCESS RESPONSE")
    print("="*50)
    
    success_resp = create_success_response(
        data={'profiles': ['profile1', 'profile2']}, 
        processing_time=0.123
    )
    
    print("Success Response Created:")
    print(json.dumps(success_resp.model_dump(), indent=2))
    
    # Verify structure
    assert success_resp.success == True
    assert success_resp.data is not None
    assert success_resp.error is None
    assert success_resp.metadata.timestamp is not None
    assert success_resp.metadata.request_id is not None
    assert success_resp.metadata.version == "1.0.0"
    assert success_resp.metadata.processing_time_ms == 123.0
    
    print("✓ Success response structure validated")
    
    # Test error response
    print("\n" + "="*50)
    print("TESTING ERROR RESPONSE")
    print("="*50)
    
    error_resp = create_error_response(
        error_code=ErrorCodes.PROFILE_NOT_FOUND,
        error_message='Profile not found',
        error_details={'requested_profile': 'nonexistent'}
    )
    
    print("Error Response Created:")
    print(json.dumps(error_resp.model_dump(), indent=2))
    
    # Verify structure
    assert error_resp.success == False
    assert error_resp.data is None
    assert error_resp.error is not None
    assert error_resp.error.code == ErrorCodes.PROFILE_NOT_FOUND
    assert error_resp.error.message == 'Profile not found'
    assert error_resp.error.details == {'requested_profile': 'nonexistent'}
    assert error_resp.metadata.timestamp is not None
    assert error_resp.metadata.request_id is not None
    assert error_resp.metadata.version == "1.0.0"
    
    print("✓ Error response structure validated")
    
    # Test error codes
    print("\n" + "="*50)
    print("TESTING ERROR CODES")
    print("="*50)
    
    print(f"PROFILE_NOT_FOUND: {ErrorCodes.PROFILE_NOT_FOUND}")
    print(f"INVALID_REQUEST: {ErrorCodes.INVALID_REQUEST}")
    print(f"INTERNAL_ERROR: {ErrorCodes.INTERNAL_ERROR}")
    print(f"TOTAL_ERROR_CODES: {len([attr for attr in dir(ErrorCodes) if not attr.startswith('_')])}")
    
    print("✓ Error codes accessible")
    
    print("\n" + "="*50)
    print("ALL TESTS PASSED! ✓")
    print("="*50)
    print("Standardized API response system is working correctly.")
    
except ImportError as e:
    print(f"✗ Import Error: {e}")
    print("Make sure the main.py file has been updated with the standardized response models.")
except Exception as e:
    print(f"✗ Unexpected Error: {e}")
    import traceback
    traceback.print_exc()