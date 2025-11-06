/**
 * Visualization Components Index
 * Exports all advanced data visualization components for the LipSyncAutomation frontend
 */

// Import types first
import type {
  EmotionSegment,
  SystemPerformance,
  HealthCheck,
  ShotDecision,
  EmotionAnalysis,
  CinematographyConfig,
  WebSocketEvent
} from '../../types';

// Main visualization components
export { default as EmotionHeatmap } from './EmotionHeatmap';
export { default as EmotionTimeline } from './EmotionTimeline';
export { default as TensionCurve } from './TensionCurve';
export { default as SystemPerformanceDashboard } from './SystemPerformanceDashboard';
export { default as EmotionRadar } from './EmotionRadar';

// Re-export types for convenience
export type {
  EmotionSegment,
  SystemPerformance,
  HealthCheck,
  ShotDecision,
  EmotionAnalysis,
  CinematographyConfig,
  WebSocketEvent
} from '../../types';

// Component-specific types
export interface EmotionHeatmapProps {
  segments: EmotionSegment[];
  selectedSegments: number[];
  onSegmentClick: (index: number) => void;
  onSegmentHover?: (index: number | null) => void;
  showConfidence?: boolean;
  width?: number;
  height?: number;
  enableZoom?: boolean;
  enableExport?: boolean;
  theme?: 'light' | 'dark';
}

export interface EmotionTimelineProps {
  segments: EmotionSegment[];
  selectedSegments: number[];
  onSegmentClick: (index: number) => void;
  onSegmentEdit: (index: number, segment: Partial<EmotionSegment>) => void;
  audioDuration?: number;
  showConfidence?: boolean;
  showArousal?: boolean;
  showValence?: boolean;
  enableRealTime?: boolean;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

export interface TensionCurveProps {
  segments: EmotionSegment[];
  tensionData?: {
    tension_level: 'low' | 'medium' | 'high' | 'critical';
    tension_score: number;
    narrative_phase: string;
    dramatic_moments: Array<{
      segment_index: number;
      tension_level: number;
      tension_type: string;
    }>;
  };
  currentTime?: number;
  showNarrativePhases?: boolean;
  showDramaticMoments?: boolean;
  enableRealTime?: boolean;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  onTensionPointClick?: (index: number, tension: number) => void;
}

export interface SystemPerformanceDashboardProps {
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

export interface EmotionRadarProps {
  segments: EmotionSegment[];
  selectedSegment?: number;
  comparisonData?: EmotionSegment[][];
  showComparison?: boolean;
  enableAnimation?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  onEmotionSelect?: (emotion: string) => void;
  onSegmentSelect?: (index: number) => void;
}

// Visualization utilities and constants
export const VISUALIZATION_CONSTANTS = {
  // Default dimensions
  DEFAULT_WIDTH: 1000,
  DEFAULT_HEIGHT: 400,
  
  // Color schemes
  EMOTION_COLORS: {
    joy: '#10b981',
    sadness: '#3b82f6',
    anger: '#ef4444',
    fear: '#a855f7',
    surprise: '#f59e0b',
    disgust: '#84cc16',
    neutral: '#6b7280'
  },
  
  TENSION_COLORS: {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#7c3aed'
  },
  
  STATUS_COLORS: {
    healthy: '#10b981',
    degraded: '#f59e0b',
    unhealthy: '#ef4444',
    up: '#10b981',
    down: '#ef4444',
    warning: '#f59e0b'
  },
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 80, critical: 95 },
    queue: { warning: 10, critical: 25 },
    load: { warning: 2.0, critical: 4.0 }
  },
  
  // Animation settings
  ANIMATION_DURATION: 1000,
  ZOOM_EXTENT: [0.5, 5] as [number, number],
  
  // Refresh intervals (milliseconds)
  REFRESH_INTERVALS: {
    performance: 5000,
    real_time: 100,
    historical: 60000
  }
};

// Utility functions for visualizations
export const visualizationUtils = {
  /**
   * Format time display for timelines
   */
  formatTime: (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  },

  /**
   * Get color based on value and thresholds
   */
  getStatusColor: (
    value: number, 
    thresholds: { warning: number; critical: number },
    colors: { low: string; medium: string; high: string }
  ): string => {
    if (value >= thresholds.critical) return colors.high;
    if (value >= thresholds.warning) return colors.medium;
    return colors.low;
  },

  /**
   * Calculate trend between two values
   */
  calculateTrend: (current: number, previous: number): number => {
    return current - previous;
  },

  /**
   * Generate smooth curve points for D3.js
   */
  generateSmoothPoints: (data: number[], smoothing: number = 0.3): number[] => {
    if (data.length <= 2) return data;
    
    const smoothed = [...data];
    
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const current = smoothed[i];
      const next = smoothed[i + 1];
      
      smoothed[i] = current * (1 - smoothing) + ((prev + next) / 2) * smoothing;
    }
    
    return smoothed;
  },

  /**
   * Export visualization as image
   */
  async exportAsImage(
    element: HTMLElement, 
    filename: string, 
    format: 'png' | 'jpeg' = 'png',
    backgroundColor: string = '#ffffff'
  ): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(element, {
        backgroundColor,
        scale: 2,
        logging: false,
        useCORS: true
      } as any);
      
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.${format}`;
      link.href = canvas.toDataURL(`image/${format}`);
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  },

  /**
   * Create responsive dimensions
   */
  getResponsiveDimensions: (
    containerWidth: number,
    containerHeight: number,
    aspectRatio: number = 16/9
  ): { width: number; height: number } => {
    const containerAspectRatio = containerWidth / containerHeight;
    
    if (containerAspectRatio > aspectRatio) {
      // Container is wider than desired
      return {
        width: containerHeight * aspectRatio,
        height: containerHeight
      };
    } else {
      // Container is taller than desired
      return {
        width: containerWidth,
        height: containerWidth / aspectRatio
      };
    }
  },

  /**
   * Validate emotion segment data
   */
  validateEmotionSegment: (segment: any): boolean => {
    return (
      typeof segment === 'object' &&
      typeof segment.start_time === 'number' &&
      typeof segment.end_time === 'number' &&
      typeof segment.emotion === 'string' &&
      typeof segment.confidence === 'number' &&
      typeof segment.valence === 'number' &&
      typeof segment.arousal === 'number' &&
      segment.start_time >= 0 &&
      segment.end_time > segment.start_time &&
      segment.confidence >= 0 && segment.confidence <= 1 &&
      segment.valence >= -1 && segment.valence <= 1 &&
      segment.arousal >= 0 && segment.arousal <= 1
    );
  },

  /**
   * Calculate emotion intensity score
   */
  calculateEmotionIntensity: (segment: EmotionSegment): number => {
    // Combine arousal, confidence, and valence extremity
    const valenceExtremity = Math.abs(segment.valence);
    return (segment.arousal * 0.4) + 
           (segment.confidence * 0.4) + 
           (valenceExtremity * 0.2);
  },

  /**
   * Create gradient definition for D3.js
   */
  createGradient: (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    id: string,
    colors: string[],
    direction: 'horizontal' | 'vertical' = 'vertical'
  ): void => {
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', id)
      .attr('x1', direction === 'horizontal' ? '0%' : '0%')
      .attr('y1', direction === 'horizontal' ? '0%' : '0%')
      .attr('x2', direction === 'horizontal' ? '100%' : '0%')
      .attr('y2', direction === 'horizontal' ? '0%' : '100%');

    colors.forEach((color, index) => {
      gradient.append('stop')
        .attr('offset', `${(index / (colors.length - 1)) * 100}%`)
        .attr('stop-color', color)
        .attr('stop-opacity', 0.8);
    });
  }
};

import { useState, useCallback } from 'react';

// Custom hooks for visualizations
export const useVisualizationUtils = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 400 });

  const handleExport = useCallback(async (
    element: HTMLElement, 
    filename: string, 
    format: 'png' | 'jpeg' = 'png'
  ) => {
    setIsExporting(true);
    try {
      await visualizationUtils.exportAsImage(element, filename, format);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const updateDimensions = useCallback((container: HTMLElement) => {
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      setDimensions(visualizationUtils.getResponsiveDimensions(width, height));
    }
  }, []);

  return {
    isExporting,
    dimensions,
    handleExport,
    updateDimensions,
    ...visualizationUtils
  };
};