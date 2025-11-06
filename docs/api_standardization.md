# Standardized API Response System

## Overview

The LipSyncAutomation backend has been updated to use a standardized API response format across all endpoints. This ensures consistency in how data, errors, and metadata are returned to the frontend.

## Response Structure

All API responses now follow this standardized structure:

```json
{
  "success": boolean,
  "data": any,
  "error": {
    "code": string,
    "message": string,
    "details": any
  },
  "metadata": {
    "timestamp": string,
    "request_id": string,
    "version": string,
    "processing_time_ms": number
  }
}
```

### Field Descriptions

- **success** (boolean): Indicates whether the request was successful
- **data** (any): The response data (present only on successful responses)
- **error** (object): Error information (present only on failed responses)
  - **code** (string): Machine-readable error code for programmatic handling
  - **message** (string): Human-readable error message
  - **details** (any, optional): Additional error context or details
- **metadata** (object): Request and response metadata
  - **timestamp** (string): ISO 8601 timestamp of the response
  - **request_id** (string): Unique identifier for tracking requests
  - **version** (string): API version
  - **processing_time_ms** (number): Server processing time in milliseconds

## Success Response Example

```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "profile_name": "character_1",
        "supported_angles": ["CU", "MS", "LS"],
        "validation": {
          "valid": true,
          "issues": []
        }
      }
    ]
  },
  "error": null,
  "metadata": {
    "timestamp": "2025-01-15T10:30:45.123456",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0",
    "processing_time_ms": 45.67
  }
}
```

## Error Response Example

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Profile 'nonexistent_profile' does not exist or is invalid",
    "details": {
      "profile_name": "nonexistent_profile",
      "available_profiles": ["character_1", "character_2"]
    }
  },
  "metadata": {
    "timestamp": "2025-01-15T10:30:45.123456",
    "request_id": "550e8400-e29b-41d4-a716-446655440001",
    "version": "1.0.0",
    "processing_time_ms": 12.34
  }
}
```

## Error Codes

The system uses standardized error codes for consistent error handling:

### General Errors
- `INTERNAL_ERROR`: Unexpected server error
- `INVALID_REQUEST`: Malformed request
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `PERMISSION_DENIED`: Access denied

### File and Upload Errors
- `FILE_NOT_FOUND`: File not found
- `INVALID_FILE_TYPE`: Unsupported file type
- `FILE_TOO_LARGE`: File exceeds size limit
- `UPLOAD_FAILED`: Upload process failed

### Processing Errors
- `PROCESSING_ERROR`: General processing failure
- `PROCESSING_FAILED`: Processing completed with errors
- `JOB_NOT_FOUND`: Job ID not found
- `JOB_ALREADY_RUNNING`: Job is already in progress

### Profile Errors
- `PROFILE_NOT_FOUND`: Profile does not exist
- `PROFILE_INVALID`: Profile validation failed
- `PROFILE_ALREADY_EXISTS`: Profile name already taken

### Audio Analysis Errors
- `AUDIO_ANALYSIS_FAILED`: Audio processing failed
- `INVALID_AUDIO_FORMAT`: Unsupported audio format
- `AUDIO_TOO_SHORT`: Audio duration too short

### Configuration Errors
- `CONFIG_ERROR`: Configuration issue
- `DEPENDENCY_MISSING`: Required dependency unavailable

### System Errors
- `SYSTEM_OVERLOADED`: System at capacity
- `RESOURCE_EXHAUSTED`: System resources depleted
- `TIMEOUT_ERROR`: Operation timed out

## Implementation Details

### Response Helper Functions

The system provides helper functions for creating standardized responses:

```python
# Success response
return create_success_response(
    data=result_data,
    request_id=request_id,
    processing_time=0.123
)

# Error response
return create_error_response(
    error_code="PROFILE_NOT_FOUND",
    error_message="Profile not found",
    error_details={"profile_name": profile_name}
)
```

### API Response Wrapper

The `api_response_wrapper` decorator automatically handles:
- Request timing
- Request ID generation
- Error wrapping
- Response structure standardization

```python
@app.get("/api/example")
async def example_endpoint():
    return api_response_wrapper(_example_logic)()

def _example_logic():
    # Business logic here
    return {"example": "data"}
```

### Migration Pattern

Existing endpoints follow this migration pattern:

1. **Before** (non-standard):
```python
@app.get("/api/profiles")
async def list_profiles():
    try:
        profiles = get_profiles()
        return {"profiles": profiles}
    except Exception as e:
        return {"error": str(e)}
```

2. **After** (standardized):
```python
@app.get("/api/profiles")
async def list_profiles():
    return api_response_wrapper(_list_profiles_data)()

def _list_profiles_data():
    profiles = get_profiles()
    return {"profiles": profiles}
```

## Frontend Integration

Frontend applications should update to handle the new response format:

```javascript
// Handle API responses
async function handleApiResponse(response) {
    const data = await response.json();
    
    if (data.success) {
        // Handle success
        return data.data;
    } else {
        // Handle error
        console.error(`Error ${data.error.code}: ${data.error.message}`);
        if (data.error.details) {
            console.error('Details:', data.error.details);
        }
        throw new Error(data.error.message);
    }
}

// Usage
try {
    const profiles = await handleApiResponse(response);
    // Process profiles data
} catch (error) {
    // Handle error
}
```

## Benefits

1. **Consistency**: All endpoints return the same structure
2. **Predictability**: Frontend can reliably parse responses
3. **Debugging**: Request IDs and timing aid in troubleshooting
4. **Error Handling**: Standardized error codes improve error management
5. **Monitoring**: Metadata enables better performance monitoring
6. **Versioning**: API version included in every response

## Testing

Use the provided test script to verify compliance:

```bash
cd /home/ishanp/Documents/GitHub/LipSyncAutomation
python scripts/test_api_responses.py
```

This will test all endpoints and verify they follow the standardized response format.

## Migration Status

The following endpoints have been migrated to use standardized responses:

### Completed
- `/` - Root endpoint
- `/api/health` - Health check
- `/api/system-info` - System information
- `/api/system/performance` - Performance metrics
- `/api/profiles` - List profiles (GET)
- `/api/profiles` - Create profile (POST)
- `/api/process` - Start processing
- `/api/jobs` - List jobs
- `/api/jobs/{job_id}` - Get job details

### Pending Migration
Use the migration script to update remaining endpoints:

```bash
cd /home/ishanp/Documents/GitHub/LipSyncAutomation
python scripts/migrate_api_responses.py
```

## Backward Compatibility

The standardized response system maintains backward compatibility by:

1. **Data Preservation**: All original response data is included in the `data` field
2. **Error Information**: Error messages remain accessible in the `error.message` field
3. **Metadata**: Additional metadata is non-breaking

Frontend applications can gradually adopt the new format while maintaining existing functionality.