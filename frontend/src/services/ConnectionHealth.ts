/**
 * Connection Health Monitoring Service
 * Monitors WebSocket connection health with ping/pong, latency tracking, and diagnostics
 * Provides connection quality metrics and automatic failover recommendations
 * @version 1.0.0
 */

// ============================================================================
// CONNECTION HEALTH CONFIGURATION
// ============================================================================

/**
 * Health check configuration
 */
export interface HealthConfig {
  /** Ping interval in milliseconds */
  pingIntervalMs: number;
  /** Ping timeout in milliseconds */
  pingTimeoutMs: number;
  /** Number of consecutive failures before considering unhealthy */
  maxConsecutiveFailures: number;
  /** Health check window size for statistics */
  healthCheckWindowSize: number;
  /** Minimum success rate to consider connection healthy */
  minSuccessRate: number;
  /** Maximum average latency to consider connection healthy */
  maxAverageLatencyMs: number;
  /** Enable jitter detection */
  enableJitterDetection: boolean;
  /** Maximum jitter threshold in milliseconds */
  maxJitterMs: number;
}

/**
 * Default health configuration
 */
export const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  pingIntervalMs: 30000,        // 30 seconds
  pingTimeoutMs: 5000,          // 5 seconds
  maxConsecutiveFailures: 3,
  healthCheckWindowSize: 20,
  minSuccessRate: 0.8,          // 80%
  maxAverageLatencyMs: 1000,    // 1 second
  enableJitterDetection: true,
  maxJitterMs: 500              // 500ms
};

// ============================================================================
// HEALTH STATUS TYPES
// ============================================================================

/**
 * Connection health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Connection quality level
 */
export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Check timestamp */
  timestamp: number;
  /** Whether the check was successful */
  success: boolean;
  /** Round-trip latency in milliseconds */
  latencyMs: number;
  /** Error message if failed */
  error?: string;
  /** Check type (ping/pong, message, etc.) */
  checkType: 'ping' | 'message' | 'connection';
}

/**
 * Connection health statistics
 */
export interface HealthStats {
  /** Current health status */
  status: HealthStatus;
  /** Connection quality level */
  quality: ConnectionQuality;
  /** Success rate over the window */
  successRate: number;
  /** Average latency over the window */
  averageLatencyMs: number;
  /** Minimum latency over the window */
  minLatencyMs: number;
  /** Maximum latency over the window */
  maxLatencyMs: number;
  /** Current jitter in milliseconds */
  jitterMs: number;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Total number of health checks performed */
  totalChecks: number;
  /** Number of successful checks */
  successfulChecks: number;
  /** Number of failed checks */
  failedChecks: number;
  /** Time since last successful check */
  timeSinceLastSuccessMs: number;
  /** Time since last failure */
  timeSinceLastFailureMs: number;
  /** Uptime percentage */
  uptimePercent: number;
}

/**
 * Connection diagnostics information
 */
export interface ConnectionDiagnostics {
  /** Overall health status */
  health: HealthStats;
  /** Network information */
  network: {
    /** Online status */
    online: boolean;
    /** Connection type */
    connectionType: string;
    /** Effective connection type */
    effectiveType: string;
    /** Round-trip time estimate */
    rtt: number;
    /** Downlink speed estimate */
    downlink: number;
  };
  /** WebSocket specific diagnostics */
  websocket: {
    /** Connection state */
    readyState: number;
    /** Connection URL */
    url: string;
    /** Protocol used */
    protocol: string;
    /** Extensions negotiated */
    extensions: string;
    /** Buffered amount */
    bufferedAmount: number;
  };
  /** Performance metrics */
  performance: {
    /** Memory usage estimate */
    memoryUsage: number;
    /** CPU usage estimate */
    cpuUsage: number;
    /** Message processing time */
    messageProcessingTime: number;
  };
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// MAIN CONNECTION HEALTH CLASS
// ============================================================================

export class ConnectionHealth {
  private config: HealthConfig;
  private healthHistory: HealthCheckResult[] = [];
  private consecutiveFailures = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private pingTimeoutTimer: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private startTime = Date.now();
  private lastSuccessTime = 0;
  private lastFailureTime = 0;
  private messageProcessingTimes: number[] = [];

  constructor(config: Partial<HealthConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
  }

  /**
   * Start health monitoring
   */
  public start(websocket: WebSocket): void {
    this.stop(); // Stop any existing monitoring
    this.startTime = Date.now();
    this.schedulePing();
    this.emit('monitoringStarted', { websocket });
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }

    this.emit('monitoringStopped');
  }

  /**
   * Schedule next ping
   */
  private schedulePing(): void {
    this.pingTimer = setTimeout(() => {
      this.performPing();
    }, this.config.pingIntervalMs);
  }

  /**
   * Perform ping/pong health check
   */
  private performPing(): void {
    const startTime = Date.now();
    this.lastPingTime = startTime;

    // Set up timeout
    this.pingTimeoutTimer = setTimeout(() => {
      this.recordHealthCheck({
        timestamp: Date.now(),
        success: false,
        latencyMs: this.config.pingTimeoutMs,
        error: 'Ping timeout',
        checkType: 'ping'
      });
    }, this.config.pingTimeoutMs);

    // Schedule next ping
    this.schedulePing();
  }

  /**
   * Handle pong response
   */
  public handlePong(): void {
    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }

    const latency = Date.now() - this.lastPingTime;
    
    this.recordHealthCheck({
      timestamp: Date.now(),
      success: true,
      latencyMs: latency,
      checkType: 'ping'
    });
  }

  /**
   * Record message processing time
   */
  public recordMessageProcessing(startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.messageProcessingTimes.push(processingTime);
    
    // Keep only recent measurements
    if (this.messageProcessingTimes.length > this.config.healthCheckWindowSize) {
      this.messageProcessingTimes.shift();
    }
  }

  /**
   * Record successful message
   */
  public recordMessageSuccess(): void {
    this.recordHealthCheck({
      timestamp: Date.now(),
      success: true,
      latencyMs: 0, // Not applicable for message success
      checkType: 'message'
    });
  }

  /**
   * Record message failure
   */
  public recordMessageFailure(error?: string): void {
    this.recordHealthCheck({
      timestamp: Date.now(),
      success: false,
      latencyMs: 0,
      error,
      checkType: 'message'
    });
  }

  /**
   * Record connection state change
   */
  public recordConnectionStateChange(readyState: number): void {
    const success = readyState === WebSocket.OPEN;
    
    this.recordHealthCheck({
      timestamp: Date.now(),
      success,
      latencyMs: 0,
      error: success ? undefined : `Connection state: ${readyState}`,
      checkType: 'connection'
    });
  }

  /**
   * Record health check result
   */
  private recordHealthCheck(result: HealthCheckResult): void {
    // Add to history
    this.healthHistory.push(result);
    
    // Maintain window size
    if (this.healthHistory.length > this.config.healthCheckWindowSize) {
      this.healthHistory.shift();
    }

    // Update consecutive failures
    if (result.success) {
      this.consecutiveFailures = 0;
      this.lastSuccessTime = result.timestamp;
    } else {
      this.consecutiveFailures++;
      this.lastFailureTime = result.timestamp;
    }

    // Emit health check event
    this.emit('healthCheck', result);

    // Emit status change if needed
    const currentStatus = this.getHealthStatus();
    if (this.consecutiveFailures === 1) {
      this.emit('statusDegraded', { result, status: currentStatus });
    } else if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.emit('statusUnhealthy', { result, status: currentStatus });
    } else if (this.consecutiveFailures === 0 && this.healthHistory.length > 1) {
      this.emit('statusRecovered', { result, status: currentStatus });
    }
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): HealthStatus {
    if (this.healthHistory.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    const stats = this.getHealthStats();
    
    if (stats.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return HealthStatus.UNHEALTHY;
    }

    if (stats.consecutiveFailures > 0 || 
        stats.successRate < this.config.minSuccessRate ||
        stats.averageLatencyMs > this.config.maxAverageLatencyMs) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Get connection quality
   */
  public getConnectionQuality(): ConnectionQuality {
    const stats = this.getHealthStats();
    
    if (stats.status === HealthStatus.UNHEALTHY) {
      return ConnectionQuality.POOR;
    }

    if (stats.status === HealthStatus.DEGRADED) {
      return ConnectionQuality.FAIR;
    }

    if (stats.averageLatencyMs < 50 && stats.successRate > 0.95) {
      return ConnectionQuality.EXCELLENT;
    }

    if (stats.averageLatencyMs < 200 && stats.successRate > 0.9) {
      return ConnectionQuality.GOOD;
    }

    return ConnectionQuality.FAIR;
  }

  /**
   * Get comprehensive health statistics
   */
  public getHealthStats(): HealthStats {
    if (this.healthHistory.length === 0) {
      return {
        status: HealthStatus.UNKNOWN,
        quality: ConnectionQuality.POOR,
        successRate: 0,
        averageLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        jitterMs: 0,
        consecutiveFailures: this.consecutiveFailures,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        timeSinceLastSuccessMs: this.lastSuccessTime ? Date.now() - this.lastSuccessTime : Infinity,
        timeSinceLastFailureMs: this.lastFailureTime ? Date.now() - this.lastFailureTime : Infinity,
        uptimePercent: 0
      };
    }

    const successfulChecks = this.healthHistory.filter(check => check.success);
    const failedChecks = this.healthHistory.filter(check => !check.success);
    const latencyChecks = successfulChecks.filter(check => check.checkType === 'ping' && check.latencyMs > 0);
    
    const successRate = successfulChecks.length / this.healthHistory.length;
    const averageLatency = latencyChecks.length > 0 
      ? latencyChecks.reduce((sum, check) => sum + check.latencyMs, 0) / latencyChecks.length 
      : 0;
    
    const minLatency = latencyChecks.length > 0 
      ? Math.min(...latencyChecks.map(check => check.latencyMs))
      : 0;
    
    const maxLatency = latencyChecks.length > 0 
      ? Math.max(...latencyChecks.map(check => check.latencyMs))
      : 0;

    // Calculate jitter (standard deviation of latency)
    let jitter = 0;
    if (this.config.enableJitterDetection && latencyChecks.length > 1) {
      const variance = latencyChecks.reduce((sum, check) => {
        return sum + Math.pow(check.latencyMs - averageLatency, 2);
      }, 0) / latencyChecks.length;
      jitter = Math.sqrt(variance);
    }

    const uptime = this.lastSuccessTime 
      ? ((Date.now() - this.startTime) - (Date.now() - this.lastSuccessTime)) / (Date.now() - this.startTime)
      : 0;

    return {
      status: this.getHealthStatus(),
      quality: this.getConnectionQuality(),
      successRate,
      averageLatencyMs: averageLatency,
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      jitterMs: jitter,
      consecutiveFailures: this.consecutiveFailures,
      totalChecks: this.healthHistory.length,
      successfulChecks: successfulChecks.length,
      failedChecks: failedChecks.length,
      timeSinceLastSuccessMs: this.lastSuccessTime ? Date.now() - this.lastSuccessTime : Infinity,
      timeSinceLastFailureMs: this.lastFailureTime ? Date.now() - this.lastFailureTime : Infinity,
      uptimePercent: uptime * 100
    };
  }

  /**
   * Get connection diagnostics
   */
  public async getDiagnostics(websocket: WebSocket): Promise<ConnectionDiagnostics> {
    const health = this.getHealthStats();
    
    // Get network information if available
    const network = await this.getNetworkInfo();
    
    // WebSocket diagnostics
    const websocketInfo = {
      readyState: websocket.readyState,
      url: websocket.url,
      protocol: websocket.protocol,
      extensions: websocket.extensions || '',
      bufferedAmount: websocket.bufferedAmount
    };

    // Performance metrics
    const performance = {
      memoryUsage: this.estimateMemoryUsage(),
      cpuUsage: this.estimateCpuUsage(),
      messageProcessingTime: this.getAverageMessageProcessingTime()
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(health, network, websocketInfo);

    return {
      health,
      network,
      websocket: websocketInfo,
      performance,
      recommendations
    };
  }

  /**
   * Get network information
   */
  private async getNetworkInfo(): Promise<ConnectionDiagnostics['network']> {
    const defaultNetwork = {
      online: navigator.onLine,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      rtt: 0,
      downlink: 0
    };

    // Try to get Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        online: navigator.onLine,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0,
        downlink: connection.downlink || 0
      };
    }

    return defaultNetwork;
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Estimate CPU usage (simplified)
   */
  private estimateCpuUsage(): number {
    // This is a very rough estimate
    const now = performance.now();
    const processingTime = this.getAverageMessageProcessingTime();
    return processingTime > 0 ? (processingTime / now) * 100 : 0;
  }

  /**
   * Get average message processing time
   */
  private getAverageMessageProcessingTime(): number {
    if (this.messageProcessingTimes.length === 0) {
      return 0;
    }
    
    const sum = this.messageProcessingTimes.reduce((a, b) => a + b, 0);
    return sum / this.messageProcessingTimes.length;
  }

  /**
   * Generate recommendations based on diagnostics
   */
  private generateRecommendations(
    health: HealthStats, 
    network: ConnectionDiagnostics['network'],
    websocket: ConnectionDiagnostics['websocket']
  ): string[] {
    const recommendations: string[] = [];

    if (health.status === HealthStatus.UNHEALTHY) {
      recommendations.push('Connection is unhealthy. Consider reconnecting.');
    }

    if (health.consecutiveFailures > 0) {
      recommendations.push(`${health.consecutiveFailures} consecutive failures detected.`);
    }

    if (health.averageLatencyMs > this.config.maxAverageLatencyMs) {
      recommendations.push('High latency detected. Check network conditions.');
    }

    if (health.jitterMs > this.config.maxJitterMs) {
      recommendations.push('High jitter detected. Network may be unstable.');
    }

    if (!network.online) {
      recommendations.push('Browser appears to be offline.');
    }

    if (network.effectiveType === 'slow-2g' || network.effectiveType === '2g') {
      recommendations.push('Slow network connection detected. Consider reducing message frequency.');
    }

    if (websocket.bufferedAmount > 1024 * 1024) { // 1MB
      recommendations.push('High buffer usage detected. Messages may be backing up.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Connection appears to be healthy.');
    }

    return recommendations;
  }

  /**
   * Reset health monitoring
   */
  public reset(): void {
    this.healthHistory = [];
    this.consecutiveFailures = 0;
    this.lastSuccessTime = 0;
    this.lastFailureTime = 0;
    this.messageProcessingTimes = [];
    this.startTime = Date.now();
    this.emit('reset');
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
          console.error(`Error in health monitor event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Destroy health monitor
   */
  public destroy(): void {
    this.stop();
    this.reset();
    this.eventListeners.clear();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create connection health monitor with default configuration
 */
export function createConnectionHealth(config?: Partial<HealthConfig>): ConnectionHealth {
  return new ConnectionHealth(config);
}

/**
 * Validate health configuration
 */
export function validateHealthConfig(config: Partial<HealthConfig>): string[] {
  const errors: string[] = [];

  if (config.pingIntervalMs !== undefined && config.pingIntervalMs <= 0) {
    errors.push('pingIntervalMs must be positive');
  }

  if (config.pingTimeoutMs !== undefined && config.pingTimeoutMs <= 0) {
    errors.push('pingTimeoutMs must be positive');
  }

  if (config.maxConsecutiveFailures !== undefined && config.maxConsecutiveFailures <= 0) {
    errors.push('maxConsecutiveFailures must be positive');
  }

  if (config.healthCheckWindowSize !== undefined && config.healthCheckWindowSize <= 0) {
    errors.push('healthCheckWindowSize must be positive');
  }

  if (config.minSuccessRate !== undefined && (config.minSuccessRate < 0 || config.minSuccessRate > 1)) {
    errors.push('minSuccessRate must be between 0 and 1');
  }

  if (config.maxAverageLatencyMs !== undefined && config.maxAverageLatencyMs <= 0) {
    errors.push('maxAverageLatencyMs must be positive');
  }

  return errors;
}