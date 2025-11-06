/**
 * SystemPerformanceDashboard - Real-time system monitoring dashboard
 * Provides comprehensive performance metrics, resource monitoring, and health status
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Settings,
  Maximize2,
  Zap,
  Database,
  Wifi,
  Thermometer
} from 'lucide-react';
import type { SystemPerformance, HealthCheck } from '../../types';

interface SystemPerformanceDashboardProps {
  performanceData?: SystemPerformance;
  healthData?: HealthCheck;
  historicalData?: SystemPerformance[];
  refreshInterval?: number;
  showHistorical?: boolean;
  enableAlerts?: boolean;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  onRefresh?: () => void;
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  cpu: { warning: 70, critical: 90 },
  memory: { warning: 80, critical: 95 },
  disk: { warning: 80, critical: 95 },
  queue: { warning: 10, critical: 25 },
  load: { warning: 2.0, critical: 4.0 }
};

// Status color mapping
const STATUS_COLORS = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  unhealthy: '#ef4444',
  up: '#10b981',
  down: '#ef4444',
  warning: '#f59e0b'
};

export const SystemPerformanceDashboard: React.FC<SystemPerformanceDashboardProps> = ({
  performanceData,
  healthData,
  historicalData = [],
  refreshInterval = 5000,
  showHistorical = true,
  enableAlerts = true,
  width = 1200,
  height = 600,
  theme = 'light',
  onRefresh
}) => {
  const cpuChartRef = useRef<SVGSVGElement>(null);
  const memoryChartRef = useRef<SVGSVGElement>(null);
  const diskChartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'disk' | 'all'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState(PERFORMANCE_THRESHOLDS);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate real-time data if not provided
  const simulatedPerformanceData = useMemo(() => {
    if (performanceData) return performanceData;
    
    return {
      cpu_usage: 20 + Math.random() * 60,
      memory_usage: 512 + Math.random() * 1536,
      memory_usage_percent: 10 + Math.random() * 70,
      disk_usage: 50 + Math.random() * 100,
      disk_usage_percent: 20 + Math.random() * 60,
      active_jobs: Math.floor(Math.random() * 10),
      queue_length: Math.floor(Math.random() * 15),
      load_average: [0.5 + Math.random() * 2, 0.3 + Math.random() * 1.5, 0.2 + Math.random() * 1],
      uptime: Math.random() * 86400
    };
  }, [performanceData]);

  // Simulate health data if not provided
  const simulatedHealthData = useMemo(() => {
    if (healthData) return healthData;
    
    return {
      status: 'healthy',
      services: {
        api: { status: 'up', response_time: 50 + Math.random() * 200, last_check: new Date().toISOString() },
        database: { status: 'up', response_time: 10 + Math.random() * 50, last_check: new Date().toISOString() },
        redis: { status: 'up', response_time: 5 + Math.random() * 20, last_check: new Date().toISOString() },
        websocket: { status: 'up', response_time: 20 + Math.random() * 100, last_check: new Date().toISOString() }
      },
      performance: simulatedPerformanceData,
      warnings: [],
      errors: []
    };
  }, [healthData, simulatedPerformanceData]);

  // Generate historical data if not provided
  const extendedHistoricalData = useMemo(() => {
    if (historicalData.length > 0) return historicalData;
    
    // Generate sample historical data
    const now = Date.now();
    return Array.from({ length: 60 }, (_, i) => ({
      cpu_usage: 20 + Math.random() * 60,
      memory_usage: 512 + Math.random() * 1536,
      memory_usage_percent: 10 + Math.random() * 70,
      disk_usage: 50 + Math.random() * 100,
      disk_usage_percent: 20 + Math.random() * 60,
      active_jobs: Math.floor(Math.random() * 10),
      queue_length: Math.floor(Math.random() * 15),
      load_average: [0.5 + Math.random() * 2, 0.3 + Math.random() * 1.5, 0.2 + Math.random() * 1],
      uptime: Math.random() * 86400,
      timestamp: new Date(now - (59 - i) * 60000).toISOString()
    } as SystemPerformance & { timestamp: string }));
  }, [historicalData]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const current = simulatedPerformanceData;
    const historical = extendedHistoricalData;
    
    return {
      cpu: {
        current: current.cpu_usage,
        status: current.cpu_usage >= alertThresholds.cpu.critical ? 'critical' :
                current.cpu_usage >= alertThresholds.cpu.warning ? 'warning' : 'healthy',
        trend: historical.length > 1 ? 
          current.cpu_usage - historical[historical.length - 2].cpu_usage : 0,
        average: historical.reduce((sum, h) => sum + h.cpu_usage, 0) / historical.length
      },
      memory: {
        current: current.memory_usage_percent,
        status: current.memory_usage_percent >= alertThresholds.memory.critical ? 'critical' :
                current.memory_usage_percent >= alertThresholds.memory.warning ? 'warning' : 'healthy',
        trend: historical.length > 1 ? 
          current.memory_usage_percent - (historical[historical.length - 2].memory_usage_percent || 0) : 0,
        average: historical.reduce((sum, h) => sum + h.memory_usage_percent, 0) / historical.length
      },
      disk: {
        current: current.disk_usage_percent,
        status: current.disk_usage_percent >= alertThresholds.disk.critical ? 'critical' :
                current.disk_usage_percent >= alertThresholds.disk.warning ? 'warning' : 'healthy',
        trend: historical.length > 1 ? 
          current.disk_usage_percent - (historical[historical.length - 2].disk_usage_percent || 0) : 0,
        average: historical.reduce((sum, h) => sum + h.disk_usage_percent, 0) / historical.length
      },
      queue: {
        current: current.queue_length,
        status: current.queue_length >= alertThresholds.queue.critical ? 'critical' :
                current.queue_length >= alertThresholds.queue.warning ? 'warning' : 'healthy',
        trend: historical.length > 1 ? 
          current.queue_length - historical[historical.length - 2].queue_length : 0,
        average: historical.reduce((sum, h) => sum + h.queue_length, 0) / historical.length
      },
      load: {
        current: current.load_average[0],
        status: current.load_average[0] >= alertThresholds.load.critical ? 'critical' :
                current.load_average[0] >= alertThresholds.load.warning ? 'warning' : 'healthy',
        trend: historical.length > 1 ? 
          current.load_average[0] - historical[historical.length - 2].load_average[0] : 0,
        average: historical.reduce((sum, h) => sum + h.load_average[0], 0) / historical.length
      }
    };
  }, [simulatedPerformanceData, extendedHistoricalData, alertThresholds]);

  // D3.js chart rendering
  const renderChart = useCallback((
    svgRef: React.RefObject<SVGSVGElement | null>,
    data: number[],
    color: string,
    label: string
  ) => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = 300 - margin.left - margin.right;
    const chartHeight = 150 - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([chartHeight, 0]);

    const line = d3.line<number>()
      .x((d, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.selectAll('.grid-line')
      .data(d3.range(0, 101, 25))
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.5);

    // Area
    const area = d3.area<number>()
      .x((d, i) => xScale(i))
      .y0(chartHeight)
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', color)
      .attr('opacity', 0.1)
      .attr('d', area);

    // Line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr('color', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '10px');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4))
      .attr('color', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '10px');

    // Label
    svg.append('text')
      .attr('x', 150)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(label);
  }, [theme]);

  // Render charts
  useEffect(() => {
    const cpuData = extendedHistoricalData.map(h => h.cpu_usage);
    const memoryData = extendedHistoricalData.map(h => h.memory_usage_percent);
    const diskData = extendedHistoricalData.map(h => h.disk_usage_percent);

    renderChart(cpuChartRef, cpuData, '#3b82f6', 'CPU Usage (%)');
    renderChart(memoryChartRef, memoryData, '#10b981', 'Memory Usage (%)');
    renderChart(diskChartRef, diskData, '#f59e0b', 'Disk Usage (%)');
  }, [extendedHistoricalData, renderChart]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      onRefresh?.();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, onRefresh]);

  // Export functionality
  const handleExport = useCallback(async () => {
    if (!containerRef.current) return;

    try {
const canvas = await html2canvas(containerRef.current, {
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 2
        } as any);
      
      const link = document.createElement('a');
      link.download = `system-performance-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [theme]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Metric card component
  const MetricCard = ({ title, metric, icon: Icon, unit = '%' }: {
    title: string;
    metric: {
      current: number;
      status: string;
      trend: number;
      average: number;
    };
    icon: any;
    unit?: string;
  }) => (
    <div className={`p-4 rounded-lg border ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {title}
          </span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium text-white`}
             style={{ backgroundColor: STATUS_COLORS[metric.status] }}>
          {metric.status.toUpperCase()}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {metric.current.toFixed(1)}{unit}
          </span>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Avg: {metric.average.toFixed(1)}{unit}
          </div>
        </div>
        
        <div className={`flex items-center space-x-1 text-sm ${
          metric.trend > 0 ? 'text-red-500' : metric.trend < 0 ? 'text-green-500' : 'text-gray-500'
        }`}>
          {metric.trend > 0 ? <TrendingUp size={16} /> : 
           metric.trend < 0 ? <TrendingDown size={16} /> : null}
          <span>{Math.abs(metric.trend).toFixed(1)}{unit}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Activity className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} size={24} />
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              System Performance Dashboard
            </h3>
            <div className={`px-3 py-1 rounded-full text-xs font-medium text-white`}
                 style={{ backgroundColor: STATUS_COLORS[simulatedHealthData.status] }}>
              {simulatedHealthData.status.toUpperCase()}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title={autoRefresh ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Settings"
            >
              <Settings size={16} />
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Export Dashboard"
            >
              <Download size={16} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Alert Thresholds
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(alertThresholds).map(([metric, thresholds]) => (
                <div key={metric}>
                  <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {metric.toUpperCase()} Warning: {thresholds.warning}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={thresholds.warning}
                    onChange={(e) => setAlertThresholds(prev => ({
                      ...prev,
                      [metric]: { ...prev[metric as keyof typeof prev], warning: parseInt(e.target.value) }
                    }))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last update */}
        <div className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Last updated: {lastUpdate.toLocaleTimeString()}
          {autoRefresh && ` (Auto-refresh: ${refreshInterval / 1000}s)`}
        </div>
      </div>

      {/* Main content */}
      <div ref={containerRef} className="p-4 overflow-auto" style={{ height: 'calc(100% - 140px)' }}>
        {/* Metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <MetricCard title="CPU Usage" metric={metrics.cpu} icon={Cpu} />
          <MetricCard title="Memory Usage" metric={metrics.memory} icon={MemoryStick} />
          <MetricCard title="Disk Usage" metric={metrics.disk} icon={HardDrive} />
          <MetricCard title="Queue Length" metric={metrics.queue} icon={Database} unit="" />
          <MetricCard title="System Load" metric={metrics.load} icon={Zap} unit="" />
          
          {/* Uptime card */}
          <div className={`p-4 rounded-lg border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <Thermometer size={20} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                System Uptime
              </span>
            </div>
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {Math.floor(simulatedPerformanceData.uptime / 3600)}h {Math.floor((simulatedPerformanceData.uptime % 3600) / 60)}m
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              {simulatedPerformanceData.active_jobs} active jobs
            </div>
          </div>
        </div>

        {/* Charts */}
        {showHistorical && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <svg ref={cpuChartRef} width={300} height={150} />
            </div>
            <div className={`p-4 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <svg ref={memoryChartRef} width={300} height={150} />
            </div>
            <div className={`p-4 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <svg ref={diskChartRef} width={300} height={150} />
            </div>
          </div>
        )}

        {/* Services status */}
        <div className={`p-4 rounded-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Service Status
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(simulatedHealthData.services).map(([service, status]) => (
              <div key={service} className={`flex items-center justify-between p-3 rounded ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full`}
                       style={{ backgroundColor: STATUS_COLORS[status.status] }} />
                  <span className={`text-sm font-medium capitalize ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {service}
                  </span>
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {status.response_time}ms
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts and warnings */}
        {enableAlerts && (simulatedHealthData.warnings.length > 0 || simulatedHealthData.errors.length > 0) && (
          <div className={`mt-4 p-4 rounded-lg border ${
            simulatedHealthData.errors.length > 0 
              ? theme === 'dark' ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
              : theme === 'dark' ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                System Alerts
              </h4>
            </div>
            <div className="space-y-1">
              {simulatedHealthData.errors.map((error, index) => (
                <div key={`error-${index}`} className={`text-xs ${theme === 'dark' ? 'text-red-400' : 'text-red-700'}`}>
                  ERROR: {error}
                </div>
              ))}
              {simulatedHealthData.warnings.map((warning, index) => (
                <div key={`warning-${index}`} className={`text-xs ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  WARNING: {warning}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemPerformanceDashboard;