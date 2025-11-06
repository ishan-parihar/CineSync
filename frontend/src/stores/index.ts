/**
 * Store Orchestration System
 * Provides cross-store communication, event-driven updates, and unified management
 */

import { useEffect, useCallback, useRef } from 'react';
import { subscribeWithSelector } from 'zustand/middleware';

// Import all stores
import useProfilesStore, { useProfileStatus } from './profilesStore';
import useProcessingStore, { useProcessingStatus } from './processingStore';
import useCinematographyStore, { useCinematographyStatus } from './cinematographyStore';
import useSystemStore, { useSystemHealth } from './systemStore';
import useUIStore, { useUIStatus } from './uiStore';

// Import types
import type { 
  WebSocketEvent, 
  Job, 
  ProfileConfig, 
  ShotDecision,
  EmotionAnalysis,
  ProcessingStageEvent,
  ShotDecisionEvent,
  ErrorOccurredEvent,
  TensionAnalysisEvent
} from '../types';

// ============================================================================
// CROSS-STORE EVENT SYSTEM
// ============================================================================

/**
 * Global event bus for cross-store communication
 */
class StoreEventBus {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private eventHistory: Array<{ type: string; data: any; timestamp: number }> = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to store events
   */
  on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    const callbacks = this.listeners.get(eventType)!;
    callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit a store event
   */
  emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
    
    // Add to history
    this.eventHistory.push({
      type: eventType,
      data,
      timestamp: Date.now()
    });
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get event history
   */
  getHistory(eventType?: string) {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }
}

// Global event bus instance
export const storeEventBus = new StoreEventBus();

// ============================================================================
// STORE ORCHESTRATION HOOK
// ============================================================================

/**
 * Main orchestration hook that manages cross-store interactions
 */
export function useStoreOrchestration() {
  // Store references
  const profilesStore = useProfilesStore();
  const processingStore = useProcessingStore();
  const cinematographyStore = useCinematographyStore();
  const systemStore = useSystemStore();
  const uiStore = useUIStore();

  // Refs for cleanup
  const unsubscribeFns = useRef<Array<() => void>>([]);

  // ============================================================================
  // CROSS-STORE EVENT HANDLERS
  // ============================================================================

  /**
   * Handle job creation events
   */
  const handleJobCreated = useCallback((job: Job) => {
    // Update system metrics
    systemStore.addLog({
      level: 'info',
      message: `Job created: ${job.id}`,
      source: 'orchestration',
      metadata: { jobId: job.id, profileId: job.profile_id }
    });

    // Update UI notification
    uiStore.addNotification({
      type: 'success',
      title: 'Job Created',
      message: `Processing job ${job.id} has been created successfully.`,
      autoHide: true
    });

    // If profile is involved, update its status
    if (job.profile_id) {
      const profile = profilesStore.profiles.find(p => p.profile_name === job.profile_id);
      if (profile) {
        storeEventBus.emit('profile:job_created', {
          profileId: job.profile_id,
          jobId: job.id
        });
      }
    }
  }, [systemStore, uiStore, profilesStore.profiles]);

  /**
   * Handle profile selection changes
   */
  const handleProfileSelected = useCallback((profileId: string | null) => {
    if (!profileId) return;

    const profile = profilesStore.profiles.find(p => p.profile_name === profileId);
    if (!profile) return;

    // Update UI with profile context
    uiStore.setBreadcrumbs([
      { label: 'Profiles', path: '/profiles' },
      { label: profile.profile_name, path: `/profiles/${profileId}` }
    ]);

    // Load cinematography config for profile if available
    storeEventBus.emit('profile:selected', { profileId, profile });

    // Check if profile has active jobs
    const activeJobs = processingStore.allJobs.filter(job => job.profile_id === profileId);
    if (activeJobs.length > 0) {
      uiStore.addNotification({
        type: 'info',
        title: 'Active Jobs',
        message: `This profile has ${activeJobs.length} active processing jobs.`,
        autoHide: true
      });
    }
  }, [profilesStore.profiles, processingStore.allJobs, uiStore]);

  /**
   * Handle emotion analysis completion
   */
  const handleEmotionAnalysisComplete = useCallback((analysis: EmotionAnalysis) => {
    // Update cinematography store with new analysis
    cinematographyStore.setEmotionAnalysis(analysis);

    // Log to system
    systemStore.addLog({
      level: 'info',
      message: `Emotion analysis completed: ${analysis.segments.length} segments`,
      source: 'orchestration',
      metadata: {
        duration: analysis.duration,
        overallEmotion: analysis.overall_emotion,
        confidence: analysis.overall_confidence
      }
    });

    // Notify user
    uiStore.addNotification({
      type: 'success',
      title: 'Analysis Complete',
      message: `Emotion analysis identified ${analysis.segments.length} segments with ${analysis.overall_emotion} as the dominant emotion.`,
      autoHide: true
    });

    // Trigger shot sequence generation if enabled
    storeEventBus.emit('emotion:analysis_complete', { analysis });
  }, [cinematographyStore, systemStore, uiStore]);

  /**
   * Handle shot decision events
   */
  const handleShotDecision = useCallback((event: ShotDecisionEvent) => {
    // Add to cinematography store
    cinematographyStore.addShotDecisionEvent(event);

    // Update processing progress
    if (event.job_id) {
      processingStore.handleProcessingStageEvent({
        type: 'processing_stage_update',
        timestamp: event.timestamp,
        job_id: event.job_id,
        stage: 'shot_generation',
        progress: 75, // Estimate progress
        status: 'in_progress'
      });
    }

    // Log decision
    systemStore.addLog({
      level: 'info',
      message: `Shot decision: ${event.emotion} -> ${event.selected_shot}`,
      source: 'orchestration',
      metadata: {
        emotion: event.emotion,
        shot: event.selected_shot,
        angle: event.vertical_angle,
        confidence: event.confidence
      }
    });
  }, [cinematographyStore, processingStore, systemStore]);

  /**
   * Handle system errors
   */
  const handleSystemError = useCallback((event: ErrorOccurredEvent) => {
    // Update system store
    systemStore.handleErrorEvent(event);

    // Update processing store if it's a job error
    if (event.job_id) {
      processingStore.handleErrorEvent(event);
    }

    // Show user notification
    uiStore.addNotification({
      type: 'error',
      title: 'System Error',
      message: event.error_message,
      autoHide: false,
      actions: event.recoverable ? [
        {
          label: 'Retry',
          action: () => {
            if (event.job_id) {
              processingStore.retryJob(event.job_id);
            }
          },
          primary: true
        },
        {
          label: 'Dismiss',
          action: () => {}
        }
      ] : [
        {
          label: 'View Details',
          action: () => {
            uiStore.openModal('settings');
          }
        }
      ]
    });

    // Log error
    systemStore.addLog({
      level: 'error',
      message: `System error [${event.error_code}]: ${event.error_message}`,
      source: event.error_stage || 'system',
      metadata: {
        errorCode: event.error_code,
        recoverable: event.recoverable,
        jobId: event.job_id
      }
    });
  }, [systemStore, processingStore, uiStore]);

  /**
   * Handle connection status changes
   */
  const handleConnectionChange = useCallback((connected: boolean) => {
    systemStore.setConnectionStatus(connected);

    if (connected) {
      // Re-sync data when reconnected
      processingStore.refreshJobs();
      systemStore.performHealthCheck();
      
      uiStore.addNotification({
        type: 'success',
        title: 'Connected',
        message: 'Successfully connected to the server.',
        autoHide: true
      });
    } else {
      uiStore.addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Lost connection to the server. Some features may be unavailable.',
        autoHide: false
      });
    }
  }, [systemStore, processingStore, uiStore]);

  /**
   * Handle workspace save events
   */
  const handleWorkspaceSave = useCallback(() => {
    const workspaceData = {
      profiles: {
        activeProfile: profilesStore.activeProfileId,
        selectedProfile: profilesStore.selectedProfileId
      },
      processing: {
        currentJob: processingStore.currentJobId,
        selectedJob: processingStore.selectedJobId
      },
      cinematography: {
        selectedShot: cinematographyStore.selectedShotIndex,
        selectedSegment: cinematographyStore.selectedSegmentIndex,
        viewMode: cinematographyStore.viewMode
      },
      ui: {
        currentRoute: uiStore.currentRoute,
        panels: uiStore.panels
      },
      timestamp: new Date().toISOString()
    };

    // Save to localStorage or send to backend
    localStorage.setItem('lipsync_workspace', JSON.stringify(workspaceData));

    uiStore.saveWorkspace();
    systemStore.addLog({
      level: 'info',
      message: 'Workspace saved',
      source: 'orchestration'
    });
  }, [
    profilesStore.activeProfileId,
    profilesStore.selectedProfileId,
    processingStore.currentJobId,
    processingStore.selectedJobId,
    cinematographyStore.selectedShotIndex,
    cinematographyStore.selectedSegmentIndex,
    cinematographyStore.viewMode,
    uiStore.currentRoute,
    uiStore.panels,
    uiStore,
    systemStore
  ]);

  // ============================================================================
  // EVENT SUBSCRIPTION SETUP
  // ============================================================================

  useEffect(() => {
    // Subscribe to store-specific events
    
    // Profiles store events
    const unsubscribeProfileSelected = storeEventBus.on('profile:selected', handleProfileSelected);
    
    // Processing store events
    const unsubscribeJobCreated = storeEventBus.on('job:created', handleJobCreated);
    
    // Cinematography store events
    const unsubscribeEmotionComplete = storeEventBus.on('emotion:analysis_complete', handleEmotionAnalysisComplete);
    const unsubscribeShotDecision = storeEventBus.on('shot:decision', handleShotDecision);
    
    // System store events
    const unsubscribeSystemError = storeEventBus.on('system:error', handleSystemError);
    const unsubscribeConnectionChange = storeEventBus.on('connection:changed', handleConnectionChange);
    
    // UI store events
    const unsubscribeWorkspaceSave = storeEventBus.on('workspace:save', handleWorkspaceSave);

    // Store unsubscribe functions for cleanup
    unsubscribeFns.current = [
      unsubscribeProfileSelected,
      unsubscribeJobCreated,
      unsubscribeEmotionComplete,
      unsubscribeShotDecision,
      unsubscribeSystemError,
      unsubscribeConnectionChange,
      unsubscribeWorkspaceSave
    ];

    return () => {
      // Cleanup all subscriptions
      unsubscribeFns.current.forEach(unsubscribe => unsubscribe());
    };
  }, [
    handleProfileSelected,
    handleJobCreated,
    handleEmotionAnalysisComplete,
    handleShotDecision,
    handleSystemError,
    handleConnectionChange,
    handleWorkspaceSave
  ]);

  // ============================================================================
  // CROSS-STORE SYNCHRONIZATION
  // ============================================================================

  /**
   * Synchronize data across stores when needed
   */
  const synchronizeStores = useCallback(() => {
    // Sync profile selection with cinematography
    if (profilesStore.activeProfileId && !cinematographyStore.emotionAnalysis) {
      // Load cinematography data for active profile
      storeEventBus.emit('profile:sync_cinematography', {
        profileId: profilesStore.activeProfileId
      });
    }

    // Sync job status with system metrics
    const activeJobsCount = processingStore.activeJobs.length;
    if (systemStore.performance?.active_jobs !== activeJobsCount) {
      systemStore.addMetricPoint('activeJobs', activeJobsCount);
    }

    // Sync error states across stores
    const hasSystemErrors = Object.values(systemStore.errors).some(error => error !== null);
    const hasProcessingErrors = Object.values(processingStore.errors).some(error => error !== null);
    
    if (hasSystemErrors || hasProcessingErrors) {
      uiStore.setError('global', 'System or processing errors detected');
    } else {
      uiStore.setError('global', null);
    }
  }, [
    profilesStore.activeProfileId,
    cinematographyStore.emotionAnalysis,
    processingStore.activeJobs,
    systemStore.performance,
    systemStore.errors,
    processingStore.errors,
    uiStore
  ]);

  // Auto-synchronize every 30 seconds
  useEffect(() => {
    const interval = setInterval(synchronizeStores, 30000);
    return () => clearInterval(interval);
  }, [synchronizeStores]);

  // ============================================================================
  // UNIFIED ACTIONS
  // ============================================================================

  /**
   * Create a new job with full orchestration
   */
  const createOrchestratedJob = useCallback(async (profileId: string, audioFile: string | File) => {
    try {
      // Validate profile
      const profile = profilesStore.profiles.find(p => p.profile_name === profileId);
      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      // Set loading states
      profilesStore.setLoading('profile', true);
      processingStore.setLoading('create', true);

      // Create job through processing store
      const job = await processingStore.createJob({
        profile_id: profileId,
        audio_file: audioFile,
        job_name: `${profile.profile_name} - ${new Date().toISOString()}`,
        options: {
          analyze_emotions: true,
          generate_shots: true,
          output_format: 'data_only'
        }
      });

      // Emit orchestrated event
      storeEventBus.emit('job:orchestrated_created', {
        job,
        profile
      });

      // Update UI
      uiStore.setCurrentRoute(`/processing/${job.id}`);
      processingStore.setSelectedJob(job.id);

      return job;
    } catch (error) {
      // Handle error across all stores
      const errorMessage = error instanceof Error ? error.message : 'Failed to create job';
      
      systemStore.addLog({
        level: 'error',
        message: `Job creation failed: ${errorMessage}`,
        source: 'orchestration'
      });

      uiStore.addNotification({
        type: 'error',
        title: 'Job Creation Failed',
        message: errorMessage,
        autoHide: false
      });

      throw error;
    } finally {
      profilesStore.setLoading('profile', false);
      processingStore.setLoading('create', false);
    }
  }, [profilesStore, processingStore, systemStore, uiStore]);

  /**
   * Reset entire application state
   */
  const resetApplication = useCallback(() => {
    // Reset all stores
    profilesStore.resetStore();
    processingStore.resetStore();
    cinematographyStore.resetStore();
    systemStore.resetStore();
    uiStore.resetStore();

    // Clear event bus
    storeEventBus.clearHistory();

    // Clear localStorage
    localStorage.removeItem('lipsync_workspace');

    // Navigate to home
    uiStore.setCurrentRoute('/');

    // Notify user
    uiStore.addNotification({
      type: 'info',
      title: 'Application Reset',
      message: 'All application data has been reset.',
      autoHide: true
    });
  }, [profilesStore, processingStore, cinematographyStore, systemStore, uiStore]);

  /**
   * Get comprehensive application status
   */
  const getApplicationStatus = useCallback(() => {
    const profileStatus = useProfileStatus();
    const processingStatus = useProcessingStatus();
    const cinematographyStatus = useCinematographyStatus();
    const systemHealth = useSystemHealth();
    const uiStatus = useUIStatus();

    return {
      overall: systemHealth.isSystemHealthy ? 'healthy' : 'degraded',
      profiles: {
        hasProfiles: profileStatus.hasProfiles,
        isLoading: profileStatus.isLoading,
        hasErrors: profileStatus.hasErrors
      },
      processing: {
        isProcessing: processingStatus.isProcessing,
        hasActiveJobs: processingStatus.hasActiveJobs,
        isLoading: processingStatus.isLoading
      },
      cinematography: {
        hasData: cinematographyStatus.hasShotSequence,
        hasEmotionData: cinematographyStatus.hasEmotionData,
        isValid: cinematographyStatus.isValidSequence
      },
      system: {
        isHealthy: systemHealth.isSystemHealthy,
        hasAlerts: systemHealth.hasActiveAlerts,
        isConnected: systemStore.isConnected
      },
      ui: {
        hasErrors: uiStatus.hasErrors,
        isLoading: uiStatus.isLoading,
        hasUnsavedChanges: uiStore.workspace.unsavedChanges
      }
    };
  }, [
    useProfileStatus,
    useProcessingStatus,
    useCinematographyStatus,
    useSystemHealth,
    useUIStatus,
    systemStore.isConnected,
    uiStore.workspace.unsavedChanges
  ]);

  return {
    // Event bus access
    eventBus: storeEventBus,
    
    // Unified actions
    createOrchestratedJob,
    resetApplication,
    synchronizeStores,
    getApplicationStatus,
    handleShotDecision,
    handleSystemError,
    handleConnectionChange,
    handleWorkspaceSave,
    
    // Store status
    stores: {
      profiles: profilesStore,
      processing: processingStore,
      cinematography: cinematographyStore,
      system: systemStore,
      ui: uiStore
    }
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for accessing global application state
 */
export function useApplicationState() {
  const orchestration = useStoreOrchestration();
  return orchestration.getApplicationStatus();
}

/**
 * Hook for WebSocket event handling across stores
 */
export function useWebSocketEventHandler() {
  const orchestration = useStoreOrchestration();

  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    // Add to system event log
    orchestration.stores.system.addSystemEvent(event);

    // Route to appropriate store based on event type
    switch (event.type) {
      case 'emotion_segment_processed':
        // Handle through cinematography store
        break;
      case 'shot_decision_made':
        orchestration.handleShotDecision(event as ShotDecisionEvent);
        break;
      case 'processing_stage_update':
        orchestration.stores.processing.handleProcessingStageEvent(event as ProcessingStageEvent);
        break;
      case 'tension_analysis_complete':
        orchestration.stores.cinematography.handleTensionAnalysisEvent(event as TensionAnalysisEvent);
        break;
      case 'error_occurred':
        orchestration.handleSystemError(event as ErrorOccurredEvent);
        break;
      case 'connection_established':
        orchestration.handleConnectionChange(true);
        break;
      default:
        console.warn('Unknown WebSocket event type:', event.type);
    }
  }, [orchestration]);

  return {
    handleWebSocketEvent,
    isConnected: orchestration.stores.system.isConnected
  };
}

