/**
 * EmotionAnalysisViewer - Real-time emotion segment visualization
 * Provides live visualization of emotion analysis with confidence indicators
 * and interactive timeline scrubbing functionality
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCinematographyStore, useProcessingStore } from '../../stores';
import type { EmotionSegment, EmotionAnalysis } from '../../types';

interface EmotionAnalysisViewerProps {
  /** Height of the visualization in pixels */
  height?: number;
  /** Whether to show confidence indicators */
  showConfidence?: boolean;
  /** Whether to show secondary emotions */
  showSecondary?: boolean;
  /** Whether timeline is interactive */
  interactive?: boolean;
  /** Color scheme for emotions */
  emotionColors?: Record<string, string>;
  /** Time change handler */
  onTimeChange?: (time: number) => void;
  /** Segment selection handler */
  onSegmentSelect?: (segment: EmotionSegment, index: number) => void;
}

const DEFAULT_EMOTION_COLORS: Record<string, string> = {
  'happy': '#FFD700',
  'sad': '#4169E1',
  'angry': '#DC143C',
  'fear': '#8B008B',
  'surprise': '#FF69B4',
  'disgust': '#228B22',
  'neutral': '#808080',
  'excited': '#FF6347',
  'calm': '#87CEEB',
  'anxious': '#FFA500',
  'confident': '#32CD32',
  'romantic': '#FF1493',
  'contemplative': '#9370DB',
  'playful': '#FFB6C1',
  'serious': '#2F4F4F'
};

export const EmotionAnalysisViewer: React.FC<EmotionAnalysisViewerProps> = ({
  height = 200,
  showConfidence = true,
  showSecondary = false,
  interactive = true,
  emotionColors = DEFAULT_EMOTION_COLORS,
  onTimeChange,
  onSegmentSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store state
  const { 
    emotionAnalysis, 
    currentTime, 
    setCurrentTime,
    selectedSegmentIndex,
    setSelectedSegment 
  } = useCinematographyStore();
  
  const { recentEvents } = useProcessingStore();
  
  // Component state
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [localShowConfidence, setLocalShowConfidence] = useState(showConfidence);
  const [localShowSecondary, setLocalShowSecondary] = useState(showSecondary);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height });
  const [animationFrame, setAnimationFrame] = useState(0);
  
  // Animation for real-time updates
  useEffect(() => {
    if (!recentEvents.length) return;
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
    }, 100);
    
    return () => clearInterval(interval);
  }, [recentEvents.length]);
  
  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [height]);
  
  // Draw emotion timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !emotionAnalysis) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvasSize;
    const { segments, duration } = emotionAnalysis;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Time markers
    const timeIntervals = 5; // Show markers every 5 seconds
    for (let i = 0; i <= duration; i += timeIntervals) {
      const x = (i / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${i}s`, x + 2, height - 5);
    }
    
    ctx.setLineDash([]);
    
    // Draw emotion segments
    segments.forEach((segment, index) => {
      const segmentWidth = ((segment.end_time - segment.start_time) / duration) * width;
      const segmentX = (segment.start_time / duration) * width;
      
      // Primary emotion color
      const primaryColor = emotionColors[segment.emotion] || DEFAULT_EMOTION_COLORS.neutral;
      
      // Adjust opacity based on confidence
      const opacity = showConfidence ? 0.3 + (segment.confidence * 0.7) : 1;
      
      // Draw segment bar
      ctx.fillStyle = primaryColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
      
      // Add pulsing effect for currently processing segment
      let segmentHeight = height - 30;
      if (hoveredSegment === index || selectedSegmentIndex === index) {
        segmentHeight += 5;
      }
      
      // Add animation for recent updates
      if (recentEvents.some(event => 
        event.type === 'emotion_segment_processed' && 
        event.data?.segment_index === index
      )) {
        const pulse = Math.sin(animationFrame * 0.1) * 2 + 2;
        segmentHeight += pulse;
      }
      
      ctx.fillRect(segmentX, 10, segmentWidth, segmentHeight);
      
      // Draw confidence indicator
      if (showConfidence) {
        ctx.fillStyle = '#000000';
        ctx.font = '9px sans-serif';
        ctx.fillText(
          `${Math.round(segment.confidence * 100)}%`,
          segmentX + 2,
          25
        );
      }
      
      // Draw secondary emotion if present
      if (showSecondary && segment.secondary_emotion) {
        const secondaryColor = emotionColors[segment.secondary_emotion] || DEFAULT_EMOTION_COLORS.neutral;
        const secondaryOpacity = segment.secondary_confidence ? 
          0.3 + (segment.secondary_confidence * 0.7) : 0.5;
        
        ctx.fillStyle = secondaryColor + Math.floor(secondaryOpacity * 255).toString(16).padStart(2, '0');
        ctx.fillRect(segmentX, height - 20, segmentWidth, 10);
      }
      
      // Draw emotion label
      ctx.fillStyle = '#000000';
      ctx.font = '11px sans-serif';
      const textWidth = ctx.measureText(segment.emotion).width;
      if (textWidth < segmentWidth - 4) {
        ctx.fillText(
          segment.emotion,
          segmentX + segmentWidth / 2 - textWidth / 2,
          height / 2
        );
      }
    });
    
    // Draw current time indicator
    if (currentTime !== null) {
      const currentX = (currentTime / duration) * width;
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, height);
      ctx.stroke();
      
      // Draw time indicator head
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX - 5, -5);
      ctx.lineTo(currentX + 5, -5);
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw selection indicator
    if (selectedSegmentIndex !== null && segments[selectedSegmentIndex]) {
      const segment = segments[selectedSegmentIndex];
      const segmentX = (segment.start_time / duration) * width;
      const segmentWidth = ((segment.end_time - segment.start_time) / duration) * width;
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(segmentX, 8, segmentWidth, height - 16);
    }
    
  }, [emotionAnalysis, currentTime, selectedSegmentIndex, hoveredSegment, canvasSize, showConfidence, showSecondary, emotionColors, animationFrame, recentEvents]);
  
  // Handle mouse events for interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!emotionAnalysis || !interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvasSize.width) * emotionAnalysis.duration;
    
    // Find hovered segment
    const hoveredIndex = emotionAnalysis.segments.findIndex(segment => 
      time >= segment.start_time && time <= segment.end_time
    );
    
    setHoveredSegment(hoveredIndex);
    
    // Handle dragging
    if (isDragging && onTimeChange) {
      setCurrentTime(time);
      onTimeChange(time);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvasSize.width) * emotionAnalysis!.duration;
    
    setIsDragging(true);
    setCurrentTime(time);
    onTimeChange?.(time);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!emotionAnalysis || !interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvasSize.width) * emotionAnalysis.duration;
    
    // Find clicked segment
    const clickedIndex = emotionAnalysis.segments.findIndex(segment => 
      time >= segment.start_time && time <= segment.end_time
    );
    
    if (clickedIndex !== -1) {
      setSelectedSegment(clickedIndex);
      onSegmentSelect?.(emotionAnalysis.segments[clickedIndex], clickedIndex);
    }
  };
  
  // Calculate statistics
  const statistics = useMemo(() => {
    if (!emotionAnalysis) return null;
    
    const { segments } = emotionAnalysis;
    const emotionCounts = segments.reduce((acc, segment) => {
      acc[segment.emotion] = (acc[segment.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgConfidence = segments.reduce((sum, segment) => sum + segment.confidence, 0) / segments.length;
    const avgValence = segments.reduce((sum, segment) => sum + segment.valence, 0) / segments.length;
    const avgArousal = segments.reduce((sum, segment) => sum + segment.arousal, 0) / segments.length;
    
    return {
      totalSegments: segments.length,
      emotionCounts,
      avgConfidence,
      avgValence,
      avgArousal,
      dominantEmotion: Object.entries(emotionCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    };
  }, [emotionAnalysis]);
  
  if (!emotionAnalysis) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No emotion analysis available</p>
          <p className="text-gray-400 text-sm mt-1">Upload audio to start emotion analysis</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Emotion Analysis Timeline</h3>
          <div className="flex items-center space-x-4">
            {/* Statistics */}
            {statistics && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="text-gray-500">Segments:</span>
                  <span className="ml-1 font-medium">{statistics.totalSegments}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500">Avg Confidence:</span>
                  <span className="ml-1 font-medium">{Math.round(statistics.avgConfidence * 100)}%</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500">Dominant:</span>
                  <span className="ml-1 font-medium">{statistics.dominantEmotion}</span>
                </div>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLocalShowConfidence(!localShowConfidence)}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  showConfidence 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Confidence
              </button>
              <button
                onClick={() => setLocalShowSecondary(!localShowSecondary)}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  showSecondary 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Secondary
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeline Canvas */}
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`w-full ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setHoveredSegment(null);
            setIsDragging(false);
          }}
          onClick={handleCanvasClick}
        />
        
        {/* Hover tooltip */}
        {hoveredSegment !== null && emotionAnalysis.segments[hoveredSegment] && (
          <div 
            className="absolute bg-gray-900 text-white p-2 rounded shadow-lg text-xs z-10 pointer-events-none"
            style={{
              left: `${(emotionAnalysis.segments[hoveredSegment].start_time / emotionAnalysis.duration) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-medium">{emotionAnalysis.segments[hoveredSegment].emotion}</div>
            <div>Time: {emotionAnalysis.segments[hoveredSegment].start_time.toFixed(1)}s - {emotionAnalysis.segments[hoveredSegment].end_time.toFixed(1)}s</div>
            <div>Confidence: {Math.round(emotionAnalysis.segments[hoveredSegment].confidence * 100)}%</div>
            <div>Valence: {emotionAnalysis.segments[hoveredSegment].valence.toFixed(2)}</div>
            <div>Arousal: {emotionAnalysis.segments[hoveredSegment].arousal.toFixed(2)}</div>
            {showSecondary && emotionAnalysis.segments[hoveredSegment].secondary_emotion && (
              <div>Secondary: {emotionAnalysis.segments[hoveredSegment].secondary_emotion} ({Math.round((emotionAnalysis.segments[hoveredSegment].secondary_confidence || 0) * 100)}%)</div>
            )}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {interactive && (
              <span>Click to select segment • Drag to scrub timeline</span>
            )}
          </div>
          
          {/* Emotion legend */}
          <div className="flex items-center space-x-3">
            {Object.entries(
              emotionAnalysis.segments.reduce((acc, segment) => {
                acc[segment.emotion] = emotionColors[segment.emotion] || DEFAULT_EMOTION_COLORS.neutral;
                return acc;
              }, {} as Record<string, string>)
            ).slice(0, 8).map(([emotion, color]) => (
              <div key={emotion} className="flex items-center space-x-1">
                <div 
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600">{emotion}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionAnalysisViewer;