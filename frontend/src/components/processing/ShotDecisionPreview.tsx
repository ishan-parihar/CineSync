/**
 * ShotDecisionPreview - Live cinematographic decision display
 * Shows real-time shot decisions with transitions, confidence indicators, and reasoning
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useCinematographyStore, useProcessingStore } from '../../stores';
import type { ShotDecision, ShotTransition } from '../../types';

interface ShotDecisionPreviewProps {
  /** Whether to show confidence indicators */
  showConfidence?: boolean;
  /** Whether to show reasoning */
  showReasoning?: boolean;
  /** Whether to show transitions */
  showTransitions?: boolean;
  /** Whether to animate transitions */
  animateTransitions?: boolean;
  /** Maximum number of recent shots to display */
  maxRecentShots?: number;
  /** Shot selection handler */
  onShotSelect?: (shot: ShotDecision, index: number) => void;
}

const SHOT_DISTANCE_LABELS: Record<string, string> = {
  'ECU': 'Extreme Close Up',
  'CU': 'Close Up', 
  'MCU': 'Medium Close Up',
  'MS': 'Medium Shot',
  'MLS': 'Medium Long Shot',
  'LS': 'Long Shot'
};

const ANGLE_LABELS: Record<string, string> = {
  'high_angle': 'High Angle',
  'eye_level': 'Eye Level',
  'low_angle': 'Low Angle',
  'dutch': 'Dutch Angle',
  'slight_low': 'Slight Low',
  'slight_high': 'Slight High'
};

const PURPOSE_LABELS: Record<string, string> = {
  'dialogue': 'Dialogue',
  'emotional': 'Emotional',
  'narrative': 'Narrative',
  'action': 'Action',
  'reaction': 'Reaction',
  'establishing': 'Establishing'
};

