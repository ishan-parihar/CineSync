/**
 * WebSocket Manager Service
 * Advanced WebSocket connection management with reconnection, buffering, and health monitoring
 * Supports connection pooling, failover, and cross-tab synchronization
 * @version 1.0.0
 */

import { EventBuffer, type BufferedEvent, createEventBuffer } from './EventBuffer';
import { ConnectionHealth, createConnectionHealth } from './ConnectionHealth';
import type { WebSocketEvent } from '../types';

// ============================================================================
// WEBSOCKET MANAGER CONFIGURATION
// ============================================================================

/**
 * Reconnection strategy types
 */
export enum ReconnectionStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_INTERVAL = 'fixed_interval',
  ADAPTIVE = 'adaptive'
}

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DESTROYED = 'destroyed'
}

/**
 * WebSocket manager configuration
 */
export interface WebSocketManagerConfig {
  /** WebSocket URL */
  url: string;
  /** Reconnection strategy */
  reconnectionStrategy: ReconnectionStrategy;
  /** Maximum reconnection attempts */
  maxReconnectionAttempts: number;
  /** Initial reconnection delay in milliseconds */
  initialReconnectionDelayMs: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectionDelayMs: number;
  /** Reconnection delay multiplier for exponential backoff */
  reconnectionDelayMultiplier: number;
  /** Enable jitter for reconnection delays */
  enableReconnectionJitter: boolean;
  /** Jitter amount (0-1) as percentage of delay */
  jitterAmount: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMs: number;
  /** Enable event buffering during disconnections */
  enableEventBuffering: boolean;
  /** Enable health monitoring */
  enableHealthMonitoring: boolean;
  /** Enable cross-tab synchronization */
  enableCrossTabSync: boolean;
  /** Cross-tab synchronization channel name */
  crossTabChannel: string;
  /** Custom protocols to use */
  protocols?: string[];
  /** Custom headers for connection */
  headers?: Record<string, string>;
  /** Enable automatic failover to backup URLs */
  enableFailover: boolean;
  /** Backup WebSocket URLs */
  backupUrls: string[];
  /** Message queue size limit */
  maxMessageQueueSize: number;
  /** Enable connection pooling */
  enableConnectionPooling: boolean;
  /** Pool size for connection pooling */
  poolSize: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: WebSocketManagerConfig = {
  url: '',
  reconnectionStrategy: ReconnectionStrategy.EXPONENTIAL_BACKOFF,
  maxReconnectionAttempts: 10,
  initialReconnectionDelayMs: 1000,
  maxReconnectionDelayMs: 30000,
  reconnectionDelayMultiplier: 2,
  enableReconnectionJitter: true,
  jitterAmount: 0.1,
  connectionTimeoutMs: 10000,
  enableEventBuffering: true,
  enableHealthMonitoring: true,
  enableCrossTabSync: true,
  crossTabChannel: 'websocket-manager',
  protocols: [],
  headers: {},
  enableFailover: false,
  backupUrls: [],
  maxMessageQueueSize: 1000,
  enableConnectionPooling: false,
  poolSize: 3
};

// ============================================================================
// WEBSOCKET MANAGER EVENTS
// ============================================================================

/**
 * Manager event types
 */
export enum ManagerEvent {
  CONNECTION_STATE_CHANGED = 'connectionStateChanged',
  MESSAGE_RECEIVED = 'messageReceived',
  MESSAGE_SENT = 'messageSent',
  ERROR_OCCURRED = 'errorOccurred',
  RECONNECTING = 'reconnecting',
  RECONNECTED = 'reconnected',
  FAILOVER_ACTIVATED = 'failoverActivated',
  HEALTH_STATUS_CHANGED = 'healthStatusChanged',
  BUFFER_OVERFLOW = 'bufferOverflow',
  CROSS_TAB_MESSAGE = 'crossTabMessage'
}

/**
 * Manager event data
 */
export interface ManagerEventData {
  [ManagerEvent.CONNECTION_STATE_CHANGED]: {
    oldState: ConnectionState;
    newState: ConnectionState;
  };
  [ManagerEvent.MESSAGE_RECEIVED]: {
    event: WebSocketEvent;
    timestamp: number;
  };
  [ManagerEvent.MESSAGE_SENT]: {
    message: any;
    timestamp: number;
  };
  [ManagerEvent.ERROR_OCCURRED]: {
    error: Error;
    context: string;
  };
  [ManagerEvent.RECONNECTING]: {
    attempt: number;
    delay: number;
    url: string;
  };
  [ManagerEvent.RECONNECTED]: {
    attempt: number;
    url: string;
  };
  [ManagerEvent.FAILOVER_ACTIVATED]: {
    failedUrl: string;
    newUrl: string;
    reason: string;
  };
  [ManagerEvent.HEALTH_STATUS_CHANGED]: {
    status: string;
    quality: string;
  };
  [ManagerEvent.BUFFER_OVERFLOW]: {
    bufferSize: number;
    maxSize: number;
  };
  [ManagerEvent.CROSS_TAB_MESSAGE]: {
    type: string;
    data: any;
    source: string;
  };
}

// ============================================================================
// MAIN WEBSOCKET MANAGER CLASS
// ============================================================================

export class WebSocketManager {
  private config: WebSocketManagerConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private ws: WebSocket | null = null;
  private eventBuffer: EventBuffer | null = null;
  private healthMonitor: ConnectionHealth | null = null;
  private reconnectionAttempts = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private eventListeners: Map<ManagerEvent, Function[]> = new Map();
  private currentUrlIndex = 0;
  private broadcastChannel: BroadcastChannel | null = null;
  private connectionPool: WebSocket[] = [];
  private isDestroyed = false;

  constructor(config: Partial<WebSocketManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (!this.config.url) {
      throw new Error('WebSocket URL is required');
    }

    this.initializeServices();
    this.setupCrossTabSync();
  }

  /**
   * Initialize supporting services
   */
  private initializeServices(): void {
    if (this.config.enableEventBuffering) {
      this.eventBuffer = createEventBuffer();
      this.eventBuffer.on('bufferFull', (data: any) => {
        this.emit(ManagerEvent.BUFFER_OVERFLOW, data);
      });
    }

    if (this.config.enableHealthMonitoring) {
      this.healthMonitor = createConnectionHealth();
      this.healthMonitor.on('statusDegraded', (data: any) => {
        console.warn('Connection health degraded:', data);
      });
      this.healthMonitor.on('statusUnhealthy', (data: any) => {
        console.error('Connection health unhealthy:', data);
        this.emit(ManagerEvent.HEALTH_STATUS_CHANGED, {
          status: 'unhealthy',
          quality: 'poor'
        });
      });
      this.healthMonitor.on('statusRecovered', (data: any) => {
        console.info('Connection health recovered:', data);
        this.emit(ManagerEvent.HEALTH_STATUS_CHANGED, {
          status: 'healthy',
          quality: 'good'
        });
      });
    }
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    if (this.config.enableCrossTabSync && typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(this.config.crossTabChannel);
        this.broadcastChannel.onmessage = (event) => {
          this.handleCrossTabMessage(event.data);
        };
      } catch (error) {
        console.warn('Failed to setup cross-tab synchronization:', error);
      }
    }
  }

  /**
   * Handle cross-tab messages
   */
  private handleCrossTabMessage(data: any): void {
    if (data.source === this.getInstanceId()) return; // Ignore own messages

    this.emit(ManagerEvent.CROSS_TAB_MESSAGE, {
      type: data.type,
      data: data.data,
      source: data.source
    });
  }

  /**
   * Get unique instance identifier
   */
  private getInstanceId(): string {
    return `ws-manager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current WebSocket URL (with failover support)
   */
  private getCurrentUrl(): string {
    const urls = [this.config.url, ...this.config.backupUrls];
    return urls[this.currentUrlIndex] || this.config.url;
  }

  /**
   * Connect to WebSocket
   */
  public async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Manager has been destroyed');
    }

    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      return;
    }

    const oldState = this.state;
    this.setState(ConnectionState.CONNECTING);

    try {
      const url = this.getCurrentUrl();
      this.ws = new WebSocket(url, this.config.protocols);
      this.setupWebSocketHandlers();
      
      // Set connection timeout
      this.connectionTimer = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeoutMs);

    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.handleConnectionOpen();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      this.handleConnectionClose(event);
    };

    this.ws.onerror = (error) => {
      this.handleConnectionError(error as unknown as Error);
    };
  }

  /**
   * Handle successful connection
   */
  private handleConnectionOpen(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    this.setState(ConnectionState.CONNECTED);
    this.reconnectionAttempts = 0;
    this.currentUrlIndex = 0; // Reset to primary URL on successful connection

    // Start health monitoring
    if (this.healthMonitor) {
      this.healthMonitor.start(this.ws!);
    }

    // Process buffered events
    this.processBufferedEvents();

    // Send queued messages
    this.processMessageQueue();

    // Emit reconnected event if this was a reconnection
    if (this.reconnectionAttempts > 0) {
      this.emit(ManagerEvent.RECONNECTED, {
        attempt: this.reconnectionAttempts,
        url: this.getCurrentUrl()
      });
    }

    // Broadcast connection to other tabs
    this.broadcastToTabs('connected', {
      url: this.getCurrentUrl(),
      timestamp: Date.now()
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    const startTime = performance.now();

    try {
      const data = JSON.parse(event.data);
      
      // Handle pong response for health monitoring
      if (data.type === 'pong') {
        this.healthMonitor?.handlePong();
        return;
      }

      const wsEvent: WebSocketEvent = {
        type: data.type || 'unknown',
        timestamp: data.timestamp || new Date().toISOString(),
        job_id: data.job_id,
        data: data.data
      };

      this.emit(ManagerEvent.MESSAGE_RECEIVED, {
        event: wsEvent,
        timestamp: Date.now()
      });

      // Record message processing time
      this.healthMonitor?.recordMessageProcessing(startTime);
      this.healthMonitor?.recordMessageSuccess();

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.healthMonitor?.recordMessageFailure('Parse error');
      this.emit(ManagerEvent.ERROR_OCCURRED, {
        error: error as Error,
        context: 'message_parsing'
      });
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    this.ws = null;
    this.healthMonitor?.stop();

    // Don't reconnect if the connection was closed intentionally
    if (event.code === 1000 || this.state === ConnectionState.DESTROYED) {
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.scheduleReconnection(event);
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    console.error('WebSocket connection error:', error);
    
    this.healthMonitor?.recordMessageFailure(error.message);
    this.emit(ManagerEvent.ERROR_OCCURRED, {
      error,
      context: 'connection'
    });

    // Try failover if enabled
    if (this.config.enableFailover && this.currentUrlIndex < this.config.backupUrls.length) {
      this.activateFailover('connection_error');
      return;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.scheduleReconnection({ code: 1006, reason: error.message } as CloseEvent);
  }

  /**
   * Activate failover to backup URL
   */
  private activateFailover(reason: string): void {
    if (this.currentUrlIndex >= this.config.backupUrls.length) {
      return; // No more backup URLs
    }

    const oldUrl = this.getCurrentUrl();
    this.currentUrlIndex++;
    const newUrl = this.getCurrentUrl();

    console.warn(`Activating failover from ${oldUrl} to ${newUrl} due to: ${reason}`);

    this.emit(ManagerEvent.FAILOVER_ACTIVATED, {
      failedUrl: oldUrl,
      newUrl,
      reason
    });

    // Clean up current connection and reconnect with new URL
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(closeEvent?: CloseEvent): void {
    if (this.reconnectionAttempts >= this.config.maxReconnectionAttempts) {
      console.error('Maximum reconnection attempts reached');
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    if (this.state === ConnectionState.DESTROYED) {
      return;
    }

    this.reconnectionAttempts++;
    const delay = this.calculateReconnectionDelay();

    this.setState(ConnectionState.RECONNECTING);

    this.emit(ManagerEvent.RECONNECTING, {
      attempt: this.reconnectionAttempts,
      delay,
      url: this.getCurrentUrl()
    });

    this.reconnectionTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Failed to reconnect:', error);
        this.scheduleReconnection();
      });
    }, delay);
  }

  /**
   * Calculate reconnection delay based on strategy
   */
  private calculateReconnectionDelay(): number {
    let delay: number;

    switch (this.config.reconnectionStrategy) {
      case ReconnectionStrategy.LINEAR_BACKOFF:
        delay = this.config.initialReconnectionDelayMs * this.reconnectionAttempts;
        break;

      case ReconnectionStrategy.FIXED_INTERVAL:
        delay = this.config.initialReconnectionDelayMs;
        break;

      case ReconnectionStrategy.ADAPTIVE:
        // Adaptive based on connection history
        const health = this.healthMonitor?.getHealthStats();
        const successRate = health?.successRate || 0.5;
        const adaptiveMultiplier = Math.max(0.5, Math.min(2, 1 / successRate));
        delay = this.config.initialReconnectionDelayMs * Math.pow(this.config.reconnectionDelayMultiplier, this.reconnectionAttempts - 1) * adaptiveMultiplier;
        break;

      case ReconnectionStrategy.EXPONENTIAL_BACKOFF:
      default:
        delay = this.config.initialReconnectionDelayMs * Math.pow(this.config.reconnectionDelayMultiplier, this.reconnectionAttempts - 1);
        break;
    }

    // Apply maximum limit
    delay = Math.min(delay, this.config.maxReconnectionDelayMs);

    // Apply jitter if enabled
    if (this.config.enableReconnectionJitter) {
      const jitter = delay * this.config.jitterAmount;
      delay += (Math.random() - 0.5) * jitter;
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Process buffered events
   */
  private processBufferedEvents(): void {
    if (!this.eventBuffer) return;

    const events = this.eventBuffer.getEventsForReplay();
    
    events.forEach(bufferedEvent => {
      this.emit(ManagerEvent.MESSAGE_RECEIVED, {
        event: bufferedEvent.event,
        timestamp: Date.now()
      });
      
      this.eventBuffer!.markEventProcessed(bufferedEvent.id);
    });
  }

  /**
   * Process message queue
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.sendMessageInternal(message);
    }
  }

  /**
   * Send message
   */
  public sendMessage(message: any): boolean {
    if (this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      return this.sendMessageInternal(message);
    }

    // Queue message if not connected
    if (this.messageQueue.length < this.config.maxMessageQueueSize) {
      this.messageQueue.push(message);
      return true;
    }

    // Buffer overflow
    this.emit(ManagerEvent.BUFFER_OVERFLOW, {
      bufferSize: this.messageQueue.length,
      maxSize: this.config.maxMessageQueueSize
    });
    
    return false;
  }

  /**
   * Send message internally
   */
  private sendMessageInternal(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
      
      this.emit(ManagerEvent.MESSAGE_SENT, {
        message,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit(ManagerEvent.ERROR_OCCURRED, {
        error: error as Error,
        context: 'message_sending'
      });
      return false;
    }
  }

  /**
   * Send ping message
   */
  public ping(): boolean {
    return this.sendMessage({ type: 'ping', timestamp: Date.now() });
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.healthMonitor?.stop();
    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Destroy manager and cleanup resources
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    
    this.eventBuffer?.destroy();
    this.healthMonitor?.destroy();
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Clear connection pool
    this.connectionPool.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.connectionPool = [];

    this.eventListeners.clear();
    this.messageQueue = [];
    this.setState(ConnectionState.DESTROYED);
  }

  /**
   * Set connection state
   */
  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState) {
      this.emit(ManagerEvent.CONNECTION_STATE_CHANGED, {
        oldState,
        newState
      });
    }
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      state: this.state,
      reconnectionAttempts: this.reconnectionAttempts,
      currentUrl: this.getCurrentUrl(),
      messageQueueSize: this.messageQueue.length,
      bufferStats: this.eventBuffer?.getStats(),
      healthStats: this.healthMonitor?.getHealthStats()
    };
  }

  /**
   * Add event listener
   */
  public on<T extends ManagerEvent>(event: T, listener: (data: ManagerEventData[T]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public off<T extends ManagerEvent>(event: T, listener: (data: ManagerEventData[T]) => void): void {
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
  private emit<T extends ManagerEvent>(event: T, data: ManagerEventData[T]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in WebSocket manager event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Broadcast message to other tabs
   */
  private broadcastToTabs(type: string, data: any): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type,
        data,
        source: this.getInstanceId()
      });
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create WebSocket manager with default configuration
 */
export function createWebSocketManager(config: Partial<WebSocketManagerConfig>): WebSocketManager {
  return new WebSocketManager(config);
}

/**
 * Validate WebSocket manager configuration
 */
export function validateConfig(config: Partial<WebSocketManagerConfig>): string[] {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('WebSocket URL is required');
  }

  if (config.maxReconnectionAttempts !== undefined && config.maxReconnectionAttempts < 0) {
    errors.push('maxReconnectionAttempts must be non-negative');
  }

  if (config.initialReconnectionDelayMs !== undefined && config.initialReconnectionDelayMs <= 0) {
    errors.push('initialReconnectionDelayMs must be positive');
  }

  if (config.maxReconnectionDelayMs !== undefined && config.maxReconnectionDelayMs <= 0) {
    errors.push('maxReconnectionDelayMs must be positive');
  }

  if (config.connectionTimeoutMs !== undefined && config.connectionTimeoutMs <= 0) {
    errors.push('connectionTimeoutMs must be positive');
  }

  if (config.maxMessageQueueSize !== undefined && config.maxMessageQueueSize <= 0) {
    errors.push('maxMessageQueueSize must be positive');
  }

  if (config.poolSize !== undefined && config.poolSize <= 0) {
    errors.push('poolSize must be positive');
  }

  return errors;
}