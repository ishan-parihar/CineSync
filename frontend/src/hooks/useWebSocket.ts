import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { createWebSocketManager, WebSocketManager, ConnectionState, ManagerEvent } from '../services/WebSocketManager';
import type { WebSocketEvent } from '../types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002/ws/processing-status';

export interface WebSocketStats {
  state: ConnectionState;
  reconnectionAttempts: number;
  currentUrl: string;
  messageQueueSize: number;
  bufferStats?: any;
  healthStats?: any;
}

export interface UseWebSocketOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Enable event buffering */
  enableBuffering?: boolean;
  /** Enable health monitoring */
  enableHealthMonitoring?: boolean;
  /** Custom WebSocket URL */
  url?: string;
  /** Maximum reconnection attempts */
  maxReconnectionAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectionDelay?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    autoConnect = true,
    enableBuffering = true,
    enableHealthMonitoring = true,
    url = WS_URL,
    maxReconnectionAttempts = 10,
    reconnectionDelay = 1000
  } = options;

  const managerRef = useRef<WebSocketManager | null>(null);
  const [stats, setStats] = useState<WebSocketStats | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const {
    isConnected,
    setConnected,
    addWebSocketEvent,
    handleEmotionSegmentEvent,
    handleShotDecisionEvent,
    handleProcessingStageEvent,
    handleTensionAnalysisEvent,
    setCurrentJob
  } = useAppStore();

  // Initialize WebSocket manager
  const initializeManager = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
    }

    try {
      managerRef.current = createWebSocketManager({
        url,
        enableEventBuffering: enableBuffering,
        enableHealthMonitoring: enableHealthMonitoring,
        maxReconnectionAttempts,
        initialReconnectionDelayMs: reconnectionDelay,
        enableCrossTabSync: true,
        enableFailover: true,
        backupUrls: [], // Add backup URLs if available
        reconnectionStrategy: 'exponential_backoff' as any
      });

      // Setup event listeners
      setupManagerListeners(managerRef.current);
      setIsReady(true);
      
    } catch (error) {
      console.error('Failed to initialize WebSocket manager:', error);
    }
  }, [url, enableBuffering, enableHealthMonitoring, maxReconnectionAttempts, reconnectionDelay]);

  // Setup manager event listeners
  const setupManagerListeners = useCallback((manager: WebSocketManager) => {
    // Connection state changes
    manager.on(ManagerEvent.CONNECTION_STATE_CHANGED, ({ newState }) => {
      const connected = newState === ConnectionState.CONNECTED;
      setConnected(connected);
      
      // Send subscription message when connected
      if (connected) {
        manager.sendMessage({
          type: 'subscribe',
          channels: ['all']
        });
      }
    });

    // Message received
    manager.on(ManagerEvent.MESSAGE_RECEIVED, ({ event }) => {
      // Add to recent events
      addWebSocketEvent(event);
      
      // Handle specific event types
      switch (event.type) {
        case 'connection_established':
          console.log('WebSocket connection established');
          break;
          
        case 'emotion_segment_processed':
          handleEmotionSegmentEvent(event as any);
          break;
          
        case 'shot_decision_made':
          handleShotDecisionEvent(event as any);
          break;
          
        case 'processing_stage_update':
          handleProcessingStageEvent(event as any);
          break;
          
        case 'tension_analysis_complete':
          handleTensionAnalysisEvent(event as any);
          break;
          
        case 'processing_complete':
          console.log('Processing complete:', event);
          break;
          
        case 'error_occurred':
          console.error('Processing error:', event);
          break;
          
        case 'job_status_update':
          if (event.data?.job_id) {
            setCurrentJob(event.data as any);
          }
          break;
          
        default:
          console.log('Unknown event type:', event.type);
      }
    });

    // Error handling
    manager.on(ManagerEvent.ERROR_OCCURRED, ({ error, context }) => {
      console.error(`WebSocket error in ${context}:`, error);
    });

    // Reconnection events
    manager.on(ManagerEvent.RECONNECTING, ({ attempt, delay, url }) => {
      console.log(`Reconnecting attempt ${attempt} to ${url} in ${delay}ms`);
    });

    manager.on(ManagerEvent.RECONNECTED, ({ attempt, url }) => {
      console.log(`Successfully reconnected to ${url} on attempt ${attempt}`);
    });

    // Failover events
    manager.on(ManagerEvent.FAILOVER_ACTIVATED, ({ failedUrl, newUrl, reason }) => {
      console.warn(`Failover activated: ${failedUrl} -> ${newUrl} (${reason})`);
    });

    // Health status changes
    manager.on(ManagerEvent.HEALTH_STATUS_CHANGED, ({ status, quality }) => {
      console.log(`Connection health changed: ${status} (${quality})`);
    });

    // Buffer overflow
    manager.on(ManagerEvent.BUFFER_OVERFLOW, ({ bufferSize, maxSize }) => {
      console.warn(`WebSocket buffer overflow: ${bufferSize}/${maxSize}`);
    });

    // Cross-tab messages
    manager.on(ManagerEvent.CROSS_TAB_MESSAGE, ({ type, data, source }) => {
      console.log(`Cross-tab message from ${source}:`, type, data);
    });

    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (manager && manager.getState() !== ConnectionState.DESTROYED) {
        setStats(manager.getStats());
      }
    }, 1000);

    // Cleanup interval on destroy
    manager.on(ManagerEvent.CONNECTION_STATE_CHANGED as any, () => {
      if (manager.getState() === ConnectionState.DESTROYED) {
        clearInterval(statsInterval);
      }
    });
  }, [addWebSocketEvent, handleEmotionSegmentEvent, handleShotDecisionEvent, handleProcessingStageEvent, handleTensionAnalysisEvent, setCurrentJob, setConnected]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!managerRef.current || managerRef.current.getState() === ConnectionState.DESTROYED) {
      initializeManager();
    }
    
    if (managerRef.current) {
      try {
        await managerRef.current.connect();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    }
  }, [initializeManager]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
  }, []);

  // Send message
  const sendMessage = useCallback((message: any) => {
    if (managerRef.current) {
      return managerRef.current.sendMessage(message);
    }
    return false;
  }, []);

  // Send ping
  const ping = useCallback(() => {
    if (managerRef.current) {
      return managerRef.current.ping();
    }
    return false;
  }, []);

  // Get connection diagnostics
  const getDiagnostics = useCallback(async () => {
    if (managerRef.current && managerRef.current.getState() === ConnectionState.CONNECTED) {
      // This would require access to the underlying WebSocket instance
      // For now, return manager stats
      return managerRef.current.getStats();
    }
    return null;
  }, []);

  // Reset connection
  const reset = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
    }
    initializeManager();
  }, [initializeManager]);

  // Initialize on mount
  useEffect(() => {
    initializeManager();

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [initializeManager]);

  // Auto-connect if enabled
  useEffect(() => {
    if (autoConnect && isReady && managerRef.current) {
      connect();
    }
  }, [autoConnect, isReady, connect]);

  // Update connection state
  useEffect(() => {
    if (managerRef.current) {
      const connected = managerRef.current.getState() === ConnectionState.CONNECTED;
      setConnected(connected);
    }
  }, [stats, setConnected]);

  return {
    // Connection state
    isConnected,
    isReady,
    stats,
    
    // Connection control
    connect,
    disconnect,
    reset,
    
    // Messaging
    sendMessage,
    ping,
    
    // Diagnostics
    getDiagnostics,
    
    // Raw manager access (for advanced usage)
    manager: managerRef.current
  };
};