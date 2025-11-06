/**
 * System Store - Domain-specific store for system performance and health monitoring
 * Handles performance metrics, health checks, and system status
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware';
import type { 
  SystemPerformance, 
  HealthCheck,
  WebSocketEvent,
  ErrorOccurredEvent 
} from '../types';

// Store state interface
interface SystemState {
  // Health and performance data
  healthCheck: HealthCheck | null;
  performance: SystemPerformance | null;
  historicalPerformance: SystemPerformance[];
  
  // Connection status
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastConnectionTime: string | null;
  connectionDrops: number;
  
  // System metrics
  metrics: {
    cpuUsage: number[];
    memoryUsage: number[];
    diskUsage: number[];
    activeJobs: number[];
    queueLength: number[];
    responseTime: number[];
    errorRate: number[];
  };
  
  // Alerts and notifications
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info' | 'success';
    message: string;
    timestamp: string;
    acknowledged: boolean;
    source: string;
  }>;
  
  // Logs
  systemLogs: Array<{
    id: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
    source: string;
    metadata?: Record<string, any>;
  }>;
  
  // Loading states
  loading: {
    health: boolean;
    performance: boolean;
    metrics: boolean;
    logs: boolean;
  };
  
  // Error states
  errors: Record<string, string | null>;
  
  // UI state
  selectedTimeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  showNotifications: boolean;
  soundEnabled: boolean;
  
  // Thresholds and limits
  thresholds: {
    cpuWarning: number;
    cpuCritical: number;
    memoryWarning: number;
    memoryCritical: number;
    diskWarning: number;
    diskCritical: number;
    responseTimeWarning: number;
    responseTimeCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
  };
  
  // System configuration
  config: {
    maxLogEntries: number;
    maxMetricsHistory: number;
    alertRetentionDays: number;
    performanceHistoryHours: number;
  };
  
  // WebSocket events
  recentEvents: WebSocketEvent[];
  eventStats: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    errorEvents: number;
    lastEventTime: string | null;
  };
  
  // Cache
  lastHealthCheck: number | null;
  lastPerformanceUpdate: number | null;
  cacheExpiry: {
    health: number; // 30 seconds
    performance: number; // 5 seconds
    metrics: number; // 1 minute
  };
}

// Store actions interface
interface SystemActions {
  // Health and performance
  setHealthCheck: (health: HealthCheck) => void;
  setPerformance: (performance: SystemPerformance) => void;
  addHistoricalPerformance: (performance: SystemPerformance) => void;
  
  // Connection management
  setConnectionStatus: (connected: boolean) => void;
  setConnectionQuality: (quality: SystemState['connectionQuality']) => void;
  recordConnectionDrop: () => void;
  
  // Metrics management
  updateMetrics: (newMetrics: Partial<SystemState['metrics']>) => void;
  addMetricPoint: (metric: keyof SystemState['metrics'], value: number) => void;
  pruneMetricsHistory: () => void;
  
  // Alert management
  addAlert: (alert: Omit<SystemState['alerts'][0], 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // Log management
  addLog: (log: Omit<SystemState['systemLogs'][0], 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  exportLogs: () => string;
  
  // Event handling
  addSystemEvent: (event: WebSocketEvent) => void;
  handleErrorEvent: (event: ErrorOccurredEvent) => void;
  clearEvents: () => void;
  
  // Loading and error actions
  setLoading: (key: keyof SystemState['loading'], value: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  
  // UI actions
  setSelectedTimeRange: (range: SystemState['selectedTimeRange']) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setShowNotifications: (show: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Configuration
  updateThresholds: (thresholds: Partial<SystemState['thresholds']>) => void;
  updateConfig: (config: Partial<SystemState['config']>) => void;
  resetThresholds: () => void;
  
  // Monitoring actions
  performHealthCheck: () => Promise<void>;
  refreshPerformance: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  // Data export
  exportMetrics: (timeRange?: SystemState['selectedTimeRange']) => string;
  exportHealthData: () => string;
  
  // Utility actions
  resetStore: () => void;
  clearCache: () => void;
  generateSystemReport: () => string;
  updateSystemStatus: (component: string, status: any) => void;
}

// Computed selectors
interface SystemSelectors {
  // Derived status
  systemStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  isSystemHealthy: boolean;
  hasActiveAlerts: boolean;
  hasUnacknowledgedAlerts: boolean;
  
  // Performance insights
  averageCpuUsage: number;
  averageMemoryUsage: number;
  averageResponseTime: number;
  currentErrorRate: number;
  
  // Statistics
  totalLogs: number;
  errorLogsCount: number;
  warningLogsCount: number;
  uptimePercentage: number;
  
  // Status checks
  isLoading: boolean;
  hasErrors: boolean;
  isMonitoring: boolean;
  isDataStale: boolean;
  
  // Cache status
  isHealthDataStale: boolean;
  isPerformanceDataStale: boolean;
}

// Initial thresholds
const defaultThresholds = {
  cpuWarning: 70,
  cpuCritical: 90,
  memoryWarning: 75,
  memoryCritical: 90,
  diskWarning: 80,
  diskCritical: 95,
  responseTimeWarning: 1000,
  responseTimeCritical: 5000,
  errorRateWarning: 5,
  errorRateCritical: 15,
};

// Initial configuration
const defaultConfig = {
  maxLogEntries: 1000,
  maxMetricsHistory: 100,
  alertRetentionDays: 7,
  performanceHistoryHours: 24,
};

// Initial state
const initialState: SystemState = {
  healthCheck: null,
  performance: null,
  historicalPerformance: [],
  
  isConnected: false,
  connectionQuality: 'good',
  lastConnectionTime: null,
  connectionDrops: 0,
  
  metrics: {
    cpuUsage: [],
    memoryUsage: [],
    diskUsage: [],
    activeJobs: [],
    queueLength: [],
    responseTime: [],
    errorRate: [],
  },
  
  alerts: [],
  systemLogs: [],
  
  loading: {
    health: false,
    performance: false,
    metrics: false,
    logs: false,
  },
  
  errors: {},
  
  selectedTimeRange: '1h',
  autoRefresh: true,
  refreshInterval: 30,
  showNotifications: true,
  soundEnabled: false,
  
  thresholds: defaultThresholds,
  config: defaultConfig,
  
  recentEvents: [],
  eventStats: {
    totalEvents: 0,
    eventsByType: {},
    errorEvents: 0,
    lastEventTime: null,
  },
  
  lastHealthCheck: null,
  lastPerformanceUpdate: null,
  cacheExpiry: {
    health: 30 * 1000, // 30 seconds
    performance: 5 * 1000, // 5 seconds
    metrics: 60 * 1000, // 1 minute
  },
};

// Create the store
export const useSystemStore = create<SystemState & SystemActions & SystemSelectors>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        // Health and performance
        setHealthCheck: (health) => {
          set({
            healthCheck: health,
            lastHealthCheck: Date.now(),
            errors: { ...get().errors, health: null }
          });
          
          // Check for alerts based on health status
          if (health.status === 'unhealthy') {
            get().addAlert({
              type: 'error',
              message: 'System health check failed',
              source: 'health-monitor',
              acknowledged: false
            });
          } else if (health.status === 'degraded') {
            get().addAlert({
              type: 'warning',
              message: 'System performance degraded',
              source: 'health-monitor',
              acknowledged: false
            });
          }
        },
        
        setPerformance: (performance) => {
          set({
            performance,
            lastPerformanceUpdate: Date.now(),
            errors: { ...get().errors, performance: null }
          });
          
          // Add to historical data
          get().addHistoricalPerformance(performance);
          
          // Update metrics
          get().addMetricPoint('cpuUsage', performance.cpu_usage);
          get().addMetricPoint('memoryUsage', performance.memory_usage_percent);
          get().addMetricPoint('diskUsage', performance.disk_usage_percent);
          get().addMetricPoint('activeJobs', performance.active_jobs);
          get().addMetricPoint('queueLength', performance.queue_length);
          
          // Check thresholds
          const state = get();
          if (performance.cpu_usage > state.thresholds.cpuCritical) {
            get().addAlert({
              type: 'error',
              message: `Critical CPU usage: ${performance.cpu_usage}%`,
              source: 'performance-monitor',
              acknowledged: false
            });
          } else if (performance.cpu_usage > state.thresholds.cpuWarning) {
            get().addAlert({
              type: 'warning',
              message: `High CPU usage: ${performance.cpu_usage}%`,
              source: 'performance-monitor',
              acknowledged: false
            });
          }
          
          if (performance.memory_usage_percent > state.thresholds.memoryCritical) {
            get().addAlert({
              type: 'error',
              message: `Critical memory usage: ${performance.memory_usage_percent}%`,
              source: 'performance-monitor',
              acknowledged: false
            });
          } else if (performance.memory_usage_percent > state.thresholds.memoryWarning) {
            get().addAlert({
              type: 'warning',
              message: `High memory usage: ${performance.memory_usage_percent}%`,
              source: 'performance-monitor',
              acknowledged: false
            });
          }
        },
        
        addHistoricalPerformance: (performance) => {
          set((state) => {
            const newHistory = [...state.historicalPerformance, performance];
            // Keep only the last N hours of data
            const cutoffTime = Date.now() - (state.config.performanceHistoryHours * 60 * 60 * 1000);
            const filteredHistory = newHistory.filter(p => 
              new Date(p.uptime).getTime() > cutoffTime
            );
            
            return {
              historicalPerformance: filteredHistory.slice(-state.config.maxMetricsHistory)
            };
          });
        },
        
        // Connection management
        setConnectionStatus: (connected) => {
          const wasConnected = get().isConnected;
          
          set({
            isConnected: connected,
            lastConnectionTime: connected ? new Date().toISOString() : get().lastConnectionTime
          });
          
          // Record connection drops
          if (wasConnected && !connected) {
            get().recordConnectionDrop();
            get().addAlert({
              type: 'warning',
              message: 'Connection lost',
              source: 'connection-monitor',
              acknowledged: false
            });
          } else if (!wasConnected && connected) {
            get().addAlert({
              type: 'success',
              message: 'Connection restored',
              source: 'connection-monitor',
              acknowledged: false
            });
          }
        },
        
        setConnectionQuality: (quality) => {
          set({ connectionQuality: quality });
        },
        
        recordConnectionDrop: () => {
          set((state) => ({
            connectionDrops: state.connectionDrops + 1
          }));
        },
        
        // Metrics management
        updateMetrics: (newMetrics) => {
          set((state) => ({
            metrics: { ...state.metrics, ...newMetrics }
          }));
        },
        
        addMetricPoint: (metric, value) => {
          set((state) => {
            const updatedMetrics = { ...state.metrics };
            const currentValues = updatedMetrics[metric];
            
            // Add new value and maintain history limit
            updatedMetrics[metric] = [...currentValues, value].slice(-state.config.maxMetricsHistory);
            
            return { metrics: updatedMetrics };
          });
        },
        
        pruneMetricsHistory: () => {
          set((state) => {
            const prunedMetrics = {} as typeof state.metrics;
            
            Object.entries(state.metrics).forEach(([key, values]) => {
              prunedMetrics[key as keyof typeof state.metrics] = values.slice(-state.config.maxMetricsHistory);
            });
            
            return { metrics: prunedMetrics };
          });
        },
        
        // Alert management
        addAlert: (alert) => {
          const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newAlert = {
            ...alert,
            id: alertId,
            timestamp: new Date().toISOString()
          };
          
          set((state) => ({
            alerts: [...state.alerts, newAlert]
          }));
          
          // Show notification if enabled
          const state = get();
          if (state.showNotifications) {
            // This would integrate with a notification system
            console.log(`[${alert.type.toUpperCase()}] ${alert.message}`);
          }
        },
        
        acknowledgeAlert: (alertId) => {
          set((state) => ({
            alerts: state.alerts.map(alert =>
              alert.id === alertId ? { ...alert, acknowledged: true } : alert
            )
          }));
        },
        
        dismissAlert: (alertId) => {
          set((state) => ({
            alerts: state.alerts.filter(alert => alert.id !== alertId)
          }));
        },
        
        clearAlerts: () => {
          set({ alerts: [] });
        },
        
        // Log management
        addLog: (log) => {
          const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newLog = {
            ...log,
            id: logId,
            timestamp: new Date().toISOString()
          };
          
          set((state) => {
            const newLogs = [...state.systemLogs, newLog];
            // Keep only the last N entries
            return {
              systemLogs: newLogs.slice(-state.config.maxLogEntries)
            };
          });
        },
        
        clearLogs: () => {
          set({ systemLogs: [] });
        },
        
        exportLogs: () => {
          const state = get();
          return JSON.stringify({
            logs: state.systemLogs,
            exportedAt: new Date().toISOString(),
            totalEntries: state.systemLogs.length
          }, null, 2);
        },
        
        // Event handling
        addSystemEvent: (event) => {
          set((state) => {
            const newEvents = [...state.recentEvents.slice(-99), event]; // Keep last 100
            const eventType = event.type;
            const isErrorEvent = event.type === 'error_occurred';
            
            return {
              recentEvents: newEvents,
              eventStats: {
                totalEvents: state.eventStats.totalEvents + 1,
                eventsByType: {
                  ...state.eventStats.eventsByType,
                  [eventType]: (state.eventStats.eventsByType[eventType] || 0) + 1
                },
                errorEvents: state.eventStats.errorEvents + (isErrorEvent ? 1 : 0),
                lastEventTime: event.timestamp
              }
            };
          });
        },
        
        handleErrorEvent: (event) => {
          get().addSystemEvent(event);
          get().addAlert({
            type: 'error',
            message: `System error: ${event.error_message}`,
            source: event.error_stage || 'system',
            acknowledged: false
          });
          
          get().addLog({
            level: 'error',
            message: `Error ${event.error_code}: ${event.error_message}`,
            source: event.error_stage || 'system',
            metadata: {
              error_code: event.error_code,
              recoverable: event.recoverable,
              job_id: event.job_id
            }
          });
        },
        
        clearEvents: () => {
          set({
            recentEvents: [],
            eventStats: {
              totalEvents: 0,
              eventsByType: {},
              errorEvents: 0,
              lastEventTime: null
            }
          });
        },
        
        // Loading and error actions
        setLoading: (key, value) => {
          set((state) => ({
            loading: { ...state.loading, [key]: value }
          }));
        },
        
        setError: (key, error) => {
          set((state) => ({
            errors: { ...state.errors, [key]: error }
          }));
        },
        
        clearErrors: () => {
          set({ errors: {} });
        },
        
        // UI actions
        setSelectedTimeRange: (range) => {
          set({ selectedTimeRange: range });
        },
        
        setAutoRefresh: (enabled) => {
          set({ autoRefresh: enabled });
        },
        
        setRefreshInterval: (interval) => {
          set({ refreshInterval: interval });
        },
        
        setShowNotifications: (show) => {
          set({ showNotifications: show });
        },
        
        setSoundEnabled: (enabled) => {
          set({ soundEnabled: enabled });
        },
        
        // Configuration
        updateThresholds: (thresholds) => {
          set((state) => ({
            thresholds: { ...state.thresholds, ...thresholds }
          }));
        },
        
        updateConfig: (config) => {
          set((state) => ({
            config: { ...state.config, ...config }
          }));
        },
        
        resetThresholds: () => {
          set({ thresholds: defaultThresholds });
        },
        
        // Monitoring actions
        performHealthCheck: async () => {
          const state = get();
          if (state.loading.health) return;
          
          get().setLoading('health', true);
          
          try {
            // Mock API call - replace with actual implementation
            // const response = await systemAPI.healthCheck();
            // get().setHealthCheck(response.data);
            
            // Mock implementation
            const mockHealth: HealthCheck = {
              status: 'healthy',
              services: {
                api: { status: 'up', response_time: 150, last_check: new Date().toISOString() },
                database: { status: 'up', response_time: 50, last_check: new Date().toISOString() },
                processing: { status: 'up', response_time: 200, last_check: new Date().toISOString() }
              },
              performance: {
                cpu_usage: Math.random() * 50,
                memory_usage: Math.random() * 1024,
                memory_usage_percent: Math.random() * 70,
                disk_usage: Math.random() * 100,
                disk_usage_percent: Math.random() * 80,
                active_jobs: Math.floor(Math.random() * 5),
                queue_length: Math.floor(Math.random() * 3),
                load_average: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
                uptime: Math.random() * 86400
              },
              warnings: [],
              errors: []
            };
            
            get().setHealthCheck(mockHealth);
          } catch (error) {
            get().setError('health', error instanceof Error ? error.message : 'Health check failed');
          } finally {
            get().setLoading('health', false);
          }
        },
        
        refreshPerformance: async () => {
          const state = get();
          if (state.loading.performance) return;
          
          get().setLoading('performance', true);
          
          try {
            // Mock API call
            const mockPerformance: SystemPerformance = {
              cpu_usage: Math.random() * 80,
              memory_usage: Math.random() * 2048,
              memory_usage_percent: Math.random() * 85,
              disk_usage: Math.random() * 500,
              disk_usage_percent: Math.random() * 90,
              active_jobs: Math.floor(Math.random() * 10),
              queue_length: Math.floor(Math.random() * 5),
              load_average: [Math.random() * 3, Math.random() * 3, Math.random() * 3],
              uptime: Math.random() * 172800
            };
            
            get().setPerformance(mockPerformance);
            get().setError('performance', null);
          } catch (error) {
            get().setError('performance', error instanceof Error ? error.message : 'Performance refresh failed');
          } finally {
            get().setLoading('performance', false);
          }
        },
        
        startMonitoring: () => {
          // This would start the monitoring interval
          get().addLog({
            level: 'info',
            message: 'System monitoring started',
            source: 'system-store'
          });
        },
        
        stopMonitoring: () => {
          // This would stop the monitoring interval
          get().addLog({
            level: 'info',
            message: 'System monitoring stopped',
            source: 'system-store'
          });
        },
        
        // Data export
        exportMetrics: (timeRange) => {
          const state = get();
          return JSON.stringify({
            metrics: state.metrics,
            performance: state.performance,
            historicalPerformance: state.historicalPerformance,
            timeRange: timeRange || state.selectedTimeRange,
            exportedAt: new Date().toISOString()
          }, null, 2);
        },
        
        exportHealthData: () => {
          const state = get();
          return JSON.stringify({
            healthCheck: state.healthCheck,
            alerts: state.alerts,
            connectionStats: {
              isConnected: state.isConnected,
              connectionQuality: state.connectionQuality,
              connectionDrops: state.connectionDrops,
              lastConnectionTime: state.lastConnectionTime
            },
            exportedAt: new Date().toISOString()
          }, null, 2);
        },
        
        // Utility actions
        resetStore: () => {
          set(initialState);
        },
        
        clearCache: () => {
          set({
            lastHealthCheck: null,
            lastPerformanceUpdate: null
          });
        },
        
        generateSystemReport: () => {
          const state = get();
          const report = {
            timestamp: new Date().toISOString(),
            systemStatus: state.healthCheck?.status || 'unknown',
            performance: state.performance,
            alerts: {
              total: state.alerts.length,
              unacknowledged: state.alerts.filter(a => !a.acknowledged).length,
              byType: state.alerts.reduce((acc, alert) => {
                acc[alert.type] = (acc[alert.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            },
            connection: {
              isConnected: state.isConnected,
              quality: state.connectionQuality,
              drops: state.connectionDrops
            },
            metrics: {
              averageCpu: state.metrics.cpuUsage.reduce((a, b) => a + b, 0) / state.metrics.cpuUsage.length || 0,
              averageMemory: state.metrics.memoryUsage.reduce((a, b) => a + b, 0) / state.metrics.memoryUsage.length || 0,
              averageResponseTime: state.metrics.responseTime.reduce((a, b) => a + b, 0) / state.metrics.responseTime.length || 0
            },
            logs: {
              total: state.systemLogs.length,
              errors: state.systemLogs.filter(l => l.level === 'error').length,
              warnings: state.systemLogs.filter(l => l.level === 'warn').length
            }
          };
          
          return JSON.stringify(report, null, 2);
        },
        
        updateSystemStatus: (component: string, status: any) => {
          // Update system status based on component
          if (component === 'websocket') {
            set((state) => ({
              isConnected: status.connected,
              connectionQuality: status.healthStats?.quality || 'good',
              lastConnectionTime: status.connected ? new Date().toISOString() : state.lastConnectionTime
            }));
            
            // Add log entry
            get().addLog({
              level: status.connected ? 'info' : 'warn',
              message: `WebSocket ${status.connected ? 'connected' : 'disconnected'} (${status.state})`,
              source: 'websocket-manager',
              metadata: status
            });
          }
        },
        
        // Selectors
        get systemStatus() {
          const health = this.healthCheck;
          if (!health) return 'unknown';
          if (health.status === 'healthy') return 'healthy';
          if (health.status === 'degraded') return 'degraded';
          return 'unhealthy';
        },
        get isSystemHealthy() {
          return this.healthCheck?.status === 'healthy';
        },
        get hasActiveAlerts() {
          return this.alerts?.length > 0;
        },
        get hasUnacknowledgedAlerts() {
          const alerts = this.alerts || [];
          return alerts.some(alert => !alert.acknowledged);
        },
        get averageCpuUsage() {
          const cpuData = this.metrics?.cpuUsage || [];
          return cpuData.length > 0 ? cpuData.reduce((a, b) => a + b, 0) / cpuData.length : 0;
        },
        get averageMemoryUsage() {
          const memoryData = this.metrics?.memoryUsage || [];
          return memoryData.length > 0 ? memoryData.reduce((a, b) => a + b, 0) / memoryData.length : 0;
        },
        get averageResponseTime() {
          const responseTimeData = this.metrics?.responseTime || [];
          return responseTimeData.length > 0 ? responseTimeData.reduce((a, b) => a + b, 0) / responseTimeData.length : 0;
        },
        get currentErrorRate() {
          const systemLogs = this.systemLogs || [];
          const recentLogs = systemLogs.filter(log => 
            new Date(log.timestamp).getTime() > Date.now() - 300000 // Last 5 minutes
          );
          const totalLogs = recentLogs.length;
          const errorLogs = recentLogs.filter(log => log.level === 'error').length;
          return totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
        },
        get totalLogs() {
          return this.systemLogs?.length || 0;
        },
        get errorLogsCount() {
          const systemLogs = this.systemLogs || [];
          return systemLogs.filter(log => log.level === 'error').length;
        },
        get warningLogsCount() {
          const systemLogs = this.systemLogs || [];
          return systemLogs.filter(log => log.level === 'warn').length;
        },
        get uptimePercentage() {
          // This would be calculated from actual uptime data
          return 99.9; // Mock value
        },
        get isLoading() {
          const loading = this.loading || {};
          return Object.values(loading).some(loading => loading);
        },
        get hasErrors() {
          const errors = this.errors || {};
          return Object.values(errors).some(error => error !== null);
        },
        get isMonitoring() {
          return this.monitoringActive;
        },
        get isDataStale() {
          const now = Date.now();
          const healthStale = !this.lastHealthCheck || (now - new Date(this.lastHealthCheck).getTime() > this.cacheExpiry.health);
          const performanceStale = !this.lastPerformanceUpdate || (now - new Date(this.lastPerformanceUpdate).getTime() > this.cacheExpiry.performance);
          return healthStale || performanceStale;
        },
        get isHealthDataStale() {
          return !this.lastHealthCheck || (Date.now() - new Date(this.lastHealthCheck).getTime() > this.cacheExpiry.health);
        },
        get isPerformanceDataStale() {
          return !this.lastPerformanceUpdate || (Date.now() - new Date(this.lastPerformanceUpdate).getTime() > this.cacheExpiry.performance);
        }
      })),
      {
        name: 'system-store',
        partialize: (state) => ({
          // Only persist specific fields
          thresholds: state.thresholds,
          config: state.config,
          selectedTimeRange: state.selectedTimeRange,
          autoRefresh: state.autoRefresh,
          refreshInterval: state.refreshInterval,
          showNotifications: state.showNotifications,
          soundEnabled: state.soundEnabled,
          alerts: state.alerts.filter(a => !a.acknowledged), // Only keep unacknowledged alerts
          systemLogs: state.systemLogs.slice(-100), // Keep last 100 logs
        }),
      }
    ),
    {
      name: 'system-store',
    }
  )
);

// Computed selectors
export const useSystemStatus = () => useSystemStore(state => {
  try {
    if (!state || !state.healthCheck) return 'unknown';
    return state.healthCheck.status || 'unknown';
  } catch (error) {
    console.warn('Error in useSystemStatus selector:', error);
    return 'unknown';
  }
});

export const useSystemHealth = () => useSystemStore(state => {
  try {
    if (!state) {
      return {
        systemStatus: 'unknown',
        isSystemHealthy: false,
        hasActiveAlerts: false,
        hasUnacknowledgedAlerts: false
      };
    }
    
    return {
      systemStatus: state.healthCheck?.status || 'unknown',
      isSystemHealthy: state.healthCheck?.status === 'healthy',
      hasActiveAlerts: (state.alerts?.length || 0) > 0,
      hasUnacknowledgedAlerts: state.alerts?.some(a => !a.acknowledged) || false,
    };
  } catch (error) {
    console.warn('Error in useSystemHealth selector:', error);
    return {
      systemStatus: 'unknown',
      isSystemHealthy: false,
      hasActiveAlerts: false,
      hasUnacknowledgedAlerts: false
    };
  }
});

export const usePerformanceInsights = () => useSystemStore(state => {
  try {
    if (!state) {
      return {
        averageCpuUsage: 0,
        averageMemoryUsage: 0,
        averageResponseTime: 0,
        currentErrorRate: 0
      };
    }
    
    const metrics = state.metrics || {};
    
    return {
      averageCpuUsage: (metrics.cpuUsage?.length || 0) > 0 
        ? metrics.cpuUsage.reduce((a, b) => a + b, 0) / metrics.cpuUsage.length 
        : 0,
      averageMemoryUsage: (metrics.memoryUsage?.length || 0) > 0 
        ? metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length 
        : 0,
      averageResponseTime: (metrics.responseTime?.length || 0) > 0 
        ? metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length 
        : 0,
      currentErrorRate: metrics.errorRate?.[metrics.errorRate.length - 1] || 0,
    };
  } catch (error) {
    console.warn('Error in usePerformanceInsights selector:', error);
    return {
      averageCpuUsage: 0,
      averageMemoryUsage: 0,
      averageResponseTime: 0,
      currentErrorRate: 0
    };
  }
});

export const useSystemStatistics = () => useSystemStore(state => {
  try {
    if (!state) {
      return {
        totalLogs: 0,
        errorLogsCount: 0,
        warningLogsCount: 0,
        uptimePercentage: 0
      };
    }
    
    const systemLogs = state.systemLogs || [];
    
    return {
      totalLogs: systemLogs.length,
      errorLogsCount: systemLogs.filter(l => l?.level === 'error').length,
      warningLogsCount: systemLogs.filter(l => l?.level === 'warn').length,
      uptimePercentage: state.performance ? (state.performance.uptime / 86400) * 100 : 0,
    };
  } catch (error) {
    console.warn('Error in useSystemStatistics selector:', error);
    return {
      totalLogs: 0,
      errorLogsCount: 0,
      warningLogsCount: 0,
      uptimePercentage: 0
    };
  }
});

export const useSystemLoadingStatus = () => useSystemStore(state => {
  try {
    if (!state) {
      return {
        isLoading: false,
        hasErrors: false,
        isMonitoring: false
      };
    }
    
    return {
      isLoading: Object.values(state.loading || {}).some(loading => loading),
      hasErrors: Object.values(state.errors || {}).some(error => error !== null),
      isMonitoring: state.autoRefresh,
      isDataStale: state.lastHealthCheck 
        ? Date.now() - state.lastHealthCheck > (state.cacheExpiry?.health || 300000)
        : true,
      isHealthDataStale: state.lastHealthCheck 
        ? Date.now() - state.lastHealthCheck > (state.cacheExpiry?.health || 300000)
        : true,
      isPerformanceDataStale: state.lastPerformanceUpdate 
        ? Date.now() - state.lastPerformanceUpdate > (state.cacheExpiry?.performance || 300000)
        : true,
    };
  } catch (error) {
    console.warn('Error in useSystemLoadingStatus selector:', error);
    return {
      isLoading: false,
      hasErrors: false,
      isMonitoring: false,
      isDataStale: true,
      isHealthDataStale: true,
      isPerformanceDataStale: true
    };
  }
});

// Auto-refresh effect
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useSystemStore.getState();
    if (state.autoRefresh && !state.loading.health) {
      useSystemStore.getState().performHealthCheck();
    }
    
    if (state.autoRefresh && !state.loading.performance) {
      useSystemStore.getState().refreshPerformance();
    }
  }, (useSystemStore.getState().refreshInterval || 30) * 1000);
}

// Export the main store hook
export default useSystemStore;