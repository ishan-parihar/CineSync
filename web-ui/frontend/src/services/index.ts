/**
 * Services Module Index
 * Exports all WebSocket management services
 * @version 1.0.0
 */

// Core WebSocket management
export { WebSocketManager, createWebSocketManager, ConnectionState, ManagerEvent } from './WebSocketManager';
export type { WebSocketManagerConfig, ManagerEventData } from './WebSocketManager';

// Event buffering
export { EventBuffer, createEventBuffer, EventPriority } from './EventBuffer';
export type { BufferedEvent, BufferConfig, BufferStats } from './EventBuffer';

// Connection health monitoring
export { ConnectionHealth, createConnectionHealth, HealthStatus, ConnectionQuality } from './ConnectionHealth';
export type { HealthConfig, HealthCheckResult, HealthStats, ConnectionDiagnostics } from './ConnectionHealth';

// Utility functions
export { validateConfig } from './WebSocketManager';
export { validateBufferConfig } from './EventBuffer';
export { validateHealthConfig } from './ConnectionHealth';