/**
 * Hook for workspace persistence
 */
export function useWorkspacePersistence() {
  const orchestration = useStoreOrchestration();

  const saveWorkspace = useCallback(() => {
    orchestration.handleWorkspaceSave();
  }, [orchestration]);

  const loadWorkspace = useCallback(() => {
    try {
      const savedData = localStorage.getItem('lipsync_workspace');
      if (!savedData) return;

      const workspace = JSON.parse(savedData);
      
      // Restore state across stores
      if (workspace.profiles?.activeProfile) {
        orchestration.stores.profiles.setActiveProfile(workspace.profiles.activeProfile);
      }
      if (workspace.profiles?.selectedProfile) {
        orchestration.stores.profiles.setSelectedProfile(workspace.profiles.selectedProfile);
      }
      if (workspace.processing?.currentJob) {
        orchestration.stores.processing.setCurrentJob(workspace.processing.currentJob);
      }
      if (workspace.processing?.selectedJob) {
        orchestration.stores.processing.setSelectedJob(workspace.processing.selectedJob);
      }
      if (workspace.cinematography?.selectedShot !== undefined) {
        orchestration.stores.cinematography.setSelectedShot(workspace.cinematography.selectedShot);
      }
      if (workspace.ui?.currentRoute) {
        orchestration.stores.ui.setCurrentRoute(workspace.ui.currentRoute);
      }
      if (workspace.ui?.panels) {
        orchestration.stores.ui.setPanelVisibility = workspace.ui.panels;
      }

      orchestration.stores.ui.addNotification({
        type: 'success',
        title: 'Workspace Restored',
        message: 'Your previous workspace has been restored.',
        autoHide: true
      });
    } catch (error) {
      console.error('Failed to load workspace:', error);
      orchestration.stores.ui.addNotification({
        type: 'error',
        title: 'Workspace Load Failed',
        message: 'Could not restore your previous workspace.',
        autoHide: true
      });
    }
  }, [orchestration]);

  return {
    saveWorkspace,
    loadWorkspace
  };
}

// Export individual stores for direct access
export {
  useProfilesStore,
  useProcessingStore,
  useCinematographyStore,
  useSystemStore,
  useUIStore,
  useProfileStatus,
  useProcessingStatus,
  useCinematographyStatus,
  useSystemHealth,
  useUIStatus
};

export default useStoreOrchestration;