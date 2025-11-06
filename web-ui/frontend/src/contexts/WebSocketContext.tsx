/**
 * WebSocket Context Provider
 * Provides WebSocket functionality to the entire application
 * Integrates with stores and provides global connection management
 * @version 1.0.0
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useWebSocket, UseWebSocketOptions } from '../hooks/useWebSocket';
import { useAppStore } from '../stores/appStore';
import { useProcessingStore } from '../stores/processingStore';
import { useSystemStore } from '../stores/systemStore';

// ============================================================================
// WEBSOCKET CONTEXT TYPES
// ============================================================================

export interface WebSocketContextValue {
  // Connection state
  isConnected: boolean;
  isReady: boolean;
  connectionState: string;
  stats: any;
  
  // Connection control
  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  
  // Messaging
  sendMessage: (message: any) => boolean;
  ping: () => boolean;
  
  // Diagnostics
  getDiagnostics: () => Promise<any>;
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
}

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ============================================================================
// PROVIDER PROPS
// ============================================================================

interface WebSocketProviderProps {
  children: ReactNode;
  options?: UseWebSocketOptions;
  autoConnect?: boolean;
}

// ============================================================================
// WEBSOCKET PROVIDER COMPONENT
// ============================================================================

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  options,
  autoConnect = true
}) => {
  const {
    isConnected,
    isReady,
    stats,
    connect,
    disconnect,
    reset,
    sendMessage,
    ping,
    getDiagnostics,
    manager
  } = useWebSocket({
    ...options,
    autoConnect
  });

  // Store integration
  const {
    setConnectionState,
    setConnectionStats,
    setLastWebSocketError,
    lastWebSocketError
  } = useAppStore();

  const { 
    addProcessingLog 
  } = useProcessingStore();

  const { 
    updateSystemStatus 
  } = useSystemStore();

  const [lastError, setLastError] = React.useState<string | null>(null);

  // Update store when connection state changes
  useEffect(() => {
    if (stats) {
      setConnectionState(stats.state);
      setConnectionStats(stats);
      
      // Update system status based on WebSocket health
      updateSystemStatus('websocket', {
        status: stats.state,
        connected: stats.state === 'connected',
        reconnectionAttempts: stats.reconnectionAttempts,
        messageQueueSize: stats.messageQueueSize,
        healthStats: stats.healthStats
      });
    }
  }, [stats, setConnectionState, setConnectionStats, updateSystemStatus]);

  // Handle WebSocket errors
  useEffect(() => {
    if (manager) {
      const handleError = ({ error, context }: any) => {
        const errorMessage = `WebSocket error in ${context}: ${error.message}`;
        setLastError(errorMessage);
        setLastWebSocketError(errorMessage);
        addProcessingLog('error', errorMessage);
      };

      manager.on('errorOccurred' as any, handleError);

      return () => {
        manager.off('errorOccurred' as any, handleError);
      };
    }
  }, [manager, setLastWebSocketError, addProcessingLog]);

  // Clear error function
  const clearError = React.useCallback(() => {
    setLastError(null);
    setLastWebSocketError(null);
  }, [setLastWebSocketError]);

  // Context value
  const contextValue: WebSocketContextValue = {
    // Connection state
    isConnected,
    isReady,
    connectionState: stats?.state || 'disconnected',
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
    
    // Error handling
    lastError: lastError || lastWebSocketError,
    clearError
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// ============================================================================
// HOOK FOR USING WEBSOCKET CONTEXT
// ============================================================================

export const useWebSocketContext = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
};

// ============================================================================
// HOOK FOR WEBSOCKET STATUS
// ============================================================================

export const useWebSocketStatus = () => {
  const { isConnected, connectionState, stats, lastError } = useWebSocketContext();
  
  return {
    isConnected,
    connectionState,
    stats,
    lastError,
    isHealthy: stats?.healthStats?.status === 'healthy',
    connectionQuality: stats?.healthStats?.quality,
    reconnectionAttempts: stats?.reconnectionAttempts || 0,
    messageQueueSize: stats?.messageQueueSize || 0
  };
};

// ============================================================================
// HOOK FOR WEBSOCKET MESSAGING
// ============================================================================

export const useWebSocketMessaging = () => {
  const { sendMessage, ping, isConnected } = useWebSocketContext();
  
  const sendEvent = React.useCallback((type: string, data?: any) => {
    return sendMessage({
      type,
      timestamp: new Date().toISOString(),
      data
    });
  }, [sendMessage]);
  
  const subscribeToEvents = React.useCallback((channels: string[]) => {
    return sendEvent('subscribe', { channels });
  }, [sendEvent]);
  
  const unsubscribeFromEvents = React.useCallback((channels: string[]) => {
    return sendEvent('unsubscribe', { channels });
  }, [sendEvent]);
  
  return {
    sendMessage,
    sendEvent,
    ping,
    subscribeToEvents,
    unsubscribeFromEvents,
    isConnected
  };
};

// ============================================================================
// HOOK FOR WEBSOCKET DIAGNOSTICS
// ============================================================================

export const useWebSocketDiagnostics = () => {
  const { getDiagnostics, stats, reset } = useWebSocketContext();
  
  const [diagnostics, setDiagnostics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  
  const refreshDiagnostics = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDiagnostics();
      setDiagnostics(result);
    } catch (error) {
      console.error('Failed to get WebSocket diagnostics:', error);
    } finally {
      setLoading(false);
    }
  }, [getDiagnostics]);
  
  return {
    diagnostics,
    stats,
    loading,
    refreshDiagnostics,
    reset
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default WebSocketProvider;