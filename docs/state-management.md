# State Management Documentation

## Overview
This document analyzes the state management architecture, patterns, and implementations in the LipSyncAutomation frontend application.

## State Management Architecture

### Framework Choice
- **Primary Framework**: Zustand (lightweight state management)
- **Architecture Pattern**: Multi-store with cross-store orchestration
- **Event System**: Custom event bus for store communication
- **Persistence**: LocalStorage for workspace state

### Store Structure Overview
```
frontend/src/stores/
├── index.ts                 # Store orchestration and event system
├── appStore.ts             # Legacy/global store (being phased out)
├── profilesStore.ts        # Character profiles and visemes management
├── processingStore.ts      # Job processing and workflow management
├── cinematographyStore.ts  # Shot decisions and emotion analysis
├── systemStore.ts          # System monitoring and health
├── uiStore.ts              # UI state and user interactions
└── __tests__/
    └── stores.test.ts      # Store testing
```

## Core State Management Patterns

### 1. Store Orchestration System
**File**: `frontend/src/stores/index.ts`

#### Store Event Bus
```typescript
class StoreEventBus {
  private listeners: Map<string, Array<(data: any) => void>>;
  private eventHistory: Array<{ type: string; data: any; timestamp: number }>;
  private maxHistorySize = 100;

  on(eventType: string, callback: (data: any) => void): () => void;
  emit(eventType: string, data: any): void;
  getHistory(eventType?: string): Array<any>;
  clearHistory(): void;
}
```

**Key Features**:
- **Decoupled Communication**: Stores communicate through events
- **Event History**: Maintain audit trail of state changes
- **Automatic Cleanup**: Unsubscribe functions for memory management
- **Error Isolation**: Errors in listeners don't crash other listeners

#### Cross-Store Orchestration Hook
```typescript
export function useStoreOrchestration() {
  // Store references
  const profilesStore = useProfilesStore();
  const processingStore = useProcessingStore();
  const cinematographyStore = useCinematographyStore();
  const systemStore = useSystemStore();
  const uiStore = useUIStore();

  // Event handlers for cross-store communication
  const handleJobCreated = useCallback((job: Job) => { /* ... */ });
  const handleProfileSelected = useCallback((profileId: string | null) => { /* ... */ });
  const handleEmotionAnalysisComplete = useCallback((analysis: EmotionAnalysis) => { /* ... */ });
  const handleShotDecision = useCallback((event: ShotDecisionEvent) => { /* ... */ });
  const handleSystemError = useCallback((event: ErrorOccurredEvent) => { /* ... */ });

  // Unified actions
  const createOrchestratedJob = useCallback(async (profileId: string, audioFile: string | File) => {
    // Multi-store coordination for job creation
  }, [/* dependencies */]);

  return {
    eventBus: storeEventBus,
    createOrchestratedJob,
    resetApplication,
    synchronizeStores,
    getApplicationStatus,
    stores: { profiles: profilesStore, /* ... */ }
  };
}
```

### 2. Specialized Store Pattern

#### Standard Store Structure
Each specialized store follows a consistent pattern:

```typescript
interface [Domain]Store {
  // State
  data: DomainData[];
  activeId: string | null;
  selectedId: string | null;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Computed Values (via selectors)
  activeData: DomainData | null;
  selectedData: DomainData | null;
  isLoading: boolean;
  hasErrors: boolean;

  // Actions
  loadData: () => Promise<void>;
  createData: (data: Partial<DomainData>) => Promise<DomainData>;
  updateData: (id: string, updates: Partial<DomainData>) => Promise<void>;
  deleteData: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  resetStore: () => void;
}
```

#### Profiles Store
**Purpose**: Character profiles, angles, emotions, and visemes management

```typescript
interface ProfilesStore {
  // State
  profiles: ProfileConfig[];
  activeProfileId: string | null;
  selectedProfileId: string | null;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Computed
  activeProfile: ProfileConfig | null;
  selectedProfile: ProfileConfig | null;
  profileStatus: {
    hasProfiles: boolean;
    isLoading: boolean;
    hasErrors: boolean;
  };

  // Actions
  loadProfiles: () => Promise<void>;
  createProfile: (profileData: Partial<ProfileConfig>) => Promise<ProfileConfig>;
  updateProfile: (profileName: string, updates: Partial<ProfileConfig>) => Promise<void>;
  deleteProfile: (profileName: string) => Promise<void>;
  setActiveProfile: (profileId: string | null) => void;
  setSelectedProfile: (profileId: string | null) => void;
  
  // Profile-specific actions
  createAngle: (profileName: string, angleName: string, angleData?: any) => Promise<void>;
  createEmotion: (profileName: string, angleName: string, emotionName: string, emotionData?: any) => Promise<void>;
  uploadViseme: (visemeData: VisemeUploadData) => Promise<void>;
  copyEmotion: (profileName: string, copyData: CopyEmotionData) => Promise<void>;
}
```

#### Processing Store
**Purpose**: Job processing, workflow management, and progress tracking

```typescript
interface ProcessingStore {
  // State
  allJobs: Job[];
  currentJobId: string | null;
  selectedJobId: string | null;
  processingStages: Record<string, ProcessingStage[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Computed
  activeJobs: Job[];
  completedJobs: Job[];
  currentJob: Job | null;
  selectedJob: Job | null;
  isProcessing: boolean;
  processingStatus: {
    isProcessing: boolean;
    hasActiveJobs: boolean;
    isLoading: boolean;
  };

  // Actions
  loadJobs: () => Promise<void>;
  createJob: (jobData: Partial<Job>) => Promise<Job>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  setCurrentJob: (jobId: string | null) => void;
  setSelectedJob: (jobId: string | null) => void;
  
  // Processing-specific actions
  handleProcessingStageEvent: (event: ProcessingStageEvent) => void;
  handleErrorEvent: (event: ErrorOccurredEvent) => void;
  refreshJobs: () => Promise<void>;
}
```

#### Cinematography Store
**Purpose**: Shot decisions, emotion analysis, and cinematography configuration

```typescript
interface CinematographyStore {
  // State
  emotionAnalysis: EmotionAnalysis | null;
  shotDecisions: ShotDecisionEvent[];
  cinematographyConfig: CinematographyConfig | null;
  selectedShotIndex: number | null;
  selectedSegmentIndex: number | null;
  viewMode: 'timeline' | 'storyboard' | 'detailed';
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Computed
  selectedShot: ShotDecisionEvent | null;
  selectedSegment: EmotionSegment | null;
  cinematographyStatus: {
    hasShotSequence: boolean;
    hasEmotionData: boolean;
    isValidSequence: boolean;
  };

  // Actions
  loadEmotionAnalysis: (jobId: string) => Promise<void>;
  loadCinematographyConfig: () => Promise<void>;
  setSelectedShot: (index: number | null) => void;
  setSelectedSegment: (index: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setEmotionAnalysis: (analysis: EmotionAnalysis) => void;
  addShotDecisionEvent: (event: ShotDecisionEvent) => void;
  
  // Event handlers
  handleTensionAnalysisEvent: (event: TensionAnalysisEvent) => void;
}
```

#### System Store
**Purpose**: System monitoring, health checks, and performance metrics

```typescript
interface SystemStore {
  // State
  performance: SystemPerformance | null;
  connectionStatus: ConnectionStatus;
  systemEvents: SystemEvent[];
  logs: LogEntry[];
  alerts: SystemAlert[];
  metrics: MetricPoint[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Computed
  isSystemHealthy: boolean;
  hasActiveAlerts: boolean;
  isConnected: boolean;
  systemHealth: {
    isSystemHealthy: boolean;
    hasActiveAlerts: boolean;
    isConnected: boolean;
  };

  // Actions
  performHealthCheck: () => Promise<void>;
  loadSystemPerformance: () => Promise<void>;
  addSystemEvent: (event: SystemEvent) => void;
  addLog: (log: LogEntry) => void;
  addMetricPoint: (metric: string, value: number) => void;
  setConnectionStatus: (connected: boolean) => void;
  handleErrorEvent: (event: ErrorOccurredEvent) => void;
  resetStore: () => void;
}
```

#### UI Store
**Purpose**: UI state, user interactions, and interface management

```typescript
interface UIStore {
  // Navigation
  currentRoute: string;
  breadcrumbs: Breadcrumb[];

  // Layout
  panels: Record<string, boolean>;
  sidebarOpen: boolean;

  // Notifications
  notifications: Notification[];

  // Modals
  activeModal: string | null;
  modalData: any;

  // Workspace
  workspace: {
    unsavedChanges: boolean;
    lastSaved: string | null;
  };

  // State Management
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;

  // Computed
  uiStatus: {
    hasErrors: boolean;
    isLoading: boolean;
    hasUnsavedChanges: boolean;
  };

  // Actions
  setCurrentRoute: (route: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  togglePanel: (panel: string) => void;
  setPanelVisibility: (panels: Record<string, boolean>) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  setError: (key: string, error: string | null) => void;
  setLoading: (key: string, loading: boolean) => void;
  saveWorkspace: () => void;
  resetStore: () => void;
}
```

