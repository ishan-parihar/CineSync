/**
 * Example component demonstrating the new store architecture
 * This component shows how to use the domain-specific stores and orchestration
 */

import React, { useEffect, useState } from 'react';
import { 
  useProfilesStore,
  useProcessingStore,
  useCinematographyStore,
  useSystemStore,
  useUIStore,
  useStoreOrchestration,
  useWebSocketEventHandler,
  useWorkspacePersistence
} from '../stores';

// Import selectors for optimized performance
import {
  useActiveProfile,
  useValidProfiles,
  useProfileStats
} from '../stores/profilesStore';

import {
  useCurrentJob,
  useFilteredJobs,
  useProcessingStatus
} from '../stores/processingStore';

import {
  useSelectedShot,
  useCinematographyStatus
} from '../stores/cinematographyStore';

import {
  useSystemHealth,
  usePerformanceInsights
} from '../stores/systemStore';

import {
  useThemeState,
  useNotificationState,
  useModalState
} from '../stores/uiStore';

// Import types
import type { ProfileConfig, Job, ShotDecision } from '../types';

/**
 * Main Dashboard Component
 * Demonstrates comprehensive usage of the new store architecture
 */
export function Dashboard() {
  // ============================================================================
  // STORE HOOKS - Individual stores for specific domains
  // ============================================================================
  
  // Profile management
  const profilesStore = useProfilesStore();
  const { 
    profiles, 
    loading: profilesLoading, 
    setActiveProfile,
    addProfile,
    deleteProfile 
  } = profilesStore;
  
  // Processing management
  const processingStore = useProcessingStore();
  const {
    activeJobs,
    createJob,
    cancelJob,
    setCurrentJob
  } = processingStore;
  
  // Cinematography management
  const cinematographyStore = useCinematographyStore();
  const {
    shotDecisions,
    emotionAnalysis,
    updateShotDecision,
    setEditingMode,
    saveEdits,
    undo,
    redo
  } = cinematographyStore;
  
  // System monitoring
  const systemStore = useSystemStore();
  const {
    healthCheck,
    performHealthCheck,
    addAlert,
    addLog
  } = systemStore;
  
  // UI management
  const uiStore = useUIStore();
  const {
    preferences,
    updatePreferences,
    openModal,
    closeModal,
    addNotification
  } = uiStore;

  // ============================================================================
  // OPTIMIZED SELECTORS - For performance and derived state
  // ============================================================================
  
  // Profile selectors
  const activeProfile = useActiveProfile();
  const validProfiles = useValidProfiles();
  const profileStats = useProfileStats();
  
  // Processing selectors
  const currentJob = useCurrentJob();
  const filteredJobs = useFilteredJobs();
  const processingStatus = useProcessingStatus();
  
  // Cinematography selectors
  const selectedShot = useSelectedShot();
  const cinematographyStatus = useCinematographyStatus();
  
  // System selectors
  const systemHealth = useSystemHealth();
  const performanceInsights = usePerformanceInsights();
  
  // UI selectors
  const { currentTheme, isDarkMode } = useThemeState();
  const { hasNotifications } = useNotificationState();
  const { hasActiveModals } = useModalState();

  // ============================================================================
  // ORCHESTRATION HOOKS - For cross-store operations
  // ============================================================================
  
  // Main orchestration for complex operations
  const { 
    createOrchestratedJob, 
    resetApplication, 
    getApplicationStatus,
    eventBus
  } = useStoreOrchestration();
  
  // WebSocket event handling across stores
  const { handleWebSocketEvent, isConnected } = useWebSocketEventHandler();
  
  // Workspace persistence
  const { saveWorkspace, loadWorkspace } = useWorkspacePersistence();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);

  // ============================================================================
  // EVENT HANDLERS - Demonstrating cross-store coordination
  // ============================================================================
  
  /**
   * Handle profile selection with cross-store effects
   */
  const handleProfileSelect = async (profileId: string) => {
    try {
      // Update profile store
      setActiveProfile(profileId);
      setSelectedProfileId(profileId);
      
      // Emit cross-store event
      eventBus.emit('profile:selected', { profileId });
      
      // Update UI context
      const profile = profiles.find(p => p?.profile_name === profileId);
      if (profile) {
        uiStore.setBreadcrumbs([
          { label: 'Dashboard', path: '/' },
          { label: 'Profiles', path: '/profiles' },
          { label: profile.profile_name, path: `/profiles/${profileId}` }
        ]);
      }
      
      // Log to system
      addLog({
        level: 'info',
        message: `Profile selected: ${profileId}`,
        source: 'dashboard'
      });
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Profile Selection Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        autoHide: false
      });
    }
  };

  /**
   * Handle job creation with full orchestration
   */
  const handleJobCreate = async (audioFile: File) => {
    if (!selectedProfileId) {
      addNotification({
        type: 'warning',
        title: 'No Profile Selected',
        message: 'Please select a profile before creating a job.',
        autoHide: true
      });
      return;
    }

    try {
      // Use orchestrated job creation for full integration
      const job = await createOrchestratedJob(selectedProfileId, audioFile);
      
      // Auto-navigate to job view
      uiStore.setCurrentRoute(`/processing/${job.id}`);
      setCurrentJob(job.id);
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Job Created Successfully',
        message: `Job ${job.id} has been created and started processing.`,
        autoHide: true
      });
      
    } catch (error) {
      // Error handling is automatically done by orchestration
      console.error('Job creation failed:', error);
    }
  };

  /**
   * Handle shot editing with undo/redo support
   */
  const handleShotEdit = (shotIndex: number, updates: Partial<ShotDecision>) => {
    // Enter editing mode if not already
    if (!cinematographyStore.editingMode) {
      setEditingMode(true);
    }
    
    // Apply optimistic update
    updateShotDecision(shotIndex, updates);
    
    // Show notification for user feedback
    addNotification({
      type: 'info',
      title: 'Shot Updated',
      message: `Shot ${shotIndex + 1} has been modified. Save to apply changes.`,
      autoHide: true,
      actions: [
        {
          label: 'Save',
          action: () => saveEdits(),
          primary: true
        },
        {
          label: 'Undo',
          action: () => undo()
        }
      ]
    });
  };

  /**
   * Handle file drop for job creation
   */
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length > 0) {
      setDraggedFile(files[0]);
      
      // Auto-create job if profile is selected
      if (selectedProfileId) {
        handleJobCreate(files[0]);
      } else {
        addNotification({
          type: 'info',
          title: 'File Dropped',
          message: 'Select a profile to create a job with this file.',
          autoHide: true
        });
      }
    }
  };

  // ============================================================================
  // EFFECTS - For cross-store synchronization and side effects
  // ============================================================================
  
  // Load workspace on mount
  useEffect(() => {
    loadWorkspace();
    
    // Setup cross-store event listeners
    const unsubscribeProfileJobCreated = eventBus.on('profile:job_created', (data) => {
      addLog({
        level: 'info',
        message: `Job created for profile: ${data.profileId}`,
        source: 'dashboard'
      });
    });
    
    const unsubscribeSystemError = eventBus.on('system:error', (error) => {
      // Show global error notification
      addNotification({
        type: 'error',
        title: 'System Error',
        message: error.message,
        autoHide: false
      });
    });
    
    return () => {
      unsubscribeProfileJobCreated();
      unsubscribeSystemError();
    };
  }, [loadWorkspace, addLog, addNotification, eventBus]);
    
  // Auto-save workspace when there are changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (uiStore.workspace?.unsavedChanges) {
        saveWorkspace();
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(interval);
  }, [uiStore.workspace?.unsavedChanges, saveWorkspace]);
    
  // Monitor system health
  useEffect(() => {
    const interval = setInterval(() => {
      if (systemHealth?.isSystemHealthy === false) {
        performHealthCheck?.();
      }
    }, 60000); // Check health every minute
    
    return () => clearInterval(interval);
  }, [systemHealth?.isSystemHealthy, performHealthCheck]);

  // ============================================================================
  // DERIVED STATE - Computed values for rendering
  // ============================================================================
  
  const applicationStatus = getApplicationStatus();
  const canCreateJob = selectedProfileId !== null && draggedFile !== null;
  const hasUnsavedEdits = cinematographyStore.hasUnsavedChanges;
  const showProcessingIndicator = processingStatus.isProcessing || profilesLoading;

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Header with system status */}
      <header className="dashboard-header">
        <div className="system-status">
          <span className={`status-indicator ${systemHealth.isSystemHealthy ? 'healthy' : 'unhealthy'}`}>
            {systemHealth.isSystemHealthy ? '●' : '●'} System {systemHealth.isSystemHealthy ? 'Healthy' : 'Degraded'}
          </span>
          <span className="connection-status">
            {isConnected ? '● Connected' : '● Disconnected'}
          </span>
          {hasNotifications && <span className="notification-indicator">🔔</span>}
        </div>
        
        <div className="header-actions">
          <button onClick={() => openModal('settings')}>
            ⚙️ Settings
          </button>
          <button onClick={() => saveWorkspace()}>
            💾 Save Workspace
          </button>
          <button onClick={() => resetApplication()}>
            🔄 Reset App
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="dashboard-main">
        <div className="dashboard-grid">
          
          {/* Profiles Section */}
          <section className="profiles-section">
            <h2>Profiles ({profileStats.totalProfiles})</h2>
            <div className="profile-stats">
              <span>Valid: {profileStats.validProfileCount}</span>
              <span>Avg Completeness: {profileStats.averageCompleteness.toFixed(1)}%</span>
            </div>
            
            <div className="profiles-list">
              {validProfiles.map(profile => (
                <div 
                  key={profile?.profile_name || 'unknown'}
                  className={`profile-card ${activeProfile?.profile_name === profile?.profile_name ? 'active' : ''}`}
                  onClick={() => profile?.profile_name && handleProfileSelect(profile.profile_name)}
                >
                  <h3>{profile?.profile_name || 'Unknown Profile'}</h3>
                  <p>{profile?.character_metadata?.full_name || 'No name available'}</p>
                  <div className="profile-meta">
                    <span>{profile?.supported_emotions?.core?.length || 0} emotions</span>
                    <span>{profile?.supported_angles?.length || 0} angles</span>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              className="add-profile-btn"
              onClick={() => openModal('profileEdit')}
            >
              + Add Profile
            </button>
          </section>

          {/* Job Creation Section */}
          <section 
            className={`job-creation-section ${canCreateJob ? 'ready' : 'waiting'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <h2>Create Job</h2>
            
            {selectedProfileId ? (
              <div className="job-ready">
                <p>Profile: {activeProfile?.profile_name}</p>
                {draggedFile ? (
                  <div className="file-info">
                    <p>File: {draggedFile.name}</p>
                    <button 
                      onClick={() => handleJobCreate(draggedFile)}
                      disabled={processingStatus.isLoading}
                    >
                      {processingStatus.isLoading ? 'Creating...' : 'Create Job'}
                    </button>
                  </div>
                ) : (
                  <div className="drop-zone">
                    <p>Drop audio file here or click to select</p>
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={(e) => e.target.files?.[0] && setDraggedFile(e.target.files[0])}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="no-profile-selected">
                <p>Select a profile to create a job</p>
              </div>
            )}
          </section>

          {/* Current Job Section */}
          <section className="current-job-section">
            <h2>Current Job</h2>
            {currentJob ? (
              <div className="job-details">
                <h3>Job {currentJob?.id || 'Unknown'}</h3>
                <p>Status: {currentJob?.status || 'Unknown'}</p>
                <p>Progress: {currentJob?.progress || 0}%</p>
                <div className="job-progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${currentJob?.progress || 0}%` }}
                  />
                </div>
                
                <div className="job-actions">
                  {currentJob?.status === 'processing' && (
                    <button onClick={() => cancelJob(currentJob.id)}>
                      Cancel Job
                    </button>
                  )}
                  {currentJob?.status === 'failed' && (
                    <button onClick={() => processingStore.retryJob?.(currentJob.id)}>
                      Retry Job
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p>No active job</p>
            )}
          </section>

          {/* Cinematography Section */}
          <section className="cinematography-section">
            <h2>Shot Sequence</h2>
            
            {cinematographyStore.editingMode && (
              <div className="editing-controls">
                <span>Editing Mode</span>
                <button onClick={saveEdits} disabled={!hasUnsavedEdits}>
                  Save Changes
                </button>
                <button onClick={undo} disabled={!cinematographyStore.canUndo}>
                  Undo
                </button>
                <button onClick={redo} disabled={!cinematographyStore.canRedo}>
                  Redo
                </button>
                <button onClick={() => setEditingMode(false)}>
                  Cancel
                </button>
              </div>
            )}
            
            {shotDecisions?.length > 0 ? (
              <div className="shots-timeline">
                {shotDecisions.map((shot, index) => (
                  <div 
                    key={index}
                    className={`shot-card ${selectedShot === shot ? 'selected' : ''}`}
                    onClick={() => cinematographyStore.setSelectedShot?.(index)}
                  >
                    <div className="shot-info">
                      <span className="shot-type">{shot?.selected_shot || 'Unknown'}</span>
                      <span className="shot-emotion">{shot?.emotion || 'Unknown'}</span>
                      <span className="shot-angle">{shot?.vertical_angle || 'Unknown'}</span>
                    </div>
                    <div className="shot-confidence">
                      {shot?.confidence ? (shot.confidence * 100).toFixed(1) : 0}%
                    </div>
                    
                    <div className="shot-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShotEdit(index, { 
                            selected_shot: shot?.selected_shot === 'CU' ? 'MS' : 'CU' 
                          });
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No shot sequence generated yet</p>
            )}
          </section>

          {/* System Metrics Section */}
          <section className="system-metrics-section">
            <h2>System Performance</h2>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>CPU Usage</h4>
                <div className="metric-value">
                  {performanceInsights?.averageCpuUsage?.toFixed(1) || '0'}%
                </div>
              </div>
              
              <div className="metric-card">
                <h4>Memory Usage</h4>
                <div className="metric-value">
                  {performanceInsights?.averageMemoryUsage?.toFixed(1) || '0'}%
                </div>
              </div>
              
              <div className="metric-card">
                <h4>Active Jobs</h4>
                <div className="metric-value">
                  {activeJobs?.length || 0}
                </div>
              </div>
              
              <div className="metric-card">
                <h4>Response Time</h4>
                <div className="metric-value">
                  {performanceInsights?.averageResponseTime?.toFixed(0) || '0'}ms
                </div>
              </div>
            </div>
            
            <button onClick={performHealthCheck}>
              Refresh Health Check
            </button>
          </section>

        </div>
      </main>

      {/* Processing indicator overlay */}
      {showProcessingIndicator && (
        <div className="processing-overlay">
          <div className="spinner"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

export default Dashboard;