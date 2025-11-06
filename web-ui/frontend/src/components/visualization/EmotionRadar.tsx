/**
 * EmotionRadar - Multi-dimensional emotion analysis radar chart
 * Provides comprehensive emotion analysis using D3.js with interactive features
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { 
  Target, 
  Settings, 
  Download, 
  Maximize2,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Zap,
  Brain
} from 'lucide-react';
import type { EmotionSegment } from '../../types';

interface EmotionRadarProps {
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

// Emotion dimensions for radar chart
const EMOTION_DIMENSIONS = [
  'joy',
  'sadness', 
  'anger',
  'fear',
  'surprise',
  'disgust',
  'neutral',
  'anticipation',
  'trust'
];

// Color schemes for different data series
const COLOR_SCHEMES = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export const EmotionRadar: React.FC<EmotionRadarProps> = ({
  segments,
  selectedSegment,
  comparisonData = [],
  showComparison = false,
  enableAnimation = true,
  showLabels = true,
  showGrid = true,
  width = 500,
  height = 500,
  theme = 'light',
  onEmotionSelect,
  onSegmentSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localShowGrid, setLocalShowGrid] = useState(showGrid);
  const [localShowLabels, setLocalShowLabels] = useState(showLabels);
  const [localShowComparison, setLocalShowComparison] = useState(showComparison);
  const [showSettings, setShowSettings] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(1000);
  const [radarSmoothing, setRadarSmoothing] = useState(0.2);
  const [normalizedScale, setNormalizedScale] = useState(true);

  // Process emotion data for radar chart
  const radarData = useMemo(() => {
    const processSegments = (segmentList: EmotionSegment[]) => {
      const emotionAggregates: Record<string, { sum: number; count: number; confidence: number }> = {};
      
      // Initialize all dimensions
      EMOTION_DIMENSIONS.forEach(dimension => {
        emotionAggregates[dimension] = { sum: 0, count: 0, confidence: 0 };
      });
      
      // Aggregate emotion data
      segmentList.forEach(segment => {
        const emotion = segment.emotion.toLowerCase();
        if (emotionAggregates[emotion]) {
          emotionAggregates[emotion].sum += segment.confidence;
          emotionAggregates[emotion].count += 1;
          emotionAggregates[emotion].confidence = segment.confidence;
        }
      });
      
      // Calculate averages and create radar data
      return EMOTION_DIMENSIONS.map(dimension => {
        const aggregate = emotionAggregates[dimension];
        const average = aggregate.count > 0 ? aggregate.sum / aggregate.count : 0;
        
        // Apply additional dimensional analysis
        let value = average;
        
        // Factor in arousal and valence for more nuanced representation
        if (segmentList.length > 0) {
          const avgArousal = segmentList.reduce((sum, s) => sum + s.arousal, 0) / segmentList.length;
          const avgValence = segmentList.reduce((sum, s) => sum + s.valence, 0) / segmentList.length;
          
          // Adjust values based on dimensional characteristics
          if (dimension === 'joy' || dimension === 'surprise') {
            value *= (1 + avgValence * 0.3); // Positive emotions boosted by positive valence
          } else if (dimension === 'sadness' || dimension === 'fear') {
            value *= (1 - avgValence * 0.3); // Negative emotions boosted by negative valence
          }
          
          if (dimension === 'anger' || dimension === 'fear' || dimension === 'surprise') {
            value *= (1 + avgArousal * 0.2); // High arousal emotions boosted by arousal
          }
        }
        
        return {
          dimension,
          value: Math.max(0, Math.min(1, value)), // Normalize to 0-1
          confidence: aggregate.confidence,
          count: aggregate.count
        };
      });
    };

    const mainData = processSegments(segments);
    const comparisonDatasets = comparisonData.map(data => processSegments(data));
    
    return {
      main: mainData,
      comparisons: comparisonDatasets
    };
  }, [segments, comparisonData]);

  // Generate radar chart angles
  const angleScale = useMemo(() => {
    return d3.scalePoint()
      .domain(EMOTION_DIMENSIONS)
      .range([0, 2 * Math.PI])
      .padding(0);
  }, []);

  // D3.js radar chart rendering
  useEffect(() => {
    if (!svgRef.current || radarData.main.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 60;

    // Create radial scale
    const radialScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, radius]);

    // Create line generator for radar
    const radarLine = d3.lineRadial<any>()
      .angle(d => angleScale(d.dimension)!)
      .radius(d => radialScale(normalizedScale ? d.value : d.value * d.confidence))
      .curve(d3.curveCardinalClosed);

    // Create area generator for filled radar
    const radarArea = d3.radialArea<any>()
      .angle(d => angleScale(d.dimension)!)
      .innerRadius(0)
      .outerRadius(d => radialScale(normalizedScale ? d.value : d.value * d.confidence))
      .curve(d3.curveCardinalClosed);

    // Main group
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Background circle
    g.append('circle')
      .attr('r', radius)
      .attr('fill', theme === 'dark' ? '#1f2937' : '#f9fafb')
      .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
      .attr('stroke-width', 1);

    // Grid circles and spokes
    if (showGrid) {
      // Concentric circles
      const gridLevels = 5;
      for (let i = 1; i <= gridLevels; i++) {
        g.append('circle')
          .attr('r', (radius / gridLevels) * i)
          .attr('fill', 'none')
          .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.5);
      }

      // Spokes (dimension lines)
      EMOTION_DIMENSIONS.forEach(dimension => {
        const angle = angleScale(dimension)!;
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;

        g.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', y)
          .attr('stroke', theme === 'dark' ? '#374151' : '#e5e7eb')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.5);
      });
    }

    // Comparison data (background layers)
    if (showComparison && radarData.comparisons.length > 0) {
      radarData.comparisons.forEach((comparison, index) => {
        g.append('path')
          .datum(comparison)
          .attr('d', radarArea)
          .attr('fill', COLOR_SCHEMES[index + 1] || COLOR_SCHEMES[0])
          .attr('opacity', 0.2)
          .attr('stroke', COLOR_SCHEMES[index + 1] || COLOR_SCHEMES[0])
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      });
    }

    // Main radar area
    const mainArea = g.append('path')
      .datum(radarData.main)
      .attr('d', radarArea)
      .attr('fill', COLOR_SCHEMES[0])
      .attr('opacity', 0.3);

    // Main radar line
    const mainLine = g.append('path')
      .datum(radarData.main)
      .attr('d', radarLine)
      .attr('fill', 'none')
      .attr('stroke', COLOR_SCHEMES[0])
      .attr('stroke-width', 2);

    // Animation
    if (enableAnimation) {
      const perimeter = 2 * Math.PI * radius;
      mainArea
        .attr('stroke-dasharray', `${perimeter} ${perimeter}`)
        .attr('stroke-dashoffset', perimeter)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeSinInOut)
        .attr('stroke-dashoffset', 0);

      mainLine
        .attr('stroke-dasharray', `${perimeter} ${perimeter}`)
        .attr('stroke-dashoffset', perimeter)
        .transition()
        .duration(animationDuration)
        .ease(d3.easeSinInOut)
        .attr('stroke-dashoffset', 0);
    }

    // Data points
    const points = g.selectAll('.data-point')
      .data(radarData.main)
      .enter()
      .append('g')
      .attr('class', 'data-point')
      .attr('transform', d => {
        const angle = angleScale(d.dimension)!;
        const r = radialScale(normalizedScale ? d.value : d.value * d.confidence);
        const x = Math.cos(angle - Math.PI / 2) * r;
        const y = Math.sin(angle - Math.PI / 2) * r;
        return `translate(${x}, ${y})`;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        onEmotionSelect?.(d.dimension);
        setSelectedDimensions(prev => 
          prev.includes(d.dimension) 
            ? prev.filter(dim => dim !== d.dimension)
            : [...prev, d.dimension]
        );
      })
      .on('mouseenter', (event, d) => {
        setHoveredDimension(d.dimension);
      })
      .on('mouseleave', () => {
        setHoveredDimension(null);
      });

    // Point circles
    points.append('circle')
      .attr('r', d => selectedDimensions.includes(d.dimension) ? 8 : 5)
      .attr('fill', d => selectedDimensions.includes(d.dimension) ? COLOR_SCHEMES[0] : '#ffffff')
      .attr('stroke', COLOR_SCHEMES[0])
      .attr('stroke-width', 2)
      .attr('opacity', d => selectedDimensions.includes(d.dimension) ? 1 : 0.8);

    // Dimension labels
    if (showLabels) {
      const labels = g.selectAll('.dimension-label')
        .data(radarData.main)
        .enter()
        .append('g')
        .attr('class', 'dimension-label')
        .attr('transform', d => {
          const angle = angleScale(d.dimension)!;
          const labelRadius = radius + 30;
          const x = Math.cos(angle - Math.PI / 2) * labelRadius;
          const y = Math.sin(angle - Math.PI / 2) * labelRadius;
          return `translate(${x}, ${y})`;
        });

      labels.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', d => 
          selectedDimensions.includes(d.dimension) ? COLOR_SCHEMES[0] :
          hoveredDimension === d.dimension ? '#3b82f6' :
          theme === 'dark' ? '#9ca3af' : '#6b7280'
        )
        .attr('font-size', d => 
          selectedDimensions.includes(d.dimension) ? '14px' : '12px'
        )
        .attr('font-weight', d => 
          selectedDimensions.includes(d.dimension) ? 'bold' : 'normal'
        )
        .style('cursor', 'pointer')
        .text(d => d.dimension.charAt(0).toUpperCase() + d.dimension.slice(1))
        .on('click', (event, d) => {
          onEmotionSelect?.(d.dimension);
          setSelectedDimensions(prev => 
            prev.includes(d.dimension) 
              ? prev.filter(dim => dim !== d.dimension)
              : [...prev, d.dimension]
          );
        });

      // Value labels on points
      if (hoveredDimension) {
        const hoveredData = radarData.main.find(d => d.dimension === hoveredDimension);
        if (hoveredData) {
          const angle = angleScale(hoveredData.dimension)!;
          const r = radialScale(normalizedScale ? hoveredData.value : hoveredData.value * hoveredData.confidence);
          const x = Math.cos(angle - Math.PI / 2) * r;
          const y = Math.sin(angle - Math.PI / 2) * r;

          g.append('text')
            .attr('x', x)
            .attr('y', y - 15)
            .attr('text-anchor', 'middle')
            .attr('fill', theme === 'dark' ? '#ffffff' : '#1f2937')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('class', 'hover-value-label')
            .text(`${(hoveredData.value * 100).toFixed(0)}%`);
        }
      }
    }

    // Center point
    g.append('circle')
      .attr('r', 3)
      .attr('fill', theme === 'dark' ? '#6b7280' : '#9ca3af');

    // Legend
    if (showComparison && radarData.comparisons.length > 0) {
      const legend = svg.append('g')
        .attr('transform', `translate(20, ${height - 80})`);

      // Main data legend item
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', COLOR_SCHEMES[0])
        .attr('opacity', 0.7);

      legend.append('text')
        .attr('x', 18)
        .attr('y', 10)
        .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
        .attr('font-size', '12px')
        .text('Current');

      // Comparison legend items
      radarData.comparisons.forEach((_, index) => {
        const yOffset = (index + 1) * 20;
        
        legend.append('rect')
          .attr('x', 0)
          .attr('y', yOffset)
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', COLOR_SCHEMES[index + 1] || COLOR_SCHEMES[0])
          .attr('opacity', 0.7);

        legend.append('text')
          .attr('x', 18)
          .attr('y', yOffset + 10)
          .attr('fill', theme === 'dark' ? '#9ca3af' : '#6b7280')
          .attr('font-size', '12px')
          .text(`Comparison ${index + 1}`);
      });
    }

  }, [radarData, width, height, theme, showGrid, showLabels, showComparison, 
      selectedDimensions, hoveredDimension, enableAnimation, animationDuration,
      normalizedScale, angleScale, onEmotionSelect]);

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
        link.download = `emotion-radar-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } else if (format === 'svg' && svgRef.current) {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const link = document.createElement('a');
        link.download = `emotion-radar-${Date.now()}.svg`;
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

  // Reset view
  const resetView = useCallback(() => {
    setSelectedDimensions([]);
    setHoveredDimension(null);
  }, []);

  return (
    <div className={`w-full h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Brain className={theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} size={24} />
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Emotion Radar Analysis
            </h3>
            {selectedSegment !== undefined && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
              }`}>
                Segment {selectedSegment + 1}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View controls */}
            <button
              onClick={() => setLocalShowGrid(!localShowGrid)}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Grid"
            >
              <Target size={16} />
            </button>

            <button
              onClick={() => setLocalShowLabels(!localShowLabels)}
              className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
              title="Toggle Labels"
            >
              {localShowLabels ? <Eye size={16} /> : <EyeOff size={16} />}
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
                  Animation Duration: {animationDuration}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="100"
                  value={animationDuration}
                  onChange={(e) => setAnimationDuration(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Radar Smoothing: {radarSmoothing.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={radarSmoothing}
                  onChange={(e) => setRadarSmoothing(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <label className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={enableAnimation}
                  onChange={(e) => setAnimationDuration(e.target.checked ? 1000 : 0)}
                  className="rounded"
                />
                <span className="text-sm">Enable Animation</span>
              </label>
              
              <label className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={normalizedScale}
                  onChange={(e) => setNormalizedScale(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Normalized Scale</span>
              </label>
              
              <label className={`flex items-center space-x-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={showComparison}
                  onChange={(e) => setLocalShowComparison(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Comparison</span>
              </label>
            </div>
          </div>
        )}

        {/* Selected dimensions */}
        {selectedDimensions.length > 0 && (
          <div className={`mt-3 flex items-center space-x-2`}>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Selected:
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedDimensions.map(dimension => (
                <button
                  key={dimension}
                  onClick={() => setSelectedDimensions(prev => 
                    prev.filter(d => d !== dimension)
                  )}
                  className={`px-2 py-1 rounded-full text-xs font-medium text-white`}
                  style={{ backgroundColor: COLOR_SCHEMES[0] }}
                >
                  {dimension}
                </button>
              ))}
            </div>
            <button
              onClick={resetView}
              className={`text-xs ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Visualization container */}
      <div 
        ref={containerRef}
        className={`relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center overflow-hidden`}
        style={{ height: 'calc(100% - 140px)' }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-full"
        />
        
        {/* Hover tooltip */}
        {hoveredDimension && (
          <div 
            className={`absolute p-3 rounded-lg shadow-xl border pointer-events-none z-10 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
            style={{
              left: '50%',
              top: '20px',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm space-y-1">
              <div className={`font-semibold capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {hoveredDimension}
              </div>
              {(() => {
                const data = radarData.main.find(d => d.dimension === hoveredDimension);
                if (!data) return null;
                return (
                  <>
                    <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      Intensity: {(data.value * 100).toFixed(1)}%
                    </div>
                    <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      Confidence: {(data.confidence * 100).toFixed(1)}%
                    </div>
                    <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      Occurrences: {data.count}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-blue-50'}`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-blue-700'}`}>
          <strong>Interactive Controls:</strong> Click emotion dimensions to select/highlight. 
          Toggle grid and labels for different views. Adjust settings for animation and scaling. 
          Export radar charts for analysis reports.
        </p>
      </div>
    </div>
  );
};

export default EmotionRadar;