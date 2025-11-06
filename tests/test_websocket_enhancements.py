#!/usr/bin/env python3
"""
Test script for WebSocket real-time event streaming enhancements.
This script demonstrates the new event types and verifies the implementation.
"""

import asyncio
import websockets
import json
from datetime import datetime

async def test_websocket_events():
    """Test WebSocket connection and event reception"""
    uri = "ws://localhost:8001/ws/processing-status"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")
            
            # Send a ping message to test connection
            ping_message = {"type": "ping"}
            await websocket.send(json.dumps(ping_message))
            print("📤 Sent ping message")
            
            # Listen for events
            event_count = 0
            max_events = 10  # Limit events for testing
            
            while event_count < max_events:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    event = json.loads(message)
                    
                    print(f"📥 Event {event_count + 1}: {event['type']}")
                    
                    # Verify event structure
                    if 'timestamp' in event:
                        print(f"   Timestamp: {event['timestamp']}")
                    
                    # Handle specific event types
                    if event['type'] == 'connection_established':
                        print("   ✅ Connection established event received")
                        print(f"   Capabilities: {event.get('server_capabilities', {})}")
                    
                    elif event['type'] == 'pong':
                        print("   ✅ Pong response received")
                    
                    elif event['type'] == 'emotion_segment_processed':
                        print(f"   🎭 Emotion: {event.get('segment', {}).get('emotion', 'unknown')}")
                        print(f"   📊 Confidence: {event.get('segment', {}).get('confidence', 0.0)}")
                    
                    elif event['type'] == 'shot_decision_made':
                        print(f"   🎬 Shot: {event.get('selected_shot', 'unknown')}")
                        print(f"   📐 Angle: {event.get('vertical_angle', 'unknown')}")
                    
                    elif event['type'] == 'processing_stage_update':
                        print(f"   ⚡ Stage: {event.get('stage', 'unknown')}")
                        print(f"   📈 Progress: {event.get('progress', 0)}%")
                    
                    elif event['type'] == 'basic_status_update':
                        active_jobs = event.get('active_jobs', 0)
                        print(f"   🔄 Active jobs: {active_jobs}")
                    
                    event_count += 1
                    
                except asyncio.TimeoutError:
                    print("⏰ Timeout waiting for events - ending test")
                    break
                except json.JSONDecodeError as e:
                    print(f"❌ JSON decode error: {e}")
                    break
            
            print(f"✅ Test completed. Received {event_count} events")
            
    except Exception as e:
        if "Connection refused" in str(e):
            print("❌ Connection refused - make sure the server is running on port 8001")
        else:
            print(f"❌ WebSocket test failed: {e}")

def print_test_info():
    """Print information about the WebSocket enhancements"""
    print("=" * 70)
    print("🚀 WebSocket Real-Time Event Streaming Test")
    print("=" * 70)
    print()
    print("This test verifies the Phase 1.5 WebSocket enhancements:")
    print()
    print("📡 New Event Types:")
    print("   • emotion_segment_processed - Real-time emotion analysis results")
    print("   • shot_decision_made - Cinematographic decision updates")
    print("   • processing_stage_update - Processing progress tracking")
    print("   • tension_analyzed - Tension analysis results")
    print("   • processing_completed - Job completion notifications")
    print("   • processing_error - Error event notifications")
    print("   • batch_* events - Batch processing updates")
    print("   • connection_* events - Connection management")
    print()
    print("🔧 Enhanced Features:")
    print("   • Real-time emotion segment streaming")
    print("   • Cinematographic decision broadcasting")
    print("   • Processing stage progress tracking")
    print("   • Enhanced error handling and reporting")
    print("   • Improved connection management")
    print("   • Client message handling (ping/pong, subscriptions)")
    print()
    print("📋 Usage:")
    print("   1. Start the backend server: python main.py")
    print("   2. Run this test script: python test_websocket_enhancements.py")
    print("   3. Start a processing job to see real-time events")
    print()
    print("=" * 70)

if __name__ == "__main__":
    print_test_info()
    
    print("🧪 Starting WebSocket test...")
    print("   (Make sure the backend server is running on localhost:8001)")
    print()
    
    asyncio.run(test_websocket_events())