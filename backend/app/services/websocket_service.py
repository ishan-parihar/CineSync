"""
WebSocket service for real-time event streaming
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Set

from .base import BaseService


class WebSocketService(BaseService):
    """Service for managing WebSocket connections and real-time events"""
    
    def _validate_config(self) -> None:
        """Validate WebSocket service configuration"""
        # WebSocket service doesn't require specific config validation
        pass
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.active_connections: Set[Any] = set()
        self.processing_jobs: Dict[str, Dict[str, Any]] = {}
    
    async def connect(self, websocket: Any) -> None:
        """Accept a new WebSocket connection"""
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: Any) -> None:
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
    
    async def broadcast_processing_update(self) -> None:
        """Emit basic processing update to all connected WebSocket clients"""
        status_update = {
            "type": "basic_status_update",
            "timestamp": datetime.now().isoformat(),
            "active_jobs": len([
                job for job in self.processing_jobs.values()
                if job["status"] in ["processing", "queued"]
            ]),
            "jobs": self.processing_jobs,
        }
        
        await self.broadcast_event(status_update)
    
    async def emit_emotion_segment_event(
        self, job_id: str, segment: Dict[str, Any], segment_index: int
    ) -> None:
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
        
        await self.broadcast_event(event)
    
    async def emit_shot_decision_event(
        self, job_id: str, emotion: str, shot_decision: Dict[str, Any]
    ) -> None:
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
        
        await self.broadcast_event(event)
    
    async def emit_processing_stage_event(
        self, 
        job_id: str, 
        stage: str, 
        progress: float, 
        estimated_completion: str = None
    ) -> None:
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
        
        await self.broadcast_event(event)
    
    async def emit_tension_analysis_event(self, job_id: str, tension_data: Dict[str, Any]) -> None:
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
        
        await self.broadcast_event(event)
    
    async def broadcast_event(self, event: Dict[str, Any]) -> None:
        """Broadcast event to all connected WebSocket clients with error handling"""
        if not self.active_connections:
            return
        
        event_json = json.dumps(event)
        disconnected_clients = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(event_json)
            except Exception as e:
                self.logger.error(f"Error sending WebSocket event: {e}")
                disconnected_clients.append(connection)
        
        # Remove disconnected clients
        for client in disconnected_clients:
            self.active_connections.discard(client)
    
    def add_processing_job(self, job_id: str, job_data: Dict[str, Any]) -> None:
        """Add a new processing job to track"""
        self.processing_jobs[job_id] = job_data
    
    def update_processing_job(self, job_id: str, updates: Dict[str, Any]) -> None:
        """Update processing job status"""
        if job_id in self.processing_jobs:
            self.processing_jobs[job_id].update(updates)
    
    def remove_processing_job(self, job_id: str) -> None:
        """Remove a processing job from tracking"""
        if job_id in self.processing_jobs:
            del self.processing_jobs[job_id]
    
    def get_processing_job(self, job_id: str) -> Dict[str, Any]:
        """Get processing job data"""
        return self.processing_jobs.get(job_id)
    
    def get_all_processing_jobs(self) -> Dict[str, Dict[str, Any]]:
        """Get all processing jobs"""
        return self.processing_jobs.copy()
    
    def get_active_jobs_count(self) -> int:
        """Get count of active processing jobs"""
        return len([
            job for job in self.processing_jobs.values()
            if job["status"] in ["processing", "queued"]
        ])
    
    def get_connection_count(self) -> int:
        """Get count of active WebSocket connections"""
        return len(self.active_connections)