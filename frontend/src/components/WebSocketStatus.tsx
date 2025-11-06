/**
 * WebSocket Status Component
 * Displays real-time WebSocket connection status and diagnostics
 * Demonstrates usage of the enhanced WebSocket management system
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  useWebSocketStatus, 
  useWebSocketMessaging, 
  useWebSocketDiagnostics 
} from '../contexts/WebSocketContext';
import { ConnectionState } from '../services/WebSocketManager';
import { HealthStatus, ConnectionQuality } from '../services/ConnectionHealth';

interface WebSocketStatusProps {
  className?: string;
  showDiagnostics?: boolean;
  showControls?: boolean;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  className = '',
  showDiagnostics = false,
  showControls = true
}) => {
  const {
    isConnected,
    connectionState,
    stats,
    lastError,
    isHealthy,
    connectionQuality,
    reconnectionAttempts,
    messageQueueSize
  } = useWebSocketStatus();

  const { sendMessage, ping, isConnected: canMessage } = useWebSocketMessaging();
  const { diagnostics, loading, refreshDiagnostics, reset } = useWebSocketDiagnostics();

  const [expanded, setExpanded] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello WebSocket!');

  // Auto-expand on error
  useEffect(() => {
    if (lastError) {
      setExpanded(true);
    }
  }, [lastError]);

  // Get status color
  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (!isHealthy) return 'bg-yellow-500';
    if (connectionQuality === 'excellent') return 'bg-green-500';
    if (connectionQuality === 'good') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  // Get status text
  const getStatusText = () => {
    if (connectionState === 'connecting') return 'Connecting...';
    if (connectionState === 'reconnecting') return `Reconnecting... (${reconnectionAttempts})`;
    if (!isConnected) return 'Disconnected';
    if (!isHealthy) return 'Degraded';
    return `Connected (${connectionQuality})`;
  };

  // Send test message
  const handleSendTest = () => {
    if (testMessage.trim()) {
      sendMessage({
        type: 'test_message',
        data: { message: testMessage, timestamp: Date.now() }
      });
    }
  };

  // Send ping
  const handlePing = () => {
    ping();
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          {/* Status indicator */}
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isConnected ? 'animate-pulse' : ''}`} />
          
          {/* Status text */}
          <span className="font-medium text-gray-900">
            {getStatusText()}
          </span>
          
          {/* Connection state badge */}
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {connectionState}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Reconnection attempts */}
          {reconnectionAttempts > 0 && (
            <span className="text-sm text-yellow-600">
              {reconnectionAttempts} attempts
            </span>
          )}

          {/* Message queue size */}
          {messageQueueSize > 0 && (
            <span className="text-sm text-blue-600">
              {messageQueueSize} queued
            </span>
          )}

          {/* Expand/collapse icon */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Error display */}
          {lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-800">{lastError}</span>
              </div>
            </div>
          )}

          {/* Connection stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Current URL:</span>
                <span className="ml-2 text-gray-600">{stats.currentUrl}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Health Status:</span>
                <span className="ml-2 text-gray-600">{stats.healthStats?.status || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Success Rate:</span>
                <span className="ml-2 text-gray-600">
                  {stats.healthStats ? `${(stats.healthStats.successRate * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Avg Latency:</span>
                <span className="ml-2 text-gray-600">
                  {stats.healthStats ? `${stats.healthStats.averageLatencyMs.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
          {showControls && (
            <div className="space-y-3">
              {/* Test message */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Test message"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendTest}
                  disabled={!canMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={handlePing}
                  disabled={!canMessage}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ping
                </button>
                <button
                  onClick={refreshDiagnostics}
                  disabled={loading}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={reset}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Diagnostics */}
          {showDiagnostics && diagnostics && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Diagnostics</h4>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;