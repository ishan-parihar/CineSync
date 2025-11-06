# Enhanced WebSocket Management System

A comprehensive, production-ready WebSocket management system for the LipSyncAutomation frontend that provides robust real-time connectivity with advanced features.

## Features

### 🔄 Connection Management
- **Exponential backoff reconnection** with configurable jitter
- **Multiple reconnection strategies**: exponential, linear, fixed, adaptive
- **Automatic failover** to backup URLs
- **Connection pooling** support for multiple tabs
- **Graceful degradation** to polling when needed

### 📦 Event Buffering
- **Priority-based event buffering** during disconnections
- **Event replay** on reconnection
- **Memory-efficient storage** with configurable limits
- **Automatic cleanup** of expired events
- **Buffer overflow protection**

### 💚 Health Monitoring
- **Real-time connection health** monitoring with ping/pong
- **Latency tracking** and jitter detection
- **Connection quality assessment**
- **Network status integration**
- **Performance metrics** collection

### 🔧 Advanced Features
- **Cross-tab synchronization** via BroadcastChannel
- **Event prioritization** (critical, high, medium, low, background)
- **Comprehensive error handling** and recovery
- **Connection diagnostics** and troubleshooting
- **TypeScript strict** typing throughout

## Quick Start

### 1. Wrap your app with the WebSocketProvider

```tsx
import { WebSocketProvider } from '../contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider
      options={{
        url: 'ws://localhost:8000/ws/processing-status',
        enableBuffering: true,
        enableHealthMonitoring: true,
        maxReconnectionAttempts: 10
      }}
    >
      <YourApp />
    </WebSocketProvider>
  );
}
```

### 2. Use WebSocket hooks in your components

```tsx
import { useWebSocketStatus, useWebSocketMessaging } from '../contexts/WebSocketContext';

function MyComponent() {
  const { isConnected, connectionState, isHealthy } = useWebSocketStatus();
  const { sendMessage, sendEvent } = useWebSocketMessaging();

  const handleSendData = () => {
    sendEvent('my_event', { data: 'hello' });
  };

  return (
    <div>
      <p>Connection: {connectionState}</p>
      <p>Healthy: {isHealthy ? 'Yes' : 'No'}</p>
      <button onClick={handleSendData} disabled={!isConnected}>
        Send Message
      </button>
    </div>
  );
}
```

### 3. Add WebSocket status component

```tsx
import WebSocketStatus from '../components/WebSocketStatus';

function Dashboard() {
  return (
    <div>
      <WebSocketStatus showDiagnostics={true} showControls={true} />
      {/* Your dashboard content */}
    </div>
  );
}
```

## Configuration Options

### WebSocketManagerConfig

```typescript
interface WebSocketManagerConfig {
  url: string;                                    // WebSocket URL
  reconnectionStrategy: ReconnectionStrategy;     // Reconnection strategy
  maxReconnectionAttempts: number;                // Max retry attempts
  initialReconnectionDelayMs: number;             // Initial delay
  maxReconnectionDelayMs: number;                 // Maximum delay
  reconnectionDelayMultiplier: number;            // Backoff multiplier
  enableReconnectionJitter: boolean;              // Add jitter to delays
  jitterAmount: number;                           // Jitter percentage (0-1)
  connectionTimeoutMs: number;                    // Connection timeout
  enableEventBuffering: boolean;                  // Enable event buffering
  enableHealthMonitoring: boolean;                // Enable health checks
  enableCrossTabSync: boolean;                    // Cross-tab sync
  enableFailover: boolean;                        // Enable backup URLs
  backupUrls: string[];                          // Backup WebSocket URLs
  maxMessageQueueSize: number;                    // Message queue limit
}
```

### Event Buffer Configuration

```typescript
interface BufferConfig {
  maxEventsPerPriority: number;          // Max events per priority
  maxBufferSizeBytes: number;            // Max buffer size
  maxEventAgeMs: number;                 // Max event age
  enableCompression: boolean;            // Enable compression
  cleanupIntervalMs: number;             // Cleanup interval
}
```

### Health Monitoring Configuration

```typescript
interface HealthConfig {
  pingIntervalMs: number;                // Ping interval
  pingTimeoutMs: number;                 // Ping timeout
  maxConsecutiveFailures: number;        // Max failures before unhealthy
  healthCheckWindowSize: number;         // Statistics window size
  minSuccessRate: number;                // Minimum success rate
  maxAverageLatencyMs: number;           // Maximum acceptable latency
  enableJitterDetection: boolean;        // Enable jitter detection
  maxJitterMs: number;                   // Maximum jitter threshold
}
```

## API Reference

### Hooks

#### `useWebSocket(options)`

Main hook for WebSocket functionality.

```typescript
const {
  isConnected,     // Connection status
  isReady,         // Manager ready status
  stats,           // Connection statistics
  connect,         // Connect manually
  disconnect,      // Disconnect manually
  reset,           // Reset connection
  sendMessage,     // Send message
  ping,            // Send ping
  getDiagnostics,  // Get diagnostics
  manager          // Raw manager access
} = useWebSocket({
  autoConnect: true,
  enableBuffering: true,
  enableHealthMonitoring: true,
  maxReconnectionAttempts: 10
});
```

#### `useWebSocketStatus()`

Get connection status information.

```typescript
const {
  isConnected,           // Connected status
  connectionState,       // Current state
  stats,                 // Full stats
  lastError,             // Last error
  isHealthy,             // Health status
  connectionQuality,     // Connection quality
  reconnectionAttempts,  // Reconnection attempts
  messageQueueSize       // Queue size
} = useWebSocketStatus();
```

#### `useWebSocketMessaging()`

Messaging functionality.

```typescript
const {
  sendMessage,           // Send raw message
  sendEvent,             // Send typed event
  ping,                  // Send ping
  subscribeToEvents,     // Subscribe to events
  unsubscribeFromEvents, // Unsubscribe from events
  isConnected            // Connection status
} = useWebSocketMessaging();
```

#### `useWebSocketDiagnostics()`

Connection diagnostics.

```typescript
const {
  diagnostics,           // Diagnostic data
  stats,                 // Connection stats
  loading,               // Loading status
  refreshDiagnostics,    // Refresh diagnostics
  reset                  // Reset connection
} = useWebSocketDiagnostics();
```

### Components

#### `WebSocketStatus`

Display connection status and controls.

```tsx
<WebSocketStatus
  className="custom-class"
  showDiagnostics={false}
  showControls={true}
/>
```

### Classes

#### `WebSocketManager`

Core WebSocket management class.

```typescript
const manager = createWebSocketManager({
  url: 'ws://localhost:8000/ws',
  enableEventBuffering: true,
  enableHealthMonitoring: true
});

// Event listeners
manager.on(ManagerEvent.CONNECTION_STATE_CHANGED, ({ newState }) => {
  console.log('Connection state:', newState);
});

manager.on(ManagerEvent.MESSAGE_RECEIVED, ({ event }) => {
  console.log('Received:', event);
});

// Control
await manager.connect();
manager.sendMessage({ type: 'test', data: {} });
manager.disconnect();
manager.destroy();
```

#### `EventBuffer`

Event buffering system.

```typescript
const buffer = createEventBuffer({
  maxEventsPerPriority: 1000,
  maxBufferSizeBytes: 10 * 1024 * 1024
});

buffer.addEvent(event, EventPriority.HIGH);
const events = buffer.getEventsForReplay(100);
buffer.markEventProcessed(event.id);
const stats = buffer.getStats();
```

#### `ConnectionHealth`

Health monitoring system.

```typescript
const health = createConnectionHealth({
  pingIntervalMs: 30000,
  pingTimeoutMs: 5000,
  maxConsecutiveFailures: 3
});

health.start(websocket);
health.handlePong();
const stats = health.getHealthStats();
const diagnostics = await health.getDiagnostics(websocket);
health.destroy();
```

## Event Types

### Manager Events

- `CONNECTION_STATE_CHANGED` - Connection state changed
- `MESSAGE_RECEIVED` - Message received
- `MESSAGE_SENT` - Message sent
- `ERROR_OCCURRED` - Error occurred
- `RECONNECTING` - Reconnection started
- `RECONNECTED` - Reconnection successful
- `FAILOVER_ACTIVATED` - Failover to backup URL
- `HEALTH_STATUS_CHANGED` - Health status changed
- `BUFFER_OVERFLOW` - Event buffer overflow
- `CROSS_TAB_MESSAGE` - Cross-tab message received

### WebSocket Events

The system handles all standard WebSocket events from your backend:

- `connection_established`
- `emotion_segment_processed`
- `shot_decision_made`
- `processing_stage_update`
- `tension_analysis_complete`
- `processing_complete`
- `error_occurred`
- `job_status_update`
- `batch_job_update`

## Error Handling

The system provides comprehensive error handling:

### Connection Errors
- Automatic reconnection with exponential backoff
- Failover to backup URLs
- Graceful degradation to polling

### Message Errors
- Message queuing during disconnections
- Error event handling
- Retry mechanisms for failed messages

### Health Monitoring
- Continuous health checks
- Automatic recovery attempts
- Performance threshold alerts

## Performance Optimization

### Memory Management
- Event buffer size limits
- Automatic cleanup of old events
- Efficient data structures

### Network Optimization
- Connection pooling
- Message batching
- Compression support

### CPU Optimization
- Efficient event processing
- Debounced health checks
- Optimized reconnection logic

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (except BroadcastChannel in older versions)
- **Mobile browsers**: Full support

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
import type { 
  WebSocketManagerConfig,
  ManagerEvent,
  WebSocketEvent,
  HealthStats,
  BufferStats 
} from '../services';
```

## Best Practices

1. **Always wrap your app** with `WebSocketProvider`
2. **Use appropriate hooks** for different use cases
3. **Monitor connection health** with `useWebSocketStatus`
4. **Handle offline scenarios** gracefully
5. **Configure proper timeouts** for your environment
6. **Use event prioritization** for important messages
7. **Monitor buffer usage** in production
8. **Test reconnection scenarios** thoroughly

## Troubleshooting

### Common Issues

1. **Connection not establishing**
   - Check WebSocket URL
   - Verify server is running
   - Check network connectivity

2. **Frequent reconnections**
   - Increase timeout values
   - Check network stability
   - Monitor server health

3. **High memory usage**
   - Reduce buffer sizes
   - Adjust cleanup intervals
   - Monitor event rates

4. **Missing events**
   - Check event prioritization
   - Verify buffer configuration
   - Check error logs

### Debug Mode

Enable debug logging:

```typescript
const manager = createWebSocketManager({
  url: 'ws://localhost:8000/ws',
  debug: true  // Enable debug logging
});
```

## Examples

See the `examples/` directory for complete examples:

- Basic usage
- Advanced configuration
- Custom event handling
- Error recovery
- Performance monitoring

## Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Write tests for new functionality
4. Update documentation for changes

## License

MIT License - see LICENSE file for details.