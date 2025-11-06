/**
 * BatchQueueManager - Advanced batch processing visualization
 * Provides comprehensive queue management with priority handling, real-time updates, and performance metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Square, ArrowUp, ArrowDown, Trash2, Plus, FolderOpen, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useProcessingStore } from '../../stores';
import type { Job, JobStatus } from '../../types';

interface BatchQueueManagerProps {
  /** Maximum number of jobs to display */
  maxJobs?: number;
  /** Whether to show performance metrics */
  showMetrics?: boolean;
  /** Whether to enable drag-and-drop reordering */
  enableDragDrop?: boolean;
  /** Whether to show real-time updates */
  realTimeUpdates?: boolean;
  /** Custom job actions */
  customActions?: Array<{
    label: string;
    icon: React.ReactNode;
    action: (job: Job) => void;
    condition?: (job: Job) => boolean;
  }>;
}

export const BatchQueueManager: React.FC<BatchQueueManagerProps> = ({
  maxJobs = 50,
  showMetrics = true,
  enableDragDrop = true,
  realTimeUpdates = true,
  customActions = []
}) => {
  // Store state
  const {
    allJobs,
    activeJobs,
    processingQueue,
    completedJobs,
    failedJobs,
    processingStats,
    recentEvents,
    queuePosition,
    estimatedWaitTimes,
    currentJobId,
    selectedJobId,
    setSelectedJob,
    cancelJob,
    retryJob,
    pauseJob,
    resumeJob,
    bulkCancel,
    bulkRetry
  } = useProcessingStore();
  
  // Component state
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'queue' | 'all' | 'active' | 'completed' | 'failed'>('queue');
  const [sortBy, setSortBy] = useState<'priority' | 'created' | 'estimated' | 'progress'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [animationFrame, setAnimationFrame] = useState(0);
  const [performanceMode, setPerformanceMode] = useState(false);

  // Animation for real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [realTimeUpdates]);
  
  // Enhanced status utilities
  const getStatusConfig = (status: JobStatus) => {
    const configs = {
      pending: {
        color: 'text-gray-600 bg-gray-100',
        icon: <Clock size={14} />,
        label: 'Pending',
        priority: 1
      },
      processing: {
        color: 'text-blue-600 bg-blue-100',
        icon: <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />,
        label: 'Processing',
        priority: 4
      },
      completed: {
        color: 'text-green-600 bg-green-100',
        icon: <CheckCircle size={14} />,
        label: 'Completed',
        priority: 5
      },
      failed: {
        color: 'text-red-600 bg-red-100',
        icon: <XCircle size={14} />,
        label: 'Failed',
        priority: 2
      },
      cancelled: {
        color: 'text-gray-500 bg-gray-100',
        icon: <Square size={14} />,
        label: 'Cancelled',
        priority: 0
      },
      paused: {
        color: 'text-yellow-600 bg-yellow-100',
        icon: <Pause size={14} />,
        label: 'Paused',
        priority: 3
      }
    };
    
    return configs[status] || configs.pending;
  };
  
  // Priority color coding
  const getPriorityColor = (priority?: number) => {
    if (!priority) return 'text-gray-500';
    if (priority >= 8) return 'text-red-600 bg-red-100';
    if (priority >= 6) return 'text-orange-600 bg-orange-100';
    if (priority >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };
  
  // Performance metrics calculation
  const performanceMetrics = useMemo(() => {
    if (!showMetrics) return null;
    
    const recentJobs = allJobs.slice(-20); // Last 20 jobs
    const successRate = processingStats.successRate || 0;
    const throughput = processingStats.throughput || 0;
    const avgProcessingTime = processingStats.averageProcessingTime || 0;
    
    // Calculate queue efficiency
    const queueEfficiency = processingQueue.length > 0 
      ? (processingQueue.filter(job => job.priority && job.priority >= 5).length / processingQueue.length) * 100
      : 0;
    
    // System load indicator
    const systemLoad = activeJobs.length > 0 ? Math.min((activeJobs.length / 3) * 100, 100) : 0;
    
    return {
      successRate,
      throughput,
      avgProcessingTime,
      queueEfficiency,
      systemLoad,
      totalProcessed: processingStats.totalProcessed || 0
    };
  }, [showMetrics, allJobs, processingStats, processingQueue, activeJobs]);
  
  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let jobs = allJobs;
    
    // Apply view mode filter
    switch (viewMode) {
      case 'queue':
        jobs = processingQueue;
        break;
      case 'active':
        jobs = activeJobs;
        break;
      case 'completed':
        jobs = completedJobs;
        break;
      case 'failed':
        jobs = failedJobs;
        break;
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      jobs = jobs.filter(job => job.status === filterStatus);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      jobs = jobs.filter(job => 
        job.audio_file.toLowerCase().includes(query) ||
        job.profile_id.toLowerCase().includes(query) ||
        job.id.toLowerCase().includes(query)
      );
    }
    
    // Apply max jobs limit
    jobs = jobs.slice(0, maxJobs);
    
    // Sort jobs
    jobs.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'priority':
          comparison = (b.priority || 0) - (a.priority || 0);
          break;
        case 'created':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'estimated':
          const aWait = estimatedWaitTimes[a.id] || 0;
          const bWait = estimatedWaitTimes[b.id] || 0;
          comparison = aWait - bWait;
          break;
        case 'progress':
          comparison = b.progress - a.progress;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return jobs;
  }, [allJobs, viewMode, filterStatus, searchQuery, maxJobs, sortBy, sortOrder, processingQueue, activeJobs, completedJobs, failedJobs, estimatedWaitTimes]);
  
  // Real-time event detection
  const recentJobEvents = useMemo(() => {
    return recentEvents.filter(event => 
      event.timestamp && 
      new Date(event.timestamp).getTime() > Date.now() - 5000 // Last 5 seconds
    );
  }, [recentEvents]);
  
  // Drag and drop handlers
  const handleDragStart = (job: Job) => {
    if (!enableDragDrop) return;
    setDraggedJob(job);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    if (!enableDragDrop || !draggedJob) return;
    e.preventDefault();
  };
  
  const handleDrop = (targetJob: Job) => {
    if (!enableDragDrop || !draggedJob || draggedJob.id === targetJob.id) return;
    
    // Implement job reordering logic
    console.log('Reordering jobs:', draggedJob.id, '->', targetJob.id);
    setDraggedJob(null);
  };
  
  // Job expansion toggle
  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };
  
  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Selection handlers
  const handleJobSelect = (jobId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedJobs([...selectedJobs, jobId]);
    } else {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    }
  };
  
  const handleSelectAll = () => {
    if (selectedJobs.length === filteredAndSortedJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(filteredAndSortedJobs.map(job => job.id));
    }
  };
  
  // Bulk operations
  const handleBulkCancel = () => {
    bulkCancel(selectedJobs);
    setSelectedJobs([]);
  };
  
  const handleBulkRetry = () => {
    bulkRetry(selectedJobs);
    setSelectedJobs([]);
  };
  
  // Calculate batch progress
  const getBatchProgress = () => {
    if (filteredAndSortedJobs.length === 0) return 0;
    const totalProgress = filteredAndSortedJobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / filteredAndSortedJobs.length);
  };
  
  // Get estimated completion time
  const getEstimatedCompletion = () => {
    const pendingJobs = filteredAndSortedJobs.filter(job => 
      job.status === 'pending' || job.status === 'paused'
    );
    
    if (pendingJobs.length === 0) return null;
    
    const avgTime = processingStats.averageProcessingTime || 120000; // 2 minutes default
    const totalTime = pendingJobs.length * avgTime;
    return Date.now() + totalTime;
  };
  
  // Render job card
  const renderJobCard = (job: Job, index: number) => {
    const isSelected = selectedJobs.includes(job.id);
    const isExpanded = expandedJobs.has(job.id);
    const isCurrent = currentJobId === job.id;
    const isRecent = recentJobEvents.some(event => event.job_id === job.id);
    const statusConfig = getStatusConfig(job.status);
    const queuePos = queuePosition[job.id];
    const waitTime = estimatedWaitTimes[job.id];
    
    return (
      <div
        key={job.id}
        draggable={enableDragDrop && job.status === 'pending'}
        onDragStart={() => handleDragStart(job)}
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(job)}
        className={`relative border transition-all duration-200 ${
          isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
        } ${isCurrent ? 'ring-2 ring-blue-500' : ''} ${
          isRecent ? 'animate-pulse' : ''
        } hover:shadow-md`}
      >
        {/* Live indicator */}
        {isRecent && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center space-x-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>
        )}
        
        {/* Current job indicator */}
        {isCurrent && (
          <div className="absolute top-2 left-2 z-10">
            <div className="flex items-center space-x-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              <Zap size={12} />
              <span>CURRENT</span>
            </div>
          </div>
        )}
        
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleJobSelect(job.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              
              {/* Job info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {job.audio_file}
                  </h4>
                  
                  {/* Status badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                    {statusConfig.icon}
                    <span className="ml-1">{statusConfig.label}</span>
                  </span>
                  
                  {/* Priority badge */}
                  {job.priority && job.priority > 0 && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(job.priority)}`}>
                      P{job.priority}
                    </span>
                  )}
                </div>
                
                {/* Metadata */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Profile: {job.profile_id}</span>
                  <span>Created: {formatTimeAgo(job.created_at)}</span>
                  {queuePos !== undefined && (
                    <span>Queue: #{queuePos + 1}</span>
                  )}
                  {waitTime && (
                    <span>Wait: {formatDuration(waitTime)}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center space-x-1">
              {job.status === 'pending' && (
                <button
                  onClick={() => {/* Start job */}}
                  className="p-1 text-green-600 hover:text-green-800"
                  title="Start job"
                >
                  <Play size={16} />
                </button>
              )}
              
              {job.status === 'processing' && (
                <button
                  onClick={() => pauseJob(job.id)}
                  className="p-1 text-yellow-600 hover:text-yellow-800"
                  title="Pause job"
                >
                  <Pause size={16} />
                </button>
              )}
              
              {job.status === 'paused' && (
                <button
                  onClick={() => resumeJob(job.id)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                  title="Resume job"
                >
                  <Play size={16} />
                </button>
              )}
              
              {(job.status === 'failed' || job.status === 'cancelled') && (
                <button
                  onClick={() => retryJob(job.id)}
                  className="p-1 text-orange-600 hover:text-orange-800"
                  title="Retry job"
                >
                  <ArrowUp size={16} />
                </button>
              )}
              
              <button
                onClick={() => cancelJob(job.id)}
                className="p-1 text-red-600 hover:text-red-800"
                title="Cancel job"
              >
                <XCircle size={16} />
              </button>
              
              <button
                onClick={() => toggleJobExpansion(job.id)}
                className="p-1 text-gray-600 hover:text-gray-800"
                title="Toggle details"
              >
                <ArrowUp 
                  size={16} 
                  className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          {job.status === 'processing' && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Job ID:</span>
                  <span className="ml-2 font-mono text-xs">{job.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2">{formatTimeAgo(job.updated_at)}</span>
                </div>
                {job.estimated_completion && (
                  <div>
                    <span className="text-gray-500">Est. completion:</span>
                    <span className="ml-2">{formatTimeAgo(job.estimated_completion)}</span>
                  </div>
                )}
                {job.stages && job.stages.length > 0 && (
                  <div>
                    <span className="text-gray-500">Stages:</span>
                    <span className="ml-2">{job.stages.length}</span>
                  </div>
                )}
              </div>
              
              {/* Processing stages */}
              {job.stages && job.stages.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Processing Stages</h5>
                  <div className="space-y-1">
                    {job.stages.map((stage, stageIndex) => (
                      <div key={stageIndex} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{stage.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">{stage.progress}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${
                                stage.status === 'completed' ? 'bg-green-500' :
                                stage.status === 'in_progress' ? 'bg-blue-500' :
                                stage.status === 'error' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${stage.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Custom actions */}
              {customActions.length > 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  {customActions.map((action, actionIndex) => (
                    (!action.condition || action.condition(job)) && (
                      <button
                        key={actionIndex}
                        onClick={() => action.action(job)}
                        className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Enhanced Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Advanced Batch Queue Manager</h3>
          
          <div className="flex items-center space-x-4">
            {/* Real-time indicator */}
            {realTimeUpdates && (
              <div className="flex items-center space-x-1 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-gray-600">Live</span>
              </div>
            )}
            
            {/* Performance mode toggle */}
            <button
              onClick={() => setPerformanceMode(!performanceMode)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                performanceMode 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {performanceMode ? 'Perf Mode' : 'Normal'}
            </button>
          </div>
        </div>
        
        {/* Controls row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* View and filter controls */}
          <div className="flex items-center space-x-2">
            {/* View mode selector */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="queue">Queue ({processingQueue.length})</option>
              <option value="active">Active ({activeJobs.length})</option>
              <option value="completed">Completed ({completedJobs.length})</option>
              <option value="failed">Failed ({failedJobs.length})</option>
              <option value="all">All ({allJobs.length})</option>
            </select>
            
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {/* Sort controls */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="priority">Priority</option>
              <option value="created">Created</option>
              <option value="estimated">Est. Time</option>
              <option value="progress">Progress</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 border border-gray-300 rounded text-sm"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1 pr-8 border border-gray-300 rounded text-sm"
            />
            <div className="absolute right-2 top-2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Selection controls */}
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedJobs.length === filteredAndSortedJobs.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {selectedJobs.length > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {selectedJobs.length} selected
                </span>
                
                <button
                  onClick={handleBulkCancel}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Cancel Selected
                </button>
                
                <button
                  onClick={handleBulkRetry}
                  className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                >
                  Retry Selected
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Progress overview */}
        {filteredAndSortedJobs.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{getBatchProgress()}% • {filteredAndSortedJobs.length} jobs</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getBatchProgress()}%` }}
              />
            </div>
            
            {getEstimatedCompletion() && (
              <div className="mt-2 text-sm text-gray-600">
                Est. completion: {formatTimeAgo(new Date(getEstimatedCompletion()!).toISOString())}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Performance metrics */}
      {showMetrics && performanceMetrics && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className={`text-lg font-bold ${
                performanceMetrics.successRate >= 90 ? 'text-green-600' :
                performanceMetrics.successRate >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {Math.round(performanceMetrics.successRate)}%
              </div>
              <div className="text-gray-600">Success Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {performanceMetrics.throughput.toFixed(1)}
              </div>
              <div className="text-gray-600">Jobs/Hour</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {formatDuration(performanceMetrics.avgProcessingTime)}
              </div>
              <div className="text-gray-600">Avg Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {Math.round(performanceMetrics.queueEfficiency)}%
              </div>
              <div className="text-gray-600">Queue Efficiency</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-bold ${
                performanceMetrics.systemLoad >= 80 ? 'text-red-600' :
                performanceMetrics.systemLoad >= 50 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {Math.round(performanceMetrics.systemLoad)}%
              </div>
              <div className="text-gray-600">System Load</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Job list */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredAndSortedJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No jobs found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create some jobs to get started'}
            </p>
          </div>
        ) : (
          filteredAndSortedJobs.map((job, index) => renderJobCard(job, index))
        )}
      </div>
      
      {/* Enhanced footer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {completedJobs.length}
            </div>
            <div className="text-gray-600">Completed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {activeJobs.length}
            </div>
            <div className="text-gray-600">Active</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {processingQueue.length}
            </div>
            <div className="text-gray-600">Queued</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {failedJobs.length}
            </div>
            <div className="text-gray-600">Failed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {allJobs.length}
            </div>
            <div className="text-gray-600">Total</div>
          </div>
        </div>
        
        {/* Recent events */}
        {recentJobEvents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm">
              <AlertTriangle size={14} className="text-yellow-500" />
              <span className="text-gray-600">
                {recentJobEvents.length} recent event{recentJobEvents.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchQueueManager;