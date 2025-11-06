/**
 * InteractiveTimeline - Advanced timeline with scrubbing and navigation
 * Provides interactive timeline with seek functionality, chapter markers, and real-time position tracking
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCinematographyStore, useProcessingStore } from '../../stores';
import type { EmotionSegment, ShotDecision } from '../../types';

interface InteractiveTimelineProps {
  /** Total duration in seconds */
  duration: number;
  /** Height of the timeline in pixels */
  height?: number;
  /** Whether to show emotion segments */
  showEmotions?: boolean;
  /** Whether to show shot decisions */
  showShots?: boolean;
  /** Whether to show chapter markers */
  showChapters?: boolean;
  /** Whether timeline is interactive */
  interactive?: boolean;
  /** Time change handler */
  onTimeChange?: (time: number) => void;
  /** Chapter markers */
  chapters?: Array<{
    time: number;
    title: string;
    type: 'emotion' | 'shot' | 'tension' | 'custom';
  }>;
  /** Custom markers */
  markers?: Array<{
    time: number;
    label: string;
    color: string;
  }>;
}

interface TimelineMarker {
  time: number;
  type: 'emotion' | 'shot' | 'chapter' | 'custom';
  label: string;
  color: string;
  data?: any;
}

export const InteractiveTimeline: React.FC<InteractiveTimelineProps> = ({
  duration,
  height = 120,
  showEmotions = true,
  showShots = true,
  showChapters = true,
  interactive = true,
  onTimeChange,
  chapters = [],
  markers = []
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Store state
  const { 
    currentTime, 
    setCurrentTime,
    emotionAnalysis,
    shotDecisions,
    tensionData
  } = useCinematographyStore();
  
  const { recentEvents } = useProcessingStore();
  
  // Component state
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportStart, setViewportStart] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<TimelineMarker | null>(null);
  
  // Animation frame for playback
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  
  // Update timeline width
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.getBoundingClientRect().width);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Generate timeline markers
  const timelineMarkers = useMemo(() => {
    const markers: TimelineMarker[] = [];
    
    // Emotion segment markers
    if (showEmotions && emotionAnalysis) {
      emotionAnalysis.segments.forEach((segment, index) => {
        markers.push({
          time: segment.start_time,
          type: 'emotion',
          label: `${segment.emotion} (${Math.round(segment.confidence * 100)}%)`,
          color: '#3b82f6',
          data: { segment, index, isStart: true }
        });
        
        markers.push({
          time: segment.end_time,
          type: 'emotion',
          label: `${segment.emotion} end`,
          color: '#93c5fd',
          data: { segment, index, isEnd: true }
        });
      });
    }
    
    // Shot decision markers
    if (showShots && shotDecisions) {
      shotDecisions.forEach((shot, index) => {
        markers.push({
          time: shot.start_time,
          type: 'shot',
          label: `${shot.selected_shot} - ${shot.vertical_angle}`,
          color: '#10b981',
          data: { shot, index, isStart: true }
        });
        
        markers.push({
          time: shot.end_time,
          type: 'shot',
          label: 'Shot end',
          color: '#86efac',
          data: { shot, index, isEnd: true }
        });
      });
    }
    
    // Chapter markers
    if (showChapters) {
      chapters.forEach(chapter => {
        markers.push({
          time: chapter.time,
          type: 'chapter',
          label: chapter.title,
          color: '#f59e0b',
          data: chapter
        });
      });
    }
    
    // Custom markers
    markers.forEach(marker => {
      markers.push({
        time: marker.time,
        type: 'custom',
        label: marker.label,
        color: marker.color,
        data: marker
      });
    });
    
    return markers.sort((a, b) => a.time - b.time);
  }, [emotionAnalysis, shotDecisions, chapters, markers, showEmotions, showShots, showChapters]);
  
  // Playback animation
  const animate = useCallback(() => {
    if (!isPlaying || currentTime >= duration) {
      setIsPlaying(false);
      return;
    }
    
    const now = Date.now();
    const deltaTime = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;
    
    const newTime = Math.min(currentTime + (deltaTime * playbackSpeed), duration);
    setCurrentTime(newTime);
    onTimeChange?.(newTime);
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, currentTime, duration, playbackSpeed, setCurrentTime, onTimeChange]);
  
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate]);
  
  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = timelineWidth;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size for retina displays
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f9fafb');
    gradient.addColorStop(1, '#f3f4f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Time markers
    const timeStep = Math.max(1, Math.floor(duration / 20)); // Show ~20 markers max
    for (let time = 0; time <= duration; time += timeStep) {
      const x = (time / duration) * width;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${time}s`, x, height - 5);
    }
    
    ctx.setLineDash([]);
    
    // Draw emotion segments
    if (showEmotions && emotionAnalysis) {
      emotionAnalysis.segments.forEach(segment => {
        const segmentWidth = ((segment.end_time - segment.start_time) / duration) * width;
        const segmentX = (segment.start_time / duration) * width;
        
        // Emotion color (simplified)
        const colors: Record<string, string> = {
          'happy': '#fbbf24',
          'sad': '#60a5fa',
          'angry': '#f87171',
          'fear': '#a78bfa',
          'surprise': '#fb7185',
          'neutral': '#d1d5db'
        };
        
        ctx.fillStyle = colors[segment.emotion] || colors.neutral;
        ctx.globalAlpha = 0.6;
        
        // Draw segment bar
        ctx.fillRect(segmentX, 10, segmentWidth, height - 40);
        
        ctx.globalAlpha = 1;
      });
    }
    
    // Draw shot segments
    if (showShots && shotDecisions) {
      shotDecisions.forEach(shot => {
        const shotWidth = ((shot.end_time - shot.start_time) / duration) * width;
        const shotX = (shot.start_time / duration) * width;
        
        // Shot type color
        const colors: Record<string, string> = {
          'ECU': '#ef4444',
          'CU': '#f97316',
          'MCU': '#eab308',
          'MS': '#22c55e',
          'MLS': '#06b6d4',
          'LS': '#3b82f6'
        };
        
        ctx.fillStyle = colors[shot.selected_shot] || '#6b7280';
        ctx.globalAlpha = 0.4;
        
        // Draw shot bar
        ctx.fillRect(shotX, height - 30, shotWidth, 20);
        
        ctx.globalAlpha = 1;
      });
    }
    
    // Draw tension overlay
    if (tensionData && tensionData.dramatic_moments) {
      tensionData.dramatic_moments.forEach(moment => {
        if (emotionAnalysis && emotionAnalysis.segments[moment.segment_index]) {
          const segment = emotionAnalysis.segments[moment.segment_index];
          const segmentX = (segment.start_time / duration) * width;
          const segmentWidth = ((segment.end_time - segment.start_time) / duration) * width;
          
          // Tension intensity visualization
          const intensity = moment.tension_level;
          ctx.fillStyle = intensity > 0.7 ? '#dc2626' : intensity > 0.4 ? '#f59e0b' : '#fbbf24';
          ctx.globalAlpha = intensity * 0.3;
          
          ctx.fillRect(segmentX, 0, segmentWidth, height);
          
          ctx.globalAlpha = 1;
        }
      });
    }
    
    // Draw current time indicator
    if (currentTime !== null) {
      const currentX = (currentTime / duration) * width;
      
      // Main line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, height);
      ctx.stroke();
      
      // Triangle head
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX - 5, -5);
      ctx.lineTo(currentX + 5, -5);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw hover indicator
    if (hoveredTime !== null && isHovered) {
      const hoverX = (hoveredTime / duration) * width;
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw markers
    timelineMarkers.forEach(marker => {
      const markerX = (marker.time / duration) * width;
      
      ctx.fillStyle = marker.color;
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = 2;
      
      // Draw marker shape based on type
      switch (marker.type) {
        case 'emotion':
          ctx.beginPath();
          ctx.arc(markerX, height / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'shot':
          ctx.beginPath();
          ctx.moveTo(markerX, height / 2 - 5);
          ctx.lineTo(markerX - 4, height / 2 + 5);
          ctx.lineTo(markerX + 4, height / 2 + 5);
          ctx.closePath();
          ctx.fill();
          break;
        case 'chapter':
          ctx.fillRect(markerX - 2, 5, 4, height - 10);
          break;
        case 'custom':
          ctx.fillRect(markerX - 3, height / 2 - 3, 6, 6);
          break;
      }
    });
    
  }, [timelineWidth, height, duration, currentTime, hoveredTime, isHovered, emotionAnalysis, shotDecisions, tensionData, timelineMarkers, showEmotions, showShots]);
  
  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !interactive) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineWidth) * duration;
    
    setHoveredTime(Math.max(0, Math.min(duration, time)));
    
    // Find hovered marker
    const hoveredMarker = timelineMarkers.find(marker => {
      const markerX = (marker.time / duration) * timelineWidth;
      return Math.abs(markerX - x) < 10;
    });
    
    setHoveredMarker(hoveredMarker || null);
    
    // Handle dragging
    if (isDragging) {
      setCurrentTime(time);
      onTimeChange?.(time);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineWidth) * duration;
    
    setIsDragging(true);
    setCurrentTime(time);
    onTimeChange?.(time);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || hoveredMarker) return;
    
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineWidth) * duration;
    
    setCurrentTime(time);
    onTimeChange?.(time);
  };
  
  const handleMarkerClick = (marker: TimelineMarker, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMarker(marker);
    setCurrentTime(marker.time);
    onTimeChange?.(marker.time);
  };
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!interactive) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowLeft':
          setCurrentTime(Math.max(0, currentTime - 1));
          onTimeChange?.(Math.max(0, currentTime - 1));
          break;
        case 'ArrowRight':
          setCurrentTime(Math.min(duration, currentTime + 1));
          onTimeChange?.(Math.min(duration, currentTime + 1));
          break;
        case 'ArrowUp':
          setPlaybackSpeed(Math.min(4, playbackSpeed + 0.5));
          break;
        case 'ArrowDown':
          setPlaybackSpeed(Math.max(0.25, playbackSpeed - 0.5));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [interactive, isPlaying, currentTime, duration, playbackSpeed, setCurrentTime, onTimeChange]);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Interactive Timeline</h3>
          
          <div className="flex items-center space-x-4">
            {/* Playback controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                disabled={!interactive}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <div className="flex items-center space-x-1 text-sm">
                <span className="text-gray-600">Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  disabled={!interactive}
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>
            
            {/* Current time display */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Time:</span>
              <span className="font-mono font-medium">
                {currentTime !== null ? currentTime.toFixed(1) : '0.0'}s / {duration.toFixed(1)}s
              </span>
            </div>
            
            {/* Toggle controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {/* Toggle emotions */}}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  showEmotions 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Emotions
              </button>
              <button
                onClick={() => {/* Toggle shots */}}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  showShots 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Shots
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div 
        ref={timelineRef}
        className={`relative ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoveredTime(null);
          setHoveredMarker(null);
          setIsDragging(false);
        }}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Interactive markers */}
        {timelineMarkers.map((marker, index) => {
          const markerX = (marker.time / duration) * timelineWidth;
          
          return (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-2 hover:w-3 transition-all cursor-pointer z-10"
              style={{ left: `${markerX}px`, transform: 'translateX(-50%)' }}
              onClick={(e) => handleMarkerClick(marker, e)}
              onMouseEnter={() => setHoveredMarker(marker)}
              onMouseLeave={() => setHoveredMarker(null)}
            >
              <div 
                className="w-full h-full"
                style={{ backgroundColor: marker.color }}
              />
            </div>
          );
        })}
        
        {/* Hover tooltip */}
        {hoveredMarker && (
          <div 
            className="absolute bg-gray-900 text-white p-2 rounded shadow-lg text-xs z-20 pointer-events-none"
            style={{
              left: `${(hoveredMarker.time / duration) * timelineWidth}px`,
              top: '-40px',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-medium">{hoveredMarker.label}</div>
            <div>Time: {hoveredMarker.time.toFixed(1)}s</div>
            <div>Type: {hoveredMarker.type}</div>
          </div>
        )}
        
        {/* Hover time tooltip */}
        {hoveredTime !== null && isHovered && !hoveredMarker && (
          <div 
            className="absolute bg-gray-900 text-white px-2 py-1 rounded shadow-lg text-xs z-20 pointer-events-none"
            style={{
              left: `${(hoveredTime / duration) * timelineWidth}px`,
              bottom: '30px',
              transform: 'translateX(-50%)'
            }}
          >
            {hoveredTime.toFixed(1)}s
          </div>
        )}
      </div>
      
      {/* Selected marker details */}
      {selectedMarker && (
        <div className="px-4 py-3 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium text-blue-900">Selected: </span>
              <span className="text-blue-700">{selectedMarker.label}</span>
              <span className="text-blue-600 ml-2">({selectedMarker.time.toFixed(1)}s)</span>
            </div>
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-blue-600 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Footer with keyboard shortcuts */}
      {interactive && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            Keyboard shortcuts: Space (play/pause) • ← → (seek) • ↑ ↓ (speed)
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveTimeline;