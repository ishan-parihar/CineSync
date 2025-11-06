/**
 * Enhanced EmotionTimeline - Advanced multi-layer timeline with D3.js
 * Features zoom, pan, real-time updates, and detailed emotion analysis
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2,
  ZoomIn,
  ZoomOut,
  Download,
  Layers,
  Clock,
  Activity,
  Settings,
  Maximize2
} from 'lucide-react';
import type { EmotionSegment } from '../../types';

interface EnhancedEmotionTimelineProps {
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

// Enhanced emotion color mapping
const EMOTION_COLORS = {
  joy: '#10b981',
  sadness: '#3b82f6',
  anger: '#ef4444',
  fear: '#a855f7',
  surprise: '#f59e0b',
  disgust: '#84cc16',
  neutral: '#6b7280'
};

// Timeline layer configurations
const TIMELINE_LAYERS = {
  emotions: { height: 60, color: '#3b82f6', label: 'Emotions' },
  confidence: { height: 40, color: '#10b981', label: 'Confidence' },
  arousal: { height: 40, color: '#f59e0b', label: 'Arousal' },
  valence: { height: 40, color: '#ef4444', label: 'Valence' }
};

export const EnhancedEmotionTimeline: React.FC<EnhancedEmotionTimelineProps> = ({
  segments,
  selectedSegments,
  onSegmentClick,
  onSegmentEdit,
  audioDuration,
  showConfidence = true,
  showArousal = true,
  showValence = true,
  enableRealTime = false,
  width = 1200,
  height = 400,
  theme = 'light'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<EmotionSegment>>({});
  const [zoomState, setZoomState] = useState({ scale: 1, translateX: 0 });
  const [visibleLayers, setVisibleLayers] = useState({
    emotions: true,
    confidence: showConfidence,
    arousal: showArousal,
    valence: showValence
  });
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (audioDuration) return audioDuration;
    return Math.max(...segments.map(s => s.end_time), 0);
  }, [segments, audioDuration]);

  // Process timeline data
  const timelineData = useMemo(() => {
    return segments.map((segment, index) => ({
      index,
      emotion: segment.emotion,
      confidence: segment.confidence,
      valence: segment.valence,
      arousal: segment.arousal,
      start_time: segment.start_time,
      end_time: segment.end_time,
      duration: segment.end_time - segment.start_time,
      color: EMOTION_COLORS[segment.emotion] || EMOTION_COLORS.neutral,
      isSelected: selectedSegments.includes(index),
      x: (segment.start_time / totalDuration) * width,
      width: ((segment.end_time - segment.start_time) / totalDuration) * width
    }));
  }, [segments, selectedSegments, totalDuration, width]);

  // D3.js timeline visualization
  useEffect(() => {
    if (!svgRef.current || timelineData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create time scale
    const timeScale = d3.scaleLinear()
      .domain([0, totalDuration])
      .range([0, width]);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        const { transform } = event;
        setZoomState({
          scale: transform.k,
          translateX: transform.x
        });
        
        timelineGroup.attr('transform', transform);
      });

    svg.call(zoom);

    // Main timeline group
    const timelineGroup = svg.append('g')
      .attr('class', 'timeline-group');

    // Background
    timelineGroup.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', theme === 'dark' ? '#1f2937' : '#f9fafb');

    // Time ruler
    const rulerGroup = timelineGroup.append('g')
      .attr('class', 'time-ruler');

    // Time markers
    const timeMarkers = rulerGroup.selectAll('.time-marker')
      .data(d3.range(0, totalDuration + 1, Math.max(1, Math.floor(totalDuration / 10))))
      .enter()
      .append('g')
      .attr('class', 'time-marker');

    timeMarkers.append('line')
      .attr('x1', d => timeScale(d))
      .attr('x2', d => timeScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    timeMarkers.append('text')
      .attr('x', d => timeScale(d))
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '12px')
      .text(d => `${d.toFixed(1)}s`);

    let currentY = 20;

    // Emotion layer
    if (visibleLayers.emotions) {
      const emotionLayer = timelineGroup.append('g')
        .attr('class', 'emotion-layer')
        .attr('transform', `translate(0, ${currentY})`);

      // Layer background
      emotionLayer.append('rect')
        .attr('width', width)
        .attr('height', TIMELINE_LAYERS.emotions.height)
        .attr('fill', theme === 'dark' ? '#374151' : '#e5e7eb')
        .attr('opacity', 0.2)
        .attr('rx', 4);

      // Emotion segments
      const emotionSegments = emotionLayer.selectAll('.emotion-segment')
        .data(timelineData)
        .enter()
        .append('g')
        .attr('class', 'emotion-segment')
        .attr('transform', d => `translate(${d.x}, 0)`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          onSegmentClick(d.index);
        })
        .on('dblclick', (event, d) => {
          event.stopPropagation();
          setEditingIndex(d.index);
          setEditForm(segments[d.index]);
        })
        .on('mouseenter', (event, d) => {
          setHoveredSegment(d.index);
        })
        .on('mouseleave', () => {
          setHoveredSegment(null);
        });

      emotionSegments.append('rect')
        .attr('width', d => Math.max(2, d.width))
        .attr('height', TIMELINE_LAYERS.emotions.height - 10)
        .attr('y', 5)
        .attr('fill', d => d.color)
        .attr('opacity', d => d.isSelected ? 1 : 0.8)
        .attr('rx', 2)
        .attr('stroke', d => d.isSelected ? '#1f2937' : 'none')
        .attr('stroke-width', d => d.isSelected ? 2 : 0);

      emotionSegments.append('text')
        .attr('x', d => d.width / 2)
        .attr('y', TIMELINE_LAYERS.emotions.height / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(d => d.emotion.length > 8 ? d.emotion.substring(0, 8) + '...' : d.emotion)
        .style('display', d => d.width > 30 ? 'block' : 'none');

      // Layer label
      emotionLayer.append('text')
        .attr('x', 10)
        .attr('y', -5)
        .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Emotions');

      currentY += TIMELINE_LAYERS.emotions.height + 20;
    }

    // Confidence layer
    if (visibleLayers.confidence) {
      const confidenceLayer = timelineGroup.append('g')
        .attr('class', 'confidence-layer')
        .attr('transform', `translate(0, ${currentY})`);

      confidenceLayer.append('rect')
        .attr('width', width)
        .attr('height', TIMELINE_LAYERS.confidence.height)
        .attr('fill', theme === 'dark' ? '#374151' : '#e5e7eb')
        .attr('opacity', 0.2)
        .attr('rx', 4);

      // Confidence line chart
      const confidenceLine = d3.line<{ time: number; confidence: number }>()
        .x(d => timeScale(d.time))
        .y(d => (1 - d.confidence) * TIMELINE_LAYERS.confidence.height)
        .curve(d3.curveMonotoneX);

      const confidenceData = timelineData.map(d => ({
        time: d.start_time + d.duration / 2,
        confidence: d.confidence
      }));

      confidenceLayer.append('path')
        .datum(confidenceData)
        .attr('fill', 'none')
        .attr('stroke', TIMELINE_LAYERS.confidence.color)
        .attr('stroke-width', 2)
        .attr('d', confidenceLine);

      // Confidence area
      const confidenceArea = d3.area<{ time: number; confidence: number }>()
        .x(d => timeScale(d.time))
        .y0(TIMELINE_LAYERS.confidence.height)
        .y1(d => (1 - d.confidence) * TIMELINE_LAYERS.confidence.height)
        .curve(d3.curveMonotoneX);

      confidenceLayer.append('path')
        .datum(confidenceData)
        .attr('fill', TIMELINE_LAYERS.confidence.color)
        .attr('opacity', 0.2)
        .attr('d', confidenceArea);

      confidenceLayer.append('text')
        .attr('x', 10)
        .attr('y', -5)
        .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Confidence');

      currentY += TIMELINE_LAYERS.confidence.height + 20;
    }

    // Arousal layer
    if (visibleLayers.arousal) {
      const arousalLayer = timelineGroup.append('g')
        .attr('class', 'arousal-layer')
        .attr('transform', `translate(0, ${currentY})`);

      arousalLayer.append('rect')
        .attr('width', width)
        .attr('height', TIMELINE_LAYERS.arousal.height)
        .attr('fill', theme === 'dark' ? '#374151' : '#e5e7eb')
        .attr('opacity', 0.2)
        .attr('rx', 4);

      const arousalLine = d3.line<{ time: number; arousal: number }>()
        .x(d => timeScale(d.time))
        .y(d => (1 - d.arousal) * TIMELINE_LAYERS.arousal.height)
        .curve(d3.curveMonotoneX);

      const arousalData = timelineData.map(d => ({
        time: d.start_time + d.duration / 2,
        arousal: d.arousal
      }));

      arousalLayer.append('path')
        .datum(arousalData)
        .attr('fill', 'none')
        .attr('stroke', TIMELINE_LAYERS.arousal.color)
        .attr('stroke-width', 2)
        .attr('d', arousalLine);

      arousalLayer.append('text')
        .attr('x', 10)
        .attr('y', -5)
        .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Arousal');

      currentY += TIMELINE_LAYERS.arousal.height + 20;
    }

    // Valence layer
    if (visibleLayers.valence) {
      const valenceLayer = timelineGroup.append('g')
        .attr('class', 'valence-layer')
        .attr('transform', `translate(0, ${currentY})`);

      valenceLayer.append('rect')
        .attr('width', width)
        .attr('height', TIMELINE_LAYERS.valence.height)
        .attr('fill', theme === 'dark' ? '#374151' : '#e5e7eb')
        .attr('opacity', 0.2)
        .attr('rx', 4);

      const valenceLine = d3.line<{ time: number; valence: number }>()
        .x(d => timeScale(d.time))
        .y(d => (1 - (d.valence + 1) / 2) * TIMELINE_LAYERS.valence.height)
        .curve(d3.curveMonotoneX);

      const valenceData = timelineData.map(d => ({
        time: d.start_time + d.duration / 2,
        valence: d.valence
      }));

      valenceLayer.append('path')
        .datum(valenceData)
        .attr('fill', 'none')
        .attr('stroke', TIMELINE_LAYERS.valence.color)
        .attr('stroke-width', 2)
        .attr('d', valenceLine);

      // Zero line (neutral valence)
      valenceLayer.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', TIMELINE_LAYERS.valence.height / 2)
        .attr('y2', TIMELINE_LAYERS.valence.height / 2)
        .attr('stroke', theme === 'dark' ? '#6b7280' : '#9ca3af')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.5);

      valenceLayer.append('text')
        .attr('x', 10)
        .attr('y', -5)
        .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Valence');
    }

    // Playhead
    const playhead = timelineGroup.append('g')
      .attr('class', 'playhead')
      .style('pointer-events', 'none');

    playhead.append('line')
      .attr('x1', timeScale(currentTime))
      .attr('x2', timeScale(currentTime))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8);

    playhead.append('polygon')
      .attr('points', `${timeScale(currentTime)},0 ${timeScale(currentTime) - 5},10 ${timeScale(currentTime) + 5},10`)
      .attr('fill', '#ef4444')
      .attr('opacity', 0.8);

  }, [timelineData, totalDuration, width, height, theme, visibleLayers, currentTime, onSegmentClick]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSkipBackward = useCallback(() => {
    setCurrentTime(Math.max(0, currentTime - 5));
  }, [currentTime]);

  const handleSkipForward = useCallback(() => {
    setCurrentTime(Math.min(totalDuration, currentTime + 5));
  }, [currentTime, totalDuration]);

  // Time update effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  }, []);

  // Export functionality
  const handleExport = useCallback(async () => {
    if (!containerRef.current) return;

    try {
const canvas = await html2canvas(containerRef.current, {
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 2
        } as any);
      
      const link = document.createElement('a');
      link.download = `emotion-timeline-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [theme]);

  // Layer toggle
  const toggleLayer = useCallback((layer: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  }, []);

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
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Advanced Emotion Timeline
          </h3>
          
          <div className="flex items-center space-x-2">
            {/* Layer controls */}
            <div className="flex items-center space-x-1 mr-4">
              <Layers size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              {Object.entries(TIMELINE_LAYERS).map(([key, layer]) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key as keyof typeof visibleLayers)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    visibleLayers[key as keyof typeof visibleLayers]
                      ? 'text-white'
                      : `${theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'}`
                  }`}
                  style={{
                    backgroundColor: visibleLayers[key as keyof typeof visibleLayers] ? layer.color : undefined
                  }}
                  title={layer.label}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleZoomIn}
                className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
            </div>

            {/* Export and fullscreen */}
            <button
              onClick={handleExport}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Export Timeline"
            >
              <Download size={16} />
            </button>

            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Playback controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Playback buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSkipBackward}
                className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                title="Skip Backward 5s"
              >
                <SkipBack size={16} />
              </button>
              
              <button
                onClick={handlePlayPause}
                className={`p-3 rounded-full ${theme === 'dark' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'} transition-colors`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <button
                onClick={handleSkipForward}
                className={`p-2 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                title="Skip Forward 5s"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Time display */}
            <div className="flex items-center space-x-2">
              <Clock size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              <span className={`font-mono text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex-1 max-w-md">
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.1"
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / totalDuration) * 100}%, ${theme === 'dark' ? '#374151' : '#e5e7eb'} ${(currentTime / totalDuration) * 100}%, ${theme === 'dark' ? '#374151' : '#e5e7eb'} 100%)`
                }}
              />
            </div>
          </div>

          {/* Zoom indicator */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
            Zoom: {(zoomState.scale * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Timeline visualization */}
      <div 
        ref={containerRef}
        className={`relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} overflow-hidden`}
        style={{ height: 'calc(100% - 140px)' }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-full"
        />
        
        {/* Hover tooltip */}
        {hoveredSegment !== null && (
          <div 
            className={`absolute p-3 rounded-lg shadow-xl border pointer-events-none z-10 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
            style={{
              left: timelineData[hoveredSegment]?.x || 0,
              top: 20,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm space-y-1">
              <div className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {timelineData[hoveredSegment]?.emotion}
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Time: {timelineData[hoveredSegment]?.start_time.toFixed(1)}s - {timelineData[hoveredSegment]?.end_time.toFixed(1)}s
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Duration: {timelineData[hoveredSegment]?.duration.toFixed(1)}s
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Confidence: {(timelineData[hoveredSegment]?.confidence * 100).toFixed(1)}%
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Valence: {timelineData[hoveredSegment]?.valence.toFixed(2)}
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Arousal: {timelineData[hoveredSegment]?.arousal.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingIndex !== null && (
        <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20`}>
          <div className={`w-full max-w-md p-6 rounded-lg shadow-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <h4 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Edit Emotion Segment
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Emotion
                </label>
                <select
                  value={editForm.emotion || ''}
                  onChange={(e) => setEditForm({ ...editForm, emotion: e.target.value })}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Select emotion...</option>
                  {Object.keys(EMOTION_COLORS).map(emotion => (
                    <option key={emotion} value={emotion}>{emotion}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start Time
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.start_time || 0}
                    onChange={(e) => setEditForm({ ...editForm, start_time: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-md border ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    End Time
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.end_time || 0}
                    onChange={(e) => setEditForm({ ...editForm, end_time: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-md border ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Confidence
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={editForm.confidence || 0}
                  onChange={(e) => setEditForm({ ...editForm, confidence: parseFloat(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-md border ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEditingIndex(null);
                  setEditForm({});
                }}
                className={`px-4 py-2 rounded-md ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors`}
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (editingIndex !== null && editForm) {
                    onSegmentEdit(editingIndex, editForm);
                    setEditingIndex(null);
                    setEditForm({});
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-blue-50'}`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-blue-700'}`}>
          <strong>Interactive Controls:</strong> Click segments to select, double-click to edit. 
          Use playback controls to navigate timeline. Toggle layers to customize view. 
          Scroll to zoom, drag to pan.
        </p>
      </div>
    </div>
  );
};

export const EmotionTimeline = EnhancedEmotionTimeline;
export default EmotionTimeline;