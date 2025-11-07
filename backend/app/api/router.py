"""
Router for aggregating all API endpoints in the LipSyncAutomation application
"""

from fastapi import APIRouter, FastAPI, File, UploadFile, WebSocket
from pathlib import Path

# Import API modules (we'll fix imports when we create the complete structure)
# from .monitoring.endpoints import MonitoringAPI
# from .profiles.endpoints import ProfileAPI
# from .cinematography.endpoints import CinematographyAPI
# from .emotions.endpoints import EmotionAPI
# from .processing.endpoints import ProcessingAPI
# from .batch.endpoints import BatchAPI
# from .settings.endpoints import SettingsAPI
# from .websocket.endpoints import WebSocketAPI


class APIRouter:
    """Main router class for aggregating all API endpoints"""
    
    def __init__(self, app: FastAPI, services: dict):
        self.app = app
        self.services = services
        self._register_routes()
    
    def _register_routes(self):
        """Register all API routes with the FastAPI application"""
        
        # Basic application routes
        @self.app.get("/")
        async def read_root():
            return {"message": "LipSyncAutomation Web API", "status": "running"}
        
        @self.app.get("/api/health")
        async def health_check():
            return {"status": "healthy", "timestamp": "2024-01-01T00:00:00"}
        
        # Monitoring routes
        @self.app.get("/api/system-info")
        async def get_system_info():
            return self.services["system_monitoring"].get_system_info()
        
        @self.app.get("/api/system/performance")
        async def get_system_performance():
            return self.services["system_monitoring"].get_system_performance()
        
        # Profile routes
        @self.app.get("/api/profiles")
        async def list_profiles():
            return self.services["profile"].list_profiles()
        
        @self.app.post("/api/profiles")
        async def create_profile(profile_data: dict):
            return self.services["profile"].create_profile(profile_data)
        
        @self.app.get("/api/profiles/{profile_name}")
        async def get_profile(profile_name: str):
            return self.services["profile"].get_profile(profile_name)
        
        @self.app.get("/api/profiles/{profile_name}/angles")
        async def get_profile_angles(profile_name: str):
            return self.services["profile"].get_profile_angles(profile_name)
        
        @self.app.get("/api/profiles/{profile_name}/angles/{angle_name}/emotions")
        async def get_profile_angle_emotions(profile_name: str, angle_name: str):
            return self.services["profile"].get_profile_angle_emotions(profile_name, angle_name)
        
        @self.app.get("/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes")
        async def get_visemes(profile_name: str, angle_name: str, emotion_name: str):
            return self.services["profile"].get_visemes(profile_name, angle_name, emotion_name)
        
        @self.app.post("/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}")
        async def upload_viseme(
            profile_name: str,
            angle_name: str,
            emotion_name: str,
            viseme_name: str,
            file: UploadFile = File(...),
        ):
            content = await file.read()
            return self.services["profile"].upload_viseme(
                profile_name, angle_name, emotion_name, viseme_name, 
                content, file.content_type
            )
        
        @self.app.delete("/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}")
        async def delete_viseme(profile_name: str, angle_name: str, emotion_name: str, viseme_name: str):
            return self.services["profile"].delete_viseme(profile_name, angle_name, emotion_name, viseme_name)
        
        @self.app.get("/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}/visemes/{viseme_name}/image")
        async def get_viseme_image(profile_name: str, angle_name: str, emotion_name: str, viseme_name: str):
            from fastapi.responses import FileResponse
            viseme_path = self.services["profile"].get_viseme_image(profile_name, angle_name, emotion_name, viseme_name)
            return FileResponse(viseme_path, media_type="image/png")
        
        @self.app.get("/api/profiles/{profile_name}/structure")
        async def get_profile_structure(profile_name: str):
            return self.services["profile"].get_profile_structure(profile_name)
        
        @self.app.post("/api/profiles/{profile_name}/repair")
        async def repair_profile_structure(profile_name: str, repair_data: dict):
            return self.services["profile"].repair_profile_structure(profile_name, repair_data)
        
        @self.app.post("/api/profiles/{profile_name}/angles/{angle_name}")
        async def create_angle(profile_name: str, angle_name: str, angle_data: dict = {}):
            return self.services["profile"].create_angle(profile_name, angle_name, angle_data)
        
        @self.app.post("/api/profiles/{profile_name}/angles/{angle_name}/emotions/{emotion_name}")
        async def create_emotion(profile_name: str, angle_name: str, emotion_name: str, emotion_data: dict = {}):
            return self.services["profile"].create_emotion(profile_name, angle_name, emotion_name, emotion_data)
        
        @self.app.post("/api/profiles/{profile_name}/copy-emotion")
        async def copy_emotion(profile_name: str, copy_data: dict):
            return self.services["profile"].copy_emotion(profile_name, copy_data)
        
        @self.app.put("/api/profiles/{profile_name}")
        async def update_profile(profile_name: str, profile_data: dict):
            return self.services["profile"].update_profile(profile_name, profile_data)
        
        # Settings routes
        @self.app.get("/api/settings")
        async def get_settings():
            return self.services["settings"].get_settings()
        
        @self.app.put("/api/settings")
        async def update_settings(settings_data: dict):
            return self.services["settings"].update_settings(settings_data)
        
        # Cinematography routes
        @self.app.get("/api/cinematography/config")
        async def get_cinematography_config():
            return self.services["cinematography"].get_cinematography_config()
        
        @self.app.put("/api/cinematography/config")
        async def update_cinematography_config(config_data: dict):
            return self.services["cinematography"].update_cinematography_config(config_data)
        
        @self.app.get("/api/cinematography/rules")
        async def get_cinematography_rules():
            return self.services["cinematography"].get_cinematography_rules()
        
        @self.app.post("/api/cinematography/overrides")
        async def create_cinematography_override(override_data: dict):
            return self.services["cinematography"].create_cinematography_override(override_data)
        
        @self.app.get("/api/cinematography/overrides")
        async def get_cinematography_overrides():
            return self.services["cinematography"].get_cinematography_overrides()
        
        @self.app.delete("/api/cinematography/overrides/{override_id}")
        async def delete_cinematography_override(override_id: str):
            return self.services["cinematography"].delete_cinematography_override(override_id)
        
        # Emotion analysis routes
        @self.app.get("/api/emotions/analyze/{audio_id}")
        async def analyze_emotion_audio(audio_id: str):
            return self.services["emotion"].analyze_emotion_audio(audio_id)
        
        @self.app.get("/api/emotions/segments/{job_id}")
        async def get_emotion_segments(job_id: str):
            return self.services["emotion"].get_emotion_segments(job_id, self.services["websocket"].get_all_processing_jobs())
        
        @self.app.post("/api/emotions/manual-adjustment")
        async def manual_emotion_adjustment(adjustment_data: dict):
            return self.services["emotion"].manual_emotion_adjustment(adjustment_data, self.services["websocket"].get_all_processing_jobs())
        
        # Processing routes
        @self.app.get("/api/jobs/{job_id}/shot-sequence")
        async def get_job_shot_sequence(job_id: str):
            return self.services["processing"].get_job_shot_sequence(job_id, self.services["websocket"].get_all_processing_jobs())
        
        @self.app.get("/api/jobs/{job_id}/emotion-analysis")
        async def get_job_emotion_analysis(job_id: str):
            return self.services["processing"].get_job_emotion_analysis(job_id, self.services["websocket"].get_all_processing_jobs())
        
        @self.app.post("/api/batch/process")
        async def start_batch_processing(batch_data: dict):
            return self.services["processing"].start_batch_processing(batch_data)
        
        # WebSocket route
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await websocket.accept()
            await self.services["websocket"].connect(websocket)
            
            try:
                while True:
                    # Keep connection alive and handle incoming messages
                    data = await websocket.receive_text()
                    # Handle any WebSocket messages here if needed
                    await self.services["websocket"].broadcast_processing_update()
            except Exception as e:
                print(f"WebSocket error: {e}")
            finally:
                self.services["websocket"].disconnect(websocket)