## State Persistence Strategy

### Workspace Persistence
```typescript
export function useWorkspacePersistence() {
  const orchestration = useStoreOrchestration();

  const saveWorkspace = useCallback(() => {
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

    localStorage.setItem('lipsync_workspace', JSON.stringify(workspaceData));
  }, [/* dependencies */]);

  const loadWorkspace = useCallback(() => {
    // Restore state across stores from localStorage
  }, [/* dependencies */]);

  return { saveWorkspace, loadWorkspace };
}
```

### Auto-Save Mechanism
- **Trigger**: On significant state changes
- **Debounce**: 30-second intervals to prevent excessive writes
- **Validation**: Ensure data integrity before saving
- **Recovery**: Graceful handling of corrupted workspace data

## WebSocket Integration

### Real-time State Updates
```typescript
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
    }
  }, [orchestration]);

  return { handleWebSocketEvent, isConnected: orchestration.stores.system.isConnected };
}
```

## State Synchronization Patterns

### Cross-Store Synchronization
```typescript
const synchronizeStores = useCallback(() => {
  // Sync profile selection with cinematography
  if (profilesStore.activeProfileId && !cinematographyStore.emotionAnalysis) {
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
}, [/* dependencies */]);
```

### Optimistic Updates
- **Pattern**: Update UI immediately, rollback on failure
- **Implementation**: Store actions with optimistic updates
- **Error Handling**: Automatic rollback on API failures
- **User Feedback**: Loading states and error notifications

## Performance Optimizations

### Store Optimization Techniques

#### 1. Selective Subscriptions
```typescript
// Instead of subscribing to entire store
const profiles = useProfilesStore(state => state.profiles);

// Subscribe to specific computed values
const profileStatus = useProfileStatus(); // Custom hook
```

#### 2. Memoized Computations
```typescript
// Custom hooks for expensive computations
export function useProfileStatus() {
  const profiles = useProfilesStore(state => state.profiles);
  const loading = useProfilesStore(state => state.loading);
  const errors = useProfilesStore(state => state.errors);

  return useMemo(() => ({
    hasProfiles: profiles.length > 0,
    isLoading: Object.values(loading).some(Boolean),
    hasErrors: Object.values(errors).some(error => error !== null)
  }), [profiles, loading, errors]);
}
```

#### 3. Event Debouncing
```typescript
// Debounced synchronization
const debouncedSync = useMemo(
  () => debounce(synchronizeStores, 1000),
  [synchronizeStores]
);
```

## Testing Strategy

### Store Testing
**File**: `frontend/src/stores/__tests__/stores.test.ts`

#### Test Patterns
```typescript
describe('Profiles Store', () => {
  let store: ProfilesStore;

  beforeEach(() => {
    store = createProfilesStore();
  });

  it('should load profiles successfully', async () => {
    await store.loadProfiles();
    expect(store.profiles).toHaveLength(expectedProfiles.length);
  });

  it('should handle profile creation', async () => {
    const profileData = { profile_name: 'test-profile' };
    const profile = await store.createProfile(profileData);
    expect(profile.profile_name).toBe('test-profile');
  });

  it('should manage loading states correctly', () => {
    store.setLoading('profiles', true);
    expect(store.loading.profiles).toBe(true);
  });
});
```

## Error Handling Patterns

### Store-Level Error Handling
```typescript
interface StoreState {
  errors: Record<string, string | null>;
}

// Standard error handling pattern
const handleError = useCallback((key: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  setError(key, errorMessage);
  
  // Log to system store
  systemStore.addLog({
    level: 'error',
    message: `${key} error: ${errorMessage}`,
    source: 'store'
  });
}, [setError, systemStore]);
```

### Global Error Recovery
```typescript
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
}, [/* all stores */]);
```

## Migration Strategy

### Legacy App Store Phase-Out
- **Current State**: Mixed usage of legacy appStore and new specialized stores
- **Migration Plan**: Gradual migration of functionality to specialized stores
- **Backward Compatibility**: Maintain legacy store during transition
- **Testing**: Ensure no regressions during migration

### Store Evolution
1. **Phase 1**: Implement specialized stores
2. **Phase 2**: Migrate components to new stores
3. **Phase 3**: Remove legacy appStore
4. **Phase 4**: Optimize and refine store patterns

---

**Analysis Date**: 2025-11-10  
**Scan Depth**: Deep Analysis  
**State Framework**: Zustand with custom orchestration  
**Pattern**: Multi-store with event-driven communication