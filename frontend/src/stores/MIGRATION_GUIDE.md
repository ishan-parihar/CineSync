# State Management Migration Guide

## Overview

This guide helps migrate from the monolithic `appStore.ts` to the new domain-specific store architecture. The new system provides better separation of concerns, advanced features, and improved scalability.

## Store Architecture

### New Store Structure

```
src/stores/
├── profilesStore.ts      # Profile management and validation
├── processingStore.ts    # Job processing and queue management  
├── cinematographyStore.ts # Shot decisions and visual configuration
├── systemStore.ts        # Performance monitoring and health checks
├── uiStore.ts           # UI preferences and interface state
└── index.ts             # Store orchestration and cross-store communication
```

### Key Features

- **Domain Separation**: Each store handles a specific domain
- **Optimistic Updates**: Better UX with immediate UI feedback
- **Persistence**: Automatic localStorage persistence with selective fields
- **Real-time Sync**: Cross-store event-driven updates
- **Undo/Redo**: Full undo/redo support for critical actions
- **Computed Selectors**: Efficient derived state calculations
- **Error Handling**: Comprehensive error management across stores

## Migration Steps

### 1. Replace Store Imports

**Before:**
```typescript
import { useAppStore, useProcessingState, useUIState } from '../stores/appStore';
```

**After:**
```typescript
import { 
  useProfilesStore, 
  useProcessingStore,
  useCinematographyStore,
  useSystemStore,
  useUIStore 
} from '../stores';

import { useStoreOrchestration } from '../stores';
```

### 2. Update State Access Patterns

**Before:**
```typescript
const {
  profiles,
  activeProfile,
  currentJob,
  emotionAnalysis,
  shotSequence,
  previewMode,
  setProfiles,
  setActiveProfile
} = useAppStore();
```

**After:**
```typescript
// Individual stores
const profilesStore = useProfilesStore();
const processingStore = useProcessingStore();
const cinematographyStore = useCinematographyStore();
const systemStore = useSystemStore();
const uiStore = useUIStore();

// Or use orchestration for cross-store operations
const { createOrchestratedJob, getApplicationStatus } = useStoreOrchestration();

// Access specific state
const { profiles, activeProfile } = profilesStore;
const { currentJob } = processingStore;
const { emotionAnalysis, shotSequence } = cinematographyStore;
const { previewMode } = uiStore;
```

### 3. Use Computed Selectors

**Before:**
```typescript
const currentJob = useAppStore(state => state.currentJob);
const filteredProfiles = useAppStore(state => 
  state.profiles.filter(profile => profile.isValid)
);
```

**After:**
```typescript
import { useCurrentJob } from '../stores/processingStore';
import { useValidProfiles } from '../stores/profilesStore';

const currentJob = useCurrentJob();
const validProfiles = useValidProfiles();
```

### 4. Update Action Calls

**Before:**
```typescript
const handleProfileSelect = (profileId) => {
  setActiveProfile(profileId);
  setPreviewMode('detailed');
};
```

**After:**
```typescript
const handleProfileSelect = (profileId) => {
  profilesStore.setActiveProfile(profileId);
  uiStore.setPreviewMode('detailed');
  
  // Or use orchestration for complex operations
  storeEventBus.emit('profile:selected', { profileId });
};
```

### 5. WebSocket Event Handling

**Before:**
```typescript
const handleEmotionEvent = (event) => {
  handleEmotionSegmentEvent(event);
};
```

**After:**
```typescript
import { useWebSocketEventHandler } from '../stores';

const { handleWebSocketEvent } = useWebSocketEventHandler();

// Events are automatically routed to appropriate stores
handleWebSocketEvent(event);
```

## Component Migration Examples

### Profile List Component

**Before:**
```typescript
function ProfileList() {
  const { profiles, setActiveProfile, loading } = useAppStore();
  
  return (
    <div>
      {profiles.map(profile => (
        <button 
          key={profile.id}
          onClick={() => setActiveProfile(profile.id)}
        >
          {profile.name}
        </button>
      ))}
    </div>
  );
}
```

**After:**
```typescript
function ProfileList() {
  const profilesStore = useProfilesStore();
  const { filteredProfiles, isLoading } = profilesStore;
  
  const handleProfileSelect = (profileId) => {
    profilesStore.setActiveProfile(profileId);
    
    // Trigger cross-store events
    storeEventBus.emit('profile:selected', { profileId });
  };
  
  if (isLoading) return <div>Loading profiles...</div>;
  
  return (
    <div>
      {filteredProfiles.map(profile => (
        <button 
          key={profile.profile_name}
          onClick={() => handleProfileSelect(profile.profile_name)}
        >
          {profile.profile_name}
        </button>
      ))}
    </div>
  );
}
```

### Job Processing Component

**Before:**
```typescript
function JobProcessing() {
  const { 
    currentJob, 
    processingStages, 
    setCurrentJob,
    updateProcessingStage 
  } = useAppStore();
  
  const handleJobCreate = async (profileId, audioFile) => {
    // Manual job creation logic
  };
}
```

**After:**
```typescript
function JobProcessing() {
  const processingStore = useProcessingStore();
  const { createJob, currentJob, isLoading } = processingStore;
  const { createOrchestratedJob } = useStoreOrchestration();
  
  const handleJobCreate = async (profileId, audioFile) => {
    try {
      // Orchestrated job creation with full cross-store integration
      const job = await createOrchestratedJob(profileId, audioFile);
      
      // UI automatically updates, notifications sent, logs created
    } catch (error) {
      // Error handling across all stores
    }
  };
  
  return (
    // Component JSX
  );
}
```

### Cinematography Editor Component

