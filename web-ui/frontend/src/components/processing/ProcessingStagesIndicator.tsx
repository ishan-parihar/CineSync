/**
 * ProcessingStagesIndicator - Advanced multi-stage progress tracking
 * Provides comprehensive visualization of processing stages with real-time updates, performance metrics, and detailed status information
 */

import React, { useEffect, useState, useMemo } from 'react';
import { CheckCircle, Circle, AlertCircle, Clock, XCircle, Activity, Zap, TrendingUp, Pause, Play } from 'lucide-react';
import { useProcessingStore, useCinematographyStore } from '../../stores';
import type { ProcessingStage, StageStatus } from '../../types';

interface ProcessingStagesIndicatorProps {
  /** Job ID to track stages for */
  jobId?: string;
  /** Whether to show detailed metrics */
  showMetrics?: boolean;
  /** Whether to show performance indicators */
  showPerformance?: boolean;
  /** Whether to enable real-time updates */
  realTimeUpdates?: boolean;
  /** Custom stage configuration */
  customStages?: Record<string, {
    name: string;
    description: string;
    estimatedDuration: number;
    category: 'analysis' | 'processing' | 'composition' | 'finalization';
    dependencies?: string[];
  }>;
  /** Height of the component */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

// Enhanced stage configuration with categories and dependencies
const DEFAULT_STAGE_CONFIG = {
  audio_analysis: {
    name: 'Audio Analysis',
    description: 'Analyzing audio characteristics, format, and quality metrics',
    estimatedDuration: 30,
    category: 'analysis' as const,
    dependencies: []
  },
  emotion_analysis: {
    name: 'Emotion Detection',
    description: 'Identifying emotional segments and patterns using AI models',
    estimatedDuration: 45,
    category: 'analysis' as const,
    dependencies: ['audio_analysis']
  },
  cinematography: {
    name: 'Cinematography Planning',
    description: 'Generating shot sequence and camera decisions based on emotions',
    estimatedDuration: 60,
    category: 'processing' as const,
    dependencies: ['emotion_analysis']
  },
  tension_analysis: {
    name: 'Tension Analysis',
    description: 'Analyzing dramatic tension and narrative pacing',
    estimatedDuration: 30,
    category: 'processing' as const,
    dependencies: ['emotion_analysis']
  },
  video_composition: {
    name: 'Video Composition',
    description: 'Compositing final video with generated shots and transitions',
    estimatedDuration: 120,
    category: 'composition' as const,
    dependencies: ['cinematography', 'tension_analysis']
  },
  final_processing: {
    name: 'Final Processing',
    description: 'Finalizing output, quality checks, and file optimization',
    estimatedDuration: 30,
    category: 'finalization' as const,
    dependencies: ['video_composition']
  }
};

const STAGE_ORDER = Object.keys(DEFAULT_STAGE_CONFIG);

export const ProcessingStagesIndicator: React.FC<ProcessingStagesIndicatorProps> = ({
  jobId,
  showMetrics = true,
  showPerformance = true,
  realTimeUpdates = true,
  customStages,
  compact = false,
  className = ''
}) => {
  // Store state
  const { 
    processingStages, 
    recentEvents, 
    currentJobId,
    processingStats 
  } = useProcessingStore();
  
  // Component state
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [animationFrame, setAnimationFrame] = useState(0);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [performanceData, setPerformanceData] = useState<Array<{
    timestamp: number;
    progress: number;
    stage: string;
  }>>([]);
  
  // Merge custom stages with default
  const stageConfig = { ...DEFAULT_STAGE_CONFIG, ...customStages };
  
  // Get stages for current job
  const stages = useMemo(() => {
    if (jobId && processingStages[jobId]) {
      return processingStages[jobId];
    }
    return {};
  }, [jobId, processingStages]);
  
  // Real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      setAnimationFrame(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [realTimeUpdates]);
  
  // Collect performance data
  useEffect(() => {
    if (!showPerformance) return;
    
    const currentStage = STAGE_ORDER.find(stageId => {
      const stage = stages[stageId];
      return stage && stage.status === 'in_progress';
    });
    
    if (currentStage && stages[currentStage]) {
      setPerformanceData(prev => {
        const newData = [...prev, {
          timestamp: Date.now(),
          progress: stages[currentStage].progress,
          stage: currentStage
        }];
        
        // Keep only last 100 data points
        return newData.slice(-100);
      });
    }
  }, [stages, showPerformance, animationFrame]);
  
  // Calculate overall progress
  const { totalProgress, stageProgress, completedStages, currentStage, hasErrors, estimatedCompletion } = useMemo(() => {
    const stageCount = STAGE_ORDER.length;
    const completed = STAGE_ORDER.filter(stageId => {
      const stage = stages[stageId];
      return stage && (stage.status === 'completed' || stage.progress >= 100);
    }).length;
    
    const totalStageProgress = STAGE_ORDER.reduce((sum, stageId) => {
      const stage = stages[stageId];
      return sum + (stage ? stage.progress || 0 : 0);
    }, 0);
    
    const total = Math.round((totalStageProgress / (stageCount * 100)) * 100);
    
    const current = STAGE_ORDER.find(stageId => {
      const stage = stages[stageId];
      return stage && stage.status === 'in_progress';
    });
    
    const errors = STAGE_ORDER.some(stageId => {
      const stage = stages[stageId];
      return stage && stage.status === 'error';
    });
    
    // Calculate estimated completion time
    let estCompletion: string | null = null;
    if (current && stages[current]) {
      const stageConfig = DEFAULT_STAGE_CONFIG[current as keyof typeof DEFAULT_STAGE_CONFIG];
      const remainingProgress = 100 - (stages[current].progress || 0);
      const estimatedTime = (remainingProgress / 100) * stageConfig.estimatedDuration * 1000;
      estCompletion = new Date(Date.now() + estimatedTime).toISOString();
    }
    
    return {
      totalProgress: total,
      stageProgress: STAGE_ORDER.reduce((acc, stageId) => {
        acc[stageId] = stages[stageId]?.progress || 0;
        return acc;
      }, {} as Record<string, number>),
      completedStages: completed,
      currentStage: current,
      hasErrors: errors,
      estimatedCompletion: estCompletion
    };
  }, [stages]);
  
  // Get stage status with enhanced logic
  const getStageStatus = (stageId: string): StageStatus => {
    const stage = stages[stageId];
    if (!stage) return 'pending';
    
    if (stage.status === 'error') return 'error';
    if (stage.status === 'completed' || stage.progress >= 100) return 'completed';
    if (stage.status === 'in_progress' || stage.progress > 0) return 'in_progress';
    if (stage.status === 'skipped') return 'skipped';
    return 'pending';
  };
  
  // Get stage icon with animation
  const getStageIcon = (status: StageStatus, stageId: string) => {
    const isCurrentStage = currentStage === stageId;
    const baseClasses = "w-5 h-5 transition-all duration-300";
    
    switch (status) {
      case 'completed':
        return <CheckCircle className={`${baseClasses} text-green-500`} />;
      case 'in_progress':
        return (
          <div className="relative">
            <Activity className={`${baseClasses} text-blue-500 ${isCurrentStage ? 'animate-pulse' : ''}`} />
            {isCurrentStage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              </div>
            )}
          </div>
        );
      case 'error':
        return <XCircle className={`${baseClasses} text-red-500`} />;
      case 'skipped':
        return <Pause className={`${baseClasses} text-gray-400`} />;
      default:
        return <Circle className={`${baseClasses} text-gray-400`} />;
    }
  };
  
