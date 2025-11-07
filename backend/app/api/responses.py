"""
Response helper functions for the LipSyncAutomation API
"""

import time
from typing import Any, Optional

from .models import ErrorDetail, ResponseMetadata, StandardAPIResponse


def create_success_response(
    data: Any = None,
    request_id: Optional[str] = None,
    processing_time: Optional[float] = None,
    version: str = "1.0.0",
) -> StandardAPIResponse:
    """Create a standardized success response"""
    from datetime import datetime
    from uuid import uuid4

    if request_id is None:
        request_id = str(uuid4())

    metadata = ResponseMetadata(
        timestamp=datetime.now().isoformat(),
        request_id=request_id,
        version=version,
        processing_time_ms=processing_time * 1000 if processing_time else None,
    )

    return StandardAPIResponse(success=True, data=data, error=None, metadata=metadata)


def create_error_response(
    error_code: str,
    error_message: str,
    error_details: Optional[dict] = None,
    request_id: Optional[str] = None,
    processing_time: Optional[float] = None,
    version: str = "1.0.0",
) -> StandardAPIResponse:
    """Create a standardized error response"""
    from datetime import datetime
    from uuid import uuid4

    if request_id is None:
        request_id = str(uuid4())

    metadata = ResponseMetadata(
        timestamp=datetime.now().isoformat(),
        request_id=request_id,
        version=version,
        processing_time_ms=processing_time * 1000 if processing_time else None,
    )

    error = ErrorDetail(code=error_code, message=error_message, details=error_details)

    return StandardAPIResponse(success=False, data=None, error=error, metadata=metadata)


def api_response_wrapper(func):
    """Decorator to wrap API endpoints with standardized responses and timing"""

    def wrapper(*args, **kwargs):
        from uuid import uuid4

        start_time = time.time()
        request_id = str(uuid4())

        try:
            # Call the original function
            result = func(*args, **kwargs)
            processing_time = time.time() - start_time

            # If the result is already a StandardAPIResponse, return it
            if isinstance(result, StandardAPIResponse):
                if not result.metadata.request_id:
                    result.metadata.request_id = request_id
                if not result.metadata.processing_time_ms:
                    result.metadata.processing_time_ms = processing_time * 1000
                return result

            # If the result has an 'error' key, convert to error response
            if isinstance(result, dict) and "error" in result:
                return create_error_response(
                    error_code="PROCESSING_ERROR",
                    error_message=str(result["error"]),
                    error_details=(
                        result if isinstance(result.get("error"), dict) else None
                    ),
                    request_id=request_id,
                    processing_time=processing_time,
                )

            # Otherwise, return success response
            return create_success_response(
                data=result, request_id=request_id, processing_time=processing_time
            )

        except Exception as e:
            processing_time = time.time() - start_time
            return create_error_response(
                error_code="INTERNAL_ERROR",
                error_message=str(e),
                request_id=request_id,
                processing_time=processing_time,
            )

    return wrapper