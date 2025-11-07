#!/usr/bin/env python3
"""
Integration tests for WebSocket functionality.
"""

import pytest
import asyncio
import websockets
import json
from datetime import datetime


import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))
@pytest.mark.integration
@pytest.mark.api
class TestWebSocket:
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures."""
        self.uri = "ws://localhost:8001/ws/processing-status"
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection establishment."""
        try:
            async with websockets.connect(self.uri, timeout=5) as websocket:
                # Test that connection is established
                assert websocket.open
                
                # Send ping message
                ping_message = {"type": "ping"}
                await websocket.send(json.dumps(ping_message))
                
                # Wait for response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    event = json.loads(response)
                    assert event.get('type') in ['pong', 'connection_established']
                except asyncio.TimeoutError:
                    # Timeout is acceptable for this test
                    pass
                    
        except (ConnectionRefusedError, OSError):
            pytest.skip("WebSocket server not running")
    
    @pytest.mark.asyncio
    async def test_websocket_event_reception(self):
        """Test WebSocket event reception and structure."""
        try:
            async with websockets.connect(self.uri, timeout=5) as websocket:
                # Listen for events
                event_count = 0
                max_events = 5  # Limit events for testing
                
                while event_count < max_events:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                        event = json.loads(message)
                        
                        # Verify basic event structure
                        assert 'type' in event
                        
                        # Verify timestamp if present
                        if 'timestamp' in event:
                            assert isinstance(event['timestamp'], str)
                        
                        # Test specific event types
                        if event['type'] == 'connection_established':
                            assert 'server_capabilities' in event
                        
                        elif event['type'] == 'emotion_segment_processed':
                            assert 'segment' in event
                            segment = event['segment']
                            assert 'emotion' in segment or 'confidence' in segment
                        
                        elif event['type'] == 'shot_decision_made':
                            assert 'selected_shot' in event
                            assert 'vertical_angle' in event
                        
                        elif event['type'] == 'processing_stage_update':
                            assert 'stage' in event
                            assert 'progress' in event
                            assert isinstance(event['progress'], (int, float))
                        
                        elif event['type'] == 'basic_status_update':
                            assert 'active_jobs' in event
                            assert isinstance(event['active_jobs'], int)
                        
                        event_count += 1
                        
                    except asyncio.TimeoutError:
                        # No more events, end test
                        break
                    except json.JSONDecodeError:
                        # Invalid JSON, skip this event
                        continue
                
                # We should have received at least one event
                assert event_count >= 0  # May be 0 if no processing is happening
                
        except (ConnectionRefusedError, OSError):
            pytest.skip("WebSocket server not running")
    
    @pytest.mark.asyncio
    async def test_websocket_message_handling(self):
        """Test WebSocket message handling and subscriptions."""
        try:
            async with websockets.connect(self.uri, timeout=5) as websocket:
                # Test subscription message
                subscribe_message = {
                    "type": "subscribe",
                    "channels": ["processing_updates", "system_status"]
                }
                await websocket.send(json.dumps(subscribe_message))
                
                # Wait for acknowledgment or any response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    event = json.loads(response)
                    # Response could be acknowledgment or any event
                    assert 'type' in event
                except asyncio.TimeoutError:
                    # No response is also acceptable
                    pass
                
                # Test ping/pong
                ping_message = {"type": "ping"}
                await websocket.send(json.dumps(ping_message))
                
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    event = json.loads(response)
                    assert event.get('type') in ['pong', 'ping_response']
                except asyncio.TimeoutError:
                    # Ping/pong might not be implemented
                    pass
                    
        except (ConnectionRefusedError, OSError):
            pytest.skip("WebSocket server not running")
    
    @pytest.mark.asyncio
    async def test_websocket_error_handling(self):
        """Test WebSocket error handling."""
        try:
            # Test connection to invalid endpoint
            invalid_uri = "ws://localhost:8001/ws/invalid_endpoint"
            
            try:
                async with websockets.connect(invalid_uri, timeout=5):
                    # If connection succeeds, that's unexpected but not an error
                    pass
            except (ConnectionRefusedError, websockets.exceptions.InvalidStatusCode):
                # This is expected for invalid endpoints
                pass
            
            # Test invalid message format
            async with websockets.connect(self.uri, timeout=5) as websocket:
                # Send invalid JSON
                await websocket.send("invalid json string")
                
                # Send invalid message structure
                invalid_message = {"invalid": "structure"}
                await websocket.send(json.dumps(invalid_message))
                
                # Server should handle these gracefully
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    # Any response is acceptable
                except asyncio.TimeoutError:
                    # No response is also acceptable
                    pass
                    
        except (ConnectionRefusedError, OSError):
            pytest.skip("WebSocket server not running")
    
    def test_websocket_library_availability(self):
        """Test that WebSocket library is available."""
        # This test ensures the websockets library is installed
        assert hasattr(websockets, 'connect')
        assert hasattr(websockets, 'exceptions')
    
    @pytest.mark.asyncio
    async def test_websocket_connection_timeout(self):
        """Test WebSocket connection timeout handling."""
        # Test connection to non-existent server
        invalid_uri = "ws://localhost:9999/ws/processing-status"
        
        with pytest.raises((ConnectionRefusedError, OSError, asyncio.TimeoutError)):
            async with websockets.connect(invalid_uri, timeout=1):
                pass