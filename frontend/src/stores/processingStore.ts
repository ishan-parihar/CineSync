/**
 * Processing Store - Domain-specific store for job processing and queue management
 * Handles job lifecycle, processing stages, and real-time updates
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware';
import type { 
  Job, 
  JobStatus, 
  ProcessingStage, 
  StageStatus, 
  CreateJobRequest,
  JobOptions,
  WebSocketEvent,
  ProcessingStageEvent,
  ProcessingCompleteEvent,
  ErrorOccurredEvent
} from '../types';

// Store state interface
interface ProcessingState {
  // Core data
  activeJobs: Job[];
  processingQueue: Job[];
  completedJobs: Job[];
  failedJobs: Job[];
  currentJobId: string | null;
  
  // Processing stages
  processingStages: Record<string, Record<string, ProcessingStage>>;
  
  // Real-time events
  recentEvents: WebSocketEvent[];
  eventHistory: WebSocketEvent[];
  
  // Loading states
  loading: {
    jobs: boolean;
    job: boolean;
    stages: boolean;
    create: boolean;
    cancel: boolean;
  };
  
  // Error states
  errors: Record<string, string | null>;
  
  // UI state
  selectedJobId: string | null;
  filterStatus: JobStatus | 'all';
  sortBy: 'created' | 'updated' | 'progress' | 'priority';
  sortOrder: 'asc' | 'desc';
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  
  // Optimistic updates
  pendingOperations: Record<string, {
    type: 'create' | 'update' | 'cancel' | 'retry';
    data: any;
    timestamp: number;
  }>;
  
  // Queue management
  queuePosition: Record<string, number>;
  estimatedWaitTimes: Record<string, number>;
  
  // Performance metrics
  processingStats: {
    totalProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    throughput: number; // jobs per hour
  };
  
  // Cache
  lastFetchTime: number | null;
  cacheExpiry: number; // 30 seconds for real-time data
}

// Store actions interface
interface ProcessingActions {
  // Job management
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  setCurrentJob: (jobId: string | null) => void;
  removeJob: (jobId: string) => void;
  
  // Job lifecycle
  createJob: (request: CreateJobRequest) => Promise<Job>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  pauseJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  
  // Processing stages
  updateProcessingStage: (jobId: string, stage: ProcessingStage) => void;
  setProcessingStages: (jobId: string, stages: ProcessingStage[]) => void;
  resetProcessingStages: (jobId: string) => void;
  
  // Event handling
  addWebSocketEvent: (event: WebSocketEvent) => void;
  handleProcessingStageEvent: (event: ProcessingStageEvent) => void;
  handleProcessingCompleteEvent: (event: ProcessingCompleteEvent) => void;
  handleErrorEvent: (event: ErrorOccurredEvent) => void;
  clearEvents: () => void;
  
  // Loading and error actions
  setLoading: (key: keyof ProcessingState['loading'], value: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  
  // UI actions
  setSelectedJob: (jobId: string | null) => void;
  setFilterStatus: (status: JobStatus | 'all') => void;
  setSorting: (sortBy: ProcessingState['sortBy'], sortOrder: ProcessingState['sortOrder']) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  
  // Optimistic updates
  addPendingOperation: (jobId: string, operation: ProcessingState['pendingOperations'][string]) => void;
  removePendingOperation: (jobId: string) => void;
  commitPendingOperation: (jobId: string) => void;
  rollbackPendingOperation: (jobId: string) => void;
  
  // Queue management
  updateQueuePosition: (jobId: string, position: number) => void;
  updateEstimatedWaitTime: (jobId: string, waitTime: number) => void;
  
  // Performance tracking
  updateProcessingStats: () => void;
  resetProcessingStats: () => void;
  
  // Bulk operations
  bulkCancel: (jobIds: string[]) => Promise<void>;
  bulkRetry: (jobIds: string[]) => Promise<void>;
  
  // Cache management
  invalidateCache: () => void;
  refreshJobs: () => Promise<void>;
  
  // Utility actions
  resetStore: () => void;
  pruneOldEvents: () => void;
  addProcessingLog: (level: string, message: string, metadata?: any) => void;
}

// Computed selectors
interface ProcessingSelectors {
  // Derived data
  currentJob: Job | null;
  selectedJob: Job | null;
  allJobs: Job[];
  filteredJobs: Job[];
  
  // Status breakdowns
  jobsByStatus: Record<JobStatus, Job[]>;
  activeJobsCount: number;
  queuedJobsCount: number;
  completedJobsCount: number;
  failedJobsCount: number;
  
  // Progress calculations
  overallProgress: number;
  estimatedTimeRemaining: number;
  
  // Status checks
  isProcessing: boolean;
  hasActiveJobs: boolean;
  hasFailedJobs: boolean;
  isLoading: boolean;
  hasErrors: boolean;
  hasPendingOperations: boolean;
  
  // Cache status
  isCacheExpired: boolean;
}

// Initial state
const initialState: ProcessingState = {
  activeJobs: [],
  processingQueue: [],
  completedJobs: [],
  failedJobs: [],
  currentJobId: null,
  
  processingStages: {},
  
  recentEvents: [],
  eventHistory: [],
  
  loading: {
    jobs: false,
    job: false,
    stages: false,
    create: false,
    cancel: false,
  },
  
  errors: {},
  
  selectedJobId: null,
  filterStatus: 'all',
  sortBy: 'created',
  sortOrder: 'desc',
  autoRefresh: true,
  refreshInterval: 5,
  
  pendingOperations: {},
  
  queuePosition: {},
  estimatedWaitTimes: {},
  
  processingStats: {
    totalProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0,
    throughput: 0,
  },
  
  lastFetchTime: null,
  cacheExpiry: 30 * 1000, // 30 seconds
};

// Create the store
export const useProcessingStore = create<ProcessingState & ProcessingActions & ProcessingSelectors>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        // Job management
        setJobs: (jobs) => {
          const categorizedJobs = jobs.reduce((acc, job) => {
            switch (job.status) {
              case 'pending':
                acc.processingQueue.push(job);
                break;
              case 'processing':
                acc.activeJobs.push(job);
                break;
              case 'completed':
                acc.completedJobs.push(job);
                break;
              case 'failed':
              case 'cancelled':
                acc.failedJobs.push(job);
                break;
              case 'paused':
                acc.activeJobs.push(job);
                break;
            }
            return acc;
          }, { activeJobs: [] as Job[], processingQueue: [] as Job[], completedJobs: [] as Job[], failedJobs: [] as Job[] });
          
          set({ 
            ...categorizedJobs,
            lastFetchTime: Date.now(),
            errors: { ...get().errors, jobs: null }
          });
        },
        
        addJob: (job) => {
          set((state) => {
            const newState = { ...state };
            
            switch (job.status) {
              case 'pending':
                newState.processingQueue = [...state.processingQueue, job];
                break;
              case 'processing':
                newState.activeJobs = [...state.activeJobs, job];
                break;
              case 'completed':
                newState.completedJobs = [...state.completedJobs, job];
                break;
              case 'failed':
              case 'cancelled':
                newState.failedJobs = [...state.failedJobs, job];
                break;
              case 'paused':
                newState.activeJobs = [...state.activeJobs, job];
                break;
            }
            
            return newState;
          });
        },
        
        updateJob: (jobId, updates) => {
          set((state) => {
            const updateJobInList = (jobs: Job[]) => 
              jobs.map(job => job.id === jobId ? { ...job, ...updates, updated_at: new Date().toISOString() } : job);
            
            return {
              activeJobs: updateJobInList(state.activeJobs),
              processingQueue: updateJobInList(state.processingQueue),
              completedJobs: updateJobInList(state.completedJobs),
              failedJobs: updateJobInList(state.failedJobs),
            };
          });
        },
        
        setCurrentJob: (jobId) => {
          set({ currentJobId: jobId });
        },
        
        removeJob: (jobId) => {
          set((state) => ({
            activeJobs: state.activeJobs.filter(j => j.id !== jobId),
            processingQueue: state.processingQueue.filter(j => j.id !== jobId),
            completedJobs: state.completedJobs.filter(j => j.id !== jobId),
            failedJobs: state.failedJobs.filter(j => j.id !== jobId),
            currentJobId: state.currentJobId === jobId ? null : state.currentJobId,
            selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId,
          }));
        },
        
        // Job lifecycle
        createJob: async (request) => {
          const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Optimistic update
          const optimisticJob: Job = {
            id: jobId,
            status: 'pending',
            progress: 0,
            profile_id: request.profile_id,
            audio_file: typeof request.audio_file === 'string' ? request.audio_file : request.audio_file.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stages: [],
            metadata: request.options,
          };
          
          get().addPendingOperation(jobId, {
            type: 'create',
            data: { request },
            timestamp: Date.now()
          });
          
          get().addJob(optimisticJob);
          
          try {
            // Mock API call - replace with actual implementation
            // const response = await processingAPI.createJob(request);
            // get().updateJob(jobId, response.data);
            
            // Simulate processing
            setTimeout(() => {
              get().updateJob(jobId, { status: 'processing' });
              get().setCurrentJob(jobId);
            }, 1000);
            
            return optimisticJob;
          } catch (error) {
            get().rollbackPendingOperation(jobId);
            get().setError('create', error instanceof Error ? error.message : 'Failed to create job');
            throw error;
          }
        },
        
        cancelJob: async (jobId) => {
          const originalJob = get().allJobs.find(j => j.id === jobId);
          if (!originalJob) return;
          
          get().addPendingOperation(jobId, {
            type: 'cancel',
            data: { originalStatus: originalJob.status },
            timestamp: Date.now()
          });
          
          // Optimistic update
          get().updateJob(jobId, { status: 'cancelled' });
          
          try {
            // Mock API call
            // await processingAPI.cancelJob(jobId);
            get().commitPendingOperation(jobId);
          } catch (error) {
            get().rollbackPendingOperation(jobId);
            get().setError('cancel', error instanceof Error ? error.message : 'Failed to cancel job');
            throw error;
          }
        },
        
        retryJob: async (jobId) => {
          const originalJob = get().allJobs.find(j => j.id === jobId);
          if (!originalJob) return;
          
          get().addPendingOperation(jobId, {
            type: 'retry',
            data: { originalStatus: originalJob.status },
            timestamp: Date.now()
          });
          
          // Optimistic update
          get().updateJob(jobId, { status: 'pending', progress: 0 });
          
          try {
            // Mock API call
            // await processingAPI.retryJob(jobId);
            get().commitPendingOperation(jobId);
          } catch (error) {
            get().rollbackPendingOperation(jobId);
            get().setError('retry', error instanceof Error ? error.message : 'Failed to retry job');
            throw error;
          }
        },
        
        pauseJob: async (jobId) => {
          get().updateJob(jobId, { status: 'paused' });
        },
        
        resumeJob: async (jobId) => {
          get().updateJob(jobId, { status: 'processing' });
        },
        
        // Processing stages
        updateProcessingStage: (jobId, stage) => {
          set((state) => ({
            processingStages: {
              ...state.processingStages,
              [jobId]: {
                ...state.processingStages[jobId],
                [stage.name]: stage
              }
            }
          }));
        },
        
        setProcessingStages: (jobId, stages) => {
          const stagesMap = stages.reduce((acc, stage) => {
            acc[stage.name] = stage;
            return acc;
          }, {} as Record<string, ProcessingStage>);
          
          set((state) => ({
            processingStages: {
              ...state.processingStages,
              [jobId]: stagesMap
            }
          }));
        },
        
        resetProcessingStages: (jobId) => {
          set((state) => {
            const newStages = { ...state.processingStages };
            delete newStages[jobId];
            return { processingStages: newStages };
          });
        },
        
        // Event handling
        addWebSocketEvent: (event) => {
          set((state) => ({
            recentEvents: [...state.recentEvents.slice(-49), event], // Keep last 50 events
            eventHistory: [...state.eventHistory, event]
          }));
        },
        
        handleProcessingStageEvent: (event) => {
          get().updateProcessingStage(event.job_id || 'unknown', {
            name: event.stage,
            progress: event.progress,
            estimated_completion: event.estimated_completion,
            status: event.status || 'in_progress',
            metadata: event.data
          });
          
          get().addWebSocketEvent(event);
        },
        
        handleProcessingCompleteEvent: (event) => {
          if (event.job_id) {
            get().updateJob(event.job_id, {
              status: event.final_status,
              progress: 100
            });
          }
          
          get().addWebSocketEvent(event);
          get().updateProcessingStats();
        },
        
        handleErrorEvent: (event) => {
          if (event.job_id) {
            get().updateJob(event.job_id, {
              status: 'failed',
              error: {
                code: event.error_code,
                message: event.error_message,
                details: { recoverable: event.recoverable }
              }
            });
          }
          
          get().addWebSocketEvent(event);
        },
        
        clearEvents: () => {
          set({ recentEvents: [], eventHistory: [] });
        },
        
        // Loading and error actions
        setLoading: (key, value) => {
          set((state) => ({
            loading: { ...state.loading, [key]: value }
          }));
        },
        
        setError: (key, error) => {
          set((state) => ({
            errors: { ...state.errors, [key]: error }
          }));
        },
        
        clearErrors: () => {
          set({ errors: {} });
        },
        
        // UI actions
        setSelectedJob: (jobId) => {
          set({ selectedJobId: jobId });
        },
        
        setFilterStatus: (status) => {
          set({ filterStatus: status });
        },
        
        setSorting: (sortBy, sortOrder) => {
          set({ sortBy, sortOrder });
        },
        
        setAutoRefresh: (enabled) => {
          set({ autoRefresh: enabled });
        },
        
        setRefreshInterval: (interval) => {
          set({ refreshInterval: interval });
        },
        
        // Optimistic updates
        addPendingOperation: (jobId, operation) => {
          set((state) => ({
            pendingOperations: { ...state.pendingOperations, [jobId]: operation }
          }));
        },
        
        removePendingOperation: (jobId) => {
          set((state) => {
            const newPending = { ...state.pendingOperations };
            delete newPending[jobId];
            return { pendingOperations: newPending };
          });
        },
        
        commitPendingOperation: (jobId) => {
          get().removePendingOperation(jobId);
        },
        
        rollbackPendingOperation: (jobId) => {
          const operation = get().pendingOperations[jobId];
          if (!operation) return;
          
          switch (operation.type) {
            case 'create':
              get().removeJob(jobId);
              break;
            case 'cancel':
            case 'retry':
              if (operation.data.originalStatus) {
                get().updateJob(jobId, { status: operation.data.originalStatus });
              }
              break;
          }
          
          get().removePendingOperation(jobId);
        },
        
        // Queue management
        updateQueuePosition: (jobId, position) => {
          set((state) => ({
            queuePosition: { ...state.queuePosition, [jobId]: position }
          }));
        },
        
        updateEstimatedWaitTime: (jobId, waitTime) => {
          set((state) => ({
            estimatedWaitTimes: { ...state.estimatedWaitTimes, [jobId]: waitTime }
          }));
        },
        
        // Performance tracking
        updateProcessingStats: () => {
          const state = get();
          const totalJobs = state.completedJobs.length + state.failedJobs.length;
          const successfulJobs = state.completedJobs.length;
          
          if (totalJobs === 0) return;
          
          const averageTime = state.completedJobs.reduce((sum, job) => {
            const created = new Date(job.created_at).getTime();
            const updated = new Date(job.updated_at).getTime();
            return sum + (updated - created);
          }, 0) / state.completedJobs.length;
          
          set((state) => ({
            processingStats: {
              totalProcessed: totalJobs,
              averageProcessingTime: averageTime,
              successRate: (successfulJobs / totalJobs) * 100,
              throughput: successfulJobs / (totalJobs / 60), // jobs per minute
            }
          }));
        },
        
        resetProcessingStats: () => {
          set({
            processingStats: {
              totalProcessed: 0,
              averageProcessingTime: 0,
              successRate: 0,
              throughput: 0,
            }
          });
        },
        
        // Bulk operations
        bulkCancel: async (jobIds) => {
          await Promise.all(jobIds.map(jobId => get().cancelJob(jobId)));
        },
        
        bulkRetry: async (jobIds) => {
          await Promise.all(jobIds.map(jobId => get().retryJob(jobId)));
        },
        
        // Cache management
        invalidateCache: () => {
          set({ lastFetchTime: null });
        },
        
        refreshJobs: async () => {
          const state = get();
          if (state.loading.jobs) return;
          
          get().setLoading('jobs', true);
          
          try {
            // Mock API call
            // const response = await processingAPI.getAllJobs();
            // get().setJobs(response.data);
          } catch (error) {
            get().setError('jobs', error instanceof Error ? error.message : 'Failed to fetch jobs');
          } finally {
            get().setLoading('jobs', false);
          }
        },
        
        // Utility actions
        resetStore: () => {
          set(initialState);
        },
        
        pruneOldEvents: () => {
          set((state) => {
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
            const recentEvents = state.recentEvents.filter(event => 
              new Date(event.timestamp).getTime() > cutoffTime
            );
            const eventHistory = state.eventHistory.filter(event => 
              new Date(event.timestamp).getTime() > cutoffTime
            );
            
            return { recentEvents, eventHistory };
          });
        },
        
        addProcessingLog: (level: string, message: string, metadata?: any) => {
          // Add to system logs for now - could be enhanced to have processing-specific logs
          console.log(`[${level.toUpperCase()}] Processing: ${message}`, metadata);
        },
        
        // Selectors
        get currentJob() {
          const allJobs = this.allJobs || [];
          return allJobs.find(job => job.id === this.currentJobId) || null;
        },
        get selectedJob() {
          const allJobs = this.allJobs || [];
          return allJobs.find(job => job.id === this.selectedJobId) || null;
        },
        get allJobs() {
          return [...(this.activeJobs || []), ...(this.processingQueue || []), ...(this.completedJobs || []), ...(this.failedJobs || [])];
        },
        get filteredJobs() {
          let filtered = this.allJobs;
          
          if (this.filterStatus !== 'all') {
            filtered = filtered.filter(job => job.status === this.filterStatus);
          }
          
          // Apply sorting
          filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortBy) {
              case 'created':
                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                break;
              case 'updated':
                comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                break;
              case 'progress':
                comparison = a.progress - b.progress;
                break;
              case 'priority':
                comparison = (a.priority || 0) - (b.priority || 0);
                break;
            }
            
            return this.sortOrder === 'asc' ? comparison : -comparison;
          });
          
          return filtered;
        },
        get jobsByStatus() {
          const allJobs = this.allJobs;
          return {
            pending: allJobs.filter(job => job.status === 'pending'),
            processing: allJobs.filter(job => job.status === 'processing'),
            completed: allJobs.filter(job => job.status === 'completed'),
            failed: allJobs.filter(job => job.status === 'failed'),
            cancelled: allJobs.filter(job => job.status === 'cancelled'),
            paused: allJobs.filter(job => job.status === 'paused'),
          };
        },
        get activeJobsCount() {
          return this.activeJobs?.length || 0;
        },
        get queuedJobsCount() {
          return this.processingQueue?.length || 0;
        },
        get completedJobsCount() {
          return this.completedJobs?.length || 0;
        },
        get failedJobsCount() {
          return this.failedJobs?.length || 0;
        },
        get overallProgress() {
          const allJobs = this.allJobs;
          const totalProgress = allJobs.reduce((sum, job) => sum + job.progress, 0);
          return allJobs.length > 0 ? totalProgress / allJobs.length : 0;
        },
        get estimatedTimeRemaining() {
          const activeJobs = this.allJobs.filter(job => job.status === 'processing');
          return activeJobs.reduce((sum, job) => {
            if (job.estimated_completion) {
              const estimatedTime = new Date(job.estimated_completion).getTime() - Date.now();
              return sum + Math.max(0, estimatedTime);
            }
            return sum;
          }, 0);
        },
        get isProcessing() {
          return (this.activeJobs?.length || 0) > 0;
        },
        get hasActiveJobs() {
          return (this.activeJobs?.length || 0) > 0 || (this.processingQueue?.length || 0) > 0;
        },
        get hasFailedJobs() {
          return (this.failedJobs?.length || 0) > 0;
        },
        get isLoading() {
          const loading = this.loading || {};
          return Object.values(loading).some(loading => loading);
        },
        get hasErrors() {
          const errors = this.errors || {};
          return Object.values(errors).some(error => error !== null);
        },
        get hasPendingOperations() {
          const pendingOperations = this.pendingOperations || {};
          return Object.keys(pendingOperations).length > 0;
        },
        get isCacheExpired() {
          return this.lastFetchTime 
            ? Date.now() - new Date(this.lastFetchTime).getTime() > this.cacheExpiry
            : true;
        }
      })),
      {
        name: 'processing-store',
        partialize: (state) => ({
          // Only persist specific fields
          selectedJobId: state.selectedJobId,
          filterStatus: state.filterStatus,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          autoRefresh: state.autoRefresh,
          refreshInterval: state.refreshInterval,
          processingStats: state.processingStats,
          completedJobs: state.completedJobs.slice(-50), // Keep last 50 completed jobs
          failedJobs: state.failedJobs.slice(-50), // Keep last 50 failed jobs
        }),
      }
    ),
    {
      name: 'processing-store',
    }
  )
);

// Computed selectors
export const useCurrentJob = () => useProcessingStore(state => {
  try {
    if (!state || !state.allJobs) return null;
    return state.allJobs.find(job => job?.id === state.currentJobId) || null;
  } catch (error) {
    console.warn('Error in useCurrentJob selector:', error);
    return null;
  }
});

export const useSelectedJob = () => useProcessingStore(state => {
  try {
    if (!state || !state.allJobs) return null;
    return state.allJobs.find(job => job?.id === state.selectedJobId) || null;
  } catch (error) {
    console.warn('Error in useSelectedJob selector:', error);
    return null;
  }
});

export const useAllJobs = () => useProcessingStore(state => {
  try {
    if (!state) return [];
    return [
      ...(state.activeJobs || []),
      ...(state.processingQueue || []),
      ...(state.completedJobs || []),
      ...(state.failedJobs || [])
    ];
  } catch (error) {
    console.warn('Error in useAllJobs selector:', error);
    return [];
  }
});

export const useFilteredJobs = () => useProcessingStore(state => {
  try {
    if (!state) return [];
    let filtered = state.allJobs || [];
    
    if (state.filterStatus !== 'all') {
      filtered = filtered.filter(job => job?.status === state.filterStatus);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sortBy) {
        case 'created':
          comparison = new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime();
          break;
      case 'updated':
        comparison = new Date(a?.updated_at || 0).getTime() - new Date(b?.updated_at || 0).getTime();
        break;
      case 'progress':
        comparison = (a?.progress || 0) - (b?.progress || 0);
        break;
      case 'priority':
        comparison = (a?.priority || 0) - (b?.priority || 0);
        break;
    }
    
    return state.sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return filtered;
} catch (error) {
  console.warn('Error in useFilteredJobs selector:', error);
  return [];
}
});

export const useJobsByStatus = () => useProcessingStore(state => {
  try {
    if (!state) return { pending: [], processing: [], completed: [], failed: [] };
    const jobs = state.allJobs || [];
    return {
      pending: jobs.filter(job => job?.status === 'pending'),
      processing: jobs.filter(job => job?.status === 'processing'),
      completed: jobs.filter(job => job?.status === 'completed'),
    failed: jobs.filter(job => job?.status === 'failed'),
    cancelled: jobs.filter(job => job?.status === 'cancelled'),
    paused: jobs.filter(job => job?.status === 'paused'),
  };
} catch (error) {
  console.warn('Error in useJobsByStatus selector:', error);
  return { pending: [], processing: [], completed: [], failed: [], cancelled: [], paused: [] };
}
});

export const useJobCounts = () => useProcessingStore(state => {
  try {
    if (!state) {
      return {
        activeJobsCount: 0,
        queuedJobsCount: 0,
        completedJobsCount: 0,
        failedJobsCount: 0
      };
    }
    return {
      activeJobsCount: state.activeJobs?.length || 0,
      queuedJobsCount: state.processingQueue?.length || 0,
      completedJobsCount: state.completedJobs?.length || 0,
      failedJobsCount: state.failedJobs?.length || 0,
    };
  } catch (error) {
    console.warn('Error in useJobCounts selector:', error);
    return {
      activeJobsCount: 0,
      queuedJobsCount: 0,
      completedJobsCount: 0,
      failedJobsCount: 0
    };
  }
});

export const useProcessingProgress = () => useProcessingStore(state => {
  try {
    if (!state) {
      return {
        overallProgress: 0,
        estimatedTimeRemaining: 0,
        jobsInProgress: 0,
        jobsCompleted: 0
      };
    }
    
    const allJobs = state.allJobs || [];
    const totalProgress = allJobs.reduce((sum, job) => sum + (job?.progress || 0), 0);
    const overallProgress = allJobs.length > 0 ? totalProgress / allJobs.length : 0;
    
    // Calculate estimated time remaining for active jobs
    const activeJobs = allJobs.filter(job => job?.status === 'processing');
    const estimatedTimeRemaining = activeJobs.reduce((sum, job) => {
      if (job?.estimated_completion) {
        const estimatedTime = new Date(job.estimated_completion).getTime() - Date.now();
        return sum + Math.max(0, estimatedTime);
      }
      return sum;
    }, 0);
    
    return {
      overallProgress,
      estimatedTimeRemaining,
      jobsInProgress: activeJobs.length,
      jobsCompleted: allJobs.filter(job => job?.status === 'completed').length
    };
  } catch (error) {
    console.warn('Error in useProcessingProgress selector:', error);
    return {
      overallProgress: 0,
      estimatedTimeRemaining: 0,
      jobsInProgress: 0,
      jobsCompleted: 0
    };
  }
});

export const useProcessingStatus = () => useProcessingStore(state => {
  try {
    if (!state) {
      return {
        isProcessing: false,
        hasActiveJobs: false,
        hasFailedJobs: false,
        isLoading: false,
        hasErrors: false,
        hasPendingOperations: false,
        isCacheExpired: true
      };
    }
    
    return {
      isProcessing: (state.activeJobs?.length || 0) > 0,
      hasActiveJobs: (state.activeJobs?.length || 0) > 0 || (state.processingQueue?.length || 0) > 0,
      hasFailedJobs: (state.failedJobs?.length || 0) > 0,
      isLoading: Object.values(state.loading || {}).some(loading => loading),
      hasErrors: Object.values(state.errors || {}).some(error => error !== null),
      hasPendingOperations: Object.keys(state.pendingOperations || {}).length > 0,
      isCacheExpired: state.lastFetchTime 
        ? Date.now() - state.lastFetchTime > (state.cacheExpiry || 300000)
        : true,
    };
  } catch (error) {
    console.warn('Error in useProcessingStatus selector:', error);
    return {
      isProcessing: false,
      hasActiveJobs: false,
      hasFailedJobs: false,
      isLoading: false,
      hasErrors: false,
      hasPendingOperations: false,
      isCacheExpired: true
    };
  }
});

// Auto-refresh effect
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useProcessingStore.getState();
    if (state.autoRefresh && !state.isLoading) {
      useProcessingStore.getState().refreshJobs();
    }
  }, 5000); // Check every 5 seconds
}

// Export the main store hook
export default useProcessingStore;