export const ShotDecisionPreview: React.FC<ShotDecisionPreviewProps> = ({
  showConfidence = true,
  showReasoning = true,
  showTransitions = true,
  animateTransitions = true,
  maxRecentShots = 5,
  onShotSelect
}) => {
  // Store state
  const { 
    shotDecisions, 
    selectedShotIndex, 
    setSelectedShot,
    recentDecisions,
    currentTime,
    sequenceMetrics
  } = useCinematographyStore();
  
  const { recentEvents } = useProcessingStore();
  
  // Component state
  const [expandedShot, setExpandedShot] = useState<number | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [previewMode, setPreviewMode] = useState<'timeline' | 'storyboard' | 'detailed'>('timeline');
  
  // Animation for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Get recent shots with real-time updates
  const recentShots = useMemo(() => {
    const recent = [...shotDecisions].slice(-maxRecentShots);
    
    // Mark shots with recent updates
    return recent.map((shot, index) => ({
      ...shot,
      isLive: recentEvents.some(event => 
        event.type === 'shot_decision_made' &&
        event.data?.emotion === shot.emotion &&
        new Date(event.timestamp).getTime() > Date.now() - 5000
      ),
      globalIndex: shotDecisions.indexOf(shot)
    }));
  }, [shotDecisions, recentEvents, maxRecentShots]);
  
  // Get current shot based on time
  const currentShot = useMemo(() => {
    if (currentTime === null) return null;
    return shotDecisions.find(shot => 
      currentTime >= shot.start_time && currentTime <= shot.end_time
    ) || null;
  }, [shotDecisions, currentTime]);
  
  // Calculate shot statistics
  const shotStatistics = useMemo(() => {
    if (shotDecisions.length === 0) return null;
    
    const shotTypeCount = shotDecisions.reduce((acc, shot) => {
      acc[shot.selected_shot] = (acc[shot.selected_shot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const angleCount = shotDecisions.reduce((acc, shot) => {
      acc[shot.vertical_angle] = (acc[shot.vertical_angle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const purposeCount = shotDecisions.reduce((acc, shot) => {
      acc[shot.shot_purpose] = (acc[shot.shot_purpose] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgConfidence = shotDecisions.reduce((sum, shot) => sum + shot.confidence, 0) / shotDecisions.length;
    
    return {
      totalShots: shotDecisions.length,
      shotTypeCount,
      angleCount,
      purposeCount,
      avgConfidence,
      mostUsedShot: (Object.entries(shotTypeCount).reduce((a, b) => a[1] > b[1] ? a : b) as [string, number])[0],
      mostUsedAngle: (Object.entries(angleCount).reduce((a, b) => a[1] > b[1] ? a : b) as [string, number])[0]
    };
  }, [shotDecisions]);
  
  // Render shot card
  const renderShotCard = (shot: ShotDecision & { isLive?: boolean; globalIndex?: number }, index: number) => {
    const isSelected = selectedShotIndex === shot.globalIndex;
    const isCurrent = currentShot?.start_time === shot.start_time;
    const isExpanded = expandedShot === index;
    
    return (
      <div
        key={`${shot.start_time}-${shot.emotion}`}
        className={`relative bg-white border rounded-lg transition-all duration-300 ${
          isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
        } ${isCurrent ? 'ring-2 ring-red-500' : ''} ${
          shot.isLive && animateTransitions ? 'animate-pulse' : ''
        } hover:shadow-md cursor-pointer`}
        onClick={() => {
          setSelectedShot(shot.globalIndex!);
          onShotSelect?.(shot, shot.globalIndex!);
        }}
      >
        {/* Live indicator */}
        {shot.isLive && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center space-x-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>
        )}
        
        {/* Current shot indicator */}
        {isCurrent && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center space-x-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span>CURRENT</span>
            </div>
          </div>
        )}
        
        {/* Main content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                {SHOT_DISTANCE_LABELS[shot.selected_shot] || shot.selected_shot}
              </h4>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{ANGLE_LABELS[shot.vertical_angle] || shot.vertical_angle}</span>
                <span>•</span>
                <span>{PURPOSE_LABELS[shot.shot_purpose] || shot.shot_purpose}</span>
              </div>
            </div>
            
            {/* Confidence indicator */}
            {showConfidence && (
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  shot.confidence >= 0.8 ? 'text-green-600' :
                  shot.confidence >= 0.6 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(shot.confidence * 100)}%
                </div>
                <div className="text-xs text-gray-500">Confidence</div>
              </div>
            )}
          </div>
          
          {/* Emotion and timing */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">Emotion:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {shot.emotion}
              </span>
            </div>
            <div className="text-gray-500">
              {shot.start_time.toFixed(1)}s - {shot.end_time.toFixed(1)}s
            </div>
          </div>
          
          {/* Transition preview */}
          {showTransitions && shot.transition && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600">Transition:</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                  {shot.transition.type}
                </span>
                <span className="text-gray-500">{shot.transition.duration}s</span>
                {shot.transition.direction && (
                  <span className="text-gray-500">→ {shot.transition.direction}</span>
                )}
              </div>
            </div>
          )}
          
          {/* Reasoning (expandable) */}
          {showReasoning && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedShot(isExpanded ? null : index);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
              >
                <span>AI Reasoning</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  {shot.reasoning}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Visual preview bar */}
        <div className="h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-b-lg" 
             style={{ 
               opacity: shot.confidence,
               animation: shot.isLive && animateTransitions ? 'pulse 2s infinite' : 'none'
             }}
        />
      </div>
    );
  };
  
  if (shotDecisions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No shot decisions available</p>
          <p className="text-gray-400 text-sm mt-1">Start processing to generate cinematographic decisions</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Shot Decisions</h3>
          
          <div className="flex items-center space-x-4">
            {/* Statistics */}
            {shotStatistics && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="text-gray-500">Total:</span>
                  <span className="ml-1 font-medium">{shotStatistics.totalShots}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500">Avg Confidence:</span>
                  <span className="ml-1 font-medium">{Math.round(shotStatistics.avgConfidence * 100)}%</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500">Primary:</span>
                  <span className="ml-1 font-medium">{SHOT_DISTANCE_LABELS[shotStatistics.mostUsedShot]}</span>
                </div>
              </div>
            )}
            
            {/* View controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode('timeline')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  previewMode === 'timeline' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setPreviewMode('storyboard')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  previewMode === 'storyboard' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Storyboard
              </button>
              <button
                onClick={() => setPreviewMode('detailed')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  previewMode === 'detailed' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content based on preview mode */}
      <div className="p-4">
        {previewMode === 'timeline' && (
          <div className="space-y-3">
            {recentShots.map((shot, index) => renderShotCard(shot, index))}
          </div>
        )}
        
        {previewMode === 'storyboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentShots.map((shot, index) => (
              <div key={index} className="transform hover:scale-105 transition-transform">
                {renderShotCard(shot, index)}
              </div>
            ))}
          </div>
        )}
        
        {previewMode === 'detailed' && (
          <div className="space-y-4">
            {recentShots.map((shot, index) => (
              <div key={index}>
                {renderShotCard({ ...shot, isLive: shot.isLive, globalIndex: shot.globalIndex }, index)}
                {/* Additional detailed information */}
                <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200 text-sm text-gray-600">
                  <div className="mb-1">
                    <span className="font-medium">Duration Modifier:</span> {shot.duration_modifier}x
                  </div>
                  <div className="mb-1">
                    <span className="font-medium">Shot Duration:</span> {(shot.end_time - shot.start_time).toFixed(2)}s
                  </div>
                  {shot.horizontal_angle && (
                    <div className="mb-1">
                      <span className="font-medium">Horizontal Angle:</span> {shot.horizontal_angle}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with sequence metrics */}
      {sequenceMetrics && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Sequence Metrics:</span>
              <span className="font-medium">Grammar Compliance: {Math.round(sequenceMetrics.grammarCompliance * 100)}%</span>
              <span className="font-medium">Overall Confidence: {Math.round(sequenceMetrics.overallConfidence * 100)}%</span>
              <span className="font-medium">Avg Duration: {sequenceMetrics.averageShotDuration.toFixed(1)}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShotDecisionPreview;