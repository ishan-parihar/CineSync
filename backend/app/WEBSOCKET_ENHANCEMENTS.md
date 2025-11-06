# WebSocket Real-Time Event Streaming - Phase 1.5 Implementation

## Overview

This implementation enhances the existing WebSocket system in the LipSyncAutomation backend to provide detailed real-time processing updates instead of just basic job status. The enhancements follow the specifications outlined in Phase 1.5 of the enhancement plan.

## Enhanced Event Types

### 1. Emotion Segment Events
```json
{
  "type": "emotion_segment_processed",
  "timestamp": "2025-01-15T10:30:00Z",
  "job_id": "job_20250115_103000_123456",
  "segment_index": 0,
  "segment": {
    "start_time": 2.5,
    "end_time": 4.2,
    "emotion": "joy",
    "confidence": 0.87,
    "valence": 0.8,
    "arousal": 0.6
  }
}
```

**Trigger**: Emitted for each emotion segment during the emotion analysis stage.

**Integration**: Integrated with the `EmotionAnalyzer.analyze_audio()` method in the `ContentOrchestrator`.

### 2. Cinematographic Decision Events
```json
{
  "type": "shot_decision_made",
  "timestamp": "2025-01-15T10:30:05Z",
  "job_id": "job_20250115_103000_123456",
  "emotion": "joy",
  "selected_shot": "CU",
  "vertical_angle": "eye_level",
  "confidence": 0.92,
  "reasoning": "High intensity joy suggests close-up engagement",
  "shot_purpose": "emotional",
  "duration_modifier": 1.2
}
```

**Trigger**: Emitted for each cinematographic decision made by the `DecisionEngine`.

**Integration**: Connected to the `DecisionEngine.generate_shot_sequence()` method with enhanced reasoning.

### 3. Processing Stage Events
```json
{
  "type": "processing_stage_update",
  "timestamp": "2025-01-15T10:30:00Z",
  "job_id": "job_20250115_103000_123456",
  "stage": "emotion_analysis",
  "progress": 0.65,
  "estimated_completion": "2025-01-15T10:35:00Z"
}
```

**Trigger**: Emitted at each major processing stage transition.

**Stages**:
- `initialization` (5%)
- `profile_validation` (10%)
- `audio_processing` (15%)
- `emotion_analysis` (25-60%)
- `cinematography_decisions` (60%)
- `cinematography_enhancement` (75%)
- `video_composition` (85%)
- `finalization` (95%)
- `processing_completed` (100%)

### 4. Tension Analysis Events
```json
{
  "type": "tension_analyzed",
  "timestamp": "2025-01-15T10:30:10Z",
  "job_id": "job_20250115_103000_123456",
  "tension_level": "medium",
  "tension_score": 0.65,
  "narrative_phase": "development",
  "dramatic_moments": [
    {
      "segment_index": 3,
      "tension_level": 0.82,
      "tension_type": "high"
    }
  ]
}
```

**Trigger**: Emitted after tension analysis is completed using the `TensionEngine`.

### 5. Processing Completion Events
```json
{
  "type": "processing_completed",
  "timestamp": "2025-01-15T10:35:00Z",
  "job_id": "job_20250115_103000_123456",
  "video_path": "output/generated_audio_character1.mp4",
  "total_processing_time": 300.5,
  "summary": {
    "total_emotion_segments": 12,
    "total_shot_decisions": 12,
    "dominant_emotion": "joy",
    "shot_variety": 4
  }
}
```

**Trigger**: Emitted when processing completes successfully.

### 6. Error Events
```json
{
  "type": "processing_error",
  "timestamp": "2025-01-15T10:32:00Z",
  "job_id": "job_20250115_103000_123456",
  "error_stage": "emotion_analysis",
  "error_message": "Failed to analyze audio: Invalid audio format",
  "progress": 25
}
```

**Trigger**: Emitted whenever an error occurs during processing.

### 7. Batch Processing Events