  // Get stage color based on category
  const getCategoryColor = (category: string) => {
    const colors = {
      analysis: 'bg-purple-100 text-purple-700 border-purple-200',
      processing: 'bg-blue-100 text-blue-700 border-blue-200',
      composition: 'bg-green-100 text-green-700 border-green-200',
      finalization: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };
  
  // Format time remaining
  const formatTimeRemaining = (timestamp: string | null) => {
    if (!timestamp) return null;
    
    const now = Date.now();
    const target = new Date(timestamp).getTime();
    const diff = target - now;
    
    if (diff <= 0) return 'Soon';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s`;
    }
    return `~${seconds}s`;
  };
  
  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!showPerformance || performanceData.length < 2) return null;
    
    const recentData = performanceData.slice(-20);
    const avgProgress = recentData.reduce((sum, d) => sum + d.progress, 0) / recentData.length;
    const progressRate = recentData.length > 1 
      ? (recentData[recentData.length - 1].progress - recentData[0].progress) / (recentData.length - 1)
      : 0;
    
    return {
      avgProgress,
      progressRate,
      totalDataPoints: performanceData.length
    };
  }, [showPerformance, performanceData]);
  
  // Toggle stage expansion
  const toggleStageExpansion = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };
  
  // Check if stage dependencies are met
  const areDependenciesMet = (stageId: string) => {
    const config = stageConfig[stageId as keyof typeof stageConfig];
    if (!config.dependencies || config.dependencies.length === 0) return true;
    
    return config.dependencies.every(dep => {
      const depStatus = getStageStatus(dep);
      return depStatus === 'completed';
    });
  };

  // Render stage component
  const renderStage = (stageId: string, index: number) => {
    const status = getStageStatus(stageId);
    const progress = stageProgress[stageId] || 0;
    const config = stageConfig[stageId as keyof typeof stageConfig];
    const isExpanded = expandedStages.has(stageId);
    const isCurrent = currentStage === stageId;
    const dependenciesMet = areDependenciesMet(stageId);
    const stage = stages[stageId];
    
    return (
      <div 
        key={stageId} 
        className={`border rounded-lg transition-all duration-300 ${
          isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        } ${!dependenciesMet ? 'opacity-50' : ''} hover:shadow-md`}
      >
        <div className="p-4">
          {/* Stage header */}
          <div className="flex items-start space-x-3">
            {/* Stage number */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              status === 'completed' ? 'bg-green-100 text-green-700' :
              status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              status === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {index + 1}
            </div>
            
            {/* Stage content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getStageIcon(status, stageId)}
                  <div>
                    <h4 className="font-medium text-gray-900">{config.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(config.category)}`}>
                        {config.category}
                      </span>
                      {!dependenciesMet && (
                        <span className="text-xs text-yellow-600 flex items-center">
                          <AlertCircle size={12} className="mr-1" />
                          Waiting for dependencies
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Progress and timing */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{progress}%</div>
                    {stage?.estimated_completion && (
                      <div className="text-xs text-gray-500">
                        {formatTimeRemaining(stage.estimated_completion)}
                      </div>
                    )}
                  </div>
                  
                  {/* Expand button */}
                  <button
                    onClick={() => toggleStageExpansion(stageId)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg 
                      className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{config.description}</p>
              
              {/* Progress bar */}
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      status === 'completed' ? 'bg-green-500' :
                      status === 'error' ? 'bg-red-500' :
                      status === 'in_progress' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {/* Error message */}
              {status === 'error' && stage?.error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-red-800">Error occurred</div>
                      <div className="text-sm text-red-700 mt-1">{stage.error}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  {/* Timing information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Started:</span>
                      <span className="ml-2">
                        {stage?.started_at ? new Date(stage.started_at).toLocaleTimeString() : 'Not started'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2">
                        {stage?.started_at && stage?.completed_at 
                          ? formatDuration(new Date(stage.completed_at).getTime() - new Date(stage.started_at).getTime())
                          : stage?.started_at 
                            ? formatDuration(Date.now() - new Date(stage.started_at).getTime())
                            : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Dependencies */}
                  {config.dependencies && config.dependencies.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Dependencies:</div>
                      <div className="flex flex-wrap gap-2">
                        {config.dependencies.map(dep => {
                          const depStatus = getStageStatus(dep);
                          return (
                            <span 
                              key={dep}
                              className={`text-xs px-2 py-1 rounded ${
                                depStatus === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {stageConfig[dep as keyof typeof stageConfig]?.name || dep}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Stage metadata */}
                  {stage?.metadata && Object.keys(stage.metadata).length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Metadata:</div>
                      <div className="bg-gray-50 rounded p-2">
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(stage.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Format duration helper
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const overallStatus = hasErrors ? 'error' : completedStages === STAGE_ORDER.length ? 'completed' : currentStage ? 'in_progress' : 'pending';

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Enhanced Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStageIcon(overallStatus, '')}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Processing Stages</h3>
              {jobId && (
                <div className="text-sm text-gray-600">Job: {jobId}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time indicator */}
            {realTimeUpdates && (
              <div className="flex items-center space-x-1 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-gray-600">Live</span>
              </div>
            )}
            
            {/* Progress display */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{totalProgress}%</div>
              <div className="text-sm text-gray-600 capitalize">
                {overallStatus} • {completedStages}/{STAGE_ORDER.length} stages
              </div>
            </div>
          </div>
        </div>
        
        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                hasErrors ? 'bg-red-500' :
                completedStages === STAGE_ORDER.length ? 'bg-green-500' :
                'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          {estimatedCompletion && (
            <div className="mt-2 text-sm text-gray-600">
              Estimated completion: {formatTimeRemaining(estimatedCompletion)}
            </div>
          )}
        </div>
        
        {/* Performance metrics */}
        {showPerformance && performanceMetrics && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {Math.round(performanceMetrics.avgProgress)}%
              </div>
              <div className="text-gray-600">Avg Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {performanceMetrics.progressRate > 0 ? '+' : ''}{performanceMetrics.progressRate.toFixed(1)}%
              </div>
              <div className="text-gray-600">Progress Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {performanceMetrics.totalDataPoints}
              </div>
              <div className="text-gray-600">Data Points</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Stages */}
      <div className={`p-4 ${compact ? 'space-y-2' : 'space-y-4'}`}>
        {STAGE_ORDER.map((stageId, index) => renderStage(stageId, index))}
      </div>
      
      {/* Enhanced Footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div>
              <span className="font-medium">Completed:</span> {completedStages} stages
            </div>
            <div>
              <span className="font-medium">Current:</span> {currentStage ? stageConfig[currentStage as keyof typeof stageConfig]?.name : 'None'}
            </div>
            {hasErrors && (
              <div className="flex items-center text-red-600">
                <AlertCircle size={14} className="mr-1" />
                <span>Errors detected</span>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600">
            Est. total time: ~{STAGE_ORDER.reduce((sum, stageId) => 
              sum + stageConfig[stageId as keyof typeof stageConfig].estimatedDuration, 0
            )}s
          </div>
        </div>
        
        {/* Recent events */}
        {realTimeUpdates && recentEvents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Activity size={14} />
                <span>Recent activity</span>
              </div>
              <div className="text-gray-500">
                {recentEvents.slice(-3).map((event, index) => (
                  <span key={index} className="ml-2">
                    {event.type.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingStagesIndicator;