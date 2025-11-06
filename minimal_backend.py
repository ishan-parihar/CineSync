#!/usr/bin/env python3
"""Minimal FastAPI test"""
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Backend is running"}

@app.get("/api/system-info")
async def system_info():
    return {
        "dependencies": {
            "ffmpeg": {"available": True, "version": "test"},
            "rhubarb": {"available": True, "version": "mock"}
        }
    }

@app.websocket("/ws/processing-status")
async def websocket_endpoint(websocket):
    await websocket.accept()
    await websocket.send_json({
        "type": "connected",
        "timestamp": "2024-01-01T00:00:00Z",
        "message": "WebSocket connection established"
    })
    await websocket.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)