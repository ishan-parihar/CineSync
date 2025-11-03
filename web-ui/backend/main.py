"""
Main FastAPI application for LipSyncAutomation Web UI
"""
from fastapi import FastAPI, WebSocket, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import asyncio
from typing import Dict, Any
import json
from pathlib import Path
import sys
from datetime import datetime

# Add the main project directory to the path to import LipSyncAutomation modules
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from lipsync_automation.core.content_orchestrator import ContentOrchestrator
from lipsync_automation.core.profile_manager import ProfileManager
from lipsync_automation.utils.validators import validate_audio_file, validate_dependencies
from lipsync_automation.utils.cache_manager import CacheManager

app = FastAPI(
    title="LipSyncAutomation Web API",
    description="Web API for LipSyncAutomation v2.0 system",
    version="1.0.0"
)

# Add CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store processing jobs status
processing_jobs: Dict[str, Dict[str, Any]] = {}

# Maintain active WebSocket connections to broadcast updates
active_websocket_connections = set()

async def emit_processing_update():
    """Emit processing update to all connected WebSocket clients"""
    status_update = {
        "active_jobs": len([job for job in processing_jobs.values() if job['status'] in ['processing', 'queued']]),
        "jobs": processing_jobs
    }
    
    # Broadcast to all connected WebSocket clients
    disconnected_clients = []
    for connection in active_websocket_connections:
        try:
            await connection.send_text(json.dumps(status_update))
        except Exception as e:
            print(f"Error sending to WebSocket client: {e}")
            disconnected_clients.append(connection)
    
    # Remove disconnected clients
    for client in disconnected_clients:
        active_websocket_connections.discard(client)

@app.get("/")
async def read_root():
    return {"message": "LipSyncAutomation Web API", "status": "running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/system-info")
async def get_system_info():
    """Get system information and status"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Validate dependencies
    try:
        dependencies_ok = validate_dependencies(
            config['system']['rhubarb_path'],
            config['system']['ffmpeg_path']
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
            "profile_directory": config['system']['profiles_directory'],
            "cache_directory": config['system']['cache_directory'],
            "temp_directory": config['system']['temp_directory']
        },
        "profiles": {
            "count": len(profile_manager.list_profiles()),
            "profiles": profile_manager.list_profiles()
        },
        "processing": {
            "active_jobs": len([job for job in processing_jobs.values() if job['status'] in ['processing', 'queued']]),
            "pending_jobs": len([job for job in processing_jobs.values() if job['status'] == 'queued']),
            "completed_jobs": len([job for job in processing_jobs.values() if job['status'] == 'completed'])
        }
    }

@app.get("/api/profiles")
async def list_profiles():
    """List all available character profiles"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    profile_manager = ProfileManager(config)
    profiles = profile_manager.list_profiles()
    
    # Add validation status for each profile
    for profile in profiles:
        validation_result = profile_manager.validate_profile(profile['profile_name'])
        profile['validation'] = validation_result
    
    return {"profiles": profiles}

@app.post("/api/profiles")
async def create_profile(profile_data: Dict[str, Any]):
    """Create a new character profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    profile_manager = ProfileManager(config)
    
    # Extract required fields from profile_data
    profile_name = profile_data.get('profile_name')
    angles = profile_data.get('supported_angles', [])
    emotions = profile_data.get('supported_emotions', [])
    
    if not profile_name:
        return {"error": "profile_name is required"}
    
    try:
        profile_path = profile_manager.create_profile_template(profile_name, angles, emotions)
        return {
            "message": f"Profile '{profile_name}' created successfully",
            "profile_path": str(profile_path),
            "profile_name": profile_name
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/profiles/{profile_name}")
async def get_profile(profile_name: str):
    """Get detailed information about a specific profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    profile_manager = ProfileManager(config)
    
    try:
        # Validate profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        
        profile_info = profile_manager.get_profile_info(profile_name)
        
        return {
            "profile_info": profile_info,
            "validation": validation_result
        }
    except Exception as e:
        return {"error": str(e)}


@app.put("/api/profiles/{profile_name}")
async def update_profile(profile_name: str, profile_data: Dict[str, Any]):
    """Update an existing character profile"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    profile_manager = ProfileManager(config)
    
    try:
        # Check if profile exists
        validation_result = profile_manager.validate_profile(profile_name)
        if not validation_result['valid']:
            return {"error": f"Profile '{profile_name}' does not exist or is invalid"}
        
        # Load existing profile config
        profiles_dir_config = config['system']['profiles_directory']
        if profiles_dir_config is None:
            return {"error": "profiles_directory not configured in settings"}
        
        profiles_dir_str = str(profiles_dir_config)
        
        # Use string concatenation to avoid path type issues
        if profiles_dir_str.startswith('./'):
            profile_path = project_root / profiles_dir_str[2:] / profile_name / "profile_config.json"
        else:
            profile_path = Path(profiles_dir_str) / profile_name / "profile_config.json"
            
        with open(profile_path, 'r') as f:
            existing_config = json.load(f)
        
        # Update provided fields while preserving others
        if 'supported_angles' in profile_data:
            existing_config['supported_angles'] = profile_data['supported_angles']
        
        if 'supported_emotions' in profile_data:
            if isinstance(existing_config['supported_emotions'], dict) and 'core' in existing_config['supported_emotions']:
                existing_config['supported_emotions']['core'] = profile_data['supported_emotions']
            else:
                # If the structure is different, update the whole field
                existing_config['supported_emotions'] = profile_data['supported_emotions']
        
        if 'character_metadata' in profile_data:
            if 'character_metadata' in existing_config:
                existing_config['character_metadata'].update(profile_data['character_metadata'])
            else:
                existing_config['character_metadata'] = profile_data['character_metadata']
        
        if 'default_settings' in profile_data:
            if 'default_settings' in existing_config:
                existing_config['default_settings'].update(profile_data['default_settings'])
            else:
                existing_config['default_settings'] = profile_data['default_settings']
        
        # Update last modified timestamp
        existing_config['last_modified'] = datetime.now().isoformat()
        
        # Save updated config
        with open(profile_path, 'w') as f:
            json.dump(existing_config, f, indent=2)
        
        # Update manifest if needed
        for profile in profile_manager.manifest['profiles']:
            if profile['profile_name'] == profile_name:
                profile['supported_angles'] = existing_config['supported_angles']
                if isinstance(existing_config['supported_emotions'], dict) and 'core' in existing_config['supported_emotions']:
                    profile['supported_emotions'] = existing_config['supported_emotions']['core']
                else:
                    profile['supported_emotions'] = existing_config['supported_emotions']
                profile['modified_date'] = datetime.now().isoformat()
                break
        
        # Save updated manifest
        profile_manager._save_manifest(profile_manager.manifest)
        
        return {
            "message": f"Profile '{profile_name}' updated successfully",
            "profile_name": profile_name
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/settings")
async def get_settings():
    """Get the main application settings"""
    config_path = project_root / "config" / "settings.json"
    try:
        with open(config_path, 'r') as f:
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
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Update with provided settings data
        # Only update fields that exist in the current config to avoid overwriting important settings
        for key, value in settings_data.items():
            if key in config:
                config[key] = value
            # Also check nested objects
            elif '.' in key:
                # Handle nested keys like 'profiles.default_profile'
                keys = key.split('.')
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
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        return {"message": "Settings updated successfully"}
    except Exception as e:
        return {"error": str(e)}

# Regular WebSocket endpoint still needed for direct connections
@app.websocket("/ws/processing-status")
async def websocket_processing_status(websocket: WebSocket):
    """WebSocket endpoint for real-time processing status updates"""
    try:
        await websocket.accept()
        active_websocket_connections.add(websocket)
        
        # Send current processing status initially
        status_update = {
            "active_jobs": len([job for job in processing_jobs.values() if job['status'] in ['processing', 'queued']]),
            "jobs": processing_jobs
        }
        await websocket.send_text(json.dumps(status_update))
        
        # Keep the connection alive by listening for any messages (though we don't expect any)
        while True:
            # Wait for messages - we expect this to raise an exception when connection closes
            data = await websocket.receive_text()
            # If we somehow receive data (which shouldn't happen in this use case), just continue
            print(f"Unexpected message received: {data}")
            
    except Exception as e:
        # Don't log this as an error - disconnections are normal
        print(f"WebSocket disconnected: {type(e).__name__}: {e}")
    finally:
        # Remove the connection from the active set
        if websocket in active_websocket_connections:
            active_websocket_connections.discard(websocket)
        # Note: We don't explicitly close the websocket here as FastAPI/Starlette handles it automatically

@app.post("/api/process")
async def start_processing(job_data: Dict[str, Any]):
    """Start a new processing job"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Validate input data
    audio_path = job_data.get('audio_path')
    if not audio_path:
        return {"error": "audio_path is required"}
    
    profile_name = job_data.get('profile', config['profiles']['default_profile'])
    output_path = job_data.get('output_path', f"output/{Path(audio_path).stem if audio_path else 'processed'}_processed.mp4")
    cinematic_mode = job_data.get('cinematic_mode', 'balanced')
    
    if not validate_audio_file(audio_path):
        return {"error": f"Invalid audio file: {audio_path}"}
    
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
        "error": None
    }
    
    # Start processing in background
    asyncio.create_task(process_job_async(job_id, audio_path, profile_name, output_path, cinematic_mode))
    
    return {
        "job_id": job_id,
        "message": "Processing job started",
        "status": "queued"
    }

async def process_job_async(job_id: str, audio_path: str, profile_name: str, output_path: str, cinematic_mode: str):
    """Process a job asynchronously"""
    config_path = project_root / "config" / "settings.json"
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    try:
        # Update job status to processing
        processing_jobs[job_id]['status'] = 'processing'
        processing_jobs[job_id]['progress'] = 10  # Initial progress
        await emit_processing_update()
        
        # Initialize orchestrator
        orchestrator = ContentOrchestrator(config)
        
        # Validate profile
        is_valid, validation_msg = orchestrator.validate_profile(profile_name)
        if not is_valid:
            processing_jobs[job_id]['status'] = 'error'
            processing_jobs[job_id]['error'] = validation_msg
            await emit_processing_update()
            return
        
        # Update progress
        processing_jobs[job_id]['progress'] = 30
        await emit_processing_update()
        
        # Generate content
        result = orchestrator.generate_content(
            audio_path=audio_path,
            profile_name=profile_name,
            output_path=output_path,
            cinematic_mode=cinematic_mode
        )
        
        # Update progress
        processing_jobs[job_id]['progress'] = 90
        await emit_processing_update()
        
        # Mark as completed
        processing_jobs[job_id]['status'] = 'completed'
        processing_jobs[job_id]['progress'] = 100
        processing_jobs[job_id]['result'] = result.__dict__ if hasattr(result, '__dict__') else str(result)
        processing_jobs[job_id]['end_time'] = datetime.now().isoformat()
        await emit_processing_update()
        
    except Exception as e:
        processing_jobs[job_id]['status'] = 'error'
        processing_jobs[job_id]['error'] = str(e)
        processing_jobs[job_id]['progress'] = 0
        await emit_processing_update()

@app.get("/api/jobs")
async def get_jobs():
    """Get all processing jobs"""
    return {"jobs": processing_jobs}

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    """Get specific job information"""
    if job_id not in processing_jobs:
        return {"error": "Job not found"}
    
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

@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    print("LipSyncAutomation Web API starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("LipSyncAutomation Web API shutting down...")

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8001))  # Default to 8001 to match the script
    uvicorn.run(app, host="0.0.0.0", port=port)