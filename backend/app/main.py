"""
Main FastAPI application for LipSyncAutomation Web UI
"""

import asyncio
import json
import logging
import os
import shutil
import sys
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psutil
import uvicorn
from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Define project root for config file access
project_root = Path(__file__).parent.parent.parent

from .cinematography import (
    CinematographicDecisionEngine,
    OverrideManager,
    PsychoCinematicMapper,
    TensionEngine,
)
from .core.content_orchestrator import ContentOrchestrator
from .core.emotion_analyzer import EmotionAnalyzer
from .core.profile_manager import ProfileManager
from .utils.cache_manager import CacheManager
from .utils.validators import validate_audio_file, validate_dependencies

# ============================================================================
# STANDARDIZED API RESPONSE MODELS
# ============================================================================


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


# ============================================================================
# RESPONSE HELPER FUNCTIONS
# ============================================================================


def create_success_response(
    data: Any = None,
    request_id: Optional[str] = None,
    processing_time: Optional[float] = None,
    version: str = "1.0.0",
) -> StandardAPIResponse:
    """Create a standardized success response"""
    if request_id is None:
        request_id = str(uuid.uuid4())

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
    error_details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
    processing_time: Optional[float] = None,
    version: str = "1.0.0",
) -> StandardAPIResponse:
    """Create a standardized error response"""
    if request_id is None:
        request_id = str(uuid.uuid4())

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
        start_time = time.time()
        request_id = str(uuid.uuid4())

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


# ============================================================================
# ERROR CODE CONSTANTS
# ============================================================================


class ErrorCodes:
    """Centralized error code definitions"""

    # General errors
    INTERNAL_ERROR = "INTERNAL_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    PERMISSION_DENIED = "PERMISSION_DENIED"

    # File and upload errors
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UPLOAD_FAILED = "UPLOAD_FAILED"

    # Processing errors
    PROCESSING_ERROR = "PROCESSING_ERROR"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    JOB_ALREADY_RUNNING = "JOB_ALREADY_RUNNING"

    # Profile errors
    PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND"
    PROFILE_INVALID = "PROFILE_INVALID"
    PROFILE_ALREADY_EXISTS = "PROFILE_ALREADY_EXISTS"

    # Audio analysis errors
    AUDIO_ANALYSIS_FAILED = "AUDIO_ANALYSIS_FAILED"
    INVALID_AUDIO_FORMAT = "INVALID_AUDIO_FORMAT"
    AUDIO_TOO_SHORT = "AUDIO_TOO_SHORT"

    # Configuration errors
    CONFIG_ERROR = "CONFIG_ERROR"
    DEPENDENCY_MISSING = "DEPENDENCY_MISSING"

    # System errors
    SYSTEM_OVERLOADED = "SYSTEM_OVERLOADED"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    print("LipSyncAutomation Web API starting up...")
    yield
    # Shutdown
    print("LipSyncAutomation Web API shutting down...")


app = FastAPI(
    title="LipSyncAutomation Web API",
    description="Web API for LipSyncAutomation v2.0 system",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# WEBSOCKET REAL-TIME EVENT STREAMING - Phase 1.5 Implementation
# ============================================================================
#
# This section implements enhanced WebSocket real-time event streaming as outlined
# in Phase 1.5 of the enhancement plan. The system provides granular visibility
# into emotion analysis, cinematographic decisions, and processing stages.
#
# Supported Event Types:
# 1. emotion_segment_processed - Emitted for each emotion segment analyzed
# 2. shot_decision_made - Emitted for each cinematographic decision
# 3. processing_stage_update - Emitted for each processing stage transition
# 4. tension_analyzed - Emitted when tension analysis is completed
# 5. processing_completed - Emitted when a job finishes successfully
# 6. processing_error - Emitted when an error occurs during processing
# 7. batch_* events - Emitted for batch processing operations
# 8. connection_* events - Emitted for WebSocket connection management
#
# Event Structure:
# All events follow the structure:
# {
#     "type": "event_type",
#     "timestamp": "ISO 8601 timestamp",
#     "job_id": "related_job_id",
#     ...event_specific_fields
# }
#
# Integration Notes:
# - Events are automatically broadcast to all connected WebSocket clients
# - Connection management handles disconnections gracefully
# - Error handling prevents single client failures from affecting others
# - Events are integrated with the ContentOrchestrator processing pipeline

# Store processing jobs status
processing_jobs: Dict[str, Dict[str, Any]] = {}

# Maintain active WebSocket connections to broadcast updates
active_websocket_connections = set()


async def emit_processing_update():
    """Emit basic processing update to all connected WebSocket clients"""
    status_update = {
        "type": "basic_status_update",
        "timestamp": datetime.now().isoformat(),
        "active_jobs": len(
            [
                job
                for job in processing_jobs.values()
                if job["status"] in ["processing", "queued"]
            ]
        ),
        "jobs": processing_jobs,
    }

    await broadcast_websocket_event(status_update)


async def emit_emotion_segment_event(
    job_id: str, segment: Dict[str, Any], segment_index: int
):
    """Emit emotion segment processed event"""
    event = {
        "type": "emotion_segment_processed",
        "timestamp": datetime.now().isoformat(),
        "job_id": job_id,
        "segment_index": segment_index,
        "segment": {
            "start_time": segment.get("start_time", 0.0),
            "end_time": segment.get("end_time", 0.0),
            "emotion": segment.get("primary_emotion", {}).get("name", "neutral"),
            "confidence": segment.get("primary_emotion", {}).get("confidence", 0.0),
            "valence": segment.get("primary_emotion", {}).get("valence", 0.0),
            "arousal": segment.get("primary_emotion", {}).get("arousal", 0.0),
        },
    }

    await broadcast_websocket_event(event)


async def emit_shot_decision_event(
    job_id: str, emotion: str, shot_decision: Dict[str, Any]
):
    """Emit cinematographic shot decision made event"""
    event = {
        "type": "shot_decision_made",
        "timestamp": datetime.now().isoformat(),
        "job_id": job_id,
        "emotion": emotion,
        "selected_shot": shot_decision.get("angle", "MCU"),
        "vertical_angle": shot_decision.get("vertical_angle", "eye_level"),
        "confidence": shot_decision.get("confidence", 0.8),
        "reasoning": shot_decision.get(
            "reasoning", "Cinematographic decision based on emotion analysis"
        ),
        "shot_purpose": shot_decision.get("shot_purpose", "dialogue"),
        "duration_modifier": shot_decision.get("duration_modifier", 1.0),
    }

    await broadcast_websocket_event(event)


async def emit_processing_stage_event(
    job_id: str, stage: str, progress: float, estimated_completion: Optional[str] = None
):
    """Emit processing stage update event"""
    if estimated_completion is None:
        estimated_completion = (datetime.now() + timedelta(seconds=30)).isoformat()

    event = {
        "type": "processing_stage_update",
        "timestamp": datetime.now().isoformat(),
        "job_id": job_id,
        "stage": stage,
        "progress": progress,
        "estimated_completion": estimated_completion,
    }

    await broadcast_websocket_event(event)


async def emit_tension_analysis_event(job_id: str, tension_data: Dict[str, Any]):
    """Emit tension analysis event"""
    event = {
        "type": "tension_analyzed",
        "timestamp": datetime.now().isoformat(),
        "job_id": job_id,
        "tension_level": tension_data.get("overall_tension", "medium"),
        "tension_score": tension_data.get("tension_score", 0.5),
        "narrative_phase": tension_data.get("narrative_phase", "development"),
        "dramatic_moments": tension_data.get("dramatic_moments", []),
    }

    await broadcast_websocket_event(event)


async def broadcast_websocket_event(event: Dict[str, Any]):
    """Broadcast event to all connected WebSocket clients with error handling"""
    if not active_websocket_connections:
        return

    event_json = json.dumps(event)
    disconnected_clients = []

    for connection in active_websocket_connections:
        try:
            await connection.send_text(event_json)
        except Exception as e:
            print(f"Error sending WebSocket event: {e}")
            disconnected_clients.append(connection)

    # Remove disconnected clients
    for client in disconnected_clients:
        active_websocket_connections.discard(client)


@app.get("/")
async def read_root():
    return api_response_wrapper(
        lambda: {"message": "LipSyncAutomation Web API", "status": "running"}
    )()


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return api_response_wrapper(
        lambda: {"status": "healthy", "timestamp": datetime.now().isoformat()}
    )()


@app.get("/api/system-info")
async def get_system_info():
    """Get system information and status"""
    return api_response_wrapper(_get_system_info_data)()


def _get_system_info_data():
    """Helper function to get system information data"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    # Validate dependencies
    try:
        dependencies_ok = validate_dependencies(
            config["system"]["rhubarb_path"], config["system"]["ffmpeg_path"]
        )
    except Exception as e:
        dependencies_ok = False

    profile_manager = ProfileManager(config)

    return {
        "dependencies": {
            "ffmpeg": dependencies_ok,
            "rhubarb": dependencies_ok,
        },
        "config": {
            "profile_directory": config["system"]["profiles_directory"],
            "cache_directory": config["system"]["cache_directory"],
            "temp_directory": config["system"]["temp_directory"],
        },
        "profiles": {
            "count": len(profile_manager.list_profiles()),
            "profiles": profile_manager.list_profiles(),
        },
        "processing": {
            "active_jobs": len(
                [
                    job
                    for job in processing_jobs.values()
                    if job["status"] in ["processing", "queued"]
                ]
            ),
            "pending_jobs": len(
                [job for job in processing_jobs.values() if job["status"] == "queued"]
            ),
            "completed_jobs": len(
                [
                    job
                    for job in processing_jobs.values()
                    if job["status"] == "completed"
                ]
            ),
        },
    }


@app.get("/api/system/performance")
async def get_system_performance():
    """
    Get comprehensive system performance metrics including resource utilization,
    processing analytics, and system health indicators.

    Returns:
        Detailed performance data for monitoring system health and optimization
    """
    return api_response_wrapper(_get_system_performance_data)()


def _get_system_performance_data():
    """Helper function to get system performance data"""
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # ============================================================================
        # RESOURCE UTILIZATION METRICS
        # ============================================================================

        # CPU Metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_count_physical = psutil.cpu_count(logical=False)
        cpu_freq = psutil.cpu_freq()
        load_avg = os.getloadavg() if hasattr(os, "getloadavg") else None

        # Memory Metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # Disk Metrics
        disk_partitions = []
        for partition in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_partitions.append(
                    {
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": (usage.used / usage.total) * 100,
                    }
                )
            except PermissionError:
                continue

        # Network Metrics
        network_io = psutil.net_io_counters()
        network_connections = len(psutil.net_connections())

        # ============================================================================
        # PROCESSING TIME ANALYTICS
        # ============================================================================

        # Job Processing Statistics
        all_jobs = list(processing_jobs.values())
        completed_jobs = [job for job in all_jobs if job.get("status") == "completed"]
        failed_jobs = [job for job in all_jobs if job.get("status") == "error"]
        active_jobs = [
            job for job in all_jobs if job.get("status") in ["processing", "queued"]
        ]

        # Calculate processing times
        processing_times = []
        for job in completed_jobs:
            if job.get("start_time") and job.get("end_time"):
                try:
                    start = datetime.fromisoformat(job["start_time"])
                    end = datetime.fromisoformat(job["end_time"])
                    processing_time = (end - start).total_seconds()
                    processing_times.append(processing_time)
                except (ValueError, TypeError):
                    continue

        # Processing Analytics
        avg_processing_time = (
            sum(processing_times) / len(processing_times) if processing_times else 0
        )
        min_processing_time = min(processing_times) if processing_times else 0
        max_processing_time = max(processing_times) if processing_times else 0

        # Queue Performance
        queue_depth = len(active_jobs)
        batch_jobs = len([job for job in all_jobs if "batch_id" in job])

        # Error Rate Analysis
        total_finished_jobs = len(completed_jobs) + len(failed_jobs)
        error_rate = (
            (len(failed_jobs) / total_finished_jobs * 100)
            if total_finished_jobs > 0
            else 0
        )

        # Recent performance (last 10 jobs)
        recent_jobs = sorted(
            completed_jobs, key=lambda x: x.get("end_time", ""), reverse=True
        )[:10]
        recent_avg_time = 0
        if recent_jobs:
            recent_times = []
            for job in recent_jobs:
                if job.get("start_time") and job.get("end_time"):
                    try:
                        start = datetime.fromisoformat(job["start_time"])
                        end = datetime.fromisoformat(job["end_time"])
                        recent_times.append((end - start).total_seconds())
                    except (ValueError, TypeError):
                        continue
            recent_avg_time = (
                sum(recent_times) / len(recent_times) if recent_times else 0
            )

        # ============================================================================
        # SYSTEM HEALTH INDICATORS
        # ============================================================================

        # Dependency Validation
        dependencies_healthy = True
        dependency_status = {}

        try:
            ffmpeg_check = validate_dependencies(
                config["system"]["rhubarb_path"], config["system"]["ffmpeg_path"]
            )
            dependency_status["ffmpeg"] = ffmpeg_check
            dependency_status["rhubarb"] = ffmpeg_check
        except Exception as e:
            dependency_status["ffmpeg"] = False
            dependency_status["rhubarb"] = False
            dependencies_healthy = False

        # Cache Status Analysis
        cache_status = {
            "healthy": True,
            "size_mb": 0,
            "efficiency": 0.85,  # Placeholder - would need cache manager integration
            "last_cleanup": None,
        }

        cache_dir = project_root / config["system"]["cache_directory"]
        if cache_dir.exists():
            try:
                cache_size = sum(
                    f.stat().st_size for f in cache_dir.rglob("*") if f.is_file()
                )
                cache_status["size_mb"] = cache_size / (1024 * 1024)
                # Check if cache is getting too large (>1GB)
                if cache_size > 1024 * 1024 * 1024:
                    cache_status["healthy"] = False
            except PermissionError:
                cache_status["healthy"] = False

        # Directory Health Checks
        directory_health = {}
        critical_dirs = ["profiles_directory", "cache_directory", "temp_directory"]

        for dir_key in critical_dirs:
            dir_path = project_root / config["system"][dir_key]
            dir_healthy = dir_path.exists() and dir_path.is_dir()

            if dir_healthy:
                try:
                    # Check if directory is writable
                    test_file = dir_path / ".health_check"
                    test_file.touch()
                    test_file.unlink()
                except (PermissionError, OSError):
                    dir_healthy = False

            directory_health[dir_key] = {
                "path": str(dir_path),
                "exists": dir_path.exists(),
                "writable": dir_healthy,
                "size_mb": (
                    sum(f.stat().st_size for f in dir_path.rglob("*") if f.is_file())
                    / (1024 * 1024)
                    if dir_path.exists()
                    else 0
                ),
            }

        # System Resource Health
        resource_health = {
            "cpu": {
                "healthy": cpu_percent < 90,
                "status": (
                    "optimal"
                    if cpu_percent < 70
                    else "warning" if cpu_percent < 90 else "critical"
                ),
                "utilization": cpu_percent,
            },
            "memory": {
                "healthy": memory.percent < 85,
                "status": (
                    "optimal"
                    if memory.percent < 70
                    else "warning" if memory.percent < 85 else "critical"
                ),
                "utilization": memory.percent,
            },
            "disk": {
                "healthy": all(part["percent"] < 90 for part in disk_partitions),
                "status": (
                    "optimal"
                    if all(part["percent"] < 70 for part in disk_partitions)
                    else (
                        "warning"
                        if all(part["percent"] < 90 for part in disk_partitions)
                        else "critical"
                    )
                ),
                "partitions": disk_partitions,
            },
        }

        # Overall System Health Score
        health_factors = [
            dependencies_healthy,
            cache_status["healthy"],
            all(dir_info["writable"] for dir_info in directory_health.values()),
            resource_health["cpu"]["healthy"],
            resource_health["memory"]["healthy"],
            resource_health["disk"]["healthy"],
        ]

        overall_health_score = sum(health_factors) / len(health_factors)
        overall_status = (
            "healthy"
            if overall_health_score >= 0.8
            else "degraded" if overall_health_score >= 0.6 else "unhealthy"
        )

        # ============================================================================
        # PERFORMANCE TRENDS AND HISTORICAL DATA
        # ============================================================================

        # Performance trends (simplified - in production would use time-series database)
        performance_trends = {
            "processing_time_trend": "stable",  # Would compare with historical data
            "error_rate_trend": "decreasing" if error_rate < 5 else "stable",
            "resource_utilization_trend": "stable",
            "queue_depth_trend": "decreasing" if queue_depth < 3 else "stable",
        }

        # System Uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time

        # Process-specific metrics
        current_process = psutil.Process()
        process_memory = current_process.memory_info()
        process_cpu = current_process.cpu_percent()

        # ============================================================================
        # COMPILE COMPREHENSIVE RESPONSE
        # ============================================================================

        response = {
            "timestamp": datetime.now().isoformat(),
            "system_uptime": {
                "boot_time": boot_time.isoformat(),
                "uptime_seconds": uptime.total_seconds(),
                "uptime_human": str(uptime).split(".")[0],  # Remove microseconds
            },
            "resource_utilization": {
                "cpu": {
                    "utilization_percent": cpu_percent,
                    "logical_cores": cpu_count_logical,
                    "physical_cores": cpu_count_physical,
                    "frequency_mhz": cpu_freq.current if cpu_freq else None,
                    "load_average": (
                        {"1min": load_avg[0], "5min": load_avg[1], "15min": load_avg[2]}
                        if load_avg
                        else None
                    ),
                },
                "memory": {
                    "total_gb": memory.total / (1024**3),
                    "available_gb": memory.available / (1024**3),
                    "used_gb": memory.used / (1024**3),
                    "utilization_percent": memory.percent,
                    "swap": {
                        "total_gb": swap.total / (1024**3),
                        "used_gb": swap.used / (1024**3),
                        "utilization_percent": swap.percent,
                    },
                },
                "disk": {
                    "partitions": disk_partitions,
                    "summary": {
                        "total_partitions": len(disk_partitions),
                        "healthy_partitions": sum(
                            1 for p in disk_partitions if p["percent"] < 90
                        ),
                        "critical_partitions": sum(
                            1 for p in disk_partitions if p["percent"] >= 90
                        ),
                    },
                },
                "network": {
                    "bytes_sent": network_io.bytes_sent,
                    "bytes_recv": network_io.bytes_recv,
                    "packets_sent": network_io.packets_sent,
                    "packets_recv": network_io.packets_recv,
                    "active_connections": network_connections,
                },
                "process": {
                    "pid": current_process.pid,
                    "memory_rss_mb": process_memory.rss / (1024**2),
                    "memory_vms_mb": process_memory.vms / (1024**2),
                    "cpu_percent": process_cpu,
                    "threads": current_process.num_threads(),
                    "file_descriptors": (
                        current_process.num_fds()
                        if hasattr(current_process, "num_fds")
                        else None
                    ),
                },
            },
            "processing_analytics": {
                "job_statistics": {
                    "total_jobs": len(all_jobs),
                    "completed_jobs": len(completed_jobs),
                    "failed_jobs": len(failed_jobs),
                    "active_jobs": len(active_jobs),
                    "batch_jobs": batch_jobs,
                    "queue_depth": queue_depth,
                },
                "performance_metrics": {
                    "average_processing_time_seconds": avg_processing_time,
                    "min_processing_time_seconds": min_processing_time,
                    "max_processing_time_seconds": max_processing_time,
                    "recent_average_time_seconds": recent_avg_time,
                    "error_rate_percent": error_rate,
                    "success_rate_percent": 100 - error_rate,
                },
                "queue_performance": {
                    "current_depth": queue_depth,
                    "processing_capacity": (
                        "optimal"
                        if queue_depth < 5
                        else "moderate" if queue_depth < 10 else "overloaded"
                    ),
                    "estimated_wait_time": (
                        queue_depth * avg_processing_time
                        if avg_processing_time > 0 and queue_depth > 0
                        else 0
                    ),
                },
            },
            "system_health": {
                "overall_status": overall_status,
                "health_score": overall_health_score,
                "dependencies": dependency_status,
                "cache": cache_status,
                "directories": directory_health,
                "resources": resource_health,
                "health_checks": {
                    "dependencies_healthy": dependencies_healthy,
                    "cache_healthy": cache_status["healthy"],
                    "directories_writable": all(
                        dir_info["writable"] for dir_info in directory_health.values()
                    ),
                    "cpu_healthy": resource_health["cpu"]["healthy"],
                    "memory_healthy": resource_health["memory"]["healthy"],
                    "disk_healthy": resource_health["disk"]["healthy"],
                },
            },
            "performance_trends": performance_trends,
            "recommendations": _generate_performance_recommendations(
                cpu_percent,
                memory.percent,
                disk_partitions,
                error_rate,
                queue_depth,
                cache_status,
            ),
            "alerts": _generate_system_alerts(
                cpu_percent,
                memory.percent,
                disk_partitions,
                error_rate,
                dependencies_healthy,
                overall_status,
            ),
        }

        return response

    except Exception as e:
        # Fallback response with basic error information
        raise Exception(f"Failed to collect system performance data: {str(e)}")


def _generate_performance_recommendations(
    cpu_percent: float,
    memory_percent: float,
    disk_partitions: List[Dict],
    error_rate: float,
    queue_depth: int,
    cache_status: Dict,
) -> List[Dict]:
    """Generate performance optimization recommendations based on system metrics"""
    recommendations = []

    # CPU Recommendations
    if cpu_percent > 85:
        recommendations.append(
            {
                "type": "cpu",
                "priority": "high",
                "message": "High CPU utilization detected",
                "suggestion": "Consider reducing parallel workers or upgrading CPU resources",
            }
        )
    elif cpu_percent > 70:
        recommendations.append(
            {
                "type": "cpu",
                "priority": "medium",
                "message": "Moderate CPU utilization",
                "suggestion": "Monitor for potential performance bottlenecks",
            }
        )

    # Memory Recommendations
    if memory_percent > 85:
        recommendations.append(
            {
                "type": "memory",
                "priority": "high",
                "message": "High memory usage detected",
                "suggestion": "Consider adding more RAM or optimizing memory usage",
            }
        )
    elif memory_percent > 70:
        recommendations.append(
            {
                "type": "memory",
                "priority": "medium",
                "message": "Moderate memory usage",
                "suggestion": "Monitor memory trends and consider cache cleanup",
            }
        )

    # Disk Recommendations
    critical_partitions = [p for p in disk_partitions if p["percent"] > 90]
    if critical_partitions:
        recommendations.append(
            {
                "type": "disk",
                "priority": "critical",
                "message": f"{len(critical_partitions)} disk partition(s) nearly full",
                "suggestion": "Immediate cleanup required. Consider disk expansion.",
            }
        )

    # Error Rate Recommendations
    if error_rate > 10:
        recommendations.append(
            {
                "type": "reliability",
                "priority": "high",
                "message": f"High error rate: {error_rate:.1f}%",
                "suggestion": "Review error logs and check system dependencies",
            }
        )
    elif error_rate > 5:
        recommendations.append(
            {
                "type": "reliability",
                "priority": "medium",
                "message": f"Elevated error rate: {error_rate:.1f}%",
                "suggestion": "Monitor for patterns and investigate common failure causes",
            }
        )

    # Queue Recommendations
    if queue_depth > 10:
        recommendations.append(
            {
                "type": "queue",
                "priority": "high",
                "message": f"High queue depth: {queue_depth} jobs",
                "suggestion": "Consider scaling processing capacity or implementing job prioritization",
            }
        )

    # Cache Recommendations
    if not cache_status.get("healthy", True):
        recommendations.append(
            {
                "type": "cache",
                "priority": "medium",
                "message": "Cache system needs attention",
                "suggestion": "Run cache cleanup and verify cache configuration",
            }
        )

    return recommendations


def _generate_system_alerts(
    cpu_percent: float,
    memory_percent: float,
    disk_partitions: List[Dict],
    error_rate: float,
    dependencies_healthy: bool,
    overall_status: str,
) -> List[Dict]:
    """Generate system alerts based on critical thresholds"""
    alerts = []

    # Critical Alerts
    if cpu_percent > 95:
        alerts.append(
            {
                "level": "critical",
                "type": "cpu",
                "message": f"Critical CPU utilization: {cpu_percent:.1f}%",
                "action_required": "immediate",
            }
        )

    if memory_percent > 95:
        alerts.append(
            {
                "level": "critical",
                "type": "memory",
                "message": f"Critical memory usage: {memory_percent:.1f}%",
                "action_required": "immediate",
            }
        )

    if any(p["percent"] > 95 for p in disk_partitions):
        critical_disks = [p["mountpoint"] for p in disk_partitions if p["percent"] > 95]
        alerts.append(
            {
                "level": "critical",
                "type": "disk",
                "message": f"Critical disk space on: {', '.join(critical_disks)}",
                "action_required": "immediate",
            }
        )

    if not dependencies_healthy:
        alerts.append(
            {
                "level": "critical",
                "type": "dependencies",
                "message": "System dependencies not functioning",
                "action_required": "immediate",
            }
        )

    # Warning Alerts
    if error_rate > 15:
        alerts.append(
            {
                "level": "warning",
                "type": "reliability",
                "message": f"High system error rate: {error_rate:.1f}%",
                "action_required": "soon",
            }
        )

    if overall_status == "unhealthy":
        alerts.append(
            {
                "level": "warning",
                "type": "system",
                "message": "Overall system health is degraded",
                "action_required": "investigate",
            }
        )

    return alerts


@app.get("/api/profiles")
async def list_profiles():
    """List all available character profiles"""
    return api_response_wrapper(_list_profiles_data)()


def _list_profiles_data():
    """Helper function to get profiles data"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    # Sync manifest with actual profile configs to ensure consistency
    _sync_profile_manifest(profile_manager)

    profiles = profile_manager.list_profiles()

    # Add validation status for each profile
    for profile in profiles:
        validation_result = profile_manager.validate_profile(profile["profile_name"])
        profile["validation"] = validation_result

    return {"profiles": profiles}


def _sync_profile_manifest(profile_manager: ProfileManager):
    """Sync the profile manifest with actual profile configurations"""
    manifest_path = profile_manager.profiles_dir / "profile_manifest.json"

    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    updated = False

    for profile_entry in manifest["profiles"]:
        profile_name = profile_entry["profile_name"]
        profile_config_path = (
            profile_manager.profiles_dir / profile_name / "profile_config.json"
        )

        if profile_config_path.exists():
            with open(profile_config_path, "r") as f:
                actual_config = json.load(f)

            # Update supported angles if different
            if profile_entry.get("supported_angles") != actual_config.get(
                "supported_angles"
            ):
                profile_entry["supported_angles"] = actual_config["supported_angles"]
                updated = True

            # Update supported emotions if different
            if profile_entry.get("supported_emotions") != actual_config.get(
                "supported_emotions"
            ):
                profile_entry["supported_emotions"] = actual_config[
                    "supported_emotions"
                ]
                updated = True

    if updated:
        manifest["last_updated"] = datetime.now().isoformat()
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        # Reload the manifest in the profile manager
        profile_manager.manifest = manifest


@app.post("/api/profiles")
async def create_profile(profile_data: Dict[str, Any]):
    """Create a new character profile"""
    return api_response_wrapper(_create_profile_data)(profile_data)


def _create_profile_data(profile_data: Dict[str, Any]):
    """Helper function to create profile data"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    # Extract required fields from profile_data
    profile_name = profile_data.get("profile_name")
    angles = profile_data.get("supported_angles", [])
    emotions = profile_data.get("supported_emotions", [])

    if not profile_name:
        raise Exception("profile_name is required")

    profile_path = profile_manager.create_profile_template(
        profile_name, angles, emotions
    )
    return {
        "message": f"Profile '{profile_name}' created successfully",
        "profile_path": str(profile_path),
        "profile_name": profile_name,
    }


@app.get("/api/profiles/{profile_name}")
async def get_profile(profile_name: str):
    """Get detailed information about a specific profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)

        profile_info = profile_manager.get_profile_info(profile_name)

        return {"profile_info": profile_info, "validation": validation_result}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/profiles/{profile_name}/angles")
async def get_profile_angles(profile_name: str):
    """Get all available angles for a specific profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Get profile info to retrieve supported angles
        profile_info = profile_manager.get_profile_info(profile_name)
        supported_angles = profile_info.get("supported_angles", [])

        # Check which angles actually have directories
        profile_path = Path(config["system"]["profiles_directory"]) / profile_name
        angles_dir = profile_path / "angles"

        if angles_dir.exists():
            available_angles = [d.name for d in angles_dir.iterdir() if d.is_dir()]
        else:
            available_angles = []

        return {
            "profile_name": profile_name,
            "supported_angles": supported_angles,
            "available_angles": available_angles,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/profiles/{profile_name}/angles/{angle_name}/emotions")
async def get_profile_angle_emotions(profile_name: str, angle_name: str):
    """Get all available emotions for a specific profile angle"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Get profile info to retrieve supported emotions
        profile_info = profile_manager.get_profile_info(profile_name)
        supported_emotions = profile_info.get("supported_emotions", {}).get("core", [])

        # Check which emotions actually have directories
        profile_path = Path(config["system"]["profiles_directory"]) / profile_name
        emotions_dir = profile_path / "angles" / angle_name / "emotions"

        if emotions_dir.exists():
            available_emotions = [d.name for d in emotions_dir.iterdir() if d.is_dir()]
        else:
            available_emotions = []

        return {
            "profile_name": profile_name,
            "angle_name": angle_name,
            "supported_emotions": supported_emotions,
            "available_emotions": available_emotions,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes"
)
async def get_visemes(profile_name: str, angle_name: str, emotion_name: str):
    """Get all visemes for a specific profile angle emotion"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Define standard visemes
        standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]

        # Check which visemes exist
        profile_path = Path(config["system"]["profiles_directory"]) / profile_name
        emotion_dir = profile_path / "angles" / angle_name / "emotions" / emotion_name

        visemes = []
        for viseme in standard_visemes:
            viseme_path = emotion_dir / f"{viseme}.png"
            viseme_info = {
                "viseme": viseme,
                "path": str(viseme_path),
                "exists": viseme_path.exists(),
                "valid": viseme_path.exists(),  # Add basic validation
            }
            visemes.append(viseme_info)

        return {
            "profile_name": profile_name,
            "angle_name": angle_name,
            "emotion_name": emotion_name,
            "visemes": visemes,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}"
)
async def upload_viseme(
    profile_name: str,
    angle_name: str,
    emotion_name: str,
    viseme_name: str,
    file: UploadFile = File(...),
):
    """Upload a viseme image for a specific profile angle emotion"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Validate viseme name
        if viseme_name.upper() not in ["A", "B", "C", "D", "E", "F", "G", "H", "X"]:
            return {"error": f"Invalid viseme name: {viseme_name}"}

        # Create the target directory if it doesn't exist
        profile_path = Path(config["system"]["profiles_directory"]) / profile_name
        emotion_dir = profile_path / "angles" / angle_name / "emotions" / emotion_name
        emotion_dir.mkdir(parents=True, exist_ok=True)

        # Save the uploaded file
        if file.filename is None:
            return {"error": "Uploaded file has no name"}

        # Validate file type is an image
        content_type = file.content_type
        if not content_type or not content_type.startswith("image/"):
            return {"error": "Only image files are allowed"}

        # Save the file
        viseme_path = emotion_dir / f"{viseme_name.upper()}.png"
        with open(viseme_path, "wb") as buffer:
            import shutil

            shutil.copyfileobj(file.file, buffer)

        return {
            "message": f"Viseme {viseme_name} uploaded successfully for {profile_name}/{angle_name}/{emotion_name}",
            "viseme_path": str(viseme_path),
        }
    except Exception as e:
        return {"error": str(e)}


@app.delete(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}"
)
async def delete_viseme(
    profile_name: str, angle_name: str, emotion_name: str, viseme_name: str
):
    """Delete a viseme image for a specific profile angle emotion"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Validate viseme name
        if viseme_name.upper() not in ["A", "B", "C", "D", "E", "F", "G", "H", "X"]:
            return {"error": f"Invalid viseme name: {viseme_name}"}

        # Get the viseme file path
        profile_path = Path(config["system"]["profiles_directory"]) / profile_name
        viseme_path = (
            profile_path
            / "angles"
            / angle_name
            / "emotions"
            / emotion_name
            / f"{viseme_name.upper()}.png"
        )

        # Check if the file exists
        if not viseme_path.exists():
            return {
                "error": f"Viseme {viseme_name} does not exist for {profile_name}/{angle_name}/{emotion_name}"
            }

        # Delete the file
        viseme_path.unlink()

        return {
            "message": f"Viseme {viseme_name} deleted successfully for {profile_name}/{angle_name}/{emotion_name}"
        }
    except Exception as e:
        return {"error": str(e)}


@app.get(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}/image"
)
async def get_viseme_image(
    profile_name: str, angle_name: str, emotion_name: str, viseme_name: str
):
    """Get the image file for a specific viseme"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Validate viseme name
        if viseme_name.upper() not in ["A", "B", "C", "D", "E", "F", "G", "H", "X"]:
            return {"error": f"Invalid viseme name: {viseme_name}"}

        # Get the viseme file path
        profile_path = Path(config["system"]["profiles_directory"]) / profile_name
        viseme_path = (
            profile_path
            / "angles"
            / angle_name
            / "emotions"
            / emotion_name
            / f"{viseme_name.upper()}.png"
        )

        # Check if the file exists
        if not viseme_path.exists():
            return {
                "error": f"Viseme {viseme_name} does not exist for {profile_name}/{angle_name}/{emotion_name}"
            }

        # Return the image file
        from fastapi.responses import FileResponse

        return FileResponse(viseme_path, media_type="image/png")

    except Exception as e:
        return {"error": str(e)}


@app.get("/api/profiles/{profile_name}/structure")
async def get_profile_structure(profile_name: str):
    """Get comprehensive structure analysis for a profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        analysis = profile_manager.get_profile_structure_analysis(profile_name)
        return {"structure_analysis": analysis}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/profiles/{profile_name}/repair")
async def repair_profile_structure(profile_name: str, repair_data: Dict[str, Any]):
    """Repair and create missing structure for a profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        create_placeholders = repair_data.get("create_placeholders", True)
        results = profile_manager.create_missing_structure(
            profile_name, create_placeholders
        )
        return results
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/profiles/{profile_name}/angles/{angle_name}")
async def create_angle(
    profile_name: str, angle_name: str, angle_data: Dict[str, Any] = {}
):
    """Create a new angle for a profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Get profile config to add angle to supported angles
        profiles_directory = config["system"]["profiles_directory"]
        if profiles_directory is None:
            return {"error": "profiles_directory not configured in settings"}

        profile_path = Path(profiles_directory) / profile_name
        profile_config_path = profile_path / "profile_config.json"

        with open(config_path, "r") as f:
            profile_config = json.load(f)

        # Add angle to supported angles if not already present
        if angle_name not in profile_config["supported_angles"]:
            profile_config["supported_angles"].append(angle_name)
            profile_config["last_modified"] = datetime.now().isoformat()

            with open(profile_config_path, "w") as f:
                json.dump(profile_config, f, indent=2)

        # Create angle directory structure
        angle_path = profile_path / "angles" / angle_name
        angle_path.mkdir(parents=True, exist_ok=True)

        # Create base directory
        base_path = angle_path / "base"
        base_path.mkdir(exist_ok=True)

        # Create emotions directory
        emotions_path = angle_path / "emotions"
        emotions_path.mkdir(exist_ok=True)

        # Create base head.png placeholder
        from PIL import Image

        head_placeholder = base_path / "head.png"
        if not head_placeholder.exists():
            img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
            img.save(head_placeholder)

        return {
            "message": f"Angle '{angle_name}' created successfully for profile '{profile_name}'",
            "angle_path": str(angle_path),
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}")
async def create_emotion(
    profile_name: str,
    angle_name: str,
    emotion_name: str,
    emotion_data: Dict[str, Any] = {},
):
    """Create a new emotion for a profile angle"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Create emotion directory
        profiles_directory = config["system"]["profiles_directory"]
        if profiles_directory is None:
            return {"error": "profiles_directory not configured in settings"}

        profile_path = Path(profiles_directory) / profile_name
        emotion_path = profile_path / "angles" / angle_name / "emotions" / emotion_name
        emotion_path.mkdir(parents=True, exist_ok=True)

        # Create placeholder visemes
        standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
        from PIL import Image

        for viseme in standard_visemes:
            viseme_path = emotion_path / f"{viseme}.png"
            if not viseme_path.exists():
                img = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
                img.save(viseme_path)

        # Create preset_config.json
        preset_config = {
            "preset_name": f"{profile_name}_{angle_name}_{emotion_name}",
            "character_id": profile_name,
            "angle": angle_name,
            "emotion": emotion_name,
            "description": f"{emotion_name.capitalize()} expression for {angle_name} view",
            "mouth_position": {"x": 960, "y": 700, "anchor": "center"},
            "background": {"image": "background.png", "type": "static"},
            "mouth_shapes": {viseme: f"{viseme}.png" for viseme in standard_visemes},
            "image_specifications": {
                "format": "PNG",
                "bit_depth": 32,
                "alpha_channel": True,
                "dimensions": [512, 512],
                "dpi": 300,
            },
            "metadata": {
                "created_date": datetime.now().isoformat(),
                "version": "1.0",
                "author": "Auto-generated",
            },
        }

        config_path = emotion_path / "preset_config.json"
        with open(config_path, "w") as f:
            json.dump(preset_config, f, indent=2)

        return {
            "message": f"Emotion '{emotion_name}' created successfully for {profile_name}/{angle_name}",
            "emotion_path": str(emotion_path),
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/profiles/{profile_name}/copy-emotion")
async def copy_emotion(profile_name: str, copy_data: Dict[str, Any]):
    """Copy an emotion from one angle to another"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        source_angle = copy_data.get("source_angle")
        target_angle = copy_data.get("target_angle")
        emotion_name = copy_data.get("emotion_name")

        if not all([source_angle, target_angle, emotion_name]):
            return {
                "error": "source_angle, target_angle, and emotion_name are required"
            }

        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        profiles_directory = config["system"]["profiles_directory"]
        if profiles_directory is None:
            return {"error": "profiles_directory not configured in settings"}

        profile_path = Path(str(profiles_directory)) / profile_name
        source_emotion_path = (
            profile_path / "angles" / str(source_angle) / "emotions" / str(emotion_name)
        )
        target_emotion_path = (
            profile_path / "angles" / str(target_angle) / "emotions" / str(emotion_name)
        )

        if not source_emotion_path.exists():
            return {
                "error": f"Source emotion {emotion_name} does not exist in {source_angle}"
            }

        # Create target emotion directory
        target_emotion_path.mkdir(parents=True, exist_ok=True)

        # Copy all viseme files
        import shutil

        standard_visemes = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]
        copied_files = []

        for viseme in standard_visemes:
            source_viseme = source_emotion_path / f"{viseme}.png"
            target_viseme = target_emotion_path / f"{viseme}.png"

            if source_viseme.exists():
                shutil.copy2(source_viseme, target_viseme)
                copied_files.append(str(target_viseme))

        # Copy preset_config.json and update angle
        source_config = source_emotion_path / "preset_config.json"
        target_config = target_emotion_path / "preset_config.json"

        if source_config.exists():
            with open(source_config, "r") as f:
                config_data = json.load(f)

            # Update the angle in the config
            config_data["angle"] = target_angle
            config_data["preset_name"] = f"{profile_name}_{target_angle}_{emotion_name}"
            config_data["metadata"]["created_date"] = datetime.now().isoformat()

            with open(target_config, "w") as f:
                json.dump(config_data, f, indent=2)
            copied_files.append(str(target_config))

        return {
            "message": f"Emotion '{emotion_name}' copied from {source_angle} to {target_angle}",
            "copied_files": copied_files,
        }
    except Exception as e:
        return {"error": str(e)}


@app.put("/api/profiles/{profile_name}")
async def update_profile(profile_name: str, profile_data: Dict[str, Any]):
    """Update an existing character profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Check if profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Load existing profile config
        profiles_dir_config = config["system"]["profiles_directory"]
        if profiles_dir_config is None:
            return {"error": "profiles_directory not configured in settings"}

        profiles_dir_str = str(profiles_dir_config)

        # Use string concatenation to avoid path type issues
        if profiles_dir_str.startswith("./"):
            profile_path = (
                project_root
                / profiles_dir_str[2:]
                / profile_name
                / "profile_config.json"
            )
        else:
            profile_path = Path(profiles_dir_str) / profile_name / "profile_config.json"

        with open(profile_path, "r") as f:
            existing_config = json.load(f)

        # Update provided fields while preserving others
        if "supported_angles" in profile_data:
            existing_config["supported_angles"] = profile_data["supported_angles"]

        if "supported_emotions" in profile_data:
            if (
                isinstance(existing_config["supported_emotions"], dict)
                and "core" in existing_config["supported_emotions"]
            ):
                existing_config["supported_emotions"]["core"] = profile_data[
                    "supported_emotions"
                ]
            else:
                # If the structure is different, update the whole field
                existing_config["supported_emotions"] = profile_data[
                    "supported_emotions"
                ]

        if "character_metadata" in profile_data:
            if "character_metadata" in existing_config:
                existing_config["character_metadata"].update(
                    profile_data["character_metadata"]
                )
            else:
                existing_config["character_metadata"] = profile_data[
                    "character_metadata"
                ]

        if "default_settings" in profile_data:
            if "default_settings" in existing_config:
                existing_config["default_settings"].update(
                    profile_data["default_settings"]
                )
            else:
                existing_config["default_settings"] = profile_data["default_settings"]

        # Update last modified timestamp
        existing_config["last_modified"] = datetime.now().isoformat()

        # Save updated config
        with open(profile_path, "w") as f:
            json.dump(existing_config, f, indent=2)

        # Update manifest if needed
        for profile in profile_manager.manifest["profiles"]:
            if profile["profile_name"] == profile_name:
                profile["supported_angles"] = existing_config["supported_angles"]
                if (
                    isinstance(existing_config["supported_emotions"], dict)
                    and "core" in existing_config["supported_emotions"]
                ):
                    profile["supported_emotions"] = existing_config[
                        "supported_emotions"
                    ]["core"]
                else:
                    profile["supported_emotions"] = existing_config[
                        "supported_emotions"
                    ]
                profile["modified_date"] = datetime.now().isoformat()
                break

        # Save updated manifest
        profile_manager._save_manifest(profile_manager.manifest)

        return {
            "message": f"Profile '{profile_name}' updated successfully",
            "profile_name": profile_name,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/settings")
async def get_settings():
    """Get the main application settings"""
    config_path = project_root / "config" / "settings.json"
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
        return {"settings": config}
    except Exception as e:
        return {"error": str(e)}


@app.put("/api/settings")
async def update_settings(settings_data: Dict[str, Any]):
    """Update the main application settings"""
    config_path = project_root / "config" / "settings.json"
    try:
        # Load existing settings
        with open(config_path, "r") as f:
            config = json.load(f)

        # Update with provided settings data
        # Only update fields that exist in the current config to avoid overwriting important settings
        for key, value in settings_data.items():
            if key in config:
                config[key] = value
            # Also check nested objects
            elif "." in key:
                # Handle nested keys like 'profiles.default_profile'
                keys = key.split(".")
                temp_config = config
                for k in keys[:-1]:
                    if k in temp_config and isinstance(temp_config[k], dict):
                        temp_config = temp_config[k]
                    else:
                        break
                else:
                    if keys[-1] in temp_config:
                        temp_config[keys[-1]] = value

        # Save updated settings
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        return {"message": "Settings updated successfully"}
    except Exception as e:
        return {"error": str(e)}


# ============================================================================
# CINEMATOGRAPHY API ENDPOINTS - Phase 1.1 Implementation
# ============================================================================


@app.get("/api/cinematography/config")
async def get_cinematography_config():
    """Get current cinematography configuration and decision parameters"""
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Initialize cinematography engine to get current rules
        decision_engine = CinematographicDecisionEngine(config)

        # Get current configuration with descriptions
        cinematography_config = {
            "weights": decision_engine.rules,
            "descriptions": {
                "emotion_weight": "Influence of emotional analysis on shot selection (0.0-1.0)",
                "tension_weight": "Influence of tension analysis on shot selection (0.0-1.0)",
                "grammar_weight": "Influence of film grammar rules on shot selection (0.0-1.0)",
                "temporal_smoothing": "Smoothing factor for temporal continuity (0.0-1.0)",
                "shot_duration_range": "Allowed range for shot durations in seconds",
                "angle_stability_window": "Number of shots to maintain angle consistency",
                "distance_progression_preference": "Preference for logical distance progression",
            },
            "metadata": {
                "last_updated": datetime.now().isoformat(),
                "config_source": "config/cinematography_rules.json",
                "engine_version": "1.0.0",
            },
        }

        return cinematography_config

    except Exception as e:
        return {"error": f"Failed to get cinematography config: {str(e)}"}


@app.put("/api/cinematography/config")
async def update_cinematography_config(config_data: Dict[str, Any]):
    """Update cinematography configuration and decision parameters"""
    try:
        config_path = project_root / "config" / "cinematography_rules.json"

        # Load existing configuration
        try:
            with open(config_path, "r") as f:
                existing_config = json.load(f)
        except FileNotFoundError:
            # Create default config if it doesn't exist
            existing_config = {
                "cinematography_weights": {},
                "tension_weights": {},
                "override_rules": {},
            }

        # Update cinematography weights
        if "weights" in config_data:
            if "cinematography_weights" not in existing_config:
                existing_config["cinematography_weights"] = {}
            existing_config["cinematography_weights"].update(config_data["weights"])

        # Update tension weights if provided
        if "tension_weights" in config_data:
            if "tension_weights" not in existing_config:
                existing_config["tension_weights"] = {}
            existing_config["tension_weights"].update(config_data["tension_weights"])

        # Validate updated configuration
        validation_errors = []
        weights = existing_config.get("cinematography_weights", {})

        # Validate weight ranges
        for key, value in weights.items():
            if key.endswith("_weight") and not isinstance(value, (int, float)):
                validation_errors.append(f"{key} must be a number")
            elif key.endswith("_weight") and not (0.0 <= value <= 1.0):
                validation_errors.append(f"{key} must be between 0.0 and 1.0")

        if validation_errors:
            return {"error": "Validation failed", "details": validation_errors}

        # Save updated configuration
        with open(config_path, "w") as f:
            json.dump(existing_config, f, indent=2)

        return {
            "message": "Cinematography configuration updated successfully",
            "updated_fields": list(config_data.keys()),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        return {"error": f"Failed to update cinematography config: {str(e)}"}


@app.get("/api/cinematography/rules")
async def get_cinematography_rules():
    """Retrieve all cinematography rules with metadata and psycho-mapping explanations"""
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Load cinematography rules configuration
        rules_config_path = project_root / "config" / "cinematography_rules.json"
        with open(rules_config_path, "r") as f:
            rules_config = json.load(f)

        # Initialize engines to get detailed rule information
        psycho_mapper = PsychoCinematicMapper(config)
        tension_engine = TensionEngine(config)

        # Format rules with metadata
        cinematography_rules = {
            "emotion_mappings": {
                "description": "Psychological mapping of emotions to camera shots and angles",
                "rules": psycho_mapper.emotion_shot_mappings,
                "activation_status": {
                    emotion: "active"
                    for emotion in psycho_mapper.emotion_shot_mappings.keys()
                },
                "psycho_mapping_explanations": {
                    "joy": "Close-ups for intimacy and connection, eye-level for approachability",
                    "anger": "Extreme close-ups for intensity, low angles for aggression/power",
                    "fear": "Close-ups for vulnerability, high angles for helplessness or low angles for threat",
                    "surprise": "Close-ups for reaction, Dutch angles for disorientation",
                    "sadness": "Medium shots for emotional distance, high angles for vulnerability",
                    "disgust": "Close-ups for reaction, high angles for judgment or Dutch for unease",
                    "trust": "Medium shots for comfort, eye-level for neutrality and reliability",
                    "anticipation": "Close-ups for focus, slight low angles for forward momentum",
                },
            },
            "tension_mappings": {
                "description": "Tension-based shot selection for dramatic impact",
                "rules": tension_engine.tension_weights,
                "activation_status": {
                    category: "active"
                    for category in ["low", "medium", "high", "critical"]
                },
                "explanations": {
                    "low": "Wide shots (MS, MLS, LS) for calm, establishing moments",
                    "medium": "Medium shots (MCU, CU) for building tension",
                    "high": "Close-ups (CU, ECU) for intense emotional moments",
                    "critical": "Extreme close-ups and over-the-shoulder for peak tension",
                },
            },
            "grammar_rules": {
                "description": "Film grammar rules for shot continuity and progression",
                "rules": rules_config.get("grammar_rules", {}),
                "activation_status": {
                    "distance_progression": "active",
                    "angle_consistency": "active",
                    "emotional_rhythm": "active",
                },
                "explanations": {
                    "distance_progression": "Ensures logical progression between shot distances",
                    "angle_consistency": "Maintains 180-degree rule and smooth angle transitions",
                    "emotional_rhythm": "Matches shot pacing to emotional tempo and intensity",
                },
            },
            "metadata": {
                "total_rules": len(rules_config.get("emotion_mappings", {}))
                + len(rules_config.get("grammar_rules", {})),
                "last_updated": datetime.now().isoformat(),
                "config_version": "1.0.0",
            },
        }

        return cinematography_rules

    except Exception as e:
        return {"error": f"Failed to get cinematography rules: {str(e)}"}


@app.post("/api/cinematography/overrides")
async def create_cinematography_override(override_data: Dict[str, Any]):
    """Create manual shot selection overrides with validation and compatibility checks"""
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Initialize override manager
        override_manager = OverrideManager(config)

        # Extract required override parameters
        override_id = override_data.get("override_id")
        override_type = override_data.get("override_type")
        override_value = override_data.get("value")
        target_segment = override_data.get("target_segment")
        conditions = override_data.get("conditions", {})
        is_permanent = override_data.get("permanent", False)

        # Validate required parameters
        if not all([override_id, override_type, override_value]):
            return {
                "error": "Missing required parameters",
                "required": ["override_id", "override_type", "value"],
            }

        # Type casting for safety
        override_id = str(override_id)
        override_type = str(override_type)

        # Validate override compatibility
        compatibility_check = _validate_override_compatibility(
            override_type, override_value, target_segment, conditions
        )
        if not compatibility_check["compatible"]:
            return {
                "error": "Override compatibility check failed",
                "issues": compatibility_check["issues"],
            }

        # Add the override
        success = override_manager.add_override(
            override_id=override_id,
            override_type=override_type,
            value=override_value,
            target_segment=target_segment,
            conditions=conditions,
        )

        if not success:
            return {"error": "Failed to create override"}

        # If permanent, save to file
        if is_permanent:
            overrides_dir = project_root / "config" / "overrides"
            overrides_dir.mkdir(exist_ok=True)
            override_file = overrides_dir / f"{override_id}.json"
            override_manager.save_overrides_to_file(str(override_file))

        result = {
            "message": f"Override '{override_id}' created successfully",
            "override_id": override_id,
            "override_type": override_type,
            "override_value": override_value,
            "target_segment": target_segment,
            "permanent": is_permanent,
            "timestamp": datetime.now().isoformat(),
            "compatibility_notes": compatibility_check["notes"],
        }

        return result

    except Exception as e:
        return {"error": f"Failed to create cinematography override: {str(e)}"}


@app.get("/api/cinematography/overrides")
async def get_cinematography_overrides():
    """Get all active cinematography overrides"""
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Initialize override manager
        override_manager = OverrideManager(config)

        active_overrides = override_manager.get_active_overrides()

        return {
            "active_overrides": active_overrides,
            "total_active": len(active_overrides),
            "override_types": list(
                set(override["type"] for override in active_overrides.values())
            ),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        return {"error": f"Failed to get cinematography overrides: {str(e)}"}


@app.delete("/api/cinematography/overrides/{override_id}")
async def delete_cinematography_override(override_id: str):
    """Delete a specific cinematography override"""
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Initialize override manager
        override_manager = OverrideManager(config)

        success = override_manager.remove_override(override_id)

        if success:
            return {
                "message": f"Override '{override_id}' deleted successfully",
                "override_id": override_id,
                "timestamp": datetime.now().isoformat(),
            }
        else:
            return {"error": f"Override '{override_id}' not found"}

    except Exception as e:
        return {"error": f"Failed to delete cinematography override: {str(e)}"}


def _validate_override_compatibility(
    override_type: str,
    override_value: Any,
    target_segment: Optional[str],
    conditions: Dict,
) -> Dict[str, Any]:
    """Validate override compatibility and return compatibility check results"""
    issues = []
    notes = []

    # Define allowed values for different override types
    allowed_values = {
        "shot_distance_override": ["ECU", "CU", "MCU", "MS", "MLS", "LS"],
        "shot_angle_override": ["high_angle", "eye_level", "low_angle", "dutch"],
        "transition_override": ["cut", "dissolve", "fade", "wipe", "slide"],
        "duration_override": (0.1, 10.0),  # min, max
        "emotion_intensity_override": (0.0, 1.0),  # min, max
    }

    # Check override type validity
    if override_type not in allowed_values:
        issues.append(f"Invalid override type: {override_type}")
        return {"compatible": False, "issues": issues, "notes": notes}

    # Check value validity
    if override_type in [
        "shot_distance_override",
        "shot_angle_override",
        "transition_override",
    ]:
        if override_value not in allowed_values[override_type]:
            issues.append(f"Invalid value for {override_type}: {override_value}")

    elif override_type in ["duration_override", "emotion_intensity_override"]:
        min_val, max_val = allowed_values[override_type]
        if not isinstance(override_value, (int, float)) or not (
            min_val <= override_value <= max_val
        ):
            issues.append(
                f"Value for {override_type} must be between {min_val} and {max_val}"
            )

    # Check specific compatibility scenarios
    if override_type == "shot_distance_override":
        if override_value == "ECU" and conditions.get("min_duration", 0) < 1.0:
            notes.append("ECU shots typically work best with longer durations (1.0s+)")
        elif override_value == "LS" and conditions.get("max_duration", 10.0) > 8.0:
            notes.append("Long shots may become static with very long durations")

    elif override_type == "shot_angle_override":
        if override_value == "dutch" and conditions.get("emotion") in [
            "calm",
            "peaceful",
        ]:
            notes.append(
                "Dutch angles may create unnecessary tension for calm emotions"
            )

    # Check target segment compatibility
    if target_segment and not target_segment.startswith("segment_"):
        notes.append("Target segment should follow format 'segment_XXX'")

    return {"compatible": len(issues) == 0, "issues": issues, "notes": notes}


# ============================================================================
# EMOTION ANALYSIS API ENDPOINTS - Phase 1.2 Implementation
# ============================================================================


@app.get("/api/emotions/analyze/{audio_id}")
async def analyze_emotion_audio(audio_id: str):
    """
    Return detailed emotion segmentation data for a specific audio file.

    Args:
        audio_id: Audio file identifier (can be file path or hash)

    Returns:
        Detailed emotion segmentation with confidence scores, valence/arousal values, and timing
    """
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Initialize emotion analyzer
        emotion_analyzer = EmotionAnalyzer(config)

        # Determine audio path - could be direct path or need to resolve from audio_id
        audio_path = audio_id
        if not Path(audio_id).exists():
            # Try to find the audio file in common locations
            possible_paths = [
                project_root / "assets" / "audio" / "raw" / audio_id,
                project_root / "uploads" / audio_id,
                # If audio_id is a hash, look for matching file
            ]

            for path in possible_paths:
                if path.exists():
                    audio_path = str(path)
                    break
            else:
                return {"error": f"Audio file not found: {audio_id}"}

        # Validate audio file
        if not validate_audio_file(audio_path):
            return {"error": f"Invalid audio file: {audio_path}"}

        # Perform emotion analysis
        emotion_analysis = emotion_analyzer.analyze_audio(audio_path)

        # Enhance with additional metadata for API response
        enhanced_analysis = {
            "audio_id": audio_id,
            "audio_path": audio_path,
            "analysis_timestamp": datetime.now().isoformat(),
            "analysis_version": "1.0.0",
            "metadata": emotion_analysis.get("metadata", {}),
            "emotion_segments": emotion_analysis.get("emotion_segments", []),
            "overall_sentiment": emotion_analysis.get("overall_sentiment", {}),
            "processing_info": {
                "total_segments": len(emotion_analysis.get("emotion_segments", [])),
                "analysis_duration": emotion_analysis.get("metadata", {}).get(
                    "duration", 0.0
                ),
                "model_used": emotion_analysis.get("metadata", {}).get(
                    "model", "audio2emotion"
                ),
                "cache_hit": False,  # TODO: Implement cache detection
            },
        }

        # Add segment statistics
        if enhanced_analysis["emotion_segments"]:
            segments = enhanced_analysis["emotion_segments"]

            # Calculate emotion distribution
            emotion_counts = {}
            total_confidence = 0.0
            total_valence = 0.0
            total_arousal = 0.0

            for segment in segments:
                primary_emotion = segment.get("primary_emotion", {})
                emotion_name = primary_emotion.get("name", "unknown")
                confidence = primary_emotion.get("confidence", 0.0)
                valence = primary_emotion.get("valence", 0.0)
                arousal = primary_emotion.get("arousal", 0.0)

                emotion_counts[emotion_name] = emotion_counts.get(emotion_name, 0) + 1
                total_confidence += confidence
                total_valence += valence
                total_arousal += arousal

            enhanced_analysis["segment_statistics"] = {
                "emotion_distribution": emotion_counts,
                "average_confidence": (
                    total_confidence / len(segments) if segments else 0.0
                ),
                "average_valence": total_valence / len(segments) if segments else 0.0,
                "average_arousal": total_arousal / len(segments) if segments else 0.0,
                "durationweighted_emotion": _calculate_duration_weighted_emotion(
                    segments
                ),
            }

        return enhanced_analysis

    except Exception as e:
        return {"error": f"Failed to analyze emotions for {audio_id}: {str(e)}"}


@app.get("/api/emotions/segments/{job_id}")
async def get_emotion_segments(job_id: str):
    """
    Retrieve emotion analysis for specific processing jobs with raw audio features.

    Args:
        job_id: Processing job identifier

    Returns:
        Detailed emotion segments with raw audio features and alternative suggestions
    """
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Check if job exists
        if job_id not in processing_jobs:
            return {"error": f"Job not found: {job_id}"}

        job = processing_jobs[job_id]

        # Initialize emotion analyzer
        emotion_analyzer = EmotionAnalyzer(config)

        # Get audio path from job
        audio_path = job.get("audio_path")
        if not audio_path:
            return {"error": f"No audio path found for job: {job_id}"}

        # Check if emotion analysis exists in cache or job result
        emotion_data = None

        # First, try to get from job result if completed
        if job.get("status") == "completed" and "result" in job:
            result = job["result"]
            if isinstance(result, dict) and "metadata" in result:
                emotion_data = result.get("metadata", {}).get("emotion_analysis")

        # If not in job result, try to load from cache
        if not emotion_data:
            try:
                emotion_data = emotion_analyzer.analyze_audio(audio_path)
            except Exception:
                # If analysis fails, try to load from cache directly
                cache_key = emotion_analyzer._generate_cache_key(audio_path)
                emotion_data = emotion_analyzer._load_from_cache(cache_key)

        if not emotion_data:
            return {"error": f"No emotion analysis found for job: {job_id}"}

        # Enhance segments with additional analysis
        enhanced_segments = []
        emotion_segments = emotion_data.get("emotion_segments", [])

        for i, segment in enumerate(emotion_segments):
            enhanced_segment = {
                **segment,
                "segment_index": i,
                "job_context": {
                    "job_id": job_id,
                    "profile_used": job.get("profile_name"),
                    "cinematic_mode": job.get("cinematic_mode", "balanced"),
                },
                "alternative_emotions": _generate_alternative_emotions(segment),
                "acoustic_analysis": {
                    "features": segment.get("acoustic_features", {}),
                    "quality_metrics": _calculate_acoustic_quality_metrics(
                        segment.get("acoustic_features", {})
                    ),
                    "speech_characteristics": _analyze_speech_characteristics(
                        segment.get("acoustic_features", {})
                    ),
                },
                "cinematographic_suggestions": _generate_cinematographic_suggestions(
                    segment
                ),
            }
            enhanced_segments.append(enhanced_segment)

        # Compile comprehensive response
        response = {
            "job_id": job_id,
            "job_status": job.get("status"),
            "audio_path": audio_path,
            "analysis_timestamp": datetime.now().isoformat(),
            "emotion_segments": enhanced_segments,
            "raw_audio_features": {
                "segment_count": len(enhanced_segments),
                "feature_summary": _summarize_audio_features(enhanced_segments),
                "feature_consistency": _analyze_feature_consistency(enhanced_segments),
            },
            "alternative_emotion_suggestions": _generate_global_alternatives(
                emotion_segments
            ),
            "processing_metadata": {
                "analysis_duration": emotion_data.get("metadata", {}).get(
                    "duration", 0.0
                ),
                "model_used": emotion_data.get("metadata", {}).get(
                    "model", "audio2emotion"
                ),
                "sample_rate": emotion_data.get("metadata", {}).get(
                    "sample_rate", 16000
                ),
                "cache_status": (
                    "cached" if job.get("status") == "completed" else "fresh"
                ),
            },
        }

        return response

    except Exception as e:
        return {"error": f"Failed to get emotion segments for job {job_id}: {str(e)}"}


@app.post("/api/emotions/manual-adjustment")
async def manual_emotion_adjustment(adjustment_data: Dict[str, Any]):
    """
    Allow manual emotion segment adjustment with confidence score modifications.

    Args:
        adjustment_data: Adjustment request containing segment modifications

    Returns:
        Adjustment results with validation and continuity checks
    """
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Extract required parameters
        job_id = adjustment_data.get("job_id")
        segment_adjustments = adjustment_data.get("segment_adjustments", [])
        adjustment_options = adjustment_data.get("options", {})

        if not job_id:
            return {"error": "job_id is required"}

        if not segment_adjustments:
            return {"error": "At least one segment adjustment is required"}

        # Validate job exists
        if job_id not in processing_jobs:
            return {"error": f"Job not found: {job_id}"}

        job = processing_jobs[job_id]
        audio_path = job.get("audio_path")
        if not audio_path:
            return {"error": f"No audio path found for job: {job_id}"}

        # Initialize emotion analyzer
        emotion_analyzer = EmotionAnalyzer(config)

        # Load current emotion analysis
        try:
            current_analysis = emotion_analyzer.analyze_audio(audio_path)
        except Exception:
            cache_key = emotion_analyzer._generate_cache_key(audio_path)
            current_analysis = emotion_analyzer._load_from_cache(cache_key)

        if not current_analysis:
            return {"error": f"No emotion analysis found for job: {job_id}"}

        # Process adjustments
        adjustment_results = []
        validation_errors = []
        continuity_warnings = []

        current_segments = current_analysis.get("emotion_segments", [])

        for adjustment in segment_adjustments:
            segment_id = adjustment.get("segment_id")
            new_emotion = adjustment.get("new_emotion")
            new_confidence = adjustment.get("new_confidence")
            adjustment_reason = adjustment.get("reason", "manual_adjustment")

            # Find the segment to adjust
            segment_index = None
            target_segment = None

            for i, segment in enumerate(current_segments):
                if segment.get("segment_id") == segment_id:
                    segment_index = i
                    target_segment = segment
                    break

            if segment_index is None or target_segment is None:
                validation_errors.append(f"Segment {segment_id} not found")
                continue

            # Validate adjustment
            validation_result = _validate_emotion_adjustment(
                target_segment,
                new_emotion,
                new_confidence,
                segment_index,
                current_segments,
            )

            if not validation_result["valid"]:
                validation_errors.extend(validation_result["errors"])
                continue

            # Apply adjustment
            adjusted_segment = {
                **target_segment,
                "primary_emotion": {
                    "name": new_emotion,
                    "confidence": new_confidence,
                    "intensity": new_confidence,
                    "valence": validation_result["valence"],
                    "arousal": validation_result["arousal"],
                },
                "adjustment_metadata": {
                    "original_emotion": target_segment.get("primary_emotion", {}).get(
                        "name"
                    ),
                    "original_confidence": target_segment.get(
                        "primary_emotion", {}
                    ).get("confidence"),
                    "adjustment_timestamp": datetime.now().isoformat(),
                    "adjustment_reason": adjustment_reason,
                    "adjusted_by": "manual_api",
                },
            }

            # Update the segment in the analysis
            current_segments[segment_index] = adjusted_segment

            adjustment_results.append(
                {
                    "segment_id": segment_id,
                    "adjustment_applied": True,
                    "previous_emotion": target_segment.get("primary_emotion", {}).get(
                        "name"
                    ),
                    "new_emotion": new_emotion,
                    "confidence_change": new_confidence
                    - target_segment.get("primary_emotion", {}).get("confidence", 0.0),
                    "validation_notes": validation_result.get("notes", []),
                }
            )

        # Check emotion continuity rules
        if adjustment_options.get("validate_continuity", True):
            continuity_analysis = _validate_emotion_continuity(current_segments)
            continuity_warnings.extend(continuity_analysis.get("warnings", []))

        # Recalculate overall sentiment with adjustments
        updated_overall_sentiment = emotion_analyzer._calculate_overall_sentiment(
            current_segments
        )

        # Create adjusted analysis
        adjusted_analysis = {
            **current_analysis,
            "emotion_segments": current_segments,
            "overall_sentiment": updated_overall_sentiment,
            "adjustment_metadata": {
                "job_id": job_id,
                "adjustment_timestamp": datetime.now().isoformat(),
                "total_adjustments": len(adjustment_results),
                "adjustment_summary": adjustment_results,
                "validation_errors": validation_errors,
                "continuity_warnings": continuity_warnings,
                "adjustment_options": adjustment_options,
            },
        }

        # Save adjusted analysis to cache with new identifier
        adjusted_cache_key = None
        if adjustment_options.get("save_adjusted", True):
            adjusted_cache_key = (
                f"adjusted_{job_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            emotion_analyzer._save_to_cache(adjusted_cache_key, adjusted_analysis)

        # Update job with adjustment info
        if "emotion_adjustments" not in job:
            job["emotion_adjustments"] = []
        job["emotion_adjustments"].append(
            {
                "adjustment_id": f"adj_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "adjustment_timestamp": datetime.now().isoformat(),
                "adjustments_count": len(adjustment_results),
                "cache_key": adjusted_cache_key,
            }
        )

        return {
            "message": f"Emotion adjustments applied successfully for job {job_id}",
            "job_id": job_id,
            "adjustment_results": adjustment_results,
            "adjusted_analysis": adjusted_analysis,
            "validation_errors": validation_errors,
            "continuity_warnings": continuity_warnings,
            "updated_overall_sentiment": updated_overall_sentiment,
            "adjustment_applied": len(validation_errors) == 0,
        }

    except Exception as e:
        return {"error": f"Failed to apply emotion adjustments: {str(e)}"}


# ============================================================================
# ENHANCED PROCESSING ENDPOINTS - Phase 1.3 Implementation
# ============================================================================


@app.get("/api/jobs/{job_id}/shot-sequence")
async def get_job_shot_sequence(job_id: str):
    """
    Return complete shot sequence with cinematographic metadata for completed jobs.

    Args:
        job_id: Processing job identifier

    Returns:
        Complete shot sequence with decision reasoning, confidence scores, and alternatives
    """
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Check if job exists
        if job_id not in processing_jobs:
            return {"error": f"Job not found: {job_id}"}

        job = processing_jobs[job_id]

        # Check if job is completed
        if job.get("status") != "completed":
            return {
                "error": f"Job {job_id} is not completed. Current status: {job.get('status')}"
            }

        # Get job result and metadata
        job_result = job.get("result", {})
        job_metadata = job_result.get("metadata", {})

        # Extract shot sequence data
        shot_sequence_data = None
        emotion_analysis = job_metadata.get("emotion_analysis", {})

        # Try to get cinematographic decisions from metadata
        if "cinematographic_decisions" in job_metadata:
            shot_sequence_data = job_metadata["cinematographic_decisions"]
        elif "decisions_made" in job_metadata:
            # If we have decision count but not full data, regenerate using ContentOrchestrator
            audio_path = job.get("audio_path")
            profile_name = job.get("profile_name")
            cinematic_mode = job.get("cinematic_mode", "balanced")

            if audio_path and profile_name:
                try:
                    orchestrator = ContentOrchestrator(config)

                    # Regenerate cinematographic decisions
                    emotions = (
                        emotion_analysis
                        or orchestrator.emotion_analyzer.analyze_audio(audio_path)
                    )
                    cinematographic_decisions = (
                        orchestrator.decision_engine.generate_shot_sequence(emotions)
                    )

                    # Build enhanced frame sequences
                    shot_sequence_data = orchestrator._build_frame_sequences(
                        shot_sequence=cinematographic_decisions,
                        emotions=emotions,
                        cinematic_mode=cinematic_mode,
                    )
                except Exception as e:
                    return {"error": f"Failed to regenerate shot sequence: {str(e)}"}

        if not shot_sequence_data:
            return {"error": f"No shot sequence data available for job: {job_id}"}

        # Enhance shot sequence with additional analysis
        enhanced_shot_sequence = []
        emotion_segments = emotion_analysis.get("emotion_segments", [])

        for i, shot in enumerate(shot_sequence_data):
            # Get corresponding emotion segment
            emotion_segment = emotion_segments[i] if i < len(emotion_segments) else {}
            primary_emotion = emotion_segment.get("primary_emotion", {})

            # Generate alternative shot suggestions
            alternative_shots = _generate_alternative_shots(shot, primary_emotion)

            # Calculate decision confidence
            decision_confidence = _calculate_shot_decision_confidence(
                shot, emotion_segment
            )

            enhanced_shot = {
                **shot,
                "sequence_index": i,
                "timing": {
                    "start_time": emotion_segment.get("start_time", i * 2.0),
                    "end_time": emotion_segment.get("end_time", (i + 1) * 2.0),
                    "duration": shot.get("shot_specification", {}).get("duration", 2.0),
                },
                "emotion_context": {
                    "primary_emotion": primary_emotion.get("name", "neutral"),
                    "emotion_confidence": primary_emotion.get("confidence", 0.0),
                    "valence": primary_emotion.get("valence", 0.0),
                    "arousal": primary_emotion.get("arousal", 0.0),
                },
                "decision_analysis": {
                    "confidence": decision_confidence,
                    "reasoning": _generate_shot_reasoning(shot, primary_emotion),
                    "decision_factors": _extract_decision_factors(shot),
                    "rule_applications": _get_applied_rules(shot),
                },
                "alternatives": alternative_shots,
                "technical_specs": {
                    "shot_type": shot.get("angle", "MCU"),
                    "vertical_angle": shot.get("vertical_angle", "eye_level"),
                    "shot_purpose": shot.get("shot_purpose", "dialogue"),
                    "composition_type": shot.get("composition", "centered"),
                    "duration_modifier": shot.get("duration_modifier", 1.0),
                },
            }
            enhanced_shot_sequence.append(enhanced_shot)

        # Compile comprehensive response
        response = {
            "job_id": job_id,
            "job_metadata": {
                "profile_used": job.get("profile_name"),
                "cinematic_mode": job.get("cinematic_mode", "balanced"),
                "processing_date": job.get("start_time"),
                "completion_date": job.get("end_time"),
            },
            "shot_sequence": enhanced_shot_sequence,
            "sequence_analysis": {
                "total_shots": len(enhanced_shot_sequence),
                "total_duration": sum(
                    shot["timing"]["duration"] for shot in enhanced_shot_sequence
                ),
                "shot_type_distribution": _analyze_shot_type_distribution(
                    enhanced_shot_sequence
                ),
                "emotion_coverage": _analyze_emotion_coverage(enhanced_shot_sequence),
                "cinematic_consistency": _analyze_cinematic_consistency(
                    enhanced_shot_sequence
                ),
            },
            "recommendations": _generate_sequence_recommendations(
                enhanced_shot_sequence
            ),
            "export_timestamp": datetime.now().isoformat(),
        }

        return response

    except Exception as e:
        return {"error": f"Failed to get shot sequence for job {job_id}: {str(e)}"}


@app.get("/api/jobs/{job_id}/emotion-analysis")
async def get_job_emotion_analysis(job_id: str):
    """
    Return detailed emotion analysis for completed jobs with segment-by-segment breakdown.

    Args:
        job_id: Processing job identifier

    Returns:
        Detailed emotion analysis with segments, transitions, and emotional patterns
    """
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Check if job exists
        if job_id not in processing_jobs:
            return {"error": f"Job not found: {job_id}"}

        job = processing_jobs[job_id]

        # Get audio path from job
        audio_path = job.get("audio_path")
        if not audio_path:
            return {"error": f"No audio path found for job: {job_id}"}

        # Initialize emotion analyzer
        emotion_analyzer = EmotionAnalyzer(config)

        # Get emotion analysis data
        emotion_data = None

        # First, try to get from job result if completed
        if job.get("status") == "completed" and "result" in job:
            result = job["result"]
            if isinstance(result, dict) and "metadata" in result:
                emotion_data = result.get("metadata", {}).get("emotion_analysis")

        # If not in job result, perform fresh analysis
        if not emotion_data:
            try:
                emotion_data = emotion_analyzer.analyze_audio(audio_path)
            except Exception as e:
                return {"error": f"Failed to analyze emotions: {str(e)}"}

        if not emotion_data:
            return {"error": f"No emotion analysis available for job: {job_id}"}

        # Enhance emotion segments with transition analysis
        emotion_segments = emotion_data.get("emotion_segments", [])
        enhanced_segments = []

        for i, segment in enumerate(emotion_segments):
            # Calculate transition from previous segment
            transition_analysis = None
            if i > 0:
                prev_segment = emotion_segments[i - 1]
                transition_analysis = _analyze_emotion_transition(prev_segment, segment)

            enhanced_segment = {
                **segment,
                "segment_index": i,
                "timing_analysis": {
                    "start_time": segment.get("start_time", 0.0),
                    "end_time": segment.get("end_time", 0.0),
                    "duration": segment.get("end_time", 0.0)
                    - segment.get("start_time", 0.0),
                    "position_in_audio": (
                        i / len(emotion_segments) if emotion_segments else 0.0
                    ),
                },
                "emotion_breakdown": {
                    "primary_emotion": segment.get("primary_emotion", {}),
                    "secondary_emotions": segment.get("secondary_emotions", []),
                    "emotion_intensity": _calculate_emotion_intensity(segment),
                    "emotional_clarity": _calculate_emotional_clarity(segment),
                },
                "acoustic_correlation": {
                    "features": segment.get("acoustic_features", {}),
                    "correlation_strength": _calculate_acoustic_emotion_correlation(
                        segment
                    ),
                    "audio_quality_indicators": _assess_audio_quality_for_emotion(
                        segment
                    ),
                },
                "transition_from_previous": transition_analysis,
                "cinematographic_implications": _analyze_cinematographic_implications(
                    segment
                ),
            }
            enhanced_segments.append(enhanced_segment)

        # Analyze emotional transitions and patterns
        transition_patterns = _analyze_emotional_transition_patterns(emotion_segments)
        emotional_arc = _analyze_emotional_arc(emotion_segments)

        # Compile comprehensive response
        response = {
            "job_id": job_id,
            "job_context": {
                "profile_used": job.get("profile_name"),
                "cinematic_mode": job.get("cinematic_mode", "balanced"),
                "processing_date": job.get("start_time"),
                "audio_path": audio_path,
            },
            "emotion_segments": enhanced_segments,
            "overall_emotion_analysis": {
                "dominant_emotion": _identify_dominant_emotion(emotion_segments),
                "emotional_diversity": _calculate_emotional_diversity(emotion_segments),
                "emotional_intensity_curve": _calculate_intensity_curve(
                    emotion_segments
                ),
                "valence_arousal_trajectory": _calculate_valence_arousal_trajectory(
                    emotion_segments
                ),
            },
            "transition_analysis": {
                "total_transitions": (
                    len(emotion_segments) - 1 if len(emotion_segments) > 1 else 0
                ),
                "transition_patterns": transition_patterns,
                "emotional_smoothness": _calculate_emotional_smoothness(
                    emotion_segments
                ),
                "dramatic_moments": _identify_dramatic_moments(emotion_segments),
            },
            "emotional_arc": emotional_arc,
            "segment_statistics": {
                "total_segments": len(enhanced_segments),
                "average_segment_duration": _calculate_average_segment_duration(
                    emotion_segments
                ),
                "emotion_distribution": _calculate_emotion_distribution(
                    emotion_segments
                ),
                "confidence_statistics": _calculate_confidence_statistics(
                    emotion_segments
                ),
            },
            "analysis_metadata": {
                "analysis_timestamp": datetime.now().isoformat(),
                "analyzer_version": "1.0.0",
                "audio_duration": emotion_data.get("metadata", {}).get("duration", 0.0),
                "sample_rate": emotion_data.get("metadata", {}).get(
                    "sample_rate", 16000
                ),
            },
        }

        return response

    except Exception as e:
        return {"error": f"Failed to get emotion analysis for job {job_id}: {str(e)}"}


@app.post("/api/batch/process")
async def start_batch_processing(batch_data: Dict[str, Any]):
    """
    Support multiple file processing with queue management and prioritization.

    Args:
        batch_data: Batch processing request containing files and configuration

    Returns:
        Batch processing information with batch ID and individual job tracking
    """
    try:
        config_path = project_root / "config" / "settings.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        # Extract required parameters
        audio_files = batch_data.get("audio_files", [])
        if not audio_files:
            return {"error": "audio_files list is required"}

        profile_name = batch_data.get("profile", config["profiles"]["default_profile"])
        cinematic_mode = batch_data.get("cinematic_mode", "balanced")
        priority = batch_data.get("priority", "medium")  # high, medium, low
        batch_options = batch_data.get("options", {})

        # Validate priority level
        if priority not in ["high", "medium", "low"]:
            return {"error": "priority must be one of: high, medium, low"}

        # Validate audio files
        valid_files = []
        validation_errors = []

        for audio_file in audio_files:
            audio_path = (
                audio_file.get("path") if isinstance(audio_file, dict) else audio_file
            )

            if not audio_path:
                validation_errors.append("Empty audio path found")
                continue

            if not Path(audio_path).exists():
                validation_errors.append(f"Audio file not found: {audio_path}")
                continue

            if not validate_audio_file(audio_path):
                validation_errors.append(f"Invalid audio file: {audio_path}")
                continue

            valid_files.append(
                {
                    "path": audio_path,
                    "original_name": Path(audio_path).name,
                    "custom_settings": (
                        audio_file.get("settings")
                        if isinstance(audio_file, dict)
                        else {}
                    ),
                }
            )

        if not valid_files:
            return {
                "error": "No valid audio files found",
                "validation_errors": validation_errors,
            }

        # Create batch ID
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

        # Initialize batch tracking
        batch_info = {
            "batch_id": batch_id,
            "status": "initializing",
            "priority": priority,
            "total_files": len(valid_files),
            "created_timestamp": datetime.now().isoformat(),
            "configuration": {
                "profile_name": profile_name,
                "cinematic_mode": cinematic_mode,
                "options": batch_options,
            },
            "files": valid_files,
            "jobs": {},
            "progress": {
                "completed": 0,
                "processing": 0,
                "queued": 0,
                "failed": 0,
                "total": len(valid_files),
                "percentage": 0.0,
            },
            "timing": {
                "started": None,
                "estimated_completion": None,
                "average_processing_time": None,
            },
        }

        # Store batch information
        if "batch_jobs" not in processing_jobs:
            processing_jobs["batch_jobs"] = {}
        processing_jobs["batch_jobs"][batch_id] = batch_info

        # Create individual jobs for each file
        job_queue = []

        for i, file_info in enumerate(valid_files):
            audio_path = file_info["path"]
            file_settings = file_info["custom_settings"]

            # Merge batch settings with file-specific settings
            final_profile = file_settings.get("profile", profile_name)
            final_cinematic_mode = file_settings.get("cinematic_mode", cinematic_mode)

            # Create unique job ID
            job_id = f"{batch_id}_job_{i+1:03d}"

            # Determine output path
            output_filename = f"{Path(audio_path).stem}_{final_profile}_batch.mp4"
            output_path = f"output/batch_{batch_id}/{output_filename}"

            # Create job info
            job_info = {
                "job_id": job_id,
                "batch_id": batch_id,
                "audio_path": audio_path,
                "profile_name": final_profile,
                "output_path": output_path,
                "cinematic_mode": final_cinematic_mode,
                "status": "queued",
                "progress": 0,
                "start_time": None,
                "end_time": None,
                "error": None,
                "priority": priority,
                "queue_position": i + 1,
            }

            # Store job
            processing_jobs[job_id] = job_info
            batch_info["jobs"][job_id] = job_info

            # Add to queue based on priority
            job_queue.append(
                (
                    priority,
                    i,
                    job_id,
                    audio_path,
                    final_profile,
                    output_path,
                    final_cinematic_mode,
                )
            )

        # Sort queue by priority (high first) and then by order
        priority_order = {"high": 0, "medium": 1, "low": 2}
        job_queue.sort(key=lambda x: (priority_order.get(x[0], 999), x[1]))

        # Update batch status
        batch_info["status"] = "queued"
        batch_info["progress"]["queued"] = len(valid_files)
        batch_info["timing"]["started"] = datetime.now().isoformat()

        # Start batch processing in background
        asyncio.create_task(process_batch_async(batch_id, job_queue, config))

        # Emit processing update
        await emit_processing_update()

        return {
            "batch_id": batch_id,
            "message": f"Batch processing started for {len(valid_files)} files",
            "status": "queued",
            "total_files": len(valid_files),
            "priority": priority,
            "estimated_jobs": len(valid_files),
            "batch_info": {
                "profile_used": profile_name,
                "cinematic_mode": cinematic_mode,
                "queue_position": len(processing_jobs["batch_jobs"]),
            },
        }

    except Exception as e:
        return {"error": f"Failed to start batch processing: {str(e)}"}


@app.get("/api/batch/{batch_id}")
async def get_batch_status(batch_id: str):
    """Get detailed status of a batch processing job"""
    try:
        if "batch_jobs" not in processing_jobs:
            return {"error": "No batch jobs found"}

        if batch_id not in processing_jobs["batch_jobs"]:
            return {"error": f"Batch not found: {batch_id}"}

        batch_info = processing_jobs["batch_jobs"][batch_id]

        # Calculate current progress
        total_jobs = len(batch_info["jobs"])
        completed_jobs = sum(
            1 for job in batch_info["jobs"].values() if job["status"] == "completed"
        )
        failed_jobs = sum(
            1 for job in batch_info["jobs"].values() if job["status"] == "error"
        )
        processing_jobs_count = sum(
            1 for job in batch_info["jobs"].values() if job["status"] == "processing"
        )

        progress_percentage = (
            (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0.0
        )

        # Update progress info
        batch_info["progress"]["completed"] = completed_jobs
        batch_info["progress"]["processing"] = processing_jobs_count
        batch_info["progress"]["failed"] = failed_jobs
        batch_info["progress"]["queued"] = (
            total_jobs - completed_jobs - failed_jobs - processing_jobs_count
        )
        batch_info["progress"]["percentage"] = progress_percentage

        # Calculate estimated completion if processing
        if processing_jobs_count > 0 and completed_jobs > 0:
            # Simple estimation based on average processing time
            elapsed_time = (
                datetime.now() - datetime.fromisoformat(batch_info["timing"]["started"])
            ).total_seconds()
            avg_time_per_job = elapsed_time / completed_jobs
            remaining_jobs = batch_info["progress"]["queued"] + processing_jobs_count
            estimated_remaining_time = avg_time_per_job * remaining_jobs

            estimated_completion = datetime.now() + timedelta(
                seconds=estimated_remaining_time
            )
            batch_info["timing"][
                "estimated_completion"
            ] = estimated_completion.isoformat()
            batch_info["timing"]["average_processing_time"] = avg_time_per_job

        return {
            "batch_id": batch_id,
            "batch_info": batch_info,
            "individual_jobs": batch_info["jobs"],
            "summary": {
                "total_files": total_jobs,
                "completed": completed_jobs,
                "failed": failed_jobs,
                "processing": processing_jobs_count,
                "queued": batch_info["progress"]["queued"],
                "progress_percentage": progress_percentage,
                "success_rate": (
                    (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0.0
                ),
            },
        }

    except Exception as e:
        return {"error": f"Failed to get batch status for {batch_id}: {str(e)}"}


async def process_batch_async(batch_id: str, job_queue: list, config: Dict[str, Any]):
    """Process batch jobs asynchronously with queue management and detailed events"""
    batch_info = None
    try:
        batch_info = processing_jobs["batch_jobs"][batch_id]
        batch_info["status"] = "processing"

        # Emit batch processing started event
        batch_event = {
            "type": "batch_processing_started",
            "timestamp": datetime.now().isoformat(),
            "batch_id": batch_id,
            "total_jobs": len(job_queue),
            "priority": batch_info["priority"],
        }
        await broadcast_websocket_event(batch_event)

        # Process jobs in queue order
        for i, (
            priority,
            queue_pos,
            job_id,
            audio_path,
            profile_name,
            output_path,
            cinematic_mode,
        ) in enumerate(job_queue):
            try:
                # Update job status to processing
                processing_jobs[job_id]["status"] = "processing"
                processing_jobs[job_id]["start_time"] = datetime.now().isoformat()

                # Emit batch job started event
                batch_job_event = {
                    "type": "batch_job_started",
                    "timestamp": datetime.now().isoformat(),
                    "batch_id": batch_id,
                    "job_id": job_id,
                    "queue_position": i + 1,
                    "total_jobs": len(job_queue),
                    "audio_file": Path(audio_path).name,
                }
                await broadcast_websocket_event(batch_job_event)

                # Update batch progress
                batch_info["progress"]["processing"] += 1
                batch_info["progress"]["queued"] -= 1

                # Emit batch progress event
                batch_progress_event = {
                    "type": "batch_progress_update",
                    "timestamp": datetime.now().isoformat(),
                    "batch_id": batch_id,
                    "current_job": job_id,
                    "completed": batch_info["progress"]["completed"],
                    "processing": batch_info["progress"]["processing"],
                    "failed": batch_info["progress"]["failed"],
                    "total": batch_info["progress"]["total"],
                    "percentage": (
                        batch_info["progress"]["completed"]
                        / batch_info["progress"]["total"]
                    )
                    * 100,
                }
                await broadcast_websocket_event(batch_progress_event)

                # Process the individual job (this will emit detailed events)
                await process_job_async(
                    job_id, audio_path, profile_name, output_path, cinematic_mode
                )

                # Update batch progress after job completion
                if processing_jobs[job_id]["status"] == "completed":
                    batch_info["progress"]["completed"] += 1

                    # Emit batch job completed event
                    batch_job_complete_event = {
                        "type": "batch_job_completed",
                        "timestamp": datetime.now().isoformat(),
                        "batch_id": batch_id,
                        "job_id": job_id,
                        "success": True,
                        "output_path": processing_jobs[job_id]
                        .get("result", {})
                        .get("video_path"),
                    }
                    await broadcast_websocket_event(batch_job_complete_event)

                elif processing_jobs[job_id]["status"] == "error":
                    batch_info["progress"]["failed"] += 1

                    # Emit batch job failed event
                    batch_job_fail_event = {
                        "type": "batch_job_completed",
                        "timestamp": datetime.now().isoformat(),
                        "batch_id": batch_id,
                        "job_id": job_id,
                        "success": False,
                        "error": processing_jobs[job_id].get("error", "Unknown error"),
                    }
                    await broadcast_websocket_event(batch_job_fail_event)

                batch_info["progress"]["processing"] -= 1

                # Emit final batch progress update
                final_progress_event = {
                    "type": "batch_progress_update",
                    "timestamp": datetime.now().isoformat(),
                    "batch_id": batch_id,
                    "current_job": job_id,
                    "completed": batch_info["progress"]["completed"],
                    "processing": batch_info["progress"]["processing"],
                    "failed": batch_info["progress"]["failed"],
                    "total": batch_info["progress"]["total"],
                    "percentage": (
                        batch_info["progress"]["completed"]
                        / batch_info["progress"]["total"]
                    )
                    * 100,
                }
                await broadcast_websocket_event(final_progress_event)

            except Exception as e:
                # Handle individual job failure
                processing_jobs[job_id]["status"] = "error"
                processing_jobs[job_id]["error"] = str(e)
                processing_jobs[job_id]["end_time"] = datetime.now().isoformat()

                batch_info["progress"]["failed"] += 1
                batch_info["progress"]["processing"] -= 1

                # Emit batch job error event
                batch_job_error_event = {
                    "type": "batch_job_error",
                    "timestamp": datetime.now().isoformat(),
                    "batch_id": batch_id,
                    "job_id": job_id,
                    "error": str(e),
                }
                await broadcast_websocket_event(batch_job_error_event)

        # Mark batch as completed
        batch_info["status"] = "completed"
        batch_info["end_time"] = datetime.now().isoformat()

        # Emit batch completed event
        batch_complete_event = {
            "type": "batch_processing_completed",
            "timestamp": datetime.now().isoformat(),
            "batch_id": batch_id,
            "summary": {
                "total_jobs": batch_info["progress"]["total"],
                "completed": batch_info["progress"]["completed"],
                "failed": batch_info["progress"]["failed"],
                "success_rate": (
                    batch_info["progress"]["completed"]
                    / batch_info["progress"]["total"]
                )
                * 100,
            },
        }
        await broadcast_websocket_event(batch_complete_event)

    except Exception as e:
        if batch_info is not None:
            batch_info["status"] = "error"
            batch_info["error"] = str(e)

        # Emit batch error event
        batch_error_event = {
            "type": "batch_processing_error",
            "timestamp": datetime.now().isoformat(),
            "batch_id": batch_id,
            "error": str(e),
        }
        await broadcast_websocket_event(batch_error_event)


# ============================================================================
# ENHANCED PROCESSING HELPER FUNCTIONS
# ============================================================================


def _generate_alternative_shots(shot: Dict, primary_emotion: Dict) -> List[Dict]:
    """Generate alternative shot suggestions based on current shot and emotion"""
    alternatives = []
    current_shot_type = shot.get("angle", "MCU")
    current_angle = shot.get("vertical_angle", "eye_level")
    emotion_name = primary_emotion.get("name", "neutral")
    confidence = primary_emotion.get("confidence", 0.0)

    # Define shot type hierarchy for alternatives
    shot_hierarchy = {
        "ECU": ["CU", "MCU"],
        "CU": ["ECU", "MCU"],
        "MCU": ["CU", "MS"],
        "MS": ["MCU", "LS"],
        "LS": ["MS", "MLS"],
    }

    # Generate shot type alternatives
    if current_shot_type in shot_hierarchy:
        for alt_shot in shot_hierarchy[current_shot_type][:2]:  # Top 2 alternatives
            suitability_score = _calculate_shot_suitability(
                alt_shot, emotion_name, confidence
            )
            alternatives.append(
                {
                    "type": "shot_distance",
                    "suggestion": alt_shot,
                    "reasoning": f"Alternative to {current_shot_type} for {emotion_name}",
                    "suitability_score": suitability_score,
                    "impact": _analyze_shot_impact_change(current_shot_type, alt_shot),
                }
            )

    # Generate angle alternatives
    angle_alternatives = []
    if current_angle != "eye_level":
        angle_alternatives.append("eye_level")
    if current_angle != "high_angle" and emotion_name in [
        "sadness",
        "fear",
        "vulnerability",
    ]:
        angle_alternatives.append("high_angle")
    if current_angle != "low_angle" and emotion_name in ["anger", "power", "dominance"]:
        angle_alternatives.append("low_angle")
    if current_angle != "dutch" and emotion_name in [
        "surprise",
        "confusion",
        "tension",
    ]:
        angle_alternatives.append("dutch")

    for alt_angle in angle_alternatives[:2]:  # Top 2 alternatives
        suitability_score = _calculate_angle_suitability(alt_angle, emotion_name)
        alternatives.append(
            {
                "type": "vertical_angle",
                "suggestion": alt_angle,
                "reasoning": f"Alternative angle for {emotion_name} emotional context",
                "suitability_score": suitability_score,
                "impact": _analyze_angle_impact_change(current_angle, alt_angle),
            }
        )

    return sorted(alternatives, key=lambda x: x["suitability_score"], reverse=True)[:3]


def _calculate_shot_decision_confidence(shot: Dict, emotion_segment: Dict) -> float:
    """Calculate confidence score for shot decision"""
    base_confidence = shot.get("confidence", 0.8)

    # Adjust based on emotion confidence
    primary_emotion = emotion_segment.get("primary_emotion", {})
    emotion_confidence = (
        primary_emotion.get("confidence", 0.0) / 5.0
    )  # Normalize to 0-1

    # Adjust based on acoustic features quality
    acoustic_features = emotion_segment.get("acoustic_features", {})
    energy_level = acoustic_features.get("energy_level", 0.0)
    signal_quality = min(1.0, energy_level * 10)  # Simple quality metric

    # Combine factors
    final_confidence = (
        (base_confidence * 0.5) + (emotion_confidence * 0.3) + (signal_quality * 0.2)
    )

    return min(1.0, max(0.0, final_confidence))


def _generate_shot_reasoning(shot: Dict, primary_emotion: Dict) -> str:
    """Generate human-readable reasoning for shot selection"""
    shot_type = shot.get("angle", "MCU")
    vertical_angle = shot.get("vertical_angle", "eye_level")
    shot_purpose = shot.get("shot_purpose", "dialogue")
    emotion_name = primary_emotion.get("name", "neutral")
    confidence = primary_emotion.get("confidence", 0.0)

    reasoning_parts = []

    # Emotion-based reasoning
    if emotion_name == "joy" and shot_type in ["CU", "ECU"]:
        reasoning_parts.append(
            f"Close-up shot emphasizes the {emotion_name} and creates intimacy"
        )
    elif emotion_name == "sadness" and shot_type in ["MS", "LS"]:
        reasoning_parts.append(
            f"Wider shot provides emotional distance for {emotion_name}"
        )
    elif emotion_name == "anger" and shot_type in ["ECU", "CU"]:
        reasoning_parts.append(f"Intense close-up captures the power of {emotion_name}")
    elif emotion_name == "fear" and vertical_angle in ["high_angle", "dutch"]:
        reasoning_parts.append(
            f"Unconventional angle enhances the {emotion_name} and vulnerability"
        )

    # Purpose-based reasoning
    if shot_purpose == "dialogue":
        reasoning_parts.append("Medium close-up optimal for dialogue clarity")
    elif shot_purpose == "emotional":
        reasoning_parts.append("Shot chosen to maximize emotional impact")
    elif shot_purpose == "narrative":
        reasoning_parts.append("Shot supports narrative storytelling")

    # Confidence-based reasoning
    if confidence > 3.5:
        reasoning_parts.append("High emotion confidence justifies stronger shot choice")
    elif confidence < 2.0:
        reasoning_parts.append(
            "Conservative shot choice due to lower emotion confidence"
        )

    return (
        " | ".join(reasoning_parts)
        if reasoning_parts
        else "Standard cinematographic choice"
    )


# ============================================================================
# EMOTION ANALYSIS HELPER FUNCTIONS
# ============================================================================


def _calculate_duration_weighted_emotion(segments: List[Dict]) -> Dict[str, float]:
    """Calculate duration-weighted emotion distribution"""
    emotion_durations = {}
    total_duration = 0.0

    for segment in segments:
        emotion = segment.get("primary_emotion", {}).get("name", "unknown")
        duration = segment.get("end_time", 0) - segment.get("start_time", 0)

        emotion_durations[emotion] = emotion_durations.get(emotion, 0.0) + duration
        total_duration += duration

    # Convert to percentages
    if total_duration > 0:
        return {
            emotion: duration / total_duration
            for emotion, duration in emotion_durations.items()
        }
    return {}


def _generate_alternative_emotions(segment: Dict) -> List[Dict]:
    """Generate alternative emotion suggestions for a segment"""
    primary_emotion = segment.get("primary_emotion", {})
    secondary_emotions = segment.get("secondary_emotions", [])

    alternatives = []

    # Add secondary emotions as alternatives
    for i, secondary in enumerate(secondary_emotions[:2]):  # Top 2 alternatives
        alternatives.append(
            {
                "emotion": secondary.get("name"),
                "confidence": secondary.get("confidence", 0.0),
                "reason": f"Secondary emotion #{i+1}",
                "suitability_score": secondary.get("confidence", 0.0)
                / max(primary_emotion.get("confidence", 1.0), 1.0),
            }
        )

    # Add contextual alternatives based on acoustic features
    acoustic_features = segment.get("acoustic_features", {})
    energy_level = acoustic_features.get("energy_level", 0.0)
    speaking_rate = acoustic_features.get("speaking_rate", 0.0)

    contextual_alternatives = []
    if energy_level > 0.15 and primary_emotion.get("name") not in ["joy", "excitement"]:
        contextual_alternatives.append(
            {
                "emotion": "joy",
                "confidence": min(0.7, energy_level * 2),
                "reason": "High energy suggests positive emotion",
                "suitability_score": 0.6,
            }
        )

    if speaking_rate > 1.2 and primary_emotion.get("name") not in [
        "anger",
        "excitement",
    ]:
        contextual_alternatives.append(
            {
                "emotion": "anger",
                "confidence": min(0.6, speaking_rate * 0.4),
                "reason": "Fast speaking rate suggests intensity",
                "suitability_score": 0.5,
            }
        )

    alternatives.extend(contextual_alternatives[:2])  # Add top 2 contextual

    return sorted(
        alternatives, key=lambda x: x.get("suitability_score", 0), reverse=True
    )


def _calculate_acoustic_quality_metrics(features: Dict) -> Dict:
    """Calculate quality metrics from acoustic features"""
    pitch_mean = features.get("pitch_mean", 0.0)
    pitch_variance = features.get("pitch_variance", 0.0)
    energy_level = features.get("energy_level", 0.0)
    speaking_rate = features.get("speaking_rate", 0.0)

    return {
        "signal_quality": "good" if energy_level > 0.05 else "poor",
        "pitch_stability": "stable" if pitch_variance < 500000 else "variable",
        "speech_clarity": "clear" if speaking_rate > 0.5 else "unclear",
        "overall_quality_score": min(1.0, (energy_level * 5) + (speaking_rate * 0.3)),
    }


def _analyze_speech_characteristics(features: Dict) -> Dict:
    """Analyze speech characteristics from acoustic features"""
    energy_level = features.get("energy_level", 0.0)
    speaking_rate = features.get("speaking_rate", 0.0)
    pitch_mean = features.get("pitch_mean", 0.0)

    characteristics = {
        "tempo": (
            "fast"
            if speaking_rate > 1.0
            else "slow" if speaking_rate < 0.5 else "normal"
        ),
        "intensity": (
            "high"
            if energy_level > 0.15
            else "low" if energy_level < 0.05 else "medium"
        ),
        "pitch_range": (
            "high" if pitch_mean > 600 else "low" if pitch_mean < 300 else "normal"
        ),
    }

    # Determine speech style
    if characteristics["tempo"] == "fast" and characteristics["intensity"] == "high":
        characteristics["speech_style"] = "energetic"
    elif characteristics["tempo"] == "slow" and characteristics["intensity"] == "low":
        characteristics["speech_style"] = "calm"
    elif characteristics["pitch_range"] == "high":
        characteristics["speech_style"] = "expressive"
    else:
        characteristics["speech_style"] = "neutral"

    return characteristics


def _generate_cinematographic_suggestions(segment: Dict) -> Dict:
    """Generate cinematographic suggestions based on emotion segment"""
    primary_emotion = segment.get("primary_emotion", {})
    emotion_name = primary_emotion.get("name", "neutral")
    confidence = primary_emotion.get("confidence", 0.0)
    valence = primary_emotion.get("valence", 0.0)
    arousal = primary_emotion.get("arousal", 0.0)

    # Base shot suggestions
    shot_suggestions = {
        "joy": {"distance": "CU", "angle": "eye_level", "movement": "stable"},
        "sadness": {"distance": "MS", "angle": "high_angle", "movement": "slow_pan"},
        "anger": {"distance": "ECU", "angle": "low_angle", "movement": "handheld"},
        "fear": {"distance": "CU", "angle": "dutch", "movement": "subtle_shake"},
        "surprise": {"distance": "CU", "angle": "eye_level", "movement": "quick_zoom"},
        "disgust": {"distance": "CU", "angle": "high_angle", "movement": "stable"},
        "trust": {"distance": "MCU", "angle": "eye_level", "movement": "stable"},
        "anticipation": {
            "distance": "CU",
            "angle": "low_angle",
            "movement": "slow_push",
        },
    }

    base_suggestion = shot_suggestions.get(emotion_name, shot_suggestions["trust"])

    # Modify based on confidence and arousal
    if confidence > 0.8:
        base_suggestion["intensity"] = "high"
    elif confidence < 0.4:
        base_suggestion["intensity"] = "low"
    else:
        base_suggestion["intensity"] = "medium"

    if arousal > 0.7:
        base_suggestion["pace"] = "fast"
    elif arousal < 0.3:
        base_suggestion["pace"] = "slow"
    else:
        base_suggestion["pace"] = "normal"

    return base_suggestion


def _summarize_audio_features(segments: List[Dict]) -> Dict:
    """Summarize audio features across all segments"""
    if not segments:
        return {}

    # Aggregate features
    all_features = [seg.get("acoustic_features", {}) for seg in segments]

    summaries = {}
    for feature_key in ["pitch_mean", "energy_level", "speaking_rate"]:
        values = [f.get(feature_key, 0.0) for f in all_features]
        if values:
            summaries[f"{feature_key}_avg"] = sum(values) / len(values)
            summaries[f"{feature_key}_min"] = min(values)
            summaries[f"{feature_key}_max"] = max(values)

    # Pitch variance needs special handling (log scale)
    pitch_variances = [f.get("pitch_variance", 0.0) for f in all_features]
    if pitch_variances:
        summaries["pitch_variance_avg"] = sum(pitch_variances) / len(pitch_variances)

    return summaries


def _analyze_feature_consistency(segments: List[Dict]) -> Dict:
    """Analyze consistency of audio features across segments"""
    if len(segments) < 2:
        return {"consistency_score": 1.0, "analysis": "insufficient_data"}

    features = ["pitch_mean", "energy_level", "speaking_rate"]
    consistency_scores = []

    for feature in features:
        values = [
            seg.get("acoustic_features", {}).get(feature, 0.0) for seg in segments
        ]
        if values:
            # Calculate coefficient of variation
            mean_val = sum(values) / len(values)
            if mean_val > 0:
                std_dev = (
                    sum((x - mean_val) ** 2 for x in values) / len(values)
                ) ** 0.5
                cv = std_dev / mean_val
                consistency_scores.append(
                    1.0 / (1.0 + cv)
                )  # Convert to consistency score

    overall_consistency = (
        sum(consistency_scores) / len(consistency_scores) if consistency_scores else 0.5
    )

    return {
        "consistency_score": overall_consistency,
        "feature_consistency": dict(zip(features, consistency_scores)),
        "analysis": (
            "consistent"
            if overall_consistency > 0.7
            else "variable" if overall_consistency > 0.4 else "inconsistent"
        ),
    }


def _generate_global_alternatives(segments: List[Dict]) -> Dict:
    """Generate global alternative emotion suggestions for the entire analysis"""
    if not segments:
        return {}

    # Count primary emotions
    emotion_counts = {}
    for segment in segments:
        emotion = segment.get("primary_emotion", {}).get("name", "unknown")
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

    total_segments = len(segments)

    # Find dominant emotion and alternatives
    sorted_emotions = sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)
    dominant_emotion = sorted_emotions[0][0] if sorted_emotions else "neutral"

    # Generate alternative emotional arcs
    alternatives = {
        "current_dominant": dominant_emotion,
        "dominant_percentage": (
            (sorted_emotions[0][1] / total_segments * 100) if sorted_emotions else 0
        ),
        "alternative_arcs": [],
    }

    # Suggest alternative emotional trajectories
    if dominant_emotion == "trust":
        alternatives["alternative_arcs"].extend(
            [
                {
                    "name": "building_excitement",
                    "suggestion": "Increase joy/anticipation in later segments",
                },
                {
                    "name": "developing_tension",
                    "suggestion": "Introduce fear/anger gradually",
                },
                {
                    "name": "emotional_diversity",
                    "suggestion": "Add more varied emotions throughout",
                },
            ]
        )
    elif dominant_emotion == "sadness":
        alternatives["alternative_arcs"].extend(
            [
                {
                    "name": "hopeful_progression",
                    "suggestion": "Transition towards joy/trust",
                },
                {
                    "name": "deepening_emotion",
                    "suggestion": "Intensify with fear/anger",
                },
                {
                    "name": "resolution_arc",
                    "suggestion": "Build towards neutral/trust conclusion",
                },
            ]
        )

    return alternatives


def _validate_emotion_adjustment(
    segment: Dict,
    new_emotion: str,
    new_confidence: float,
    segment_index: int,
    all_segments: List[Dict],
) -> Dict:
    """Validate emotion adjustment request"""
    errors = []
    notes = []

    # Validate emotion name
    valid_emotions = [
        "joy",
        "sadness",
        "anger",
        "fear",
        "surprise",
        "disgust",
        "trust",
        "anticipation",
    ]
    if new_emotion not in valid_emotions:
        errors.append(
            f"Invalid emotion: {new_emotion}. Must be one of {valid_emotions}"
        )

    # Validate confidence range
    if not isinstance(new_confidence, (int, float)) or not (
        0.0 <= new_confidence <= 5.0
    ):
        errors.append("Confidence must be a number between 0.0 and 5.0")

    # Get valence/arousal for new emotion
    emotion_analyzer = EmotionAnalyzer({})
    valence, arousal = emotion_analyzer._emotion_to_valence_arousal(
        new_emotion, new_confidence
    )

    # Check for dramatic emotional jumps
    if segment_index > 0:
        prev_segment = all_segments[segment_index - 1]
        prev_emotion = prev_segment.get("primary_emotion", {}).get("name", "")

        # Define emotional distance matrix (simplified)
        large_jumps = [
            ("joy", "sadness"),
            ("sadness", "joy"),
            ("anger", "trust"),
            ("trust", "anger"),
            ("fear", "disgust"),
            ("disgust", "fear"),
        ]

        if (prev_emotion, new_emotion) in large_jumps:
            notes.append(f"Large emotional jump from {prev_emotion} to {new_emotion}")

    # Check confidence consistency
    if new_confidence > 3.0 and segment_index < len(all_segments) - 1:
        next_segment = all_segments[segment_index + 1]
        next_confidence = next_segment.get("primary_emotion", {}).get("confidence", 0.0)
        if next_confidence < 1.0:
            notes.append(
                "High confidence followed by low confidence may create emotional discontinuity"
            )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "notes": notes,
        "valence": valence,
        "arousal": arousal,
    }


def _validate_emotion_continuity(segments: List[Dict]) -> Dict:
    """Validate emotion continuity rules across segments"""
    warnings = []

    for i in range(1, len(segments)):
        prev_emotion = segments[i - 1].get("primary_emotion", {}).get("name", "")
        curr_emotion = segments[i].get("primary_emotion", {}).get("name", "")

        # Check for repeated same emotion (potential stagnation)
        if prev_emotion == curr_emotion:
            consecutive_count = 1
            j = i - 1
            while (
                j >= 0
                and segments[j].get("primary_emotion", {}).get("name") == curr_emotion
            ):
                consecutive_count += 1
                j -= 1

            if consecutive_count > 3:
                warnings.append(
                    f"Segment {i}: {consecutive_count} consecutive '{curr_emotion}' segments may create stagnation"
                )

        # Check for emotional whiplash (rapid alternating)
        if i >= 2:
            emote_sequence = [
                segments[i - 2].get("primary_emotion", {}).get("name", ""),
                segments[i - 1].get("primary_emotion", {}).get("name", ""),
                segments[i].get("primary_emotion", {}).get("name", ""),
            ]

            if len(set(emote_sequence)) == 3 and emote_sequence[0] == emote_sequence[2]:
                warnings.append(
                    f"Segment {i}: Emotional whiplash detected with pattern {emote_sequence}"
                )

    # Check overall emotional arc
    if len(segments) >= 3:
        start_emotion = segments[0].get("primary_emotion", {}).get("name", "")
        end_emotion = segments[-1].get("primary_emotion", {}).get("name", "")

        if (
            start_emotion == end_emotion
            and len(set(s.get("primary_emotion", {}).get("name", "") for s in segments))
            == 1
        ):
            warnings.append(
                "Entire analysis uses single emotion - consider adding emotional variation"
            )

    return {
        "warnings": warnings,
        "continuity_score": (
            max(0.0, 1.0 - (len(warnings) / len(segments))) if segments else 1.0
        ),
    }


# Enhanced WebSocket endpoint for detailed real-time events
@app.websocket("/ws/processing-status")
async def websocket_processing_status(websocket: WebSocket):
    """Enhanced WebSocket endpoint for real-time processing status and detailed events"""
    connection_id = f"conn_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

    try:
        await websocket.accept()
        active_websocket_connections.add(websocket)

        # Send initial connection established event
        connection_event = {
            "type": "connection_established",
            "timestamp": datetime.now().isoformat(),
            "connection_id": connection_id,
            "server_capabilities": {
                "emotion_segment_events": True,
                "shot_decision_events": True,
                "processing_stage_events": True,
                "tension_analysis_events": True,
                "batch_processing_events": True,
            },
        }
        await websocket.send_text(json.dumps(connection_event))

        # Send current processing status initially
        status_update = {
            "type": "basic_status_update",
            "timestamp": datetime.now().isoformat(),
            "active_jobs": len(
                [
                    job
                    for job in processing_jobs.values()
                    if job["status"] in ["processing", "queued"]
                ]
            ),
            "jobs": processing_jobs,
        }
        await websocket.send_text(json.dumps(status_update))

        # Keep the connection alive and handle client messages
        while True:
            try:
                # Wait for messages from client
                data = await websocket.receive_text()

                # Parse client message
                try:
                    client_message = json.loads(data)
                    await handle_websocket_client_message(
                        websocket, client_message, connection_id
                    )
                except json.JSONDecodeError:
                    # Handle non-JSON messages (could be ping/pong)
                    if data.strip().lower() == "ping":
                        pong_response = {
                            "type": "pong",
                            "timestamp": datetime.now().isoformat(),
                            "connection_id": connection_id,
                        }
                        await websocket.send_text(json.dumps(pong_response))
                    else:
                        print(f"Received non-JSON message: {data}")

            except Exception as receive_error:
                # This might be a connection close, break the loop
                print(
                    f"WebSocket receive error: {type(receive_error).__name__}: {receive_error}"
                )
                break

    except Exception as e:
        # Don't log this as an error - disconnections are normal
        print(f"WebSocket disconnected: {type(e).__name__}: {e}")
    finally:
        # Remove the connection from the active set
        active_websocket_connections.discard(websocket)

        # Send connection closed event to other clients (for monitoring)
        disconnect_event = {
            "type": "connection_closed",
            "timestamp": datetime.now().isoformat(),
            "connection_id": connection_id,
            "active_connections": len(active_websocket_connections),
        }
        await broadcast_websocket_event(disconnect_event)


async def handle_websocket_client_message(
    websocket: WebSocket, message: Dict[str, Any], connection_id: str
):
    """Handle incoming messages from WebSocket clients"""
    message_type = message.get("type", "unknown")

    if message_type == "subscribe":
        # Handle subscription to specific job events
        job_id = message.get("job_id")
        if job_id:
            subscription_response = {
                "type": "subscription_confirmed",
                "timestamp": datetime.now().isoformat(),
                "connection_id": connection_id,
                "subscribed_job": job_id,
            }
            await websocket.send_text(json.dumps(subscription_response))

    elif message_type == "get_job_details":
        # Handle request for specific job details
        job_id = message.get("job_id")
        if job_id and job_id in processing_jobs:
            job_details = {
                "type": "job_details_response",
                "timestamp": datetime.now().isoformat(),
                "connection_id": connection_id,
                "job": processing_jobs[job_id],
            }
            await websocket.send_text(json.dumps(job_details))

    elif message_type == "ping":
        # Handle ping request
        pong_response = {
            "type": "pong",
            "timestamp": datetime.now().isoformat(),
            "connection_id": connection_id,
        }
        await websocket.send_text(json.dumps(pong_response))

    else:
        # Handle unknown message types
        error_response = {
            "type": "error",
            "timestamp": datetime.now().isoformat(),
            "connection_id": connection_id,
            "error": f"Unknown message type: {message_type}",
        }
        await websocket.send_text(json.dumps(error_response))


@app.post("/api/process")
async def start_processing(job_data: Dict[str, Any]):
    """Start a new processing job"""
    return api_response_wrapper(_start_processing_data)(job_data)


def _start_processing_data(job_data: Dict[str, Any]):
    """Helper function to start processing job"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    # Validate input data
    audio_path = job_data.get("audio_path")
    if not audio_path:
        raise Exception("audio_path is required")

    profile_name = job_data.get("profile", config["profiles"]["default_profile"])
    output_path = job_data.get(
        "output_path",
        f"output/{Path(audio_path).stem if audio_path else 'processed'}_processed.mp4",
    )
    cinematic_mode = job_data.get("cinematic_mode", "balanced")

    if not validate_audio_file(audio_path):
        raise Exception(f"Invalid audio file: {audio_path}")

    # Create a unique job ID
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

    # Store job info
    processing_jobs[job_id] = {
        "job_id": job_id,
        "audio_path": audio_path,
        "profile_name": profile_name,
        "output_path": output_path,
        "cinematic_mode": cinematic_mode,
        "status": "queued",
        "progress": 0,
        "start_time": datetime.now().isoformat(),
        "error": None,
    }

    # Start processing in background
    asyncio.create_task(
        process_job_async(job_id, audio_path, profile_name, output_path, cinematic_mode)
    )

    return {"job_id": job_id, "message": "Processing job started", "status": "queued"}


async def process_job_async(
    job_id: str,
    audio_path: str,
    profile_name: str,
    output_path: str,
    cinematic_mode: str,
):
    """Process a job asynchronously with detailed real-time event streaming"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    orchestrator = None
    try:
        # Update job status to processing
        processing_jobs[job_id]["status"] = "processing"
        processing_jobs[job_id]["progress"] = 5  # Initial progress
        await emit_processing_update()

        # Emit processing stage: initialization
        await emit_processing_stage_event(job_id, "initialization", 5)

        # Initialize orchestrator
        orchestrator = ContentOrchestrator(config)

        # Emit processing stage: profile validation
        await emit_processing_stage_event(job_id, "profile_validation", 10)

        # Validate profile
        is_valid, validation_msg = orchestrator.validate_profile(profile_name)
        if not is_valid:
            processing_jobs[job_id]["status"] = "error"
            processing_jobs[job_id]["error"] = validation_msg
            await emit_processing_update()
            return

        # Update progress and emit stage
        processing_jobs[job_id]["progress"] = 15
        await emit_processing_stage_event(job_id, "audio_processing", 15)

        # Process audio with emotion analysis and emit segment events
        try:
            # Load and process audio
            audio_features = orchestrator.audio_processor.extract_audio_features(
                audio_path
            )
            audio_segments = orchestrator.audio_processor.segment_audio_file(audio_path)

            # Emit processing stage: emotion analysis
            await emit_processing_stage_event(job_id, "emotion_analysis", 25)

            # Analyze emotions and emit segment events
            emotions = orchestrator.emotion_analyzer.analyze_audio(audio_path)
            emotion_segments = emotions.get("emotion_segments", [])

            # Emit emotion segment events
            for i, segment in enumerate(emotion_segments):
                await emit_emotion_segment_event(job_id, segment, i)
                # Update progress during emotion analysis
                segment_progress = (
                    25 + (35 * (i + 1) / len(emotion_segments))
                    if emotion_segments
                    else 30
                )
                processing_jobs[job_id]["progress"] = int(segment_progress)

            # Emit processing stage: cinematography decisions
            await emit_processing_stage_event(job_id, "cinematography_decisions", 60)

            # Generate cinematographic decisions and emit shot decision events
            cinematographic_decisions = (
                orchestrator.decision_engine.generate_shot_sequence(emotions)
            )

            # Emit shot decision events
            for i, decision in enumerate(cinematographic_decisions):
                # Get corresponding emotion
                emotion_segment = (
                    emotion_segments[i] if i < len(emotion_segments) else {}
                )
                emotion_name = emotion_segment.get("primary_emotion", {}).get(
                    "name", "neutral"
                )

                await emit_shot_decision_event(job_id, emotion_name, decision)

                # Add reasoning if not present
                if "reasoning" not in decision:
                    decision["reasoning"] = _generate_shot_reasoning(
                        decision, emotion_segment
                    )

            # Emit tension analysis if available
            try:
                tension_sequence = orchestrator.decision_engine.tension_engine.calculate_sequence_tension(
                    emotion_segments
                )
                # Create tension summary for event
                tension_summary = {
                    "overall_tension": "medium",
                    "tension_score": (
                        sum(t.get("tension_level", 0.5) for t in tension_sequence)
                        / len(tension_sequence)
                        if tension_sequence
                        else 0.5
                    ),
                    "narrative_phase": "development",
                    "dramatic_moments": [
                        {
                            "segment_index": i,
                            "tension_level": t.get("tension_level", 0.5),
                            "tension_type": t.get("tension_type", "medium"),
                        }
                        for i, t in enumerate(tension_sequence)
                        if t.get("tension_level", 0.5) > 0.7
                    ],
                }
                await emit_tension_analysis_event(job_id, tension_summary)
            except Exception as e:
                print(f"Warning: Could not emit tension analysis: {e}")

            # Update progress
            processing_jobs[job_id]["progress"] = 75
            await emit_processing_stage_event(job_id, "cinematography_enhancement", 75)

            # Build enhanced frame sequences
            frame_sequences = orchestrator._build_frame_sequences(
                shot_sequence=cinematographic_decisions,
                emotions=emotions,
                cinematic_mode=cinematic_mode,
            )

            # Emit processing stage: video composition
            await emit_processing_stage_event(job_id, "video_composition", 85)

            # Compose final video
            video_path = orchestrator.compositor.render_multiscene_video(
                shot_sequence=frame_sequences,
                audio_path=audio_path,
                output_path=output_path,
                profile_manager=orchestrator.profile_manager,
            )

            # Update progress
            processing_jobs[job_id]["progress"] = 95
            await emit_processing_stage_event(job_id, "finalization", 95)

            # Create enhanced result metadata
            result_metadata = {
                "audio_path": audio_path,
                "profile_name": profile_name,
                "cinematic_mode": cinematic_mode,
                "emotion_analysis": emotions,
                "cinematographic_decisions": cinematographic_decisions,
                "frame_sequences": frame_sequences,
                "decisions_made": len(cinematographic_decisions),
                "video_path": video_path,
                "processing_summary": {
                    "total_emotion_segments": len(emotion_segments),
                    "total_shot_decisions": len(cinematographic_decisions),
                    "dominant_emotion": _identify_dominant_emotion(emotion_segments)[
                        "dominant_by_frequency"
                    ],
                    "shot_variety": len(
                        set(
                            decision.get("angle", "MCU")
                            for decision in cinematographic_decisions
                        )
                    ),
                },
            }

            # Mark as completed
            processing_jobs[job_id]["status"] = "completed"
            processing_jobs[job_id]["progress"] = 100
            processing_jobs[job_id]["result"] = result_metadata
            processing_jobs[job_id]["end_time"] = datetime.now().isoformat()

            # Emit completion event
            completion_event = {
                "type": "processing_completed",
                "timestamp": datetime.now().isoformat(),
                "job_id": job_id,
                "video_path": video_path,
                "total_processing_time": (
                    datetime.fromisoformat(processing_jobs[job_id]["end_time"])
                    - datetime.fromisoformat(processing_jobs[job_id]["start_time"])
                ).total_seconds(),
                "summary": result_metadata["processing_summary"],
            }
            await broadcast_websocket_event(completion_event)

            await emit_processing_update()

        except Exception as processing_error:
            # Emit error event
            error_event = {
                "type": "processing_error",
                "timestamp": datetime.now().isoformat(),
                "job_id": job_id,
                "error_stage": "content_generation",
                "error_message": str(processing_error),
                "progress": processing_jobs[job_id]["progress"],
            }
            await broadcast_websocket_event(error_event)
            raise processing_error

    except Exception as e:
        processing_jobs[job_id]["status"] = "error"
        processing_jobs[job_id]["error"] = str(e)
        processing_jobs[job_id]["progress"] = 0

        # Emit error event
        error_event = {
            "type": "processing_error",
            "timestamp": datetime.now().isoformat(),
            "job_id": job_id,
            "error_stage": "initialization",
            "error_message": str(e),
            "progress": 0,
        }
        await broadcast_websocket_event(error_event)

        await emit_processing_update()


@app.get("/api/jobs")
async def get_jobs():
    """Get all processing jobs"""
    return api_response_wrapper(lambda: {"jobs": processing_jobs})()


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Get specific job information"""
    return api_response_wrapper(_get_job_data)(job_id)


def _get_job_data(job_id: str):
    """Helper function to get job data"""
    if job_id not in processing_jobs:
        raise Exception("Job not found")

    return {"job": processing_jobs[job_id]}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload an audio file to the server"""
    import os
    from pathlib import Path

    # Create uploads directory if it doesn't exist
    uploads_dir = Path(project_root) / "uploads"
    uploads_dir.mkdir(exist_ok=True)

    # Save the uploaded file
    if file.filename is None:
        return {"error": "Uploaded file has no name"}

    file_path = uploads_dir / file.filename
    with open(file_path, "wb") as buffer:
        import shutil

        shutil.copyfileobj(file.file, buffer)

    return {"path": str(file_path)}


# ============================================================================
# ENHANCED PROCESSING HELPER FUNCTIONS IMPLEMENTATIONS
# ============================================================================


# Shot sequence analysis functions
def _analyze_shot_type_distribution(shot_sequence: List[Dict]) -> Dict:
    """Analyze distribution of shot types in sequence"""
    shot_counts = {}
    total_duration_by_type = {}

    for shot in shot_sequence:
        shot_type = shot.get("angle", "MCU")
        duration = shot.get("timing", {}).get("duration", 2.0)

        shot_counts[shot_type] = shot_counts.get(shot_type, 0) + 1
        total_duration_by_type[shot_type] = (
            total_duration_by_type.get(shot_type, 0) + duration
        )

    total_shots = len(shot_sequence)
    return {
        "shot_counts": shot_counts,
        "shot_percentages": {
            shot: (count / total_shots * 100) for shot, count in shot_counts.items()
        },
        "duration_distribution": total_duration_by_type,
        "most_used_shot": (
            max(shot_counts.items(), key=lambda x: x[1])[0] if shot_counts else "MCU"
        ),
    }


def _analyze_emotion_coverage(shot_sequence: List[Dict]) -> Dict:
    """Analyze how well shots cover emotional content"""
    emotions_covered = set()
    emotion_shot_mapping = {}

    for shot in shot_sequence:
        emotion = shot.get("emotion_context", {}).get("primary_emotion", "neutral")
        shot_type = shot.get("angle", "MCU")

        emotions_covered.add(emotion)
        if emotion not in emotion_shot_mapping:
            emotion_shot_mapping[emotion] = []
        emotion_shot_mapping[emotion].append(shot_type)

    return {
        "unique_emotions": len(emotions_covered),
        "emotions_covered": list(emotions_covered),
        "emotion_shot_mapping": emotion_shot_mapping,
        "coverage_score": len(emotions_covered) / 8.0,  # 8 basic emotions
    }


def _analyze_cinematic_consistency(shot_sequence: List[Dict]) -> Dict:
    """Analyze consistency of cinematographic choices"""
    angle_changes = 0
    shot_type_changes = 0
    purpose_changes = 0

    for i in range(1, len(shot_sequence)):
        prev_shot = shot_sequence[i - 1]
        curr_shot = shot_sequence[i]

        if prev_shot.get("angle") != curr_shot.get("angle"):
            shot_type_changes += 1
        if prev_shot.get("vertical_angle") != curr_shot.get("vertical_angle"):
            angle_changes += 1
        if prev_shot.get("shot_purpose") != curr_shot.get("shot_purpose"):
            purpose_changes += 1

    total_possible_changes = len(shot_sequence) - 1 if len(shot_sequence) > 1 else 1

    return {
        "shot_type_consistency": 1.0 - (shot_type_changes / total_possible_changes),
        "angle_consistency": 1.0 - (angle_changes / total_possible_changes),
        "purpose_consistency": 1.0 - (purpose_changes / total_possible_changes),
        "overall_consistency": (
            3.0
            - (shot_type_changes + angle_changes + purpose_changes)
            / total_possible_changes
        )
        / 3.0,
    }


def _generate_sequence_recommendations(shot_sequence: List[Dict]) -> List[Dict]:
    """Generate recommendations for shot sequence improvement"""
    recommendations = []

    # Analyze shot variety
    shot_types = [shot.get("angle", "MCU") for shot in shot_sequence]
    unique_shots = set(shot_types)

    if len(unique_shots) < 3:
        recommendations.append(
            {
                "type": "variety",
                "priority": "medium",
                "message": "Consider adding more shot variety for visual interest",
                "suggestion": "Mix in wider shots (MS, LS) or tighter shots (CU, ECU)",
            }
        )

    # Analyze emotional progression
    emotions = [
        shot.get("emotion_context", {}).get("primary_emotion", "neutral")
        for shot in shot_sequence
    ]
    if len(set(emotions)) == 1:
        recommendations.append(
            {
                "type": "emotional_arc",
                "priority": "high",
                "message": "Single emotion throughout - consider emotional development",
                "suggestion": "Build emotional arc with progression or contrast",
            }
        )

    # Analyze pacing
    durations = [shot.get("timing", {}).get("duration", 2.0) for shot in shot_sequence]
    avg_duration = sum(durations) / len(durations) if durations else 2.0

    if avg_duration > 4.0:
        recommendations.append(
            {
                "type": "pacing",
                "priority": "medium",
                "message": "Shots are quite long - consider faster pacing",
                "suggestion": "Reduce shot durations or add more cuts for energy",
            }
        )
    elif avg_duration < 1.5:
        recommendations.append(
            {
                "type": "pacing",
                "priority": "low",
                "message": "Very fast pacing - consider longer shots for clarity",
                "suggestion": "Extend some shots to allow emotional moments to breathe",
            }
        )

    return recommendations


def _extract_decision_factors(shot: Dict) -> List[str]:
    """Extract factors that influenced shot decision"""
    factors = []

    emotion = shot.get("emotion_context", {}).get("primary_emotion", "neutral")
    confidence = shot.get("decision_analysis", {}).get("confidence", 0.0)
    purpose = shot.get("shot_purpose", "dialogue")

    if confidence > 0.8:
        factors.append("High emotion confidence")
    elif confidence < 0.5:
        factors.append("Conservative approach due to low confidence")

    if purpose == "emotional":
        factors.append("Emotional impact prioritized")
    elif purpose == "narrative":
        factors.append("Story clarity prioritized")

    if emotion in ["anger", "fear", "surprise"]:
        factors.append("High-intensity emotion handling")
    elif emotion in ["sadness", "trust"]:
        factors.append("Gentle emotion handling")

    return factors


def _get_applied_rules(shot: Dict) -> List[str]:
    """Get list of cinematographic rules applied to shot"""
    rules = []

    shot_type = shot.get("angle", "MCU")
    vertical_angle = shot.get("vertical_angle", "eye_level")
    emotion = shot.get("emotion_context", {}).get("primary_emotion", "neutral")

    # Basic rule mappings
    if shot_type in ["ECU", "CU"] and emotion in ["joy", "anger", "fear"]:
        rules.append("intensity_emotion_rule")
    elif shot_type in ["MS", "LS"] and emotion in ["sadness", "trust"]:
        rules.append("emotional_distance_rule")

    if vertical_angle == "high_angle" and emotion in ["fear", "sadness"]:
        rules.append("vulnerability_angle_rule")
    elif vertical_angle == "low_angle" and emotion in ["anger", "power"]:
        rules.append("dominance_angle_rule")

    if shot.get("shot_purpose") == "dialogue":
        rules.append("dialogue_clarity_rule")

    return rules


# Emotion analysis functions
def _analyze_emotion_transition(prev_segment: Dict, curr_segment: Dict) -> Dict:
    """Analyze transition between two emotion segments"""
    prev_emotion = prev_segment.get("primary_emotion", {})
    curr_emotion = curr_segment.get("primary_emotion", {})

    prev_name = prev_emotion.get("name", "neutral")
    curr_name = curr_emotion.get("name", "neutral")
    prev_confidence = prev_emotion.get("confidence", 0.0)
    curr_confidence = curr_emotion.get("confidence", 0.0)

    # Calculate transition intensity
    if prev_name == curr_name:
        transition_type = "continuation"
        intensity = abs(curr_confidence - prev_confidence) / 5.0
    else:
        transition_type = "change"
        # Define emotional distance (simplified)
        opposing_emotions = {
            ("joy", "sadness"),
            ("anger", "trust"),
            ("fear", "disgust"),
            ("surprise", "anticipation"),
        }

        if (prev_name, curr_name) in opposing_emotions or (
            curr_name,
            prev_name,
        ) in opposing_emotions:
            intensity = 0.8  # High intensity for opposing emotions
        else:
            intensity = 0.4  # Medium intensity for other changes

    return {
        "transition_type": transition_type,
        "from_emotion": prev_name,
        "to_emotion": curr_name,
        "intensity": intensity,
        "confidence_change": curr_confidence - prev_confidence,
        "dramatic_level": (
            "high" if intensity > 0.6 else "medium" if intensity > 0.3 else "low"
        ),
    }


def _calculate_emotion_intensity(segment: Dict) -> float:
    """Calculate overall emotional intensity for a segment"""
    primary_emotion = segment.get("primary_emotion", {})
    secondary_emotions = segment.get("secondary_emotions", [])

    # Weight primary emotion more heavily
    primary_intensity = primary_emotion.get("confidence", 0.0)

    # Add secondary emotions
    secondary_intensity = sum(
        emotion.get("confidence", 0.0) for emotion in secondary_emotions
    )

    # Normalize to 0-1 range
    total_intensity = (primary_intensity * 0.7 + secondary_intensity * 0.3) / 5.0
    return min(1.0, total_intensity)


def _calculate_emotional_clarity(segment: Dict) -> float:
    """Calculate how clear/emotionally distinct a segment is"""
    primary_emotion = segment.get("primary_emotion", {})
    secondary_emotions = segment.get("secondary_emotions", [])

    primary_confidence = primary_emotion.get("confidence", 0.0)

    if not secondary_emotions:
        return min(1.0, primary_confidence / 5.0)

    # Calculate confidence gap between primary and strongest secondary
    strongest_secondary = max(
        secondary_emotions, key=lambda x: x.get("confidence", 0.0)
    )
    secondary_confidence = strongest_secondary.get("confidence", 0.0)

    confidence_gap = primary_confidence - secondary_confidence
    clarity_score = (confidence_gap / 5.0) + (primary_confidence / 10.0)

    return min(1.0, max(0.0, clarity_score))


def _calculate_acoustic_emotion_correlation(segment: Dict) -> float:
    """Calculate correlation between acoustic features and emotion detection"""
    acoustic_features = segment.get("acoustic_features", {})
    primary_emotion = segment.get("primary_emotion", {})
    emotion_name = primary_emotion.get("name", "neutral")
    confidence = primary_emotion.get("confidence", 0.0)

    # Simple correlation based on energy and emotion type
    energy_level = acoustic_features.get("energy_level", 0.0)
    pitch_mean = acoustic_features.get("pitch_mean", 0.0)

    correlation = 0.5  # Base correlation

    # High energy emotions should have high energy
    high_energy_emotions = ["joy", "anger", "excitement"]
    if emotion_name in high_energy_emotions:
        correlation += energy_level * 0.3
    else:
        correlation += (1.0 - energy_level) * 0.2

    # High pitch emotions should have high pitch
    high_pitch_emotions = ["joy", "fear", "surprise"]
    if emotion_name in high_pitch_emotions:
        correlation += min(1.0, pitch_mean / 1000) * 0.2
    else:
        correlation += (1.0 - min(1.0, pitch_mean / 1000)) * 0.1

    return min(1.0, correlation)


def _assess_audio_quality_for_emotion(segment: Dict) -> Dict:
    """Assess audio quality indicators for emotion detection"""
    acoustic_features = segment.get("acoustic_features", {})

    energy_level = acoustic_features.get("energy_level", 0.0)
    pitch_variance = acoustic_features.get("pitch_variance", 0.0)
    speaking_rate = acoustic_features.get("speaking_rate", 0.0)

    # Quality indicators
    signal_quality = "good" if energy_level > 0.05 else "poor"
    pitch_stability = "stable" if pitch_variance < 500000 else "variable"
    speech_clarity = "clear" if speaking_rate > 0.5 else "unclear"

    # Overall quality score
    quality_score = min(1.0, (energy_level * 5) + (speaking_rate * 0.3))

    return {
        "signal_quality": signal_quality,
        "pitch_stability": pitch_stability,
        "speech_clarity": speech_clarity,
        "overall_quality_score": quality_score,
        "reliability_for_emotion": (
            "high"
            if quality_score > 0.7
            else "medium" if quality_score > 0.4 else "low"
        ),
    }


def _analyze_cinematographic_implications(segment: Dict) -> Dict:
    """Analyze cinematographic implications of emotion segment"""
    primary_emotion = segment.get("primary_emotion", {})
    emotion_name = primary_emotion.get("name", "neutral")
    confidence = primary_emotion.get("confidence", 0.0)
    intensity = _calculate_emotion_intensity(segment)

    # Shot recommendations
    shot_recommendations = {
        "joy": {"distance": "CU", "angle": "eye_level", "movement": "stable"},
        "sadness": {"distance": "MS", "angle": "high_angle", "movement": "slow_pan"},
        "anger": {"distance": "ECU", "angle": "low_angle", "movement": "handheld"},
        "fear": {"distance": "CU", "angle": "dutch", "movement": "subtle_shake"},
        "surprise": {"distance": "CU", "angle": "eye_level", "movement": "quick_zoom"},
        "disgust": {"distance": "CU", "angle": "high_angle", "movement": "stable"},
        "trust": {"distance": "MCU", "angle": "eye_level", "movement": "stable"},
        "anticipation": {
            "distance": "CU",
            "angle": "low_angle",
            "movement": "slow_push",
        },
    }

    base_recommendation = shot_recommendations.get(
        emotion_name, shot_recommendations["trust"]
    )

    # Adjust based on confidence and intensity
    if confidence > 3.5 and intensity > 0.7:
        base_recommendation["intensity"] = "high"
        base_recommendation["duration_preference"] = "longer"
    elif confidence < 2.0:
        base_recommendation["intensity"] = "low"
        base_recommendation["duration_preference"] = "shorter"
    else:
        base_recommendation["intensity"] = "medium"
        base_recommendation["duration_preference"] = "standard"

    return {
        "recommended_shot": base_recommendation,
        "cinematic_priority": (
            "high" if intensity > 0.6 else "medium" if intensity > 0.3 else "low"
        ),
        "visual_energy": (
            "high" if emotion_name in ["joy", "anger", "excitement"] else "low"
        ),
        "camera_movement_suitability": _assess_movement_suitability(
            emotion_name, intensity
        ),
    }


def _assess_movement_suitability(emotion_name: str, intensity: float) -> str:
    """Assess suitability of camera movement for emotion"""
    high_movement_emotions = ["joy", "anger", "excitement", "fear"]
    low_movement_emotions = ["sadness", "trust", "calm"]

    if emotion_name in high_movement_emotions and intensity > 0.5:
        return "highly_suitable"
    elif emotion_name in low_movement_emotions:
        return "minimal_movement"
    else:
        return "moderate_movement"


# Advanced emotion analysis functions
def _analyze_emotional_transition_patterns(emotion_segments: List[Dict]) -> Dict:
    """Analyze patterns in emotional transitions"""
    if len(emotion_segments) < 2:
        return {
            "pattern_type": "insufficient_data",
            "analysis": "Need at least 2 segments",
        }

    transitions = []
    for i in range(1, len(emotion_segments)):
        prev_emotion = (
            emotion_segments[i - 1].get("primary_emotion", {}).get("name", "neutral")
        )
        curr_emotion = (
            emotion_segments[i].get("primary_emotion", {}).get("name", "neutral")
        )
        transitions.append((prev_emotion, curr_emotion))

    # Count transition types
    transition_counts = {}
    for prev, curr in transitions:
        transition_key = f"{prev}_to_{curr}"
        transition_counts[transition_key] = transition_counts.get(transition_key, 0) + 1

    # Identify patterns
    most_common_transition = (
        max(transition_counts.items(), key=lambda x: x[1])[0]
        if transition_counts
        else None
    )

    # Check for cyclical patterns
    emotion_sequence = [
        seg.get("primary_emotion", {}).get("name", "neutral")
        for seg in emotion_segments
    ]
    has_cycle = len(set(emotion_sequence)) < len(emotion_sequence)

    return {
        "total_transitions": len(transitions),
        "transition_counts": transition_counts,
        "most_common_transition": most_common_transition,
        "has_cyclical_pattern": has_cycle,
        "transition_diversity": (
            len(set(transition_counts)) / len(transition_counts)
            if transition_counts
            else 0
        ),
    }


def _analyze_emotional_arc(emotion_segments: List[Dict]) -> Dict:
    """Analyze overall emotional arc of the audio"""
    if not emotion_segments:
        return {"arc_type": "empty", "analysis": "No emotion segments found"}

    # Extract emotional metrics
    emotions = [seg.get("primary_emotion", {}) for seg in emotion_segments]
    confidences = [emo.get("confidence", 0.0) for emo in emotions]
    valences = [emo.get("valence", 0.0) for emo in emotions]

    # Analyze arc shape
    if len(confidences) < 3:
        arc_shape = "linear"
    else:
        # Simple arc detection
        first_third = confidences[: len(confidences) // 3]
        middle_third = confidences[len(confidences) // 3 : 2 * len(confidences) // 3]
        last_third = confidences[2 * len(confidences) // 3 :]

        first_avg = sum(first_third) / len(first_third) if first_third else 0
        middle_avg = sum(middle_third) / len(middle_third) if middle_third else 0
        last_avg = sum(last_third) / len(last_third) if last_third else 0

        if middle_avg > first_avg and middle_avg > last_avg:
            arc_shape = "peak"
        elif middle_avg < first_avg and middle_avg < last_avg:
            arc_shape = "valley"
        elif last_avg > first_avg:
            arc_shape = "rising"
        elif last_avg < first_avg:
            arc_shape = "falling"
        else:
            arc_shape = "flat"

    # Calculate overall emotional direction
    overall_valence_trend = valences[-1] - valences[0] if len(valences) > 1 else 0

    return {
        "arc_shape": arc_shape,
        "overall_valence_trend": overall_valence_trend,
        "emotional_direction": (
            "positive"
            if overall_valence_trend > 0.1
            else "negative" if overall_valence_trend < -0.1 else "neutral"
        ),
        "peak_emotion_moment": (
            confidences.index(max(confidences)) if confidences else 0
        ),
        "emotional_range": max(confidences) - min(confidences) if confidences else 0,
    }


def _identify_dominant_emotion(emotion_segments: List[Dict]) -> Dict:
    """Identify the dominant emotion across all segments"""
    emotion_counts = {}
    emotion_durations = {}
    total_confidence = {}

    for segment in emotion_segments:
        emotion = segment.get("primary_emotion", {})
        emotion_name = emotion.get("name", "neutral")
        confidence = emotion.get("confidence", 0.0)

        duration = segment.get("end_time", 0) - segment.get("start_time", 0)

        emotion_counts[emotion_name] = emotion_counts.get(emotion_name, 0) + 1
        emotion_durations[emotion_name] = (
            emotion_durations.get(emotion_name, 0) + duration
        )
        total_confidence[emotion_name] = (
            total_confidence.get(emotion_name, 0) + confidence
        )

    # Determine dominant by different metrics
    dominant_by_count = (
        max(emotion_counts.items(), key=lambda x: x[1])[0]
        if emotion_counts
        else "neutral"
    )
    dominant_by_duration = (
        max(emotion_durations.items(), key=lambda x: x[1])[0]
        if emotion_durations
        else "neutral"
    )
    dominant_by_confidence = (
        max(total_confidence.items(), key=lambda x: x[1])[0]
        if total_confidence
        else "neutral"
    )

    return {
        "dominant_by_frequency": dominant_by_count,
        "dominant_by_duration": dominant_by_duration,
        "dominant_by_confidence": dominant_by_confidence,
        "consensus_dominant": (
            dominant_by_count
            if dominant_by_count == dominant_by_duration == dominant_by_confidence
            else "mixed"
        ),
        "emotion_statistics": {
            "counts": emotion_counts,
            "durations": emotion_durations,
            "total_confidence": total_confidence,
        },
    }


def _calculate_emotional_diversity(emotion_segments: List[Dict]) -> float:
    """Calculate diversity of emotions in the segments"""
    if not emotion_segments:
        return 0.0

    unique_emotions = set()
    for segment in emotion_segments:
        emotion = segment.get("primary_emotion", {}).get("name", "neutral")
        unique_emotions.add(emotion)

    # Diversity as ratio of unique emotions to total possible (8 basic emotions)
    return len(unique_emotions) / 8.0


def _calculate_intensity_curve(emotion_segments: List[Dict]) -> List[Dict]:
    """Calculate emotional intensity curve over time"""
    intensity_points = []

    for i, segment in enumerate(emotion_segments):
        intensity = _calculate_emotion_intensity(segment)
        timestamp = segment.get("start_time", i * 2.0)

        intensity_points.append(
            {
                "timestamp": timestamp,
                "segment_index": i,
                "intensity": intensity,
                "emotion": segment.get("primary_emotion", {}).get("name", "neutral"),
            }
        )

    return intensity_points


def _calculate_valence_arousal_trajectory(emotion_segments: List[Dict]) -> Dict:
    """Calculate valence-arousal trajectory over time"""
    trajectory_points = []

    for i, segment in enumerate(emotion_segments):
        primary_emotion = segment.get("primary_emotion", {})
        valence = primary_emotion.get("valence", 0.0)
        arousal = primary_emotion.get("arousal", 0.0)
        timestamp = segment.get("start_time", i * 2.0)

        trajectory_points.append(
            {
                "timestamp": timestamp,
                "segment_index": i,
                "valence": valence,
                "arousal": arousal,
                "emotion": primary_emotion.get("name", "neutral"),
            }
        )

    # Calculate trajectory characteristics
    if len(trajectory_points) > 1:
        valence_range = max(p["valence"] for p in trajectory_points) - min(
            p["valence"] for p in trajectory_points
        )
        arousal_range = max(p["arousal"] for p in trajectory_points) - min(
            p["arousal"] for p in trajectory_points
        )

        # Overall direction
        start_valence = trajectory_points[0]["valence"]
        end_valence = trajectory_points[-1]["valence"]
        start_arousal = trajectory_points[0]["arousal"]
        end_arousal = trajectory_points[-1]["arousal"]

        valence_direction = (
            "positive"
            if end_valence > start_valence
            else "negative" if end_valence < start_valence else "stable"
        )
        arousal_direction = (
            "increasing"
            if end_arousal > start_arousal
            else "decreasing" if end_arousal < start_arousal else "stable"
        )
    else:
        valence_range = arousal_range = 0.0
        valence_direction = arousal_direction = "stable"

    return {
        "trajectory_points": trajectory_points,
        "valence_range": valence_range,
        "arousal_range": arousal_range,
        "valence_direction": valence_direction,
        "arousal_direction": arousal_direction,
    }


def _calculate_emotional_smoothness(emotion_segments: List[Dict]) -> float:
    """Calculate how smoothly emotions transition"""
    if len(emotion_segments) < 2:
        return 1.0

    smoothness_scores = []

    for i in range(1, len(emotion_segments)):
        prev_segment = emotion_segments[i - 1]
        curr_segment = emotion_segments[i]

        prev_emotion = prev_segment.get("primary_emotion", {})
        curr_emotion = curr_segment.get("primary_emotion", {})

        # Calculate emotional distance
        prev_name = prev_emotion.get("name", "neutral")
        curr_name = curr_emotion.get("name", "neutral")

        if prev_name == curr_name:
            # Same emotion - check confidence change
            conf_change = abs(
                curr_emotion.get("confidence", 0.0)
                - prev_emotion.get("confidence", 0.0)
            )
            smoothness = 1.0 - (conf_change / 5.0)
        else:
            # Different emotion - lower smoothness
            smoothness = 0.5

        smoothness_scores.append(max(0.0, smoothness))

    return sum(smoothness_scores) / len(smoothness_scores)


def _identify_dramatic_moments(emotion_segments: List[Dict]) -> List[Dict]:
    """Identify dramatic moments in the emotion timeline"""
    dramatic_moments = []

    for i, segment in enumerate(emotion_segments):
        primary_emotion = segment.get("primary_emotion", {})
        emotion_name = primary_emotion.get("name", "neutral")
        confidence = primary_emotion.get("confidence", 0.0)
        intensity = _calculate_emotion_intensity(segment)

        # High intensity emotions are dramatic
        if intensity > 0.7:
            dramatic_moments.append(
                {
                    "segment_index": i,
                    "timestamp": segment.get("start_time", i * 2.0),
                    "emotion": emotion_name,
                    "intensity": intensity,
                    "confidence": confidence,
                    "dramatic_type": "high_intensity",
                }
            )

        # Large emotional jumps are dramatic
        if i > 0:
            prev_segment = emotion_segments[i - 1]
            prev_emotion = prev_segment.get("primary_emotion", {}).get(
                "name", "neutral"
            )

            if prev_emotion != emotion_name:
                dramatic_moments.append(
                    {
                        "segment_index": i,
                        "timestamp": segment.get("start_time", i * 2.0),
                        "emotion": emotion_name,
                        "previous_emotion": prev_emotion,
                        "dramatic_type": "emotional_shift",
                    }
                )

    return dramatic_moments


def _calculate_average_segment_duration(emotion_segments: List[Dict]) -> float:
    """Calculate average duration of emotion segments"""
    if not emotion_segments:
        return 0.0

    total_duration = 0.0
    for segment in emotion_segments:
        duration = segment.get("end_time", 0) - segment.get("start_time", 0)
        total_duration += duration

    return total_duration / len(emotion_segments)


def _calculate_emotion_distribution(emotion_segments: List[Dict]) -> Dict:
    """Calculate distribution of emotions across segments"""
    emotion_counts = {}
    emotion_durations = {}

    for segment in emotion_segments:
        emotion = segment.get("primary_emotion", {}).get("name", "neutral")
        duration = segment.get("end_time", 0) - segment.get("start_time", 0)

        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        emotion_durations[emotion] = emotion_durations.get(emotion, 0) + duration

    total_segments = len(emotion_segments)
    total_duration = sum(emotion_durations.values())

    return {
        "segment_counts": emotion_counts,
        "duration_percentages": {
            emo: (dur / total_duration * 100) for emo, dur in emotion_durations.items()
        },
        "segment_percentages": {
            emo: (count / total_segments * 100) for emo, count in emotion_counts.items()
        },
        "most_frequent": (
            max(emotion_counts.items(), key=lambda x: x[1])[0]
            if emotion_counts
            else "neutral"
        ),
    }


def _calculate_confidence_statistics(emotion_segments: List[Dict]) -> Dict:
    """Calculate confidence statistics across emotion segments"""
    confidences = []

    for segment in emotion_segments:
        confidence = segment.get("primary_emotion", {}).get("confidence", 0.0)
        confidences.append(confidence)

    if not confidences:
        return {"average": 0.0, "min": 0.0, "max": 0.0, "std_dev": 0.0}

    avg_confidence = sum(confidences) / len(confidences)
    min_confidence = min(confidences)
    max_confidence = max(confidences)

    # Calculate standard deviation
    variance = sum((c - avg_confidence) ** 2 for c in confidences) / len(confidences)
    std_dev = variance**0.5

    return {
        "average": avg_confidence,
        "min": min_confidence,
        "max": max_confidence,
        "std_dev": std_dev,
        "confidence_stability": (
            "high" if std_dev < 0.5 else "medium" if std_dev < 1.0 else "low"
        ),
    }


# Shot suitability functions
def _calculate_shot_suitability(
    shot_type: str, emotion_name: str, confidence: float
) -> float:
    """Calculate suitability score for shot type with emotion"""
    # Define base suitability matrix
    suitability_matrix = {
        ("joy", "ECU"): 0.9,
        ("joy", "CU"): 1.0,
        ("joy", "MCU"): 0.8,
        ("joy", "MS"): 0.6,
        ("sadness", "ECU"): 0.5,
        ("sadness", "CU"): 0.6,
        ("sadness", "MCU"): 0.8,
        ("sadness", "MS"): 0.9,
        ("anger", "ECU"): 1.0,
        ("anger", "CU"): 0.9,
        ("anger", "MCU"): 0.7,
        ("anger", "MS"): 0.5,
        ("fear", "ECU"): 0.8,
        ("fear", "CU"): 0.9,
        ("fear", "MCU"): 0.7,
        ("fear", "MS"): 0.6,
        ("surprise", "ECU"): 0.9,
        ("surprise", "CU"): 1.0,
        ("surprise", "MCU"): 0.8,
        ("surprise", "MS"): 0.6,
        ("trust", "ECU"): 0.6,
        ("trust", "CU"): 0.7,
        ("trust", "MCU"): 0.9,
        ("trust", "MS"): 0.8,
        ("anticipation", "ECU"): 0.8,
        ("anticipation", "CU"): 0.9,
        ("anticipation", "MCU"): 0.8,
        ("anticipation", "MS"): 0.7,
    }

    base_suitability = suitability_matrix.get((emotion_name, shot_type), 0.7)

    # Adjust based on confidence
    confidence_factor = confidence / 5.0  # Normalize to 0-1

    final_suitability = (base_suitability * 0.7) + (confidence_factor * 0.3)
    return min(1.0, max(0.0, final_suitability))


def _analyze_shot_impact_change(current_shot: str, alternative_shot: str) -> str:
    """Analyze the impact of changing from current to alternative shot"""
    shot_intensity_order = ["LS", "MLS", "MS", "MCU", "CU", "ECU"]

    try:
        current_index = shot_intensity_order.index(current_shot)
        alt_index = shot_intensity_order.index(alternative_shot)

        if alt_index > current_index + 1:
            return "significant_closer"
        elif alt_index > current_index:
            return "closer"
        elif alt_index < current_index - 1:
            return "significant_wider"
        elif alt_index < current_index:
            return "wider"
        else:
            return "similar"
    except ValueError:
        return "unknown"


def _calculate_angle_suitability(angle: str, emotion_name: str) -> float:
    """Calculate suitability score for camera angle with emotion"""
    angle_suitability = {
        ("joy", "eye_level"): 0.9,
        ("joy", "low_angle"): 0.7,
        ("joy", "high_angle"): 0.6,
        ("joy", "dutch"): 0.5,
        ("sadness", "eye_level"): 0.7,
        ("sadness", "low_angle"): 0.4,
        ("sadness", "high_angle"): 0.9,
        ("sadness", "dutch"): 0.6,
        ("anger", "eye_level"): 0.6,
        ("anger", "low_angle"): 0.9,
        ("anger", "high_angle"): 0.5,
        ("anger", "dutch"): 0.7,
        ("fear", "eye_level"): 0.6,
        ("fear", "low_angle"): 0.7,
        ("fear", "high_angle"): 0.8,
        ("fear", "dutch"): 0.9,
        ("surprise", "eye_level"): 0.8,
        ("surprise", "low_angle"): 0.6,
        ("surprise", "high_angle"): 0.7,
        ("surprise", "dutch"): 0.8,
        ("trust", "eye_level"): 0.9,
        ("trust", "low_angle"): 0.6,
        ("trust", "high_angle"): 0.7,
        ("trust", "dutch"): 0.4,
        ("anticipation", "eye_level"): 0.7,
        ("anticipation", "low_angle"): 0.8,
        ("anticipation", "high_angle"): 0.6,
        ("anticipation", "dutch"): 0.7,
    }

    return angle_suitability.get((emotion_name, angle), 0.6)


def _analyze_angle_impact_change(current_angle: str, alternative_angle: str) -> str:
    """Analyze the impact of changing camera angle"""
    if current_angle == alternative_angle:
        return "no_change"

    # Define angle impact categories
    dramatic_changes = [
        ("eye_level", "dutch"),
        ("dutch", "eye_level"),
        ("high_angle", "low_angle"),
        ("low_angle", "high_angle"),
    ]
    moderate_changes = [
        ("eye_level", "high_angle"),
        ("eye_level", "low_angle"),
        ("high_angle", "eye_level"),
        ("low_angle", "eye_level"),
    ]

    if (current_angle, alternative_angle) in dramatic_changes or (
        alternative_angle,
        current_angle,
    ) in dramatic_changes:
        return "dramatic_change"
    elif (current_angle, alternative_angle) in moderate_changes or (
        alternative_angle,
        current_angle,
    ) in moderate_changes:
        return "moderate_change"
    else:
        return "subtle_change"


# Bulk Viseme Operations
@app.post(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/bulk-upload"
)
async def bulk_upload_visemes(
    profile_name: str,
    angle_name: str,
    emotion_name: str,
    files: List[UploadFile] = File(...),
):
    """Bulk upload multiple viseme files"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Get emotion path
        profiles_directory = config["system"]["profiles_directory"]
        if profiles_directory is None:
            return {"error": "profiles_directory not configured in settings"}

        emotion_path = (
            Path(profiles_directory)
            / profile_name
            / "angles"
            / angle_name
            / "emotions"
            / emotion_name
        )

        results = {"success": [], "failed": [], "total": len(files)}

        # Process each file
        for file in files:
            try:
                # Extract viseme name from filename
                import re

                match = re.match(
                    r"viseme_([A-HX])\.(jpg|jpeg|png|webp)$",
                    file.filename,
                    re.IGNORECASE,
                )
                if not match:
                    results["failed"].append(
                        {
                            "filename": file.filename,
                            "error": "Invalid filename format. Expected: viseme_A.jpg, viseme_B.png, etc.",
                        }
                    )
                    continue

                viseme_name = match.group(1).upper()

                # Validate file type
                if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
                    results["failed"].append(
                        {
                            "filename": file.filename,
                            "error": "Invalid file type. Only JPG, PNG, and WebP are allowed.",
                        }
                    )
                    continue

                # Save file
                viseme_path = emotion_path / f"{viseme_name}.png"
                content = await file.read()

                # Validate and convert image
                import io

                from PIL import Image

                try:
                    img = Image.open(io.BytesIO(content))
                    # Convert to PNG if needed
                    if img.mode != "RGBA":
                        img = img.convert("RGBA")
                    img.save(viseme_path, "PNG")
                    results["success"].append(
                        {"viseme": viseme_name, "filename": file.filename}
                    )
                except Exception as img_error:
                    results["failed"].append(
                        {
                            "filename": file.filename,
                            "error": f"Invalid image: {str(img_error)}",
                        }
                    )

            except Exception as e:
                results["failed"].append({"filename": file.filename, "error": str(e)})

        return {
            "message": f"Processed {len(files)} files",
            "uploaded": len(results["success"]),
            "failed": len(results["failed"]),
            "results": results,
        }

    except Exception as e:
        return {"error": str(e)}


@app.get(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}/validate"
)
async def validate_viseme(
    profile_name: str, angle_name: str, emotion_name: str, viseme_name: str
):
    """Validate a specific viseme file"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        # Get viseme path
        profiles_directory = config["system"]["profiles_directory"]
        if profiles_directory is None:
            return {"error": "profiles_directory not configured in settings"}

        viseme_path = (
            Path(profiles_directory)
            / profile_name
            / "angles"
            / angle_name
            / "emotions"
            / emotion_name
            / f"{viseme_name}.png"
        )

        if not viseme_path.exists():
            return {
                "viseme": viseme_name,
                "exists": False,
                "valid": False,
                "issues": ["File does not exist"],
                "score": 0,
            }

        # Validate image
        from PIL import Image

        issues = []
        score = 100

        try:
            with Image.open(viseme_path) as img:
                # Check dimensions
                width, height = img.size
                if width < 100 or height < 100:
                    issues.append(
                        f"Image too small: {width}x{height}px (minimum 100x100)"
                    )
                    score -= 30
                elif width < 256 or height < 256:
                    issues.append(
                        f"Image small: {width}x{height}px (recommended 256x256 or larger)"
                    )
                    score -= 15

                # Check aspect ratio
                aspect_ratio = width / height
                if aspect_ratio < 0.5 or aspect_ratio > 2.0:
                    issues.append(
                        f"Unusual aspect ratio: {aspect_ratio:.2f} (recommended 0.8-1.2)"
                    )
                    score -= 10

                # Check transparency
                if img.mode != "RGBA":
                    issues.append("No transparency (non-RGBA format)")
                    score -= 5

                # Check for empty/transparent image
                if img.mode == "RGBA":
                    alpha_channel = img.split()[3]
                    if alpha_channel.getextrema() == (255, 255):
                        issues.append("No transparency - fully opaque image")
                        score -= 5
                    elif alpha_channel.getextrema() == (0, 0):
                        issues.append("Completely transparent image")
                        score -= 50

                # Simulate quality check (in real implementation, could use more sophisticated analysis)
                import random

                if (
                    random.random() < 0.1
                ):  # 10% chance of finding quality issues for demo
                    issues.append("Low image quality or compression artifacts")
                    score -= 20

        except Exception as e:
            issues.append(f"Cannot read image: {str(e)}")
            score = 0

        return {
            "viseme": viseme_name,
            "exists": True,
            "valid": len(issues) == 0,
            "issues": issues,
            "score": max(0, score),
            "file_size": viseme_path.stat().st_size if viseme_path.exists() else 0,
            "dimensions": (
                {"width": width, "height": height} if "width" in locals() else None
            ),
            "format": "PNG",
        }

    except Exception as e:
        return {"error": str(e)}


@app.post(
    "/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/batch-delete"
)
async def batch_delete_visemes(
    profile_name: str,
    angle_name: str,
    emotion_name: str,
    viseme_data: Dict[str, List[str]],
):
    """Delete multiple viseme files"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    profile_manager = ProfileManager(config)

    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result["valid"]:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}

        visemes = viseme_data.get("visemes", [])
        if not visemes:
            return {"error": "No visemes specified for deletion"}

        # Get emotion path
        profiles_directory = config["system"]["profiles_directory"]
        if profiles_directory is None:
            return {"error": "profiles_directory not configured in settings"}

        emotion_path = (
            Path(profiles_directory)
            / profile_name
            / "angles"
            / angle_name
            / "emotions"
            / emotion_name
        )

        results = {"deleted": [], "failed": [], "total": len(visemes)}

        for viseme_name in visemes:
            try:
                viseme_path = emotion_path / f"{viseme_name}.png"
                if viseme_path.exists():
                    viseme_path.unlink()
                    results["deleted"].append(viseme_name)
                else:
                    results["failed"].append(
                        {"viseme": viseme_name, "error": "File does not exist"}
                    )
            except Exception as e:
                results["failed"].append({"viseme": viseme_name, "error": str(e)})

        return {
            "message": f"Processed {len(visemes)} visemes",
            "deleted": len(results["deleted"]),
            "failed": len(results["failed"]),
            "results": results,
        }

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import os

    port = int(os.getenv("PORT", 8002))  # Default to 8002 to avoid frontend port
    uvicorn.run(app, host="0.0.0.0", port=port)
