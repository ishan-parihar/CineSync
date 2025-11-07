"""
Shared models for the LipSyncAutomation API
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error information for API responses"""

    code: str = Field(..., description="Error code for programmatic handling")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details"
    )


class ResponseMetadata(BaseModel):
    """Metadata for API responses"""

    timestamp: str = Field(..., description="ISO 8601 timestamp")
    request_id: str = Field(..., description="Unique request identifier")
    version: str = Field(default="1.0.0", description="API version")
    processing_time_ms: Optional[float] = Field(
        None, description="Processing time in milliseconds"
    )


class StandardAPIResponse(BaseModel):
    """Standardized API response model"""

    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[Any] = Field(None, description="Response data")
    error: Optional[ErrorDetail] = Field(
        None, description="Error information if failed"
    )
    metadata: ResponseMetadata = Field(..., description="Response metadata")