/**
 * TensionCurve - Advanced dramatic tension analysis with D3.js
 * Provides real-time tension monitoring, narrative phases, and dramatic moments
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Download, 
  Settings,
  Maximize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import type { EmotionSegment } from '../../types';

interface TensionCurveProps {
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

// Tension level color mapping
const TENSION_COLORS = {
  low: '#10b981',      // Green
  medium: '#f59e0b',   // Amber
  high: '#ef4444',     // Red
  critical: '#7c3aed'  // Purple
};

// Narrative phase colors
const PHASE_COLORS = {
  'exposition': '#3b82f6',
  'rising_action': '#f59e0b',
  'climax': '#ef4444',
  'falling_action': '#8b5cf6',
  'resolution': '#10b981'
};

export const TensionCurve: React.FC<TensionCurveProps> = ({
  segments,
  tensionData,
  currentTime = 0,
  showNarrativePhases = true,
  showDramaticMoments = true,
  enableRealTime = false,
  width = 1000,
  height = 400,
  theme = 'light',
  onTensionPointClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [zoomState, setZoomState] = useState({ scale: 1, translateX: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [smoothingFactor, setSmoothingFactor] = useState(0.3);
  const [tensionSensitivity, setTensionSensitivity] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localShowNarrativePhases, setLocalShowNarrativePhases] = useState(showNarrativePhases);
  const [localShowDramaticMoments, setLocalShowDramaticMoments] = useState(showDramaticMoments);

  // Calculate tension for each segment
  const tensionCurveData = useMemo(() => {
    return segments.map((segment, index) => {
      // Base tension from arousal and valence polarity
      let tension = segment.arousal;
      
      // Increase tension for extreme valence (both positive and negative)
      const valenceExtremity = Math.abs(segment.valence);
      tension += valenceExtremity * 0.3;
      
      // Apply emotion-specific tension modifiers
      const emotionTensionMap: Record<string, number> = {
        fear: 0.8,
        anger: 0.7,
        surprise: 0.6,
        disgust: 0.5,
        sadness: 0.4,
        joy: 0.2,
        neutral: 0.1
      };
      
      tension += (emotionTensionMap[segment.emotion] || 0.3) * tensionSensitivity;
      
      // Apply confidence weighting
      tension *= segment.confidence;
      
      // Normalize to 0-1 range
      tension = Math.max(0, Math.min(1, tension));
      
      // Determine tension level
      let tensionLevel: keyof typeof TENSION_COLORS = 'low';
      if (tension >= 0.8) tensionLevel = 'critical';
      else if (tension >= 0.6) tensionLevel = 'high';
      else if (tension >= 0.4) tensionLevel = 'medium';
      
      return {
        index,
        start_time: segment.start_time,
        end_time: segment.end_time,
        duration: segment.end_time - segment.start_time,
        emotion: segment.emotion,
        tension,
        tensionLevel,
        confidence: segment.confidence,
        valence: segment.valence,
        arousal: segment.arousal,
        x: (segment.start_time + (segment.end_time - segment.start_time) / 2) / Math.max(...segments.map(s => s.end_time)) * width,
        y: height - (tension * (height - 60)) - 30,
        isDramatic: tensionData?.dramatic_moments.some(m => m.segment_index === index),
        isSelected: selectedPoints.includes(index)
      };
    });
  }, [segments, tensionData, tensionSensitivity, width, height, selectedPoints]);

  // Apply smoothing to tension curve
  const smoothedTensionData = useMemo(() => {
    if (tensionCurveData.length === 0) return tensionCurveData;
    
    const smoothed = [...tensionCurveData];
    
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1].tension;
      const current = smoothed[i].tension;
      const next = smoothed[i + 1].tension;
      
      smoothed[i].tension = current * (1 - smoothingFactor) + 
                           ((prev + next) / 2) * smoothingFactor;
      smoothed[i].y = height - (smoothed[i].tension * (height - 60)) - 30;
    }
    
    return smoothed;
  }, [tensionCurveData, smoothingFactor, height]);

  // D3.js visualization setup
  useEffect(() => {
    if (!svgRef.current || smoothedTensionData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, Math.max(...segments.map(s => s.end_time))])
      .range([50, width - 50]);

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - 30, 30]);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        const { transform } = event;
        setZoomState({
          scale: transform.k,
          translateX: transform.x
        });
        
        mainGroup.attr('transform', transform);
      });

    svg.call(zoom);

    // Main group for transformations
    const mainGroup = svg.append('g')
      .attr('class', 'main-group');

    // Background
    mainGroup.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', theme === 'dark' ? '#1f2937' : '#f9fafb')
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 1);

    // Tension level zones
    const tensionZones = [
      { level: 'critical', range: [0.8, 1], color: TENSION_COLORS.critical, opacity: 0.1 },
      { level: 'high', range: [0.6, 0.8], color: TENSION_COLORS.high, opacity: 0.1 },
      { level: 'medium', range: [0.4, 0.6], color: TENSION_COLORS.medium, opacity: 0.1 },
      { level: 'low', range: [0, 0.4], color: TENSION_COLORS.low, opacity: 0.1 }
    ];

    tensionZones.forEach(zone => {
      mainGroup.append('rect')
        .attr('x', 50)
        .attr('y', yScale(zone.range[1]))
        .attr('width', width - 100)
        .attr('height', yScale(zone.range[0]) - yScale(zone.range[1]))
        .attr('fill', zone.color)
        .attr('opacity', zone.opacity);
    });

    // Narrative phase indicators
    if (localShowNarrativePhases && tensionData?.narrative_phase) {
      const phaseColor = PHASE_COLORS[tensionData.narrative_phase as keyof typeof PHASE_COLORS] || '#6b7280';
      
      mainGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', 20)
        .attr('fill', phaseColor)
        .attr('opacity', 0.2);

      mainGroup.append('text')
        .attr('x', width / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', phaseColor)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(`Narrative Phase: ${tensionData.narrative_phase.replace('_', ' ').toUpperCase()}`);
    }

    // Grid lines
    const gridGroup = mainGroup.append('g')
      .attr('class', 'grid');

    // Horizontal grid lines
    gridGroup.selectAll('.grid-line-h')
      .data(d3.range(0, 1.1, 0.2))
      .enter()
      .append('line')
      .attr('class', 'grid-line-h')
      .attr('x1', 50)
      .attr('x2', width - 50)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.5);

    // Vertical grid lines
    const timeMarkers = Math.max(1, Math.floor(Math.max(...segments.map(s => s.end_time)) / 5));
    gridGroup.selectAll('.grid-line-v')
      .data(d3.range(0, Math.max(...segments.map(s => s.end_time)) + 1, timeMarkers))
      .enter()
      .append('line')
      .attr('class', 'grid-line-v')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 30)
      .attr('y2', height - 30)
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.5);

    // Tension curve area
    const tensionArea = d3.area<typeof smoothedTensionData[0]>()
      .x(d => xScale(d.start_time + d.duration / 2))
      .y0(height - 30)
      .y1(d => d.y)
      .curve(d3.curveCardinal);

    mainGroup.append('path')
      .datum(smoothedTensionData)
      .attr('fill', 'url(#tension-gradient)')
      .attr('opacity', 0.3)
      .attr('d', tensionArea);

    // Tension curve line
    const tensionLine = d3.line<typeof smoothedTensionData[0]>()
      .x(d => xScale(d.start_time + d.duration / 2))
      .y(d => d.y)
      .curve(d3.curveCardinal);

    mainGroup.append('path')
      .datum(smoothedTensionData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', tensionLine);

    // Gradient definition
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'tension-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', TENSION_COLORS.critical)
      .attr('stop-opacity', 0.8);

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', TENSION_COLORS.medium)
      .attr('stop-opacity', 0.5);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', TENSION_COLORS.low)
      .attr('stop-opacity', 0.2);

    // Data points
    const points = mainGroup.selectAll('.tension-point')
      .data(smoothedTensionData)
      .enter()
      .append('g')
      .attr('class', 'tension-point')
      .attr('transform', d => `translate(${xScale(d.start_time + d.duration / 2)}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onTensionPointClick?.(d.index, d.tension);
        setSelectedPoints(prev => 
          prev.includes(d.index) 
            ? prev.filter(i => i !== d.index)
            : [...prev, d.index]
        );
      })
      .on('mouseenter', (event, d) => {
        setHoveredPoint(d.index);
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
      });

    // Point circles
    points.append('circle')
      .attr('r', d => d.isDramatic ? 8 : 5)
      .attr('fill', d => TENSION_COLORS[d.tensionLevel])
      .attr('stroke', d => d.isSelected ? '#1f2937' : '#ffffff')
      .attr('stroke-width', d => d.isSelected ? 3 : 2)
      .attr('opacity', d => d.isDramatic ? 1 : 0.8);

    // Dramatic moment indicators
    if (showDramaticMoments) {
      const dramaticPoints = mainGroup.selectAll('.dramatic-point')
        .data(smoothedTensionData.filter(d => d.isDramatic))
        .enter()
        .append('g')
        .attr('class', 'dramatic-point')
        .attr('transform', d => `translate(${xScale(d.start_time + d.duration / 2)}, ${d.y})`);

      dramaticPoints.append('circle')
        .attr('r', 12)
        .attr('fill', 'none')
        .attr('stroke', TENSION_COLORS.critical)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8);

      dramaticPoints.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-15')
        .attr('fill', TENSION_COLORS.critical)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('!');
    }

    // Current time indicator
    if (currentTime > 0) {
      const currentX = xScale(currentTime);
      
      mainGroup.append('line')
        .attr('x1', currentX)
        .attr('x2', currentX)
        .attr('y1', 30)
        .attr('y2', height - 30)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.8);

      mainGroup.append('polygon')
        .attr('points', `${currentX},25 ${currentX - 5},15 ${currentX + 5},15`)
        .attr('fill', '#ef4444')
        .attr('opacity', 0.8);
    }

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${Number(d).toFixed(1)}s`)
      .tickSize(-height + 60);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => Number(d).toFixed(1))
      .tickSize(-width + 100);

    mainGroup.append('g')
      .attr('transform', `translate(0, ${height - 30})`)
      .call(xAxis)
      .attr('color', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '12px');

    mainGroup.append('g')
      .attr('transform', `translate(50, 0)`)
      .call(yAxis)
      .attr('color', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '12px');

    // Axis labels
    mainGroup.append('text')
      .attr('transform', `translate(${width / 2}, ${height - 5})`)
      .attr('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Time (seconds)');

    mainGroup.append('text')
      .attr('transform', 'translate(20, ' + (height / 2) + ') rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Tension Level');

  }, [smoothedTensionData, width, height, theme, localShowNarrativePhases, localShowDramaticMoments, currentTime, segments, onTensionPointClick]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSkipForward = useCallback(() => {
    // Would advance by 5 seconds or next dramatic moment
  }, []);

  const handleSkipBackward = useCallback(() => {
    // Would go back by 5 seconds or previous dramatic moment
  }, []);

  // Export functionality
  const handleExport = useCallback(async (format: 'png' | 'svg') => {
    if (!containerRef.current) return;

    try {
      if (format === 'png') {
        const canvas = await html2canvas(containerRef.current, {
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 2
        } as any);
        
        const link = document.createElement('a');
        link.download = `tension-curve-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else if (format === 'svg' && svgRef.current) {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const link = document.createElement('a');
        link.download = `tension-curve-${Date.now()}.svg`;
        link.href = svgUrl;
        link.click();
        
        URL.revokeObjectURL(svgUrl);
      }
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

  return (
    <div className={`w-full h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg shadow-lg overflow-hidden`}>
      {/* Header with controls */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Activity className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} size={24} />
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Dramatic Tension Analysis
            </h3>
            {tensionData && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium text-white`}
                   style={{ backgroundColor: TENSION_COLORS[tensionData.tension_level] }}>
                {tensionData.tension_level.toUpperCase()} ({(tensionData.tension_score * 100).toFixed(0)}%)
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Playback controls */}
            {enableRealTime && (
              <div className="flex items-center space-x-1 mr-4">
                <button
                  onClick={handleSkipBackward}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                  title="Skip Backward"
                >
                  <SkipBack size={16} />
                </button>
                
                <button
                  onClick={handlePlayPause}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'} transition-colors`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                
                <button
                  onClick={handleSkipForward}
                  className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                  title="Skip Forward"
                >
                  <SkipForward size={16} />
                </button>
              </div>
            )}

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
              onClick={() => handleExport('png')}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Export as PNG"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Smoothing Factor: {smoothingFactor.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={smoothingFactor}
                  onChange={(e) => setSmoothingFactor(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tension Sensitivity: {tensionSensitivity.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={tensionSensitivity}
                  onChange={(e) => setTensionSensitivity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <label className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={localShowNarrativePhases}
                  onChange={(e) => setLocalShowNarrativePhases(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Narrative Phases</span>
              </label>
              
              <label className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={localShowDramaticMoments}
                  onChange={(e) => setLocalShowDramaticMoments(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Dramatic Moments</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Visualization container */}
      <div 
        ref={containerRef}
        className={`relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} overflow-hidden`}
        style={{ height: 'calc(100% - 120px)' }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-full"
        />
        
        {/* Hover tooltip */}
        {hoveredPoint !== null && (
          <div 
            className={`absolute p-3 rounded-lg shadow-xl border pointer-events-none z-10 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
            style={{
              left: smoothedTensionData[hoveredPoint]?.x || 0,
              top: (smoothedTensionData[hoveredPoint]?.y || 0) - 80,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm space-y-1">
              <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Tension: {(smoothedTensionData[hoveredPoint]?.tension * 100).toFixed(1)}%
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Emotion: {smoothedTensionData[hoveredPoint]?.emotion}
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Time: {smoothedTensionData[hoveredPoint]?.start_time.toFixed(1)}s - {smoothedTensionData[hoveredPoint]?.end_time.toFixed(1)}s
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Confidence: {(smoothedTensionData[hoveredPoint]?.confidence * 100).toFixed(1)}%
              </div>
              {smoothedTensionData[hoveredPoint]?.isDramatic && (
                <div className="flex items-center space-x-1 text-red-500">
                  <AlertTriangle size={12} />
                  <span className="text-xs font-medium">Dramatic Moment</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zoom indicator */}
        <div className={`absolute bottom-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
          theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 shadow-md'
        }`}>
          Zoom: {(zoomState.scale * 100).toFixed(0)}%
        </div>
      </div>

      {/* Legend */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Tension Levels:
            </span>
            {Object.entries(TENSION_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center space-x-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </span>
              </div>
            ))}
          </div>
          
          {tensionData?.dramatic_moments && tensionData.dramatic_moments.length > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle size={16} className="text-red-500" />
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {tensionData?.dramatic_moments?.length} Dramatic Moments
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TensionCurve;