**Before:**
```typescript
function CinematographyEditor() {
  const { 
    shotSequence, 
    setShotSequence,
    previewMode,
    setPreviewMode 
  } = useAppStore();
  
  const handleShotUpdate = (index, updates) => {
    // Manual shot update logic
  };
}
```

**After:**
```typescript
function CinematographyEditor() {
  const cinematographyStore = useCinematographyStore();
  const { 
    shotDecisions, 
    editingMode, 
    canUndo, 
    canRedo,
    viewMode 
  } = cinematographyStore;
  
  const handleShotEdit = (index, updates) => {
    cinematographyStore.editShot(index, updates);
  };
  
  const handleSaveEdits = () => {
    cinematographyStore.saveEdits();
    cinematographyStore.validateSequence();
  };
  
  const handleUndo = () => {
    cinematographyStore.undo();
  };
  
  return (
    <div>
      {/* Undo/Redo controls */}
      <button onClick={handleUndo} disabled={!canUndo}>Undo</button>
      <button onClick={cinematographyStore.redo} disabled={!canRedo}>Redo</button>
      
      {/* Shot editing interface */}
      {shotDecisions.map((shot, index) => (
        <ShotEditor 
          key={index}
          shot={shot}
          onUpdate={(updates) => handleShotEdit(index, updates)}
        />
      ))}
    </div>
  );
}
```

## Advanced Features Usage

### Optimistic Updates

```typescript
const handleProfileDelete = async (profileId) => {
  // Optimistic update - UI updates immediately
  profilesStore.deleteProfile(profileId);
  
  try {
    await profilesAPI.deleteProfile(profileId);
    profilesStore.commitPendingOperation(profileId);
  } catch (error) {
    // Rollback on failure
    profilesStore.rollbackPendingOperation(profileId);
  }
};
```

### Cross-Store Events

```typescript
// Listen to events across stores
useEffect(() => {
  const unsubscribe = storeEventBus.on('job:completed', (job) => {
    // Update UI when job completes
    uiStore.addNotification({
      type: 'success',
      title: 'Job Complete',
      message: `Job ${job.id} has completed successfully.`
    });
    
    // Update profile statistics
    profilesStore.updateProfileStats(job.profile_id);
  });
  
  return unsubscribe;
}, []);
```

### Workspace Persistence

```typescript
function useWorkspaceAutoSave() {
  const { saveWorkspace } = useWorkspacePersistence();
  const { hasUnsavedChanges } = useUIStore();
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        saveWorkspace();
      }
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(interval);
  }, [hasUnsavedChanges, saveWorkspace]);
}
```

## Performance Optimizations

### Selective Subscriptions

```typescript
// Only subscribe to specific state changes
const activeProfile = useProfilesStore(state => state.activeProfile);
const isProcessing = useProcessingStore(state => state.loading.jobs);

// Use memoized selectors
const expensiveComputedValue = useProfilesStore(
  useCallback(state => {
    return state.profiles.filter(p => p.isValid).map(p => 
      complexCalculation(p)
    );
  }, [])
);
```

### Store Persistence

```typescript
// Only persist necessary fields to localStorage
const persistedStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: 'store-name',
      partialize: (state) => ({
        // Only persist these fields
        preferences: state.preferences,
        selectedItems: state.selectedItems,
      })
    }
  )
);
```

## Testing

### Unit Testing Stores

```typescript
import { act, renderHook } from '@testing-library/react';
import { useProfilesStore } from '../stores/profilesStore';

describe('ProfilesStore', () => {
  it('should add profile correctly', () => {
    const { result } = renderHook(() => useProfilesStore());
    
    act(() => {
      result.current.addProfile(mockProfile);
    });
    
    expect(result.current.profiles).toContain(mockProfile);
  });
});
```

### Integration Testing

```typescript
import { renderHook } from '@testing-library/react';
import { useStoreOrchestration } from '../stores';

describe('Store Orchestration', () => {
  it('should handle cross-store events', async () => {
    const { result } = renderHook(() => useStoreOrchestration());
    
    await act(async () => {
      await result.current.createOrchestratedJob('profile1', 'audio.mp3');
    });
    
    expect(result.current.stores.processing.currentJob).toBeDefined();
    expect(result.current.stores.ui.currentRoute).toBe('/processing/job-id');
  });
});
```

## Troubleshooting

### Common Issues

1. **Zustand Context Error**: Ensure stores are used within React components
2. **Persistence Not Working**: Check partialize configuration
3. **Cross-Store Events Not Firing**: Verify event bus subscription setup
4. **Performance Issues**: Use selective subscriptions and memoized selectors

### Debug Tools

```typescript
// Enable devtools for all stores
const store = create<StoreState>()(
  devtools(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: 'store-name',
      trace: true // Enable stack traces
    }
  )
);

// Log store changes
useStoreOrchestration().stores.profiles.subscribe(
  (state) => console.log('Profiles store changed:', state)
);
```

## Best Practices

1. **Use Domain-Specific Stores**: Keep related state together
2. **Leverage Orchestration**: Use `useStoreOrchestration` for complex operations
3. **Implement Error Boundaries**: Handle store errors gracefully
4. **Optimize Re-renders**: Use specific selectors instead of entire store
5. **Test Store Logic**: Unit test store actions and selectors
6. **Document Events**: Document cross-store events for maintainability

## Migration Checklist

- [ ] Replace all `useAppStore` imports with specific store imports
- [ ] Update state access patterns to use individual stores
- [ ] Replace manual state management with store actions
- [ ] Implement cross-store event handling
- [ ] Add optimistic updates for better UX
- [ ] Set up workspace persistence
- [ ] Update component tests for new stores
- [ ] Verify performance improvements
- [ ] Update documentation
- [ ] Train team on new architecture

This migration provides a more scalable, maintainable, and feature-rich state management system for the LipSyncAutomation application.