#### Batch Started
```json
{
  "type": "batch_processing_started",
  "timestamp": "2025-01-15T10:30:00Z",
  "batch_id": "batch_20250115_103000_123456",
  "total_jobs": 5,
  "priority": "medium"
}
```

#### Batch Progress
```json
{
  "type": "batch_progress_update",
  "timestamp": "2025-01-15T10:32:00Z",
  "batch_id": "batch_20250115_103000_123456",
  "current_job": "job_20250115_103200_234567",
  "completed": 2,
  "processing": 1,
  "failed": 0,
  "total": 5,
  "percentage": 40.0
}
```

#### Batch Completed
```json
{
  "type": "batch_processing_completed",
  "timestamp": "2025-01-15T10:35:00Z",
  "batch_id": "batch_20250115_103000_123456",
  "summary": {
    "total_jobs": 5,
    "completed": 5,
    "failed": 0,
    "success_rate": 100.0
  }
}
```

### 8. Connection Management Events

#### Connection Established
```json
{
  "type": "connection_established",
  "timestamp": "2025-01-15T10:30:00Z",
  "connection_id": "conn_20250115_103000_123456",
  "server_capabilities": {
    "emotion_segment_events": true,
    "shot_decision_events": true,
    "processing_stage_events": true,
    "tension_analysis_events": true,
    "batch_processing_events": true
  }
}
```

#### Connection Closed
```json
{
  "type": "connection_closed",
  "timestamp": "2025-01-15T10:35:00Z",
  "connection_id": "conn_20250115_103000_123456",
  "active_connections": 3
}
```

## Enhanced WebSocket Endpoint

### URL: `/ws/processing-status`

The WebSocket endpoint has been enhanced to support:

1. **Automatic Event Broadcasting**: All events are automatically broadcast to all connected clients
2. **Connection Management**: Graceful handling of disconnections and connection errors
3. **Client Message Handling**: Support for ping/pong, subscriptions, and job detail requests
4. **Error Isolation**: Single client failures don't affect other connected clients

### Client Message Types

#### Ping/Pong
```json
// Client sends
{"type": "ping"}

// Server responds
{
  "type": "pong",
  "timestamp": "2025-01-15T10:30:00Z",
  "connection_id": "conn_20250115_103000_123456"
}
```

#### Job Subscription
```json
// Client sends
{"type": "subscribe", "job_id": "job_20250115_103000_123456"}

// Server responds
{
  "type": "subscription_confirmed",
  "timestamp": "2025-01-15T10:30:00Z",
  "connection_id": "conn_20250115_103000_123456",
  "subscribed_job": "job_20250115_103000_123456"
}
```

#### Job Details Request
```json
// Client sends
{"type": "get_job_details", "job_id": "job_20250115_103000_123456"}

// Server responds
{
  "type": "job_details_response",
  "timestamp": "2025-01-15T10:30:00Z",
  "connection_id": "conn_20250115_103000_123456",
  "job": { /* full job object */ }
}
```

## Integration Points

### ContentOrchestrator Integration

The enhanced WebSocket system is deeply integrated with the `ContentOrchestrator.process_content()` method:

1. **Emotion Analysis**: Events are emitted as each emotion segment is processed
2. **Cinematographic Decisions**: Events are emitted for each shot decision
3. **Processing Stages**: Progress events are emitted at each major stage
4. **Error Handling**: Errors are caught and emitted as events

### Backend API Integration

The WebSocket system works alongside the existing REST API endpoints:

- `/api/process` - Starts processing and triggers WebSocket events
- `/api/batch/process` - Starts batch processing with batch-specific events
- `/api/jobs/{id}` - Provides job details that can be requested via WebSocket

## Implementation Details

### New Functions Added

1. **`emit_emotion_segment_event()`** - Emits emotion segment processed events
2. **`emit_shot_decision_event()`** - Emits cinematographic decision events
3. **`emit_processing_stage_event()`** - Emits processing stage updates
4. **`emit_tension_analysis_event()`** - Emits tension analysis results
5. **`broadcast_websocket_event()`** - Centralized event broadcasting with error handling
6. **`handle_websocket_client_message()`** - Handles incoming client messages

### Enhanced Functions

1. **`process_job_async()`** - Now emits detailed events during processing
2. **`process_batch_async()`** - Enhanced with batch-specific event streaming
3. **`websocket_processing_status()`** - Upgraded with client message handling

### Error Handling

- **Graceful Degradation**: WebSocket failures don't affect processing
- **Connection Cleanup**: Disconnected clients are automatically removed
- **Error Isolation**: Client errors don't impact other connections
- **Fallback Mechanisms**: Processing continues even if WebSocket broadcasting fails

## Testing

### Test Script

A comprehensive test script is provided at `test_websocket_enhancements.py` that:

1. **Tests Connection**: Verifies WebSocket connection establishment
2. **Validates Events**: Checks that events have the correct structure
3. **Demonstrates Usage**: Shows how to handle different event types
4. **Error Handling**: Tests connection failure scenarios

### Running Tests

```bash
# Start the backend server
cd web-ui/backend
python main.py

# In another terminal, run the test
python test_websocket_enhancements.py
```

## Frontend Integration Guide

### Connecting to WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8001/ws/processing-status');

ws.onopen = (event) => {
    console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketEvent(data);
};
```

### Handling Events

```javascript
function handleWebSocketEvent(event) {
    switch (event.type) {
        case 'emotion_segment_processed':
            updateEmotionTimeline(event.segment);
            break;
        case 'shot_decision_made':
            updateShotPreview(event);
            break;
        case 'processing_stage_update':
            updateProgressBar(event.progress, event.stage);
            break;
        case 'processing_completed':
            showCompletionNotification(event);
            break;
        case 'processing_error':
            showErrorNotification(event);
            break;
    }
}
```

### Requesting Job Details

```javascript
// Request specific job details
ws.send(JSON.stringify({
    type: 'get_job_details',
    job_id: 'job_20250115_103000_123456'
}));
```

## Performance Considerations

### Optimization Features

1. **Event Batching**: Multiple events are batched when possible
2. **Connection Pooling**: Active connections are efficiently managed
3. **Error Recovery**: Automatic reconnection for clients
4. **Memory Management**: Disconnected clients are immediately cleaned up

### Scalability

- **Horizontal Scaling**: Multiple backend instances can share WebSocket connections
- **Load Balancing**: WebSocket connections can be load-balanced
- **Resource Limits**: Connection limits prevent resource exhaustion

## Security Considerations

### Implementation

1. **Connection Validation**: WebSocket connections are validated
2. **Message Sanitization**: Incoming messages are sanitized
3. **Error Information**: Sensitive information is not exposed in error messages
4. **Access Control**: WebSocket access can be controlled via CORS and authentication

### Best Practices

- Validate all incoming client messages
- Rate limit WebSocket connections
- Monitor for unusual connection patterns
- Implement authentication for production environments

## Future Enhancements

### Phase 2 Planning

1. **Event Filtering**: Allow clients to subscribe to specific event types
2. **Event Replay**: Store and replay historical events for new connections
3. **Advanced Authentication**: Implement JWT-based WebSocket authentication
4. **Metrics and Analytics**: Add WebSocket performance monitoring

### Extensibility

The event system is designed to be easily extensible:

1. **New Event Types**: Can be added by defining new emit functions
2. **Custom Payloads**: Events can carry custom data
3. **Client-Side Features**: New client message types can be added
4. **Third-Party Integration**: Events can be forwarded to external systems

## Conclusion

The WebSocket real-time event streaming implementation provides comprehensive visibility into the LipSyncAutomation processing pipeline. The enhanced system enables:

- **Real-time Monitoring**: Live updates during processing
- **Granular Details**: Detailed emotion and cinematographic information
- **Better UX**: Responsive and informative frontend interfaces
- **Debugging Support**: Detailed error reporting and progress tracking
- **Batch Processing**: Enhanced batch job monitoring capabilities

This implementation successfully fulfills the requirements outlined in Phase 1.5 of the enhancement plan and provides a solid foundation for the Phase 2 frontend visualization components.