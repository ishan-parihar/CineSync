#!/usr/bin/env python3
"""Simple WebSocket test client"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8002/ws/processing-status"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            
            # Listen for messages
            async for message in websocket:
                data = json.loads(message)
                print(f"Received: {data}")
                
                # Stop after a few messages
                if data.get('type') == 'connected':
                    print("WebSocket connection successful!")
                    break
                    
    except Exception as e:
        print(f"WebSocket connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())