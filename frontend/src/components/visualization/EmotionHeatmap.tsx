/**
 * Enhanced EmotionHeatmap - Advanced heatmap visualization with D3.js integration
 * Provides interactive emotion intensity mapping with zoom, pan, and drill-down capabilities
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  RotateCcw, 
  Maximize2,
  Filter,
  Grid3X3
} from 'lucide-react';
import type { EmotionSegment } from '../../types';

interface EnhancedEmotionHeatmapProps {
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

// Enhanced emotion color mapping with gradients
const EMOTION_COLORS = {
  joy: { primary: '#10b981', gradient: ['#34d399', '#10b981', '#059669'] },
  sadness: { primary: '#3b82f6', gradient: ['#60a5fa', '#3b82f6', '#1d4ed8'] },
  anger: { primary: '#ef4444', gradient: ['#f87171', '#ef4444', '#dc2626'] },
  fear: { primary: '#a855f7', gradient: ['#c084fc', '#a855f7', '#9333ea'] },
  surprise: { primary: '#f59e0b', gradient: ['#fbbf24', '#f59e0b', '#d97706'] },
  disgust: { primary: '#84cc16', gradient: ['#bef264', '#84cc16', '#65a30d'] },
  neutral: { primary: '#6b7280', gradient: ['#9ca3af', '#6b7280', '#4b5563'] }
};

export const EnhancedEmotionHeatmap: React.FC<EnhancedEmotionHeatmapProps> = ({
  segments,
  selectedSegments,
  onSegmentClick,
  onSegmentHover,
  showConfidence = true,
  width = 800,
  height = 400,
  enableZoom = true,
  enableExport = true,
  theme = 'light'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomState, setZoomState] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [filteredEmotions, setFilteredEmotions] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Process data for heatmap
  const heatmapData = useMemo(() => {
    return segments.map((segment, index) => {
      const emotion = segment.emotion;
      const colorScheme = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
      
      return {
        index,
        emotion,
        valence: segment.valence,
        arousal: segment.arousal,
        confidence: segment.confidence,
        start_time: segment.start_time,
        end_time: segment.end_time,
        duration: segment.end_time - segment.start_time,
        color: colorScheme.primary,
        gradient: colorScheme.gradient,
        // Position in valence-arousal space
        x: ((segment.valence + 1) / 2) * width, // Normalize valence to 0-1
        y: (1 - segment.arousal) * height, // Invert arousal for correct orientation
        radius: Math.max(20, segment.confidence * 60), // Size based on confidence
        isSelected: selectedSegments.includes(index),
        isFiltered: filteredEmotions.length > 0 && !filteredEmotions.includes(emotion)
      };
    });
  }, [segments, selectedSegments, filteredEmotions, width, height]);

  // D3.js visualization setup
  useEffect(() => {
    if (!svgRef.current || heatmapData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([-1, 1])
      .range([50, width - 50]);

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - 50, 50]);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        const { transform } = event;
        setZoomState({
          scale: transform.k,
          translateX: transform.x,
          translateY: transform.y
        });
        
        g.attr('transform', transform);
      });

    if (enableZoom) {
      svg.call(zoom);
    }

    // Main group for transformations
    const g = svg.append('g');

    // Background
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', theme === 'dark' ? '#1f2937' : '#f9fafb')
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 1);

    // Grid lines
    if (showGrid) {
      // Vertical grid lines (valence)
      g.selectAll('.grid-line-vertical')
        .data(d3.range(-1, 1.1, 0.2))
        .enter()
        .append('line')
        .attr('class', 'grid-line-vertical')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', 50)
        .attr('y2', height - 50)
        .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);

      // Horizontal grid lines (arousal)
      g.selectAll('.grid-line-horizontal')
        .data(d3.range(0, 1.1, 0.2))
        .enter()
        .append('line')
        .attr('class', 'grid-line-horizontal')
        .attr('x1', 50)
        .attr('x2', width - 50)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2')
        .attr('opacity', 0.5);
    }

    // Emotion clusters (Voronoi-like grouping)
    const clusters = g.selectAll('.emotion-cluster')
      .data(heatmapData.filter(d => !d.isFiltered))
      .enter()
      .append('g')
      .attr('class', 'emotion-cluster');

    // Cluster backgrounds (convex hull approximation)
    clusters.each(function(d) {
      const cluster = d3.select(this);
      const nearbyPoints = heatmapData.filter(p => 
        p.emotion === d.emotion && 
        Math.sqrt(Math.pow(p.x - d.x, 2) + Math.pow(p.y - d.y, 2)) < 150
      );

      if (nearbyPoints.length > 2) {
        const circle = cluster.append('circle')
          .attr('cx', d.x)
          .attr('cy', d.y)
          .attr('r', 80)
          .attr('fill', d.color)
          .attr('opacity', 0.1)
          .attr('stroke', d.color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '5,5');
      }
    });

    // Connection lines for temporal sequence
    const lineGenerator = d3.line<EmotionSegment & { x: number; y: number }>()
      .x(d => xScale(d.valence))
      .y(d => yScale(d.arousal))
      .curve(d3.curveCardinal);

    g.append('path')
      .datum(heatmapData.filter(d => !d.isFiltered))
      .attr('fill', 'none')
      .attr('stroke', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.3)
      .attr('d', lineGenerator);

    // Main emotion points
    const points = clusters.selectAll('.emotion-point')
      .data(d => [d])
      .enter()
      .append('g')
      .attr('class', 'emotion-point')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSegmentClick(d.index);
      })
      .on('mouseenter', (event, d) => {
        setHoveredSegment(d.index);
        onSegmentHover?.(d.index);
      })
      .on('mouseleave', () => {
        setHoveredSegment(null);
        onSegmentHover?.(null);
      });

    // Gradient definitions
    const defs = svg.append('defs');
    
    heatmapData.forEach(d => {
      const gradient = defs.append('radialGradient')
        .attr('id', `gradient-${d.index}`)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d.gradient[0])
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', d.gradient[1])
        .attr('stop-opacity', 0.6);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d.gradient[2])
        .attr('stop-opacity', 0.4);
    });

    // Emotion circles with gradients
    points.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => `url(#gradient-${d.index})`)
      .attr('stroke', d => d.isSelected ? '#1f2937' : d.color)
      .attr('stroke-width', d => d.isSelected ? 3 : 1)
      .attr('opacity', d => d.isFiltered ? 0.2 : 0.8)
      .style('transition', 'all 0.3s ease');

    // Hover effects
    points.on('mouseenter', function(event, d) {
      d3.select(this)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', d.radius * 1.2)
        .attr('opacity', 1);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', d.radius)
        .attr('opacity', d.isFiltered ? 0.2 : 0.8);
    });

    // Emotion labels
    points.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => d.emotion.substring(0, 3).toUpperCase())
      .attr('opacity', d => showConfidence ? d.confidence : 1);

    // Axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => (typeof d === 'number' ? d.toFixed(1) : String(d)))
      .tickSize(-height + 100);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => (typeof d === 'number' ? d.toFixed(1) : String(d)))
      .tickSize(-width + 100);

    g.append('g')
      .attr('transform', `translate(0, ${height - 50})`)
      .call(xAxis)
      .attr('color', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '12px');

    g.append('g')
      .attr('transform', `translate(50, 0)`)
      .call(yAxis)
      .attr('color', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '12px');

    // Axis labels
    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height - 10})`)
      .attr('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Valence (Negative ← → Positive)');

    g.append('text')
      .attr('transform', 'translate(20, ' + (height / 2) + ') rotate(-90)')
      .attr('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Arousal (Calm ← → Excited)');

  }, [heatmapData, width, height, theme, showGrid, showConfidence, enableZoom, onSegmentClick, onSegmentHover]);

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

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
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
        link.download = `emotion-heatmap-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else if (format === 'svg' && svgRef.current) {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const link = document.createElement('a');
        link.download = `emotion-heatmap-${Date.now()}.svg`;
        link.href = svgUrl;
        link.click();
        
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [theme]);

  // Filter emotions
  const toggleEmotionFilter = useCallback((emotion: string) => {
    setFilteredEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setFilteredEmotions([]);
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
            Advanced Emotion Heatmap
          </h3>
          
          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            {enableZoom && (
              <div className="flex items-center space-x-1 mr-4">
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
                <button
                  onClick={handleResetZoom}
                  className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                  title="Reset Zoom"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}

            {/* View controls */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Grid"
            >
              <Grid3X3 size={16} />
            </button>

            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Fullscreen"
            >
              <Maximize2 size={16} />
            </button>

            {/* Export controls */}
            {enableExport && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleExport('png')}
                  className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                  title="Export as PNG"
                >
                  <Download size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Emotion filters */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.keys(EMOTION_COLORS).map(emotion => (
              <button
                key={emotion}
                onClick={() => toggleEmotionFilter(emotion)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filteredEmotions.includes(emotion)
                    ? 'bg-gray-300 text-gray-700 line-through'
                    : 'text-white'
                }`}
                style={{
                  backgroundColor: filteredEmotions.includes(emotion) ? undefined : EMOTION_COLORS[emotion].primary
                }}
              >
                {emotion}
              </button>
            ))}
            
            {filteredEmotions.length > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 rounded-full text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
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
        {hoveredSegment !== null && (
          <div 
            className={`absolute p-3 rounded-lg shadow-xl border pointer-events-none z-10 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
            style={{
              left: heatmapData[hoveredSegment]?.x || 0,
              top: (heatmapData[hoveredSegment]?.y || 0) - 80,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm space-y-1">
              <div className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {heatmapData[hoveredSegment]?.emotion}
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Time: {heatmapData[hoveredSegment]?.start_time.toFixed(1)}s - {heatmapData[hoveredSegment]?.end_time.toFixed(1)}s
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Valence: {heatmapData[hoveredSegment]?.valence.toFixed(2)}
              </div>
              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                Arousal: {heatmapData[hoveredSegment]?.arousal.toFixed(2)}
              </div>
              {showConfidence && (
                <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  Confidence: {(heatmapData[hoveredSegment]?.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zoom indicator */}
        {enableZoom && (
          <div className={`absolute bottom-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
            theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 shadow-md'
          }`}>
            Zoom: {(zoomState.scale * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-blue-50'}`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-blue-700'}`}>
          <strong>Interactive Controls:</strong> Click and drag to pan, scroll to zoom. 
          Click emotion points to select, use filters to focus on specific emotions. 
          Export visualizations for reports.
        </p>
      </div>
    </div>
  );
};

export default EnhancedEmotionHeatmap;
export const EmotionHeatmap = EnhancedEmotionHeatmap;