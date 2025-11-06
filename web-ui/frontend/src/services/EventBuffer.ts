/**
 * Event Buffer Service for WebSocket Connection Management
 * Handles event buffering during disconnections and replay on reconnection
 * Supports event prioritization and memory-efficient storage
 * @version 1.0.0
 */

import type { WebSocketEvent } from '../types';

// ============================================================================
// EVENT BUFFER CONFIGURATION
// ============================================================================

/**
 * Event priority levels
 */
export enum EventPriority {
  CRITICAL = 0,    // Connection events, errors
  HIGH = 1,        // Job status, processing stages
  MEDIUM = 2,      // Emotion segments, shot decisions
  LOW = 3,         // Analytics, diagnostics
  BACKGROUND = 4   // Telemetry, metrics
}

/**
 * Buffer configuration
 */
export interface BufferConfig {
  /** Maximum number of events to buffer per priority */
  maxEventsPerPriority: number;
  /** Maximum total buffer size in bytes */
  maxBufferSizeBytes: number;
  /** Maximum age of buffered events in milliseconds */
  maxEventAgeMs: number;
  /** Whether to compress buffered events */
  enableCompression: boolean;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
}

/**
 * Default buffer configuration
 */
export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxEventsPerPriority: 1000,
  maxBufferSizeBytes: 10 * 1024 * 1024, // 10MB
  maxEventAgeMs: 30 * 60 * 1000, // 30 minutes
  enableCompression: true,
  cleanupIntervalMs: 5 * 60 * 1000 // 5 minutes
};

// ============================================================================
// BUFFERED EVENT INTERFACE
// ============================================================================

/**
 * Buffered event with metadata
 */
export interface BufferedEvent {
  /** The original WebSocket event */
  event: WebSocketEvent;
  /** Event priority */
  priority: EventPriority;
  /** Timestamp when buffered */
  bufferedAt: number;
  /** Estimated size in bytes */
  sizeBytes: number;
  /** Unique identifier */
  id: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Whether event has been processed */
  processed: boolean;
}

// ============================================================================
// EVENT BUFFER STATISTICS
// ============================================================================

/**
 * Buffer statistics for monitoring
 */
export interface BufferStats {
  /** Total number of buffered events */
  totalEvents: number;
  /** Events by priority */
  eventsByPriority: Record<EventPriority, number>;
  /** Current buffer size in bytes */
  currentSizeBytes: number;
  /** Buffer utilization percentage */
  utilizationPercent: number;
  /** Oldest event age in milliseconds */
  oldestEventAgeMs: number;
  /** Number of processed events */
  processedEvents: number;
  /** Number of failed events */
  failedEvents: number;
  /** Compression ratio if compression is enabled */
  compressionRatio?: number;
}

// ============================================================================
// MAIN EVENT BUFFER CLASS
// ============================================================================

export class EventBuffer {
  private config: BufferConfig;
  private buffers: Map<EventPriority, BufferedEvent[]>;
  private stats: BufferStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<BufferConfig> = {}) {
    this.config = { ...DEFAULT_BUFFER_CONFIG, ...config };
    this.buffers = new Map();
    this.stats = this.initializeStats();
    this.initializeBuffers();
    this.startCleanupTimer();
  }

  /**
   * Initialize empty buffers for each priority level
   */
  private initializeBuffers(): void {
    Object.values(EventPriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.buffers.set(priority, []);
      }
    });
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): BufferStats {
    const eventsByPriority: Record<EventPriority, number> = {} as any;
    Object.values(EventPriority).forEach(priority => {
      if (typeof priority === 'number') {
        eventsByPriority[priority] = 0;
      }
    });

    return {
      totalEvents: 0,
      eventsByPriority,
      currentSizeBytes: 0,
      utilizationPercent: 0,
      oldestEventAgeMs: 0,
      processedEvents: 0,
      failedEvents: 0
    };
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop the cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get priority for an event type
   */
  private getEventPriority(eventType: string): EventPriority {
    const criticalEvents = [
      'connection_established',
      'connection_lost',
      'error_occurred',
      'authentication_required'
    ];

    const highEvents = [
      'processing_complete',
      'job_status_update',
      'processing_stage_update',
      'batch_job_update'
    ];

    const mediumEvents = [
      'emotion_segment_processed',
      'shot_decision_made',
      'tension_analysis_complete'
    ];

    const lowEvents = [
      'system_metrics',
      'performance_update',
      'debug_info'
    ];

    if (criticalEvents.includes(eventType)) return EventPriority.CRITICAL;
    if (highEvents.includes(eventType)) return EventPriority.HIGH;
    if (mediumEvents.includes(eventType)) return EventPriority.MEDIUM;
    if (lowEvents.includes(eventType)) return EventPriority.LOW;
    return EventPriority.BACKGROUND;
  }

  /**
   * Estimate event size in bytes
   */
  private estimateEventSize(event: WebSocketEvent): number {
    return JSON.stringify(event).length * 2; // Rough UTF-16 byte estimation
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if buffer has space for event
   */
  private hasSpaceForEvent(eventSize: number): boolean {
    if (this.stats.currentSizeBytes + eventSize > this.config.maxBufferSizeBytes) {
      return false;
    }
    return true;
  }

  /**
   * Remove oldest events to make space
   */
  private makeSpace(requiredSpace: number): void {
    let freedSpace = 0;
    const eventsToRemove: BufferedEvent[] = [];

    // Remove oldest events starting from lowest priority
    for (let priority = EventPriority.BACKGROUND; priority >= EventPriority.CRITICAL; priority--) {
      const buffer = this.buffers.get(priority);
      if (!buffer) continue;

      while (buffer.length > 0 && freedSpace < requiredSpace) {
        const event = buffer.shift();
        if (event) {
          freedSpace += event.sizeBytes;
          eventsToRemove.push(event);
        }
      }

      if (freedSpace >= requiredSpace) break;
    }

    // Update statistics
    this.stats.currentSizeBytes -= freedSpace;
    this.stats.totalEvents -= eventsToRemove.length;

    // Emit events removed event
    if (eventsToRemove.length > 0) {
      this.emit('eventsRemoved', { count: eventsToRemove.length, freedSpace });
    }
  }

  /**
   * Add event to buffer
   */
  public addEvent(event: WebSocketEvent, priority?: EventPriority): boolean {
    const eventPriority = priority ?? this.getEventPriority(event.type);
    const eventSize = this.estimateEventSize(event);
    const eventId = this.generateEventId();

    // Check if we have space
    if (!this.hasSpaceForEvent(eventSize)) {
      this.makeSpace(eventSize + 1024); // Make space with some buffer
    }

    // Double-check space after cleanup
    if (!this.hasSpaceForEvent(eventSize)) {
      this.emit('bufferFull', { event, size: eventSize });
      return false;
    }

    const bufferedEvent: BufferedEvent = {
      event,
      priority: eventPriority,
      bufferedAt: Date.now(),
      sizeBytes: eventSize,
      id: eventId,
      retryCount: 0,
      processed: false
    };

    // Add to appropriate priority buffer
    const buffer = this.buffers.get(eventPriority);
    if (buffer) {
      // Check per-priority limit
      if (buffer.length >= this.config.maxEventsPerPriority) {
        // Remove oldest event from this priority
        const removed = buffer.shift();
        if (removed) {
          this.stats.currentSizeBytes -= removed.sizeBytes;
          this.stats.totalEvents--;
        }
      }

      buffer.push(bufferedEvent);
      this.stats.currentSizeBytes += eventSize;
      this.stats.totalEvents++;
      this.stats.eventsByPriority[eventPriority]++;

      this.emit('eventAdded', { bufferedEvent });
      return true;
    }

    return false;
  }

  /**
   * Get events for replay, prioritized by importance
   */
  public getEventsForReplay(maxCount?: number): BufferedEvent[] {
    const events: BufferedEvent[] = [];
    const now = Date.now();
    const maxAge = this.config.maxEventAgeMs;

    // Collect events from all priorities in order
    for (let priority = EventPriority.CRITICAL; priority <= EventPriority.BACKGROUND; priority++) {
      const buffer = this.buffers.get(priority);
      if (!buffer) continue;

      for (const bufferedEvent of buffer) {
        // Skip processed or expired events
        if (bufferedEvent.processed) continue;
        if (now - bufferedEvent.bufferedAt > maxAge) continue;

        events.push(bufferedEvent);

        if (maxCount && events.length >= maxCount) {
          break;
        }
      }

      if (maxCount && events.length >= maxCount) {
        break;
      }
    }

    return events;
  }

  /**
   * Mark event as processed
   */
  public markEventProcessed(eventId: string): boolean {
    for (const buffer of this.buffers.values()) {
      const event = buffer.find(e => e.id === eventId);
      if (event) {
        event.processed = true;
        this.stats.processedEvents++;
        this.emit('eventProcessed', { eventId });
        return true;
      }
    }
    return false;
  }

  /**
   * Mark event as failed
   */
  public markEventFailed(eventId: string, error?: string): boolean {
    for (const buffer of this.buffers.values()) {
      const event = buffer.find(e => e.id === eventId);
      if (event) {
        event.retryCount++;
        if (event.retryCount >= 3) {
          // Remove event after 3 failed attempts
          const index = buffer.indexOf(event);
          buffer.splice(index, 1);
          this.stats.currentSizeBytes -= event.sizeBytes;
          this.stats.totalEvents--;
          this.stats.failedEvents++;
          this.emit('eventFailed', { eventId, error, removed: true });
        } else {
          this.emit('eventFailed', { eventId, error, removed: false });
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Clean up old events
   */
  public cleanup(): number {
    const now = Date.now();
    const maxAge = this.config.maxEventAgeMs;
    let removedCount = 0;
    let freedSpace = 0;

    for (const buffer of this.buffers.values()) {
      const initialLength = buffer.length;
      
      for (let i = buffer.length - 1; i >= 0; i--) {
        const event = buffer[i];
        if (now - event.bufferedAt > maxAge) {
          buffer.splice(i, 1);
          freedSpace += event.sizeBytes;
          removedCount++;
        }
      }

      // Update priority count
      const priority = this.getEventPriority(buffer[0]?.event?.type || '');
      this.stats.eventsByPriority[priority] = buffer.length;
    }

    this.stats.currentSizeBytes -= freedSpace;
    this.stats.totalEvents -= removedCount;

    if (removedCount > 0) {
      this.emit('cleanup', { removedCount, freedSpace });
    }

    return removedCount;
  }

  /**
   * Clear all buffered events
   */
  public clear(): void {
    for (const buffer of this.buffers.values()) {
      buffer.length = 0;
    }
    
    this.stats = this.initializeStats();
    this.emit('cleared');
  }

  /**
   * Get current buffer statistics
   */
  public getStats(): BufferStats {
    const now = Date.now();
    let oldestEventAge = 0;

    // Find oldest event
    for (const buffer of this.buffers.values()) {
      for (const event of buffer) {
        const age = now - event.bufferedAt;
        if (age > oldestEventAge) {
          oldestEventAge = age;
        }
      }
    }

    this.stats.oldestEventAgeMs = oldestEventAge;
    this.stats.utilizationPercent = (this.stats.currentSizeBytes / this.config.maxBufferSizeBytes) * 100;

    return { ...this.stats };
  }

  /**
   * Add event listener
   */
  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Destroy the event buffer
   */
  public destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    this.eventListeners.clear();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create event buffer with default configuration
 */
export function createEventBuffer(config?: Partial<BufferConfig>): EventBuffer {
  return new EventBuffer(config);
}

/**
 * Validate buffer configuration
 */
export function validateBufferConfig(config: Partial<BufferConfig>): string[] {
  const errors: string[] = [];

  if (config.maxEventsPerPriority !== undefined && config.maxEventsPerPriority <= 0) {
    errors.push('maxEventsPerPriority must be positive');
  }

  if (config.maxBufferSizeBytes !== undefined && config.maxBufferSizeBytes <= 0) {
    errors.push('maxBufferSizeBytes must be positive');
  }

  if (config.maxEventAgeMs !== undefined && config.maxEventAgeMs <= 0) {
    errors.push('maxEventAgeMs must be positive');
  }

  if (config.cleanupIntervalMs !== undefined && config.cleanupIntervalMs <= 0) {
    errors.push('cleanupIntervalMs must be positive');
  }

  return